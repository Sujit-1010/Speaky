import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';

import { motion } from 'framer-motion';
import { Users, Clock, ArrowLeft, RefreshCw, LogIn, Search } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function BrowseRooms() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [myHostedRoom, setMyHostedRoom] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();

      setUser(currentUser);

      // Get all rooms in lobby status that aren't full
      const availableRooms = await api.entities.GDRoom.filter(
        { status: 'lobby' },
        '-created_date',
        20
      );

      // Check if current user is hosting any active room
      const hostedRoom = availableRooms.find(room => 
        room.host_id === currentUser.email || 
        room.created_by === currentUser.email
      );
      setMyHostedRoom(hostedRoom);

      // Filter out rooms that are full and exclude user's own hosted room from joinable list
      const openRooms = availableRooms.filter(room => 
        (room.participants?.length || 0) < room.team_size
      );

      setRooms(openRooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (room) => {
    if (!user) return;
    
    setJoining(room.id);
    try {
      // Use dedicated participant endpoint — server validates capacity and status.
      await api.gdParticipant.join(room.id, { user_name: user.full_name });
      navigate(createPageUrl(`Lobby?roomId=${room.id}`));
    } catch (error) {
      console.error('Error joining room:', error);
      setJoining(null);
    }
  };


  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2 gradient-text">Browse GD Rooms</h1>
              <p className="text-gray-600">Join an available room hosted by other users</p>
            </div>
            <button
              onClick={loadData}
              className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </motion.div>

        {/* Warning if user is already hosting a room */}
        {myHostedRoom && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <ClayCard className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-yellow-800">You are hosting a room</p>
                  <p className="text-sm text-yellow-700">You cannot join other rooms while hosting. Go to your lobby or close your room first.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(createPageUrl(`Lobby?roomId=${myHostedRoom.id}`))}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold"
                >
                  Go to My Lobby
                </motion.button>
              </div>
            </ClayCard>
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="clay-card p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <ClayCard className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Rooms Available</h3>
            <p className="text-gray-500 mb-6">There are no open rooms right now. Why not create one?</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(createPageUrl('CreateRoom?mode=custom'))}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow-xl"
            >
              Create a Room
            </motion.button>
          </ClayCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room, index) => {
              const spotsLeft = room.team_size - (room.participants?.length || 0);
              const isMyRoom = room.host_id === user?.email || room.created_by === user?.email;

              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ClayCard className="h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            {spotsLeft} spots left
                          </span>
                          {isMyRoom && (
                            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                              Your Room
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold">{room.topic || `${room.domain} Discussion`}</h3>
                      </div>
                      <span className="text-sm text-gray-500 font-mono">{room.room_code}</span>
                    </div>

                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {room.participants?.length || 0}/{room.team_size}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {room.duration} min
                      </div>
                      <span className="capitalize">{room.domain}</span>
                    </div>

                    {/* Participants Preview */}
                    <div className="flex items-center gap-2 mb-4">
                      {room.participants?.slice(0, 4).map((p, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold"
                          title={p.name}
                        >
                          {p.name?.charAt(0) || '?'}
                        </div>
                      ))}
                      {(room.participants?.length || 0) > 4 && (
                        <span className="text-sm text-gray-500">+{room.participants.length - 4} more</span>
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => isMyRoom ? navigate(createPageUrl(`Lobby?roomId=${room.id}`)) : joinRoom(room)}
                      disabled={joining === room.id || (myHostedRoom && !isMyRoom)}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
                        myHostedRoom && !isMyRoom 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      }`}
                    >
                      {joining === room.id ? (
                        'Joining...'
                      ) : isMyRoom ? (
                        <>
                          <Users className="w-5 h-5" />
                          Go to Lobby
                        </>
                      ) : myHostedRoom ? (
                        'You are hosting another room'
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          Join Room
                        </>
                      )}
                    </motion.button>
                  </ClayCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}