import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/lib/SocketContext';

export default function useWebRTC({ roomId, me, maxParticipants = 12, sendMedia = true }) {
  const socket = useSocket();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // key: userId -> MediaStream
  const [connectedPeers, setConnectedPeers] = useState({}); // key: userId -> RTCPeerConnection
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [mediaError, setMediaError] = useState(null);
  const joiningRef = useRef(false);
  const [diagnostics, setDiagnostics] = useState({ socketId: null, peers: [], remotes: [], pcs: {}, lastSignal: null });
  const xirsysFetchedRef = useRef(false);

  // Refs that mirror state to avoid stale closures in socket handlers
  const connectedPeersRef = useRef({});
  const remoteStreamsRef = useRef({});
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef({}); // peerKey -> RTCIceCandidateInit[]
  const iceRestartedAtRef = useRef({}); // peerKey -> timestamp
  const getIceServers = () => {
    try {
      if (typeof window !== 'undefined' && window && window['__ICE_SERVERS__']) return window['__ICE_SERVERS__'];
      const raw = localStorage.getItem('ice_servers');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:openrelay.metered.ca:80' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    ];
  };
  useEffect(() => {
    try {
      if (xirsysFetchedRef.current) return;
      const cfg = (typeof window !== 'undefined' && window && window['__XIRSYS__']) || (() => {
        try {
          const ident = localStorage.getItem('xirsys_ident');
          const secret = localStorage.getItem('xirsys_secret');
          const channel = localStorage.getItem('xirsys_channel') || 'MyFirstApp';
          if (ident && secret) return { ident, secret, channel };
        } catch {}
        return null;
      })();
      if (!cfg) return;
      xirsysFetchedRef.current = true;
      (async () => {
        try {
          const res = await fetch(`https://global.xirsys.net/_turn/${encodeURIComponent(cfg.channel || 'MyFirstApp')}`, {
            method: 'PUT',
            headers: {
              'Authorization': 'Basic ' + (typeof btoa !== 'undefined' ? btoa(`${cfg.ident}:${cfg.secret}`) : ''),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ format: 'urls' })
          });
          const data = await res.json().catch(() => null);
          let servers = [];
          if (Array.isArray(data)) servers = data.map(u => ({ urls: u }));
          else if (Array.isArray(data?.v)) servers = data.v.map(u => ({ urls: u }));
          else if (Array.isArray(data?.iceServers)) servers = data.iceServers;
          else if (Array.isArray(data?.v?.iceServers)) servers = data.v.iceServers;
          if (servers && servers.length) {
            try { localStorage.setItem('ice_servers', JSON.stringify(servers)); } catch {}
            if (typeof window !== 'undefined' && window) window['__ICE_SERVERS__'] = servers;
          }
        } catch {}
      })();
    } catch {}
  }, []);
  useEffect(() => { connectedPeersRef.current = connectedPeers; }, [connectedPeers]);
  useEffect(() => { remoteStreamsRef.current = remoteStreams; }, [remoteStreams]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  const ensureConnections = (delayMs = 600) => {
    setTimeout(() => {
      const peers = diagnostics?.peers || [];
      peers.forEach((peerKey) => {
        if (!peerKey || peerKey === myClientId) return;
        if (!connectedPeersRef.current[peerKey]) {
          if (String(myClientId) < String(peerKey)) {
            createPeerConnection(peerKey, true);
          }
        }
      });
    }, delayMs);
  };

  const stopLocalTracks = () => {
    try {
      const s = localStreamRef.current;
      if (s) s.getTracks().forEach(t => t.stop());
    } catch {}
  };

  const myId = me?.email || me?.id || socket?.id;
  const myClientId = socket?.id;

  useEffect(() => {
    let cleanup = () => {};
    (async () => {
      if (!socket || !socket.id || !roomId || !myId) return;
      if (joiningRef.current) return;
      joiningRef.current = true;
      try {
        let stream = null;
        if (sendMedia) {
          const videoConstraints = {
            width: { ideal: 640, max: 640 },
            height: { ideal: 360, max: 360 },
            frameRate: { ideal: 24, max: 30 },
          };
          const audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          };
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: audioConstraints });
          setLocalStream(stream);
          localStreamRef.current = stream;
          setMediaError(null);
        }

        setDiagnostics(d => ({ ...d, socketId: myClientId }));
        socket.on('webrtc:peers', ({ peers = [] }) => {
          setDiagnostics(d => ({ ...d, peers: peers.map(p => (typeof p === 'string' ? p : (p.clientId || p.userId))) }));
          peers.forEach((p) => {
            const peerKey = typeof p === 'string' ? p : (p?.clientId || p?.userId);
            if (!peerKey) return;
            // Skip self by clientId if available; fallback to userId
            if (peerKey === myClientId) return;
            if (typeof p !== 'string' && p?.userId && p.userId === myId && !p?.clientId) return;
            if (connectedPeersRef.current[peerKey]) return;
            const limit = Math.max(1, (maxParticipants || 12) - 1);
            if (Object.keys(connectedPeersRef.current).length >= limit) return;
            createPeerConnection(peerKey, true);
          });
          ensureConnections(800);
        });

        socket.on('webrtc:user-joined', ({ clientId, userId }) => {
          const peerKey = clientId || userId;
          if (!peerKey) return;
          if (peerKey === myClientId) return;
          if (typeof userId === 'string' && !clientId && userId === myId) return;
          // Do not initiate here; the joiner initiates using peers list.
          setDiagnostics(d => ({ ...d, peers: Array.from(new Set([...(d.peers || []), peerKey])) }));
          const limit = Math.max(1, (maxParticipants || 12) - 1);
          if (Object.keys(connectedPeersRef.current).length >= limit) return;
          ensureConnections(1200);
        });

        socket.on('webrtc:signal', async ({ from, target, data }) => {
          // Prefer clientId addressing; fallback to userId for older servers
          if (from === myClientId || from === myId) return;
          if (target && target !== myClientId && target !== myId) return;
          setDiagnostics(d => ({ ...d, lastSignal: { from, type: data?.type || (data?.candidate ? 'candidate' : 'unknown'), at: Date.now() } }));

          const peerKey = from;
          let pc = connectedPeersRef.current[peerKey];
          if (!pc) pc = createPeerConnection(peerKey, false);

          if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc:signal', { roomId, from: myClientId, target: from, data: answer });
            const queued = pendingCandidatesRef.current[from] || [];
            for (const c of queued) {
              try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
            }
            pendingCandidatesRef.current[from] = [];
          } else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const queued = pendingCandidatesRef.current[from] || [];
            for (const c of queued) {
              try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
            }
            pendingCandidatesRef.current[from] = [];
          } else if (data.candidate) {
            try {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } else {
                const list = pendingCandidatesRef.current[from] || [];
                list.push(data.candidate);
                pendingCandidatesRef.current[from] = list;
              }
            } catch {}
          }
        });

        socket.on('webrtc:user-left', ({ clientId, userId }) => {
          removePeer(clientId || userId);
        });

        socket.emit('webrtc:join', { roomId, userId: myId, clientId: myClientId });

        cleanup = () => {
          socket.emit('webrtc:leave', { roomId, userId: myId, clientId: myClientId });
          socket.off('webrtc:user-joined');
          socket.off('webrtc:signal');
          socket.off('webrtc:user-left');
          Object.values(connectedPeers).forEach(pc => pc.close());
          setConnectedPeers({});
          setRemoteStreams({});
          setDiagnostics({ socketId: null, peers: [], remotes: [], pcs: {}, lastSignal: null });
          try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch {}
          try { const cur = localStreamRef.current; if (cur) cur.getTracks().forEach(t => t.stop()); } catch {}
        };
      } catch (e) {
        console.error('WebRTC init error', e);
        setMediaError(e?.name || 'MediaError');
      }
    })();

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, socket?.id, roomId, myId]);

  const createPeerConnection = (peerKey, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
      bundlePolicy: 'max-bundle',
      iceTransportPolicy: 'all',
    });

    // Keep map up to date
    setConnectedPeers(prev => ({ ...prev, [peerKey]: pc }));
    connectedPeersRef.current = { ...connectedPeersRef.current, [peerKey]: pc };
    setDiagnostics(d => ({ ...d, pcs: { ...d.pcs, [peerKey]: { conn: pc.connectionState, ice: pc.iceConnectionState } } }));

    const ls = localStreamRef.current;
    if (ls) {
      ls.getTracks().forEach(track => pc.addTrack(track, ls));
    } else {
      try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch {}
      try { pc.addTransceiver('video', { direction: 'recvonly' }); } catch {}
    }

    const tuneSenders = () => {
      try {
        const peerCount = Object.keys(connectedPeersRef.current || {}).length + 1;
        const targetVideo = peerCount >= 8 ? 300_000 : 600_000;
        pc.getSenders().forEach(sender => {
          if (!sender.track) return;
          const p = sender.getParameters();
          if (!p.encodings || p.encodings.length === 0) p.encodings = [{}];
          if (sender.track.kind === 'video') {
            p.encodings[0].maxBitrate = targetVideo;
            p.degradationPreference = 'maintain-framerate';
          } else if (sender.track.kind === 'audio') {
            p.encodings[0].maxBitrate = 32_000;
          }
          sender.setParameters(p).catch(() => {});
        });
      } catch {}
    };
    tuneSenders();

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams(prev => ({ ...prev, [peerKey]: stream }));
      remoteStreamsRef.current = { ...remoteStreamsRef.current, [peerKey]: stream };
      setDiagnostics(d => ({ ...d, remotes: Object.keys({ ...remoteStreamsRef.current }) }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:signal', { roomId, from: myClientId, target: peerKey, data: { candidate: event.candidate } });
      }
    };

    pc.onconnectionstatechange = async () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        const last = iceRestartedAtRef.current[peerKey] || 0;
        const now = Date.now();
        if (now - last > 15000) {
          iceRestartedAtRef.current[peerKey] = now;
          try {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            socket.emit('webrtc:signal', { roomId, from: myClientId, target: peerKey, data: offer });
          } catch {}
        }
      }
      if (pc.connectionState === 'closed') {
        removePeer(peerKey);
      }
      setDiagnostics(d => ({ ...d, pcs: { ...d.pcs, [peerKey]: { ...(d.pcs?.[peerKey] || {}), conn: pc.connectionState } } }));
    };

    pc.oniceconnectionstatechange = () => {
      setDiagnostics(d => ({ ...d, pcs: { ...d.pcs, [peerKey]: { ...(d.pcs?.[peerKey] || {}), ice: pc.iceConnectionState } } }));
    };
    pc.onnegotiationneeded = async () => {
      try {
        if (!isInitiator) return;
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:signal', { roomId, from: myClientId, target: peerKey, data: offer });
      } catch {}
    };

    if (isInitiator) {
      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc:signal', { roomId, from: myClientId, target: peerKey, data: offer });
        } catch (e) {
          console.error('offer error', e);
        }
      })();
    }

    return pc;
  };

  const removePeer = (peerKey) => {
    setRemoteStreams(prev => {
      const copy = { ...prev };
      delete copy[peerKey];
      return copy;
    });
    remoteStreamsRef.current = (() => { const c = { ...remoteStreamsRef.current }; delete c[peerKey]; return c; })();
    setConnectedPeers(prev => {
      const pc = prev[peerKey];
      if (pc) try { pc.close(); } catch {}
      const copy = { ...prev };
      delete copy[peerKey];
      return copy;
    });
    connectedPeersRef.current = (() => { const c = { ...connectedPeersRef.current }; delete c[peerKey]; return c; })();
  };

  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    setMicOn(localStream.getAudioTracks().some(t => t.enabled));
  };

  const toggleCamera = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    setCameraOn(localStream.getVideoTracks().some(t => t.enabled));
  };

  const retryDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640, max: 640 }, height: { ideal: 360, max: 360 }, frameRate: { ideal: 24, max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setMediaError(null);
      Object.entries(connectedPeers).forEach(async ([peerId, pc]) => {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        try {
          if (pc.signalingState === 'stable') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc:signal', { roomId, from: myClientId, target: peerId, data: offer });
          }
        } catch {}
      });
    } catch (e) {
      setMediaError(e?.name || 'MediaError');
    }
  };

  return {
    localStream,
    remoteStreams,
    micOn,
    cameraOn,
    toggleMic,
    toggleCamera,
    mediaError,
    retryDevices,
    diagnostics,
    stopLocalTracks,
  };
}
