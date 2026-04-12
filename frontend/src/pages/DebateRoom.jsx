import { api } from '@/api/apiClient';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import useZegoCall from '@/hooks/useZegoCall';
import { ArrowLeft, Bot, Clock, LogOut, Swords, ThumbsDown, ThumbsUp } from 'lucide-react';

export default function DebateRoom() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId') || urlParams.get('roomid');

  const [room, setRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionActive, setSessionActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (room && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            endDebate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [room, timeLeft]);

  // ZEGOCLOUD setup (always publish media)
  const {
    localStream,
    remoteStreams,
    micOn,
    cameraOn,
    toggleMic,
    toggleCamera,
    mediaError,
    retryDevices,
  } = useZegoCall({
    roomId,
    user,
    autoJoin: true,
  });

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);

      const [roomData] = await api.entities.DebateRoom.filter({ id: roomId });
      setRoom(roomData);
      setTimeLeft(roomData.duration * 60);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const setVideoRef = (el, stream, isSelf = false) => {
    if (!el || !stream) return;
    try {
      el.srcObject = stream;
      if (isSelf) el.muted = true;
      el.onloadedmetadata = () => el.play().catch(() => {});
    } catch {}
  };

  const endDebate = async () => {
    setSessionActive(false);
    await api.entities.DebateRoom.update(roomId, { status: 'completed' });
    navigate(createPageUrl('DebateArena'));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const myParticipant = room?.participants?.find(p => p.user_id === user?.email);
  const mySide = myParticipant?.side;

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={endDebate}
            className="flex items-center gap-2 text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-white" />
            <span className="text-white font-bold">Debate Room</span>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-lg text-white text-sm">
            {room.room_code}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${mySide === 'for' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            {mySide === 'for' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
            <span className="font-bold text-sm">{mySide === 'for' ? 'FOR' : 'AGAINST'}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full">
            <Clock className="w-5 h-5 text-white" />
            <span className={`font-mono font-bold text-lg ${timeLeft < 60 ? 'text-red-400' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <button
            onClick={endDebate}
            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-2 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Exit Meeting
          </button>
        </div>
      </div>

      {/* Topic Banner */}
      <div className="bg-gray-800 px-4 py-3 text-center">
        <p className="text-gray-400 text-sm">Topic</p>
        <h2 className="text-white font-bold text-lg">{room.topic}</h2>
      </div>

      {/* WebRTC Grid */}
      <div className="flex-1 p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-gray-900">
        {/* Local */}
        <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
          {localStream ? (
            <video data-self="true" ref={el => setVideoRef(el, localStream, true)} playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">{mediaError ? 'Mic/Camera blocked' : 'Connecting camera...'}</div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">You</div>
        </div>
        
        {/* Remotes */}
        {Object.entries(remoteStreams || {}).map(([peerId, stream]) => (
          <div key={peerId} className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
            {stream ? (
              <video ref={el => setVideoRef(el, stream)} playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">Waiting for video...</div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">{peerId}</div>
          </div>
        ))}
        {/* AI Judge */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-red-700 to-orange-700 aspect-video flex items-center justify-center">
          <div className="flex flex-col items-center text-white">
            <Bot className="w-10 h-10 mb-2" />
            <span className="font-bold">AI Judge</span>
          </div>
          <div className="absolute top-2 right-2 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">Observer</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3 flex items-center gap-3 justify-center">
        <button onClick={toggleMic} className={`px-3 py-2 rounded-lg text-sm font-bold ${micOn ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>{micOn ? 'Mic On' : 'Mic Off'}</button>
        <button onClick={toggleCamera} className={`px-3 py-2 rounded-lg text-sm font-bold ${cameraOn ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}>{cameraOn ? 'Cam On' : 'Cam Off'}</button>
        {mediaError && (
          <button onClick={retryDevices} className="px-3 py-2 rounded-lg text-sm font-bold bg-yellow-600 text-white">Retry Devices</button>
        )}
      </div>
    </div>
  );
}