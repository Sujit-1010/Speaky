import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Users, Clock, Sparkles } from 'lucide-react';
import ClayCard from '../shared/ClayCard';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';

export default function GlobalMatchingCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStartNow = async () => {
    if (!user || loading) return;

    setLoading(true);
    setError(null);

    try {
      const userId = user.email || user.id;
      const name = user.full_name || user.email || 'You';

      const resp = await api.globalGd.join({ userId, name });

      if (!resp || !resp.status) {
        throw new Error('Unexpected response from server');
      }

      if (resp.status === 'matched') {
        navigate(`/lobby/${resp.roomId}`, {
          state: {
            topic: resp.topic,
            teamSize: resp.teamSize || resp.groupSize || 3,
            participants: resp.participants || [],
          },
        });
      } else {
        navigate('/finding', {
          state: {
            userId,
            name,
            queueSize: resp.queueSize,
            position: resp.position,
            groupSize: resp.groupSize || resp.teamSize || 3,
          },
        });
      }
    } catch (e) {
      console.error('Failed to start global matching', e);
      setError(e?.message || 'Failed to start matching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClayCard elevated className="border-2 border-white/60 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 opacity-10"
        style={{ backgroundSize: '200% 200%', animation: 'gradientShift 8s ease infinite' }}
      />
      <div className="relative flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">Global Matching</h2>
              <p className="text-gray-600">Instantly join a group discussion with students worldwide</p>
            </div>
          </div>

          <ul className="space-y-2 text-gray-700 mb-6">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Auto-matched groups of 3 participants</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Balanced topics from real interview-style prompts</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <span>Best for quick practice (10–15 min)</span>
            </li>
          </ul>

          {error && (
            <p className="text-sm text-red-600 mb-3 font-medium">{error}</p>
          )}

          <motion.button
            whileHover={!loading ? { scale: 1.02, y: -1 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            onClick={handleStartNow}
            disabled={!user || loading}
            className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            {loading ? 'Finding Participants…' : 'Start Now'}
          </motion.button>

          <p className="mt-2 text-xs text-gray-500">
            You&apos;ll first join a &quot;Finding Participants&quot; screen while we match you with others.
          </p>
        </div>

        <div className="w-full md:w-64 flex-shrink-0">
          <ClayCard className="bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Team Size</p>
                <p className="text-lg font-bold">3 participants</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-lg font-bold">10–15 min</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Matching usually takes <span className="font-semibold">10–30 seconds</span> depending on traffic.
            </p>
          </ClayCard>
        </div>
      </div>
    </ClayCard>
  );
}
