import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { Globe, Settings, Trophy, Sparkles } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function GDModes() {
  const modes = [
    {
      id: 'global',
      title: 'Global',
      description: 'Join global discussions and earn rewards',
      icon: Globe,
      badge: 'Reward Mode',
      badgeColor: 'bg-yellow-400',
      gradient: 'from-purple-400 to-blue-500',
      features: ['Earn XP & Badges', 'Global Leaderboard', 'AI Feedback'],
      link: 'CreateRoom?mode=global'
    },
    {
      id: 'custom',
      title: 'Custom',
      description: 'Create private rooms with custom settings',
      icon: Settings,
      badge: 'No Reward',
      badgeColor: 'bg-gray-400',
      gradient: 'from-cyan-400 to-teal-500',
      features: ['Private Rooms', 'Custom Topics', 'Invite Friends'],
      link: 'CreateRoom?mode=custom'
    },
    {
      id: 'tournament',
      title: 'Tournament',
      description: 'Compete in organized tournaments',
      icon: Trophy,
      badge: 'Organization Rewards',
      badgeColor: 'bg-orange-400',
      gradient: 'from-pink-400 to-red-500',
      features: ['Special Prizes', 'Certificates', 'Recognition'],
      link: null
    }
  ];

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-7xl mx-auto px-6 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold mb-2 gradient-text">Choose Your GD Mode</h1>
          <p className="text-gray-600 text-lg">Select how you want to practice today</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode, index) => {
            const Icon = mode.icon;
            const content = (
              <ClayCard 
                key={mode.id}
                className="h-full relative overflow-hidden"
              >
                {/* Badge */}
                <div className={`absolute top-4 right-4 px-3 py-1 ${mode.badgeColor} text-white text-xs font-bold rounded-full flex items-center gap-1`}>
                  <Sparkles className="w-3 h-3" />
                  {mode.badge}
                </div>

                <div className="flex flex-col h-full">
                  <div className={`w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shadow-xl`}>
                    <Icon className="w-12 h-12 text-white" />
                  </div>
                  
                  <h3 className="text-3xl font-bold mb-3">{mode.title}</h3>
                  <p className="text-gray-600 mb-6">{mode.description}</p>
                  
                  <div className="space-y-2 flex-1">
                    {mode.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${mode.gradient}`}></div>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    className={`mt-6 w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-105 ${
                      mode.link 
                        ? `bg-gradient-to-r ${mode.gradient}` 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!mode.link}
                  >
                    {mode.link ? 'Start Now' : 'Coming Soon'}
                  </button>
                </div>
              </ClayCard>
            );

            return mode.link ? (
              <Link key={mode.id} to={createPageUrl(mode.link)}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {content}
                </motion.div>
              </Link>
            ) : (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {content}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}