import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { Swords, Users, Clock, BookOpen, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateDebateRoom() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    teamSize: 2,
    domain: 'general',
    duration: 20,
    topic: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await api.auth.me();
    setUser(currentUser);
  };

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'D';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const roomCode = generateRoomCode();
      const room = await api.entities.DebateRoom.create({
        room_code: roomCode,
        host_id: user.email,
        mode: 'custom',
        team_size: formData.teamSize,
        domain: formData.domain,
        duration: formData.duration,
        status: 'lobby',
        participants: [{
          user_id: user.email,
          name: user.full_name,
          side: 'for',
          joined_at: new Date().toISOString()
        }],
        topic: formData.topic || `Debate on ${formData.domain}`
      });

      navigate(createPageUrl(`DebateLobby?roomId=${room.id}`));
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setLoading(false);
    }
  };

  const domains = ['General', 'Technology', 'Business', 'Education', 'Healthcare', 'Environment', 'Politics', 'Sports'];

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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-5xl font-bold mb-2 gradient-text">Create Debate Room</h1>
          <p className="text-gray-600 text-lg">Set up your debate session</p>
        </motion.div>

        <ClayCard className="mb-6">
          <div className="space-y-6">
            {/* Topic */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Swords className="w-5 h-5 text-red-500" />
                Debate Topic (Optional)
              </label>
              <Input
                placeholder="e.g., Technology is making us less human"
                value={formData.topic}
                onChange={(e) => setFormData({...formData, topic: e.target.value})}
                className="clay-card border-none h-14 text-lg"
              />
            </div>

            {/* Team Size */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                Participants
              </label>
              <Select value={formData.teamSize.toString()} onValueChange={(val) => setFormData({...formData, teamSize: parseInt(val)})}>
                <SelectTrigger className="clay-card border-none h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Debaters (1v1)</SelectItem>
                  <SelectItem value="4">4 Debaters (2v2)</SelectItem>
                  <SelectItem value="6">6 Debaters (3v3)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Domain */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <BookOpen className="w-5 h-5 text-orange-600" />
                Topic Domain
              </label>
              <Select value={formData.domain} onValueChange={(val) => setFormData({...formData, domain: val})}>
                <SelectTrigger className="clay-card border-none h-14 text-lg capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain} value={domain.toLowerCase()}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Clock className="w-5 h-5 text-blue-600" />
                Duration
              </label>
              <Select value={formData.duration.toString()} onValueChange={(val) => setFormData({...formData, duration: parseInt(val)})}>
                <SelectTrigger className="clay-card border-none h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={loading}
            className="mt-8 w-full py-5 rounded-3xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-lg shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Creating Room...'
            ) : (
              <>
                <Plus className="w-6 h-6" />
                Create Debate Room
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </motion.button>
        </ClayCard>
      </div>
    </div>
  );
}