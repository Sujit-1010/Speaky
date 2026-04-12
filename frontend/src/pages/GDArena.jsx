import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';

import { motion } from 'framer-motion';
import { Globe, Settings, Trophy, Sparkles, Users, Plus, LogIn, X, Search } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function GDArena() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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

  const startGlobalMatch = async () => {
    if (!user) return;

    // Use the new global auto-matching flow
    navigate('/global');
  };

  const [showCustomOptions, setShowCustomOptions] = useState(false);

  const modes = [
    {
      id: 'global',
      title: 'Global Matching',
      description: 'Join global discussions and compete with players worldwide',
      icon: Globe,
      badge: 'Reward Mode',
      badgeColor: 'bg-gradient-to-r from-yellow-400 to-orange-500',
      gradient: 'from-purple-500 via-blue-500 to-indigo-500',
      borderColor: 'border-purple-200',
      features: ['Earn XP & Badges', 'Global Leaderboard', 'AI Feedback', 'Instant Matching'],
      onClick: startGlobalMatch
    },
    {
      id: 'custom',
      title: 'Custom GD Room',
      description: 'Create private rooms with friends and custom settings',
      icon: Settings,
      badge: 'No Reward',
      badgeColor: 'bg-gradient-to-r from-gray-400 to-gray-500',
      gradient: 'from-cyan-400 via-teal-400 to-green-500',
      borderColor: 'border-cyan-200',
      features: ['Private Rooms', 'Custom Topics', 'Invite Friends', 'Flexible Settings'],
      onClick: () => setShowCustomOptions(true),
      isCustom: true
    },
    {
      id: 'tournament',
      title: 'Tournament',
      description: 'Compete in organized tournaments with special prizes',
      icon: Trophy,
      badge: 'Organization Rewards',
      badgeColor: 'bg-gradient-to-r from-pink-400 to-red-500',
      gradient: 'from-orange-400 via-pink-500 to-red-500',
      borderColor: 'border-pink-200',
      features: ['Special Prizes', 'Certificates', 'Recognition', 'Leaderboard'],
      onClick: () => navigate(createPageUrl('TournamentHub?type=gd'))
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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-3 gradient-text">Choose Your GD Mode</h1>
          <p className="text-gray-600 text-base sm:text-lg">Select how you want to practice today</p>
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
                  className={`h-full relative overflow-hidden border-3 ${mode.borderColor} ${mode.onClick ? 'cursor-pointer' : 'opacity-90'}`}
                >
                  {/* Animated Background Gradient */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-5`}
                    style={{
                      backgroundSize: '200% 200%',
                      animation: 'gradientShift 8s ease infinite'
                    }}
                  />
                  
                  {/* Badge */}
                  <div className={`absolute top-4 right-4 px-4 py-2 ${mode.badgeColor} text-white text-xs font-black rounded-full flex items-center gap-1.5 shadow-xl border-2 border-white/30`}>
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
                      whileHover={mode.onClick ? { scale: 1.03, y: -2 } : {}}
                      whileTap={mode.onClick ? { scale: 0.97 } : {}}
                      onClick={mode.onClick}
                      disabled={!mode.onClick}
                      className={`w-full py-4 sm:py-5 rounded-[1.5rem] font-black text-base sm:text-lg shadow-2xl transition-all border-3 border-white/40 ${
                        mode.onClick 
                          ? `bg-gradient-to-r ${mode.gradient} text-white hover:shadow-3xl` 
                          : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      style={mode.onClick ? {
                        boxShadow: '0 16px 48px rgba(79, 70, 229, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.3)'
                      } : {}}
                    >
                      {mode.onClick ? 'Start Now' : 'Coming Soon'}
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
          <ClayCard elevated className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-100">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center icon-3d flex-shrink-0">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">Join Thousands of Learners</h3>
                <p className="text-gray-600 leading-relaxed">
                  Practice with peers globally, get AI-powered feedback, and track your progress. 
                  Start your journey to becoming a better communicator today!
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
                <h2 className="text-2xl font-black">Custom GD Room</h2>
                <button 
                  onClick={() => setShowCustomOptions(false)}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(createPageUrl('CreateRoom?mode=custom'))}
                  className="w-full p-5 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-500 text-white font-bold text-lg shadow-lg flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-black">Create Room</p>
                    <p className="text-sm opacity-90">Host a new room and invite friends</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(createPageUrl('BrowseRooms'))}
                  className="w-full p-5 rounded-2xl bg-gradient-to-r from-purple-400 to-blue-500 text-white font-bold text-lg shadow-lg flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-black">Browse Rooms</p>
                    <p className="text-sm opacity-90">Find and join available rooms</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(createPageUrl('JoinRoom'))}
                  className="w-full p-5 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold text-lg shadow-lg flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-black">Join with Code</p>
                    <p className="text-sm opacity-90">Enter a room code to join directly</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}