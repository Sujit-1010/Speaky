import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Hash, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { createPageUrl } from '../utils';

export default function JoinRoom() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myHostedRoom, setMyHostedRoom] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const deepLinkRoomId = urlParams.get('roomId');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const hosted = await checkHostedRoom();
    if (deepLinkRoomId) {
      await joinByRoomId(deepLinkRoomId, hosted);
    }
  };

  const checkHostedRoom = async () => {
    try {
      const user = await api.auth.me();
      if (!user) return null;
      const hostedRooms = await api.entities.GDRoom.filter({
        host_id: user.email,
        status: 'lobby'
      });

      if (hostedRooms.length > 0) {
        setMyHostedRoom(hostedRooms[0]);
        return hostedRooms[0];
      }
      return null;
    } catch (error) {
      console.error('Error checking hosted room:', error);
      return null;
    }
  };

  const joinByRoomId = async (roomId, hostedRoom) => {
    if (!roomId) return;

    // Check if user is hosting a room
    if (hostedRoom) {
      setError('You cannot join other rooms while hosting. Go to your lobby first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await api.auth.me();
      if (!user) {
        api.auth.redirectToLogin();
        return;
      }

      const roomData = await api.entities.GDRoom.filter({ id: roomId });
      if (!roomData || roomData.length === 0) {
        setError('Room not found or already ended');
        return;
      }

      const room = roomData[0];

      if (room.status === 'completed') {
        setError('This room has already ended');
        return;
      }

      const joinedRoom = await api.rooms.gd.join(roomId, { user_id: user.email, user_name: user.full_name });
      const effectiveRoomId = joinedRoom?.id || joinedRoom?._id || roomId;

      if (joinedRoom?.status === 'active') {
        navigate(createPageUrl(`Call?roomId=${effectiveRoomId}`));
        return;
      }

      navigate(createPageUrl(`Lobby?roomId=${effectiveRoomId}`));
    } catch (error) {
      console.error('Error joining room:', error);
      if (error && Number(error.status) === 409) {
        setError('Room is full');
      } else {
        setError('Failed to join room');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    // Check if user is hosting a room
    if (myHostedRoom) {
      setError('You cannot join other rooms while hosting. Go to your lobby first.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const user = await api.auth.me();
      if (!user) {
        api.auth.redirectToLogin();
        return;
      }
      // Only find rooms that are in lobby status (not completed or old rooms)
      const rooms = await api.entities.GDRoom.filter({ 
        room_code: roomCode.toUpperCase(),
        status: { $in: ['lobby', 'active'] }
      }, '-created_date', 1);

      if (rooms.length === 0) {
        setError('Room not found or already ended');
        setLoading(false);
        return;
      }

      // Get the most recent room with this code
      const room = rooms[0];
      if (room.status === 'completed') {
        setError('This room has already ended');
        setLoading(false);
        return;
      }

      const joinedRoom = await api.rooms.gd.join(room.id, { user_id: user.email, user_name: user.full_name });
      const effectiveRoomId = joinedRoom?.id || joinedRoom?._id || room.id;

      if (joinedRoom?.status === 'active' || room.status === 'active') {
        navigate(createPageUrl(`Call?roomId=${effectiveRoomId}`));
        return;
      }

      navigate(createPageUrl(`Lobby?roomId=${effectiveRoomId}`));
    } catch (error) {
      console.error('Error joining room:', error);
      if (error && Number(error.status) === 409) {
        setError('Room is full');
      } else {
        setError('Failed to join room');
      }
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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-2 gradient-text">Join GD Room</h1>
            <p className="text-gray-600 text-lg">Enter the room code to join the discussion</p>
          </div>
        </motion.div>

        {myHostedRoom && (
          <ClayCard className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-yellow-800">You are hosting a room</p>
                <p className="text-sm text-yellow-700">You cannot join other rooms while hosting.</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(createPageUrl(`Lobby?roomId=${myHostedRoom.id}`))}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm"
              >
                Go to My Lobby
              </motion.button>
            </div>
          </ClayCard>
        )}

        <ClayCard className="mb-6">
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Hash className="w-5 h-5 text-purple-600" />
                  Room Code
                </label>
              <input
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
              disabled={loading || roomCode.length !== 6 || myHostedRoom}
              className={`w-full py-5 rounded-3xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                myHostedRoom 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-2xl'
              }`}
            >
              {loading ? (
                'Joining...'
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  Join Now
                </>
              )}
            </motion.button>
          </div>
        </ClayCard>

        <ClayCard className="bg-gradient-to-br from-blue-50 to-purple-50 text-center">
          <p className="text-gray-700 mb-4">Don't have a room code?</p>
          <button
            onClick={() => navigate(createPageUrl('CreateRoom'))}
            className="px-8 py-3 rounded-full bg-white text-purple-600 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Create New Room
          </button>
        </ClayCard>
      </div>
    </div>
  );
}