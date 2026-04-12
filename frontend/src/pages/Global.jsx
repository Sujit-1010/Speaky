import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import GlobalMatchingCard from '../components/global/GlobalMatchingCard';

export default function Global() {
  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />

      <div className="max-w-5xl mx-auto px-6 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 gradient-text">
            Global Matching
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Join a quick group discussion with students around the world.
          </p>
        </motion.div>

        <div className="space-y-8">
          <GlobalMatchingCard />

          <ClayCard className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-700 font-semibold mb-1">
                  How it works
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  Click <span className="font-semibold">Start Now</span> to enter the global queue.
                  We&apos;ll match you with other participants and send you to the Lobby once a group is ready.
                </p>
              </div>
            </div>
          </ClayCard>
        </div>
      </div>
    </div>
  );
}
