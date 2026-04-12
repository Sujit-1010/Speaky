import { motion } from 'framer-motion';
import { MessageSquare, Mic, Bot, Trophy, Target, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function About() {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: 'Group Discussions',
      description: 'Practice GD skills with peers in real-time video sessions with AI-powered topic suggestions.',
      color: 'from-cyan-400 to-blue-500'
    },
    {
      icon: Mic,
      title: 'Extempore Practice',
      description: 'Improve spontaneous speaking with random topics and AI feedback on fluency and content.',
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: Bot,
      title: 'AI Interview Practice',
      description: 'Voice-based AI interviews that adapt to your responses with real-time feedback.',
      color: 'from-green-400 to-teal-500'
    },
    {
      icon: Trophy,
      title: 'Tournaments',
      description: 'Compete in organized tournaments for GD, Debate, and Extempore with leaderboards.',
      color: 'from-yellow-400 to-orange-500'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '50K+', label: 'Sessions Completed' },
    { value: '95%', label: 'User Satisfaction' },
    { value: '24/7', label: 'AI Availability' }
  ];

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="About" user={null} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
            <span className="text-white font-black text-3xl">SU</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black mb-4 gradient-text">SpeakUp</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The ultimate platform to master your communication skills through AI-powered practice, 
            peer learning, and competitive tournaments.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((stat, index) => (
            <ClayCard key={index} className="text-center py-6">
              <p className="text-3xl font-black gradient-text">{stat.value}</p>
              <p className="text-gray-600 font-medium">{stat.label}</p>
            </ClayCard>
          ))}
        </motion.div>

        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <ClayCard className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Target className="w-10 h-10 text-white" />
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-black mb-3">Our Mission</h2>
                <p className="text-gray-600 text-lg leading-relaxed">
                  We believe everyone deserves the opportunity to become a confident communicator. 
                  SpeakUp democratizes access to high-quality speaking practice through AI technology 
                  and peer collaboration, helping millions prepare for interviews, group discussions, 
                  and public speaking.
                </p>
              </div>
            </div>
          </ClayCard>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-black text-center mb-8">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <ClayCard className="h-full">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                        <p className="text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  </ClayCard>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-black text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Choose Your Practice Mode', desc: 'Select from GD, Solo Practice, AI Interview, or Debates' },
              { step: '2', title: 'Practice & Get Feedback', desc: 'Engage in sessions with real-time AI analysis and peer interaction' },
              { step: '3', title: 'Track & Improve', desc: 'Review your progress, earn XP, and climb the leaderboard' }
            ].map((item, index) => (
              <ClayCard key={index} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-black">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </ClayCard>
            ))}
          </div>
        </motion.div>

        {/* Team / Values Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-16"
        >
          <ClayCard className="bg-gradient-to-br from-orange-50 to-pink-50 border-2 border-orange-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black mb-3">Built with Passion</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                SpeakUp was created by a team passionate about education and technology. 
                We're committed to helping you achieve your communication goals through innovative 
                AI-powered tools and a supportive community.
              </p>
            </div>
          </ClayCard>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <ClayCard className="bg-gradient-to-r from-purple-600 to-blue-600 border-2 border-purple-400">
            <h2 className="text-3xl font-black mb-4 text-gray-900">Ready to Start Speaking?</h2>
            <p className="mb-6 text-gray-800 text-lg font-medium">Join thousands of users improving their communication skills every day.</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="px-8 py-4 rounded-2xl bg-white text-purple-600 font-bold shadow-xl hover:shadow-2xl transition-all"
            >
              Get Started Now
            </motion.button>
          </ClayCard>
        </motion.div>
      </div>
    </div>
  );
}