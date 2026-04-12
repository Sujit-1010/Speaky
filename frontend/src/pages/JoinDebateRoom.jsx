import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { LogIn, Hash, ArrowLeft } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { Input } from '@/components/ui/input';

export default function JoinDebateRoom() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const user = await api.auth.me();
      const rooms = await api.entities.DebateRoom.filter({ 
        room_code: roomCode.toUpperCase(),
        status: { $in: ['lobby', 'active'] }
      }, '-created_date', 1);

      if (rooms.length === 0) {
        setError('Room not found or already ended');
        setLoading(false);
        return;
      }

      const room = rooms[0];

      if (room.status === 'active') {
        navigate(createPageUrl(`DebateRoom?roomId=${room.id}`));
        return;
      }

      // Add user to participants
      const isAlreadyParticipant = room.participants?.some(p => p.user_id === user.email);
      if (!isAlreadyParticipant) {
        // Assign side based on current participants
        const forCount = room.participants?.filter(p => p.side === 'for').length || 0;
        const againstCount = room.participants?.filter(p => p.side === 'against').length || 0;
        const side = forCount <= againstCount ? 'for' : 'against';

        const updatedParticipants = [...(room.participants || []), {
          user_id: user.email,
          name: user.full_name,
          side: side,
          joined_at: new Date().toISOString()
        }];

        await api.entities.DebateRoom.update(room.id, {
          participants: updatedParticipants
        });
      }

      navigate(createPageUrl(`DebateLobby?roomId=${room.id}`));
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-2xl mx-auto px-6 pt-28">
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
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-2 gradient-text">Join Debate Room</h1>
            <p className="text-gray-600 text-lg">Enter the room code to join</p>
          </div>
        </motion.div>

        <ClayCard className="mb-6">
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Hash className="w-5 h-5 text-red-500" />
                Room Code
              </label>
              <Input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="Enter 6-digit code"
                className="clay-card border-none h-16 text-2xl text-center font-bold tracking-widest"
                maxLength={6}
              />
              {error && (
                <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoin}
              disabled={loading || roomCode.length !== 6}
              className="w-full py-5 rounded-3xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-lg shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Joining...'
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  Join Debate
                </>
              )}
            </motion.button>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}