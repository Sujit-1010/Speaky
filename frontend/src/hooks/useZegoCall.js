import { api } from '@/api/apiClient';
import { useEffect, useRef, useState } from 'react';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

function attachStreamToVideoElement(videoEl, stream, { muted = false } = {}) {
    if (!videoEl || !stream) return;
    try {
        if (videoEl.srcObject !== stream) {
            videoEl.srcObject = stream;
        }
        videoEl.muted = muted;
        videoEl.playsInline = true;
        const play = () => {
            videoEl.play().catch(() => { });
        };
        if (videoEl.readyState >= 2) {
            play();
        } else {
            videoEl.onloadedmetadata = play;
        }
    } catch {
        // ignore attach errors
    }
}

export default function useZegoCall({ roomId, user, autoJoin = true, canPublish = true }) {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // key: streamID -> MediaStream
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [mediaError, setMediaError] = useState(null);
    const [diagnostics, setDiagnostics] = useState({
        appID: null,
        roomID: null,
        userID: null,
        roomState: 'disconnected',
        lastErrorCode: 0,
    });
    const [isJoining, setIsJoining] = useState(false);
    const [isJoined, setIsJoined] = useState(false);

    const engineRef = useRef(null);
    const tokenInfoRef = useRef(null);
    const remoteStreamsRef = useRef({});
    const destroyedRef = useRef(false);

    const ensureEngine = (appID, serverURL) => {
        if (engineRef.current) return engineRef.current;
        const engine = new ZegoExpressEngine(appID, serverURL || '');

        engine.on('roomStateUpdate', (roomID, state, errorCode) => {
            setDiagnostics((d) => ({
                ...d,
                roomID,
                roomState: state,
                lastErrorCode: errorCode || 0,
            }));
        });

        engine.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
            if (destroyedRef.current) return;
            if (!Array.isArray(streamList)) return;

            if (updateType === 'ADD') {
                for (const item of streamList) {
                    const sid = item.streamID;
                    if (!sid) continue;
                    try {
                        const remote = await engine.startPlayingStream(sid);
                        remoteStreamsRef.current = { ...remoteStreamsRef.current, [sid]: remote };
                        setRemoteStreams((prev) => ({ ...prev, [sid]: remote }));
                    } catch (e) {
                        console.error('Zego startPlayingStream error', e);
                    }
                }
            } else if (updateType === 'DELETE') {
                for (const item of streamList) {
                    const sid = item.streamID;
                    if (!sid) continue;
                    try {
                        engine.stopPlayingStream(sid);
                    } catch { }
                    const existing = remoteStreamsRef.current[sid];
                    if (existing) {
                        try {
                            existing.getTracks().forEach((t) => t.stop());
                        } catch { }
                    }
                    const copy = { ...remoteStreamsRef.current };
                    delete copy[sid];
                    remoteStreamsRef.current = copy;
                    setRemoteStreams((prev) => {
                        const p = { ...prev };
                        delete p[sid];
                        return p;
                    });
                }
            }
        });

        engineRef.current = engine;
        return engine;
    };

    const joinRoom = async () => {
        if (!roomId || !user || isJoined || isJoining) return;
        try {
            setIsJoining(true);
            setMediaError(null);

            const user_id = user.email || user.id || `user_${Date.now()}`;
            const user_name = user.full_name || user_id;

            const { appID, serverURL, token, userID, userName, roomID } = await api.zego.getRoomToken({
                roomId,
                user_id,
                user_name,
                canPublish,
            });

            const engine = ensureEngine(appID, serverURL);

            await engine.loginRoom(roomID, token, { userID, userName }, { userUpdate: true });

            let streamID = null;
            if (canPublish) {
                const local = await engine.createStream({
                    camera: {
                        audio: true,
                        video: true,
                    },
                });
                setLocalStream(local);
                streamID = `${roomID}_${userID}`;
                await engine.startPublishingStream(streamID, local);
            } else {
                setLocalStream(null);
            }

            tokenInfoRef.current = { appID, serverURL, userID, userName, roomID, streamID };
            setDiagnostics((d) => ({ ...d, appID, roomID, userID }));
            setIsJoined(true);
            setMediaError(null);
        } catch (e) {
            console.error('Zego joinRoom error', e);
            setMediaError(e?.name || e?.message || 'MediaError');
        } finally {
            setIsJoining(false);
        }
    };

    const stopLocalTracks = () => {
        try {
            if (localStream) {
                localStream.getTracks().forEach((t) => t.stop());
            }
        } catch {
            // ignore
        }
    };

    const leaveRoom = async () => {
        const engine = engineRef.current;
        const info = tokenInfoRef.current;

        try {
            if (engine && info?.streamID) {
                try {
                    engine.stopPublishingStream(info.streamID);
                } catch { }
            }

            stopLocalTracks();
            setLocalStream(null);

            Object.values(remoteStreamsRef.current || {}).forEach((s) => {
                try {
                    s.getTracks().forEach((t) => t.stop());
                } catch { }
            });
            remoteStreamsRef.current = {};
            setRemoteStreams({});

            if (engine && info?.roomID) {
                try {
                    await engine.logoutRoom(info.roomID);
                } catch { }
            }

            setIsJoined(false);
            tokenInfoRef.current = null;
        } catch (e) {
            console.error('Zego leaveRoom error', e);
        }
    };

    const toggleMic = () => {
        if (!localStream) return;
        const tracks = localStream.getAudioTracks();
        if (!tracks.length) return;
        const nextEnabled = !tracks[0].enabled;
        tracks.forEach((t) => {
            t.enabled = nextEnabled;
        });
        setMicOn(nextEnabled);
    };

    const toggleCamera = () => {
        if (!localStream) return;
        const tracks = localStream.getVideoTracks();
        if (!tracks.length) return;
        const nextEnabled = !tracks[0].enabled;
        tracks.forEach((t) => {
            t.enabled = nextEnabled;
        });
        setCameraOn(nextEnabled);
    };

    const retryDevices = async () => {
        const engine = engineRef.current;
        const info = tokenInfoRef.current;
        if (!engine || !info?.roomID || !info?.userID) return;

        try {
            stopLocalTracks();
            const local = await engine.createStream({
                camera: {
                    audio: true,
                    video: true,
                },
            });
            setLocalStream(local);
            await engine.startPublishingStream(info.streamID, local);
            setMediaError(null);
        } catch (e) {
            console.error('Zego retryDevices error', e);
            setMediaError(e?.name || e?.message || 'MediaError');
        }
    };

    useEffect(() => {
        if (!autoJoin) return;
        if (!roomId || !user) return;
        joinRoom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, user?.id, user?.email, autoJoin]);

    useEffect(() => {
        return () => {
            destroyedRef.current = true;
            leaveRoom().finally(() => {
                const engine = engineRef.current;
                if (engine) {
                    try {
                        engine.destroyEngine();
                    } catch { }
                    engineRef.current = null;
                }
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        joinRoom,
        leaveRoom,
        isJoining,
        isJoined,
        attachStreamToVideoElement,
    };
}
