import { api } from '@/api/apiClient';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import useZegoCall from '@/hooks/useZegoCall';
import { AlertCircle, ArrowLeft, Check, Clock, Copy, LogOut, Mic, MicOff, Users, Video, VideoOff } from 'lucide-react';

export default function HumanInterviewRoom() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId');
  
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [localVideoEl, setLocalVideoEl] = useState(null);
  const [remoteVideoEls, setRemoteVideoEls] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (room) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [room]);

  const zegoRoomId = room?.room_code ? `ai_interview_${room.room_code}` : null;

  const {
    localStream,
    remoteStreams,
    micOn,
    cameraOn,
    toggleMic,
    toggleCamera,
    mediaError,
    retryDevices,
    leaveRoom,
    isJoined,
    isJoining,
    attachStreamToVideoElement,
  } = useZegoCall({ roomId: zegoRoomId, user, autoJoin: true, canPublish: true });

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);

      const [roomData] = await api.entities.AIInterview.filter({ id: roomId });
      if (roomData) {
        setRoom(roomData);
        
        if (roomData.status === 'lobby') {
          await api.entities.AIInterview.update(roomId, { status: 'active' });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (localVideoEl && localStream) {
      attachStreamToVideoElement(localVideoEl, localStream, { muted: true });
    }
  }, [localVideoEl, localStream, attachStreamToVideoElement]);

  useEffect(() => {
    Object.entries(remoteStreams || {}).forEach(([streamID, stream]) => {
      const el = remoteVideoEls[streamID];
      if (el && stream) {
        attachStreamToVideoElement(el, stream, { muted: false });
      }
    });
  }, [remoteStreams, remoteVideoEls, attachStreamToVideoElement]);

  const endInterview = async () => {
    try {
      try { await leaveRoom(); } catch { }
      if (roomId) {
        await api.entities.AIInterview.update(roomId, { status: 'completed' });
      }
    } catch (error) {
      console.error('Error ending interview:', error);
    } finally {
      navigate(createPageUrl('AIInterviewHub'));
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room?.room_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={endInterview}
            className="flex items-center gap-2 text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-white" />
            <span className="text-white font-bold">Human Interview</span>
          </div>
          <button
            onClick={copyRoomCode}
            className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {room.room_code}
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full">
            <Clock className="w-5 h-5 text-white" />
            <span className="font-mono font-bold text-lg text-white">
              {formatTime(timeElapsed)}
            </span>
          </div>
          <button
            onClick={endInterview}
            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-2 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Exit
          </button>
        </div>
      </div>

      {/* Interview Type Banner */}
      <div className="bg-gray-800 px-4 py-2 text-center">
        <p className="text-gray-400 text-sm">
          {room.interview_type?.toUpperCase()} Interview 
          {room.company && ` • ${room.company}`}
          {room.role && ` • ${room.role}`}
        </p>
      </div>

      {/* ZegoCloud Meeting */}
      <div className="flex-1 p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-gray-900">
        <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
          {localStream ? (
            <video
              ref={setLocalVideoEl}
              data-self="true"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              {mediaError ? 'Mic/Camera blocked or unavailable' : isJoining ? 'Connecting…' : 'Waiting to join…'}
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
            You
          </div>
        </div>

        {Object.entries(remoteStreams || {}).map(([streamID]) => (
          <div key={streamID} className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
            <video
              ref={(el) => {
                if (!el) return;
                setRemoteVideoEls((prev) => (prev[streamID] === el ? prev : { ...prev, [streamID]: el }));
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
              {streamID}
            </div>
          </div>
        ))}
      </div>

      {mediaError && (
        <div className="bg-red-600 text-white text-sm px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{String(mediaError)}</span>
          </div>
          <button
            onClick={retryDevices}
            className="text-xs font-bold px-3 py-1 rounded bg-white/10 hover:bg-white/20"
          >
            Retry Devices
          </button>
        </div>
      )}

      <div className="bg-gray-800 px-4 py-3 flex items-center gap-4 justify-center flex-shrink-0">
        <button
          onClick={toggleMic}
          disabled={!isJoined}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            micOn ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
          } disabled:opacity-60`}
        >
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          <span>{micOn ? 'Mic On' : 'Mic Off'}</span>
        </button>

        <button
          onClick={toggleCamera}
          disabled={!isJoined}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            cameraOn ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
          } disabled:opacity-60`}
        >
          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          <span>{cameraOn ? 'Camera On' : 'Camera Off'}</span>
        </button>

        <button
          onClick={endInterview}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-red-600 hover:bg-red-700 text-white"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
}