import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';

import { Users, Clock, Copy, Check, Play, LogOut, ThumbsUp, ThumbsDown, Swords } from 'lucide-react';
import ClayCard from '../components/shared/ClayCard';

export default function DebateLobby() {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);

      if (!roomId) {
        navigate(createPageUrl('DebateArena'));
        return;
      }

      const roomData = await api.entities.DebateRoom.filter({ id: roomId });

      if (roomData.length > 0) {
        const fetchedRoom = roomData[0];
        setRoom(fetchedRoom);
        
        if (fetchedRoom.status === 'active') {
          navigate(createPageUrl(`DebateRoom?roomId=${fetchedRoom.id}`));
        }
      } else {
        navigate(createPageUrl('DebateArena'));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      navigate(createPageUrl('DebateArena'));
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room?.room_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startDebate = async () => {
    if (!room) return;

    await api.entities.DebateRoom.update(room.id, {
      status: 'active',
      started_at: new Date().toISOString()
    });

    navigate(createPageUrl(`DebateRoom?roomId=${room.id}`));
  };

  const exitRoom = async () => {
    if (!room || !user) return;
    
    const updatedParticipants = room.participants.filter(p => p.user_id !== user.email);
    await api.entities.DebateRoom.update(room.id, {
      participants: updatedParticipants
    });
    
    navigate(createPageUrl('DebateArena'));
  };

  const isHost = user && room && room.host_id === user.email;

  const forTeam = room?.participants?.filter(p => p.side === 'for') || [];
  const againstTeam = room?.participants?.filter(p => p.side === 'against') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Custom Header for Fullscreen */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-gray-100 shadow-lg px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900">Debate</span>
          </div>
          <button
            onClick={exitRoom}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200"
          >
            <LogOut className="w-5 h-5" />
            Exit Room
          </button>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-2 gradient-text">Debate Lobby</h1>
            <p className="text-gray-600 text-lg">Waiting for participants...</p>
          </div>
        </motion.div>

        {/* Room Info */}
        <ClayCard className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Debate Details</h2>
            <div className="flex gap-2">
              <button
                onClick={copyRoomCode}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold flex items-center gap-2 shadow-lg"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {room?.room_code}
              </button>
            </div>
          </div>

          {/* Topic */}
          <div className="clay-card p-4 bg-gradient-to-r from-red-50 to-orange-50 mb-6">
            <p className="text-sm text-gray-600 mb-1">Debate Topic</p>
            <p className="text-xl font-bold">{room?.topic}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="clay-card p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-gray-600">Participants</p>
              <p className="text-xl font-bold">{room?.team_size}</p>
            </div>
            <div className="clay-card p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-xl font-bold">{room?.duration} min</p>
            </div>
            <div className="clay-card p-4 text-center">
              <Swords className="w-6 h-6 mx-auto mb-2 text-red-600" />
              <p className="text-sm text-gray-600">Joined</p>
              <p className="text-xl font-bold">{room?.participants?.length || 0}</p>
            </div>
          </div>
        </ClayCard>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* For Team */}
          <ClayCard className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <ThumbsUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-700">FOR the Motion</h3>
            </div>
            <div className="space-y-3">
              {forTeam.map((participant, index) => (
                <motion.div
                  key={participant.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/60"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold">
                    {participant.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{participant.name}</p>
                    {participant.user_id === room?.host_id && (
                      <span className="text-xs text-yellow-600 font-bold">Host</span>
                    )}
                  </div>
                </motion.div>
              ))}
              {Array.from({ length: Math.ceil(room?.team_size / 2) - forTeam.length }).map((_, i) => (
                <div key={`empty-for-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/30">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-gray-400">Waiting...</p>
                </div>
              ))}
            </div>
          </ClayCard>

          {/* Against Team */}
          <ClayCard className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                <ThumbsDown className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-red-700">AGAINST the Motion</h3>
            </div>
            <div className="space-y-3">
              {againstTeam.map((participant, index) => (
                <motion.div
                  key={participant.user_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/60"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold">
                    {participant.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{participant.name}</p>
                    {participant.user_id === room?.host_id && (
                      <span className="text-xs text-yellow-600 font-bold">Host</span>
                    )}
                  </div>
                </motion.div>
              ))}
              {Array.from({ length: Math.floor(room?.team_size / 2) - againstTeam.length }).map((_, i) => (
                <div key={`empty-against-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/30">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-gray-400">Waiting...</p>
                </div>
              ))}
            </div>
          </ClayCard>
        </div>

        {/* Start Button */}
        {isHost ? (
          <ClayCard className="bg-gradient-to-br from-red-50 to-orange-50">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startDebate}
              className="w-full py-6 rounded-3xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xl shadow-xl flex items-center justify-center gap-3"
            >
              <Play className="w-8 h-8" />
              Start Debate
            </motion.button>
          </ClayCard>
        ) : (
          <ClayCard className="bg-gradient-to-br from-gray-50 to-orange-50">
            <div className="text-center py-4">
              <p className="font-bold text-lg text-gray-700">Waiting for host to start...</p>
            </div>
          </ClayCard>
        )}
      </div>
    </div>
  );
}