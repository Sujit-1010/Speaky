import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';

import { motion } from 'framer-motion';
import { Bot, Plus, LogIn, Briefcase, Code, Heart, Brain, ArrowLeft, X, Users, Mic } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AIInterviewHub() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    interview_type: 'hr',
    company: '',
    role: '',
    duration: 30
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
    let code = 'AI';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createMeeting = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const roomCode = generateRoomCode();
      const room = await api.entities.AIInterview.create({

        room_code: roomCode,
        host_id: user.email,
        host_name: user.full_name,
        interview_type: formData.interview_type,
        company: formData.company,
        role: formData.role,
        duration: formData.duration,
        status: 'lobby',
        participants: [{
          user_id: user.email,
          name: user.full_name,
          joined_at: new Date().toISOString()
        }]
      });

      navigate(createPageUrl(`HumanInterviewRoom?roomId=${room.id}`));
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = async () => {
    if (!roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }

    setLoading(true);
    try {
      const rooms = await api.entities.AIInterview.filter({ 

        room_code: roomCode.toUpperCase(),
        status: { $in: ['lobby', 'active'] }
      });

      if (rooms.length === 0) {
        alert('Room not found');
        setLoading(false);
        return;
      }

      const room = rooms[0];
      
      // Add user to participants
      const isAlreadyParticipant = room.participants?.some(p => p.user_id === user.email);
      if (!isAlreadyParticipant) {
        const updatedParticipants = [...(room.participants || []), {
          user_id: user.email,
          name: user.full_name,
          joined_at: new Date().toISOString()
        }];

        await api.entities.AIInterview.update(room.id, {
          participants: updatedParticipants
        });
      }

      navigate(createPageUrl(`HumanInterviewRoom?roomId=${room.id}`));
    } catch (error) {
      console.error('Error joining room:', error);
    } finally {
      setLoading(false);
    }
  };

  const interviewTypes = [
    { id: 'hr', label: 'HR Interview', icon: Heart, color: 'from-pink-400 to-red-500' },
    { id: 'technical', label: 'Technical Interview', icon: Code, color: 'from-blue-400 to-indigo-500' },
    { id: 'behavioral', label: 'Behavioral Interview', icon: Brain, color: 'from-purple-400 to-pink-500' },
    { id: 'case_study', label: 'Case Study', icon: Briefcase, color: 'from-green-400 to-teal-500' }
  ];

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4 mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Explore
          </button>
          <h1 className="text-4xl sm:text-5xl font-black mb-3 gradient-text">AI Interview Practice</h1>
          <p className="text-gray-600 text-lg">Practice interviews with AI-powered feedback</p>
        </motion.div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* AI Mode */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <ClayCard 
              elevated 
              onClick={() => navigate(createPageUrl('AIInterviewAI'))}
              className="h-full cursor-pointer border-2 border-green-200 hover:border-green-400 transition-all"
            >
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-xl">
                  <Bot className="w-12 h-12 text-white" />
                </div>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold mb-3">VOICE AI</span>
                <h2 className="text-2xl font-black mb-2">AI Mode</h2>
                <p className="text-gray-600">Real-time voice interview with AI interviewer that asks follow-up questions</p>
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                  <Mic className="w-4 h-4" />
                  <span>Voice-based conversation</span>
                </div>
              </div>
            </ClayCard>
          </motion.div>

          {/* Human Mode */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <ClayCard 
              elevated 
              className="h-full border-2 border-purple-200"
            >
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-xl">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-3">PEER PRACTICE</span>
                <h2 className="text-2xl font-black mb-2">Human Mode</h2>
                <p className="text-gray-600">Practice interviews with real people via video call</p>
                <div className="flex gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowJoinModal(true)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-400 to-pink-500 text-white font-bold flex items-center gap-2"
                  >
                    <LogIn className="w-5 h-5" />
                    Join
                  </motion.button>
                </div>
              </div>
            </ClayCard>
          </motion.div>
        </div>

        {/* Interview Types */}
        <h2 className="text-2xl font-bold mb-4">Interview Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {interviewTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ClayCard className="text-center py-6">
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="font-bold text-sm">{type.label}</p>
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
          className="mt-8"
        >
          <ClayCard className="bg-gradient-to-br from-cyan-50 to-blue-50">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold mb-2">AI-Powered Interview Practice</h3>
                <p className="text-gray-600">
                  Practice with intelligent AI that adapts to your responses, provides real-time feedback, 
                  and helps you prepare for any interview scenario.
                </p>
              </div>
            </div>
          </ClayCard>
        </motion.div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black">Create Interview</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Interview Type</label>
                <Select value={formData.interview_type} onValueChange={(val) => setFormData({...formData, interview_type: val})}>
                  <SelectTrigger className="clay-card border-none h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Company (Optional)</label>
                <Input
                  placeholder="e.g., Google, Amazon"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="clay-card border-none h-12"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Role (Optional)</label>
                <Input
                  placeholder="e.g., Software Engineer"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="clay-card border-none h-12"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Duration</label>
                <Select value={formData.duration.toString()} onValueChange={(val) => setFormData({...formData, duration: parseInt(val)})}>
                  <SelectTrigger className="clay-card border-none h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createMeeting}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold text-lg shadow-lg disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Meeting'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Join Meeting Modal */}
      {showJoinModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowJoinModal(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black">Join Interview</h2>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Room Code</label>
                <Input
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="clay-card border-none h-14 text-xl text-center tracking-widest"
                  maxLength={6}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={joinMeeting}
                disabled={loading || roomCode.length < 4}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-500 text-white font-bold text-lg shadow-lg disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Meeting'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}