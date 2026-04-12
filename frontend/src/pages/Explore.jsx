import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { MessageSquare, Mic, Bot, UserCheck, Target } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function Explore() {
  const practiceModesData = [
    {
      id: 'gd',
      title: 'GD',
      subtitle: 'Start GD',
      description: 'Group Discussion with peers',
      icon: MessageSquare,
      gradient: 'from-purple-400 to-blue-500',
      link: 'GDArena'
    },
    {
      id: 'expo',
      title: 'Extempore',
      subtitle: 'Start Expo',
      description: 'Extempore Speaking Practice',
      icon: Mic,
      gradient: 'from-orange-400 to-pink-500',
      link: 'ExtemporePractice'
    },
    {
      id: 'ai-interview',
      title: 'AI Interview',
      subtitle: 'Practice Interview',
      description: 'Practice interviews with AI-powered feedback',
      icon: UserCheck,
      gradient: 'from-cyan-400 to-blue-500',
      link: 'AIInterviewHub'
    },
    {
      id: 'solo',
      title: 'Practice Solo',
      subtitle: 'AI Coach',
      description: 'Practice with AI and get personalized tips to improve your communication',
      icon: Bot,
      gradient: 'from-teal-400 to-green-500',
      link: 'SoloPractice'
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
          <h1 className="text-5xl font-bold mb-2 gradient-text">Explore Practice Modes</h1>
          <p className="text-gray-600 text-lg">Choose your path to excellence</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {practiceModesData.map((mode, index) => {
            const Icon = mode.icon;
            const CardContent = (
              <ClayCard
                key={mode.id}
                elevated
                className="h-full border-2 border-white/60"
                onClick={mode.link ? undefined : null}
              >
                <div className="flex flex-col h-full">
                  <div className={`w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center icon-3d`}>
                    <Icon className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{mode.title}</h3>
                  <p className="text-purple-600 font-bold mb-3 text-lg">{mode.subtitle}</p>
                  <p className="text-gray-600 flex-1 leading-relaxed">{mode.description}</p>

                </div>
              </ClayCard>
            );

            return mode.link ? (
              <Link key={mode.id} to={createPageUrl(mode.link)}>
                {CardContent}
              </Link>
            ) : (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {CardContent}
              </motion.div>
            );
          })}
        </div>

        {/* Featured Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <ClayCard className="bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-3 gradient-text">Why Practice with GDHub?</h2>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    AI-powered feedback and analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Real-time performance tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    Gamified learning experience
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    Connect with peers worldwide
                  </li>
                </ul>
              </div>
              <div className="animate-float">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-2xl">
                  <Bot className="w-16 h-16 text-white" />
                </div>
              </div>
            </div>
          </ClayCard>
        </motion.div>
      </div>
    </div>
  );
}