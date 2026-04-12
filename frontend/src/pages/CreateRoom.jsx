import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { createPageUrl } from '../utils';

export default function CreateRoom() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'global';

  const [formData, setFormData] = useState({
    teamSize: 4,
    domain: 'technology',
    duration: 15
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await api.auth.me();
    setUser(currentUser);
  };

  const generateRoomCode = () => {
    // Generate truly unique 6-character code with timestamp
    const timestamp = Date.now().toString(36).toUpperCase();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let random = '';
    for (let i = 0; i < 3; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return (timestamp.slice(-3) + random).toUpperCase();
  };

  const handleCreate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const roomCode = generateRoomCode();
      const room = await api.entities.GDRoom.create({
        room_code: roomCode,
        host_id: user.email, // Explicitly set host_id to current user email
        mode: mode,
        team_size: formData.teamSize,
        domain: formData.domain,
        duration: formData.duration,
        status: 'lobby',
        participants: [{
          user_id: user.email,
          name: user.full_name,
          joined_at: new Date().toISOString()
        }],
        topic: getRandomTopic(formData.domain)
      });

      navigate(createPageUrl(`Lobby?roomId=${room.id}`));
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setLoading(false);
    }
  };

  const domains = [
    'Technology', 'Business', 'Education', 'Healthcare', 
    'Environment', 'Politics', 'Sports', 'Entertainment'
  ];

  const topicsByDomain = {
    technology: [
      'Impact of artificial intelligence on future jobs',
      'Is social media making us more connected or more isolated?',
      'Should governments regulate big tech companies more strictly?',
      'Are smartphones making us smarter or more distracted?',
    ],
    business: [
      'Should companies prioritize profit or social responsibility?',
      'Is work-from-home the future of corporate culture?',
      'Are startups better than traditional corporate jobs?',
      'Impact of influencer marketing on consumer behavior',
    ],
    education: [
      'Is online learning as effective as classroom learning?',
      'Should coding be mandatory in schools?',
      'Grades vs skills: What matters more for a student?',
      'Exams: test of memory or understanding?',
    ],
    healthcare: [
      'Mental health awareness in today\'s youth',
      'Should healthcare be a fundamental right?',
      'Impact of fitness trackers on our lifestyle',
      'Are we becoming too dependent on medicines?',
    ],
    environment: [
      'Climate change: individual responsibility vs government policy',
      'Are electric vehicles the real solution to pollution?',
      'Plastic ban: how practical is it?',
      'Is economic growth possible without harming the environment?',
    ],
    politics: [
      'Role of youth in modern politics',
      'Should voting be made compulsory?',
      'Is social media changing the way we view politics?',
      'Politics and development: can they go hand in hand?',
    ],
    sports: [
      'Is cricket overshadowing other sports?',
      'Are sports stars better role models than film stars?',
      'Should e-sports be considered real sports?',
      'Pressure on young athletes to perform',
    ],
    entertainment: [
      'Reality shows: how real are they?',
      'Impact of OTT platforms on traditional cinema',
      'Are celebrities responsible for promoting healthy lifestyles?',
      'Has entertainment become too violent?',
    ],
    general: [
      'Is success more about hard work or smart work?',
      'Should failure be celebrated as a learning step?',
      'Is money the most important factor for happiness?',
      'Has technology improved human relationships?',
    ],
  };

  const getRandomTopic = (domain) => {
    const key = String(domain || 'general').toLowerCase();
    const list = topicsByDomain[key] || topicsByDomain['general'] || [];
    if (!list.length) {
      return `Discussion on ${domain || 'general topics'}`;
    }
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  };

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-4xl mx-auto px-6 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-5xl font-bold mb-2 gradient-text">Create GD Room</h1>
          <p className="text-gray-600 text-lg">Set up your discussion session</p>
        </motion.div>

        <ClayCard className="mb-6">
          <div className="space-y-6">
            {/* Team Size */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                Team Size
              </label>
              <select
                value={formData.teamSize}
                onChange={(e) => setFormData({ ...formData, teamSize: parseInt(e.target.value) })}
                className="clay-card border-none h-14 text-lg w-full px-4 rounded-2xl"
              >
                <option value={2}>2 Participants</option>
                <option value={3}>3 Participants</option>
                <option value={4}>4 Participants</option>
                <option value={5}>5 Participants</option>
                <option value={6}>6 Participants</option>
                <option value={7}>7 Participants</option>
                <option value={8}>8 Participants</option>
                <option value={9}>9 Participants</option>
                <option value={10}>10 Participants</option>
                <option value={11}>11 Participants</option>
                <option value={12}>12 Participants</option>
              </select>
            </div>

            {/* Domain */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <BookOpen className="w-5 h-5 text-purple-600" />
                GD Domain
              </label>
              <select
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="clay-card border-none h-14 text-lg w-full px-4 rounded-2xl capitalize"
              >
                {domains.map((d) => (
                  <option key={d} value={d.toLowerCase()} className="capitalize">{d}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Clock className="w-5 h-5 text-purple-600" />
                Duration
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="clay-card border-none h-14 text-lg w-full px-4 rounded-2xl"
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={loading}
            className="mt-8 w-full py-5 rounded-3xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              'Creating Room...'
            ) : (
              <>
                <Plus className="w-6 h-6" />
                Create Room
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </motion.button>
        </ClayCard>

        <ClayCard className="bg-gradient-to-br from-purple-50 to-blue-50">
          <h3 className="font-bold text-lg mb-3">How it works:</h3>
          <ol className="space-y-2 text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm flex items-center justify-center font-bold">1</span>
              <span>Create a room with your preferred settings</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm flex items-center justify-center font-bold">2</span>
              <span>Share the room code with your friends</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm flex items-center justify-center font-bold">3</span>
              <span>Wait in the lobby for everyone to join</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm flex items-center justify-center font-bold">4</span>
              <span>Start the discussion and practice together!</span>
            </li>
          </ol>
        </ClayCard>
      </div>
    </div>
  );
}