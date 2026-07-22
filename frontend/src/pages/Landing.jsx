import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, Mic, Bot, Award, TrendingUp, ArrowRight } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import { createPageUrl } from '../utils';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50">
      <TopNav activePage="Landing" user={null} />

      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[36rem] h-[36rem] bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[36rem] h-[36rem] bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-10 sm:pb-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 text-purple-700 font-semibold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4" />
              Level up your speaking skills
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900">
              Speak with Confidence. Compete with Clarity.
            </h1>
            <p className="mt-4 sm:mt-5 text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              Practice Group Discussions, Extempore & AI Interviews. Get instant feedback, climb the leaderboard, and master communication.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                to={createPageUrl('Dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to={createPageUrl('Explore')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-gray-800 font-bold border-2 border-gray-200 hover:bg-gray-50"
              >
                Explore Features
              </Link>
              
            </div>
          </motion.div>

          <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard icon={MessageSquare} color="from-cyan-400 to-blue-500" title="Group Discussions" desc="Join or host GDs with real participants. Practice topics, moderate, and receive AI insights." />
            <FeatureCard icon={Mic} color="from-purple-400 to-pink-500" title="Extempore" desc="Think on your feet with timed prompts and instant fluency feedback to sharpen your delivery." />
            <FeatureCard icon={Bot} color="from-green-400 to-teal-500" title="AI Interviews" desc="Simulate interview rooms powered by AI. Practice answers and get granular analysis." />
            <FeatureCard icon={Award} color="from-yellow-400 to-amber-500" title="Leaderboard" desc="Compete globally. Earn XP, unlock levels, and showcase your progress to the community." />
            <FeatureCard icon={TrendingUp} color="from-emerald-400 to-cyan-500" title="Insights" desc="Track pace, clarity, and depth. Identify strengths and personalized areas to improve." />
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-[2rem] p-6 sm:p-10 bg-white border-2 border-gray-100 shadow-xl text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-black">Ready to SpeakUp?</h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              Jump into a session now or explore modes to find your perfect practice flow.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link to={createPageUrl('GDArena')} className="px-5 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg hover:shadow-xl">
                Quick Start GD
              </Link>
              <Link to={createPageUrl('ExtemporePractice')} className="px-5 py-3 rounded-full bg-gray-900 text-white font-bold hover:bg-black">
                Practice Solo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, color, title, desc }) {
  return (
    <motion.div whileHover={{ y: -6 }} className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100">
      <div className={`w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="font-black text-lg mb-1">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </motion.div>
  );
}
