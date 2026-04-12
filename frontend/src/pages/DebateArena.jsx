import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';

import { Globe, Settings, Trophy, Sparkles, Swords, Plus, LogIn, X } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function DebateArena() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showCustomOptions, setShowCustomOptions] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);

    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const startGlobalDebate = async () => {
    if (!user) return;
    
    const timestamp = Date.now().toString(36).substring(-4);
    const random = Math.random().toString(36).substring(2, 6);
    const roomCode = ('D' + timestamp + random).toUpperCase().substring(0, 6);
    
    const topics = [
      'Technology is making us less human',
      'Social media does more harm than good',
      'Online education can replace traditional classrooms',
      'AI will create more jobs than it destroys',
      'Privacy is more important than security'
    ];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    const room = await api.entities.DebateRoom.create({
      room_code: roomCode,
      host_id: user.email,
      mode: 'global',
      team_size: 2,
      domain: 'general',
      duration: 20,
      status: 'lobby',
      participants: [{
        user_id: user.email,
        name: user.full_name,
        side: 'for',
        joined_at: new Date().toISOString()
      }],
      topic: topic
    });

    navigate(createPageUrl(`DebateLobby?roomId=${room.id}`));
  };

  const modes = [
    {
      id: 'global',
      title: 'Global Matching',
      description: 'Debate with random opponents from around the world',
      icon: Globe,
      badge: 'Reward Mode',
      badgeColor: 'bg-gradient-to-r from-yellow-400 to-orange-500',
      gradient: 'from-red-500 via-orange-500 to-yellow-500',
      borderColor: 'border-red-200',
      features: ['Earn XP & Badges', 'Global Rankings', 'AI Judging', 'Instant Matching'],
      onClick: startGlobalDebate
    },
    {
      id: 'custom',
      title: 'Custom Debate',
      description: 'Create private debates with friends and custom topics',
      icon: Settings,
      badge: 'No Reward',
      badgeColor: 'bg-gradient-to-r from-gray-400 to-gray-500',
      gradient: 'from-indigo-400 via-purple-400 to-pink-500',
      borderColor: 'border-indigo-200',
      features: ['Private Rooms', 'Custom Topics', 'Choose Sides', 'Flexible Rules'],
      onClick: () => setShowCustomOptions(true)
    },
    {
      id: 'tournament',
      title: 'Tournament',
      description: 'Compete in organized debate tournaments',
      icon: Trophy,
      badge: 'Organization Rewards',
      badgeColor: 'bg-gradient-to-r from-pink-400 to-red-500',
      gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
      borderColor: 'border-emerald-200',
      features: ['Special Prizes', 'Certificates', 'Recognition', 'Leaderboard'],
      onClick: () => navigate(createPageUrl('TournamentHub?type=debate'))
    }
  ];

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-12 text-center"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-3 gradient-text">Choose Debate Mode</h1>
          <p className="text-gray-600 text-base sm:text-lg">Select your debate challenge</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {modes.map((mode, index) => {
            const Icon = mode.icon;
            return (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
              >
                <ClayCard 
                  elevated
                  onClick={mode.onClick}
                  className={`h-full relative overflow-hidden border-3 ${mode.borderColor} cursor-pointer`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-5`} />
                  
                  <div className={`absolute top-4 right-4 px-4 py-2 ${mode.badgeColor} text-white text-xs font-black rounded-full flex items-center gap-1.5 shadow-xl`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {mode.badge}
                  </div>

                  <div className="relative flex flex-col h-full pt-2">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-[2rem] bg-gradient-to-br ${mode.gradient} flex items-center justify-center icon-3d shadow-2xl`}>
                      <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    
                    <h3 className="text-2xl sm:text-3xl font-black mb-3">{mode.title}</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">{mode.description}</p>
                    
                    <div className="space-y-2.5 flex-1 mb-6">
                      {mode.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${mode.gradient} shadow-lg`}></div>
                          <span className="text-sm font-medium text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full py-4 sm:py-5 rounded-[1.5rem] font-black text-base sm:text-lg shadow-2xl bg-gradient-to-r ${mode.gradient} text-white`}
                    >
                      Start Now
                    </motion.button>
                  </div>
                </ClayCard>
              </motion.div>
            );
          })}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 sm:mt-12"
        >
          <ClayCard elevated className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center icon-3d flex-shrink-0">
                <Swords className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">Sharpen Your Argumentation Skills</h3>
                <p className="text-gray-600 leading-relaxed">
                  Practice structured debates, learn to argue both sides, and get AI-powered feedback on your arguments.
                </p>
              </div>
            </div>
          </ClayCard>
        </motion.div>

        {/* Custom Room Modal */}
        {showCustomOptions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCustomOptions(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black">Custom Debate</h2>
                <button 
                  onClick={() => setShowCustomOptions(false)}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(createPageUrl('CreateDebateRoom'))}
                  className="w-full p-5 rounded-2xl bg-gradient-to-r from-indigo-400 to-purple-500 text-white font-bold text-lg shadow-lg flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-black">Create Room</p>
                    <p className="text-sm opacity-90">Start a new debate room</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(createPageUrl('JoinDebateRoom'))}
                  className="w-full p-5 rounded-2xl bg-gradient-to-r from-pink-400 to-red-500 text-white font-bold text-lg shadow-lg flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-black">Join Room</p>
                    <p className="text-sm opacity-90">Enter a code to join</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}