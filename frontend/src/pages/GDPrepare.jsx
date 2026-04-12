import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import { BookOpen, Clock, Sparkles, Users } from 'lucide-react';

export default function GDPrepare() {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute prep time

  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId');

  useEffect(() => {
    if (!roomId || roomId === 'null' || roomId === 'undefined') {
      navigate(createPageUrl('Dashboard'));
      return;
    }
    loadRoom();
  }, []);

  useEffect(() => {
    let timer;
    const poll = async () => {
      try {
        const data = await api.entities.GDRoom.filter({ id: roomId });
        if (data.length === 0 || data[0].status === 'completed') {
          navigate(createPageUrl('Dashboard'));
        }
      } catch {}
    };
    poll();
    timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [roomId, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) {
      navigate(createPageUrl(`Call?roomId=${roomId}`));
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, roomId, navigate]);

  const loadRoom = async () => {
    try {
      const roomData = await api.entities.GDRoom.filter({ id: roomId });
      if (roomData.length > 0) {
        setRoom(roomData[0]);
      } else {
        navigate(createPageUrl('Dashboard'));
      }
    } catch (error) {
      console.error('Error loading room:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        {/* Preparation Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center">
          {/* Timer Circle */}
          <div className="relative w-40 h-40 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - timeLeft / 60)}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Clock className="w-6 h-6 text-white/70 mx-auto mb-1" />
                <span className="text-4xl font-black text-white">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-2">Prepare Yourself</h1>
          <p className="text-white/70 mb-8">Take a moment to think about the topic</p>

          {/* Skip waiting */}
          {roomId && roomId !== 'null' && roomId !== 'undefined' && (
            <div className="mb-6">
              <button
                onClick={() => navigate(createPageUrl(`Call?roomId=${roomId}`))}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Skip & Join Now
              </button>
            </div>
          )}

          {/* Topic Card */}
          <div className="bg-white/10 rounded-2xl p-6 mb-6 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-purple-300" />
              <span className="text-purple-300 font-bold text-sm uppercase">GD Topic</span>
            </div>
            <h2 className="text-2xl font-bold text-white leading-relaxed">
              {room?.topic || 'Loading topic...'}
            </h2>
          </div>

          {/* Room Info */}
          <div className="flex items-center justify-center gap-6 text-white/70 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{room?.participants?.length || 0} participants</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{room?.duration || 15} min discussion</span>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-5 border border-purple-400/30">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">Quick Tips</span>
            </div>
            <ul className="text-white/80 text-sm space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                Think of 2-3 main points to discuss
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                Listen actively and build on others' ideas
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                Be respectful and give everyone a chance to speak
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}