import { api } from '@/api/apiClient';
import { useSocket } from '@/lib/SocketContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import { Bot, Camera, Check, Clock, Copy, LogOut, MessageSquare, Mic, Play, Share2, UserPlus, Users } from 'lucide-react';

import ClayCard from '../components/shared/ClayCard';

export default function Lobby() {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [friends, setFriends] = useState([]);
  const [inviting, setInviting] = useState({});
  const socket = useSocket();

  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);

      // Fetch room by ID directly
      const roomData = await api.entities.GDRoom.filter({ id: roomId });

      if (roomData.length === 0) {
        // Room was deleted by host
        navigate(createPageUrl('Dashboard'));
        return;
      }

      if (roomData.length > 0) {
        const fetchedRoom = roomData[0];
        setRoom(fetchedRoom);

        // If room status changed to active, send everyone to pre-GD prepare screen with countdown
        if (fetchedRoom.status === 'active') {
          navigate(createPageUrl(`GDPrepare?roomId=${fetchedRoom.id}`));
        } else if (fetchedRoom.status === 'completed') {
          // Host ended the room; redirect everyone out
          navigate(createPageUrl('Dashboard'));
        }
      }

      // Load friends list for invites
      if (currentUser) {
        let myProfiles = await api.entities.UserProfile.filter({ user_id: currentUser.email });
        if (myProfiles.length === 0) {
          myProfiles = await api.entities.UserProfile.filter({ user_id: currentUser.id });
        }
        if (myProfiles.length > 0 && myProfiles[0].friends && myProfiles[0].friends.length > 0) {
          const allUsers = await api.entities.User.list();
          const list = allUsers.filter(u => myProfiles[0].friends.includes(u.email) || myProfiles[0].friends.includes(u.id));
          setFriends(list);
        } else {
          setFriends([]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const inviteFriend = async (friend) => {
    if (!room || !user) return;
    const friendEmail = friend.email || friend.id;
    // If already in participants, skip
    const alreadyIn = (room.participants || []).some(p => p.user_id === friendEmail || p.user_id === friend.id);
    if (alreadyIn) return;
    setInviting(prev => ({ ...prev, [friendEmail]: true }));
    try {
      const notif = await api.entities.Notification.create({
        user_id: friendEmail,
        type: 'room_invite',
        title: 'Room Invite',
        message: `${user.full_name} invited you to join GD room ${room.room_code}`,
        from_user_id: user.email,
        room_id: room.id,
        is_read: false,
      });
      if (socket) {
        socket.emit('room_invite_notification', {
          to_user_id: friendEmail,
          from_user_id: user.email,
          from_user_name: user.full_name,
          room_id: room.id,
          room_code: room.room_code,
          notification: notif,
        });
      }
    } finally {
      setInviting(prev => ({ ...prev, [friendEmail]: false }));
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room?.room_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startSession = async () => {
    if (!room) return;

    await api.entities.GDRoom.update(room.id, {
      status: 'active',
      started_at: new Date().toISOString()
    });

    // After marking room active, go to pre-GD prepare screen (1-minute countdown)
    navigate(createPageUrl(`GDPrepare?roomId=${room.id}`));
  };

  const exitRoom = async () => {
    if (!room || !user) return;

    try {
      const hostId = room.host_id || room.created_by;
      const amHost = hostId === user.email || hostId === user.id;

      if (amHost) {
        try {
          await api.entities.GDRoom.delete(room.id);
        } catch (e) {
          await api.entities.GDRoom.update(room.id, { status: 'completed', participants: [] });
        }
      } else {
        const updatedParticipants = (room.participants || []).filter(p => p.user_id !== user.email && p.user_id !== user.id);
        await api.entities.GDRoom.update(room.id, { participants: updatedParticipants });
      }
    } finally {
      navigate(createPageUrl('GDArena'));
    }
  };

  // Check if current user is the host - the person who created the room
  // Use host_id if set, otherwise fall back to created_by
  const roomHostId = room?.host_id || room?.created_by;
  const isHost = user && room && roomHostId === user.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Custom Header for Fullscreen */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-gray-100 shadow-lg px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900">SpeakUp</span>
          </div>
          <button
            onClick={exitRoom}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Exit Room
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-2 gradient-text">Lobby</h1>
            <p className="text-gray-600 text-lg">Waiting for participants to join...</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Room Info */}
          <ClayCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Room Details</h2>
              <div className="flex gap-2">
                <button
                  onClick={copyRoomCode}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {room?.room_code}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="clay-card p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-gray-600">Team Size</p>
                <p className="text-xl font-bold">{room?.team_size}</p>
              </div>
              <div className="clay-card p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-xl font-bold">{room?.duration} min</p>
              </div>
              <div className="clay-card p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-gray-600">Joined</p>
                <p className="text-xl font-bold">{room?.participants?.length || 0}</p>
              </div>
            </div>

            <div className="clay-card p-4 bg-gradient-to-r from-purple-50 to-blue-50">
              <p className="text-sm text-gray-600 mb-1">Topic Domain</p>
              <p className="text-lg font-bold capitalize">{room?.domain}</p>
            </div>
          </ClayCard>

          {/* Invite Friends */}
          <ClayCard className="bg-gradient-to-br from-green-50 to-cyan-50">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center shadow-xl">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Invite Friends</h3>
              <p className="text-sm text-gray-600 mb-4">
                Share code or send direct invites to your friends
              </p>
              <button
                onClick={() => {
                  const inviteUrl = `${window.location.origin}${createPageUrl('JoinRoom', { roomId: room?.id })}`;
                  navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-cyan-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all mb-3"
              >
                <Share2 className="w-5 h-5" />
                {copied ? 'Copied!' : 'Share Invite'}
              </button>

              {/* Friends list */}
              {friends && friends.length > 0 ? (
                <div className="text-left max-h-60 overflow-y-auto space-y-2">
                  {friends.map((f) => {
                    const email = f.email || f.id;
                    const alreadyIn = (room?.participants || []).some(p => p.user_id === email || p.user_id === f.id);
                    return (
                      <div key={email} className="flex items-center justify-between p-2 rounded-lg bg-white/60">
                        <div>
                          <p className="font-semibold leading-tight">{f.full_name || 'User'}</p>
                          <p className="text-xs text-gray-500">{email}</p>
                        </div>
                        <button
                          disabled={inviting[email] || alreadyIn}
                          onClick={() => inviteFriend(f)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold ${alreadyIn ? 'bg-gray-200 text-gray-500' : 'bg-green-500 text-white hover:bg-green-600'}`}
                        >
                          {alreadyIn ? 'Joined' : (inviting[email] ? 'Inviting...' : 'Invite')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No friends found. Add friends from the Leaderboard.</p>
              )}
            </div>
          </ClayCard>
        </div>

        {/* Participants Grid */}
        <ClayCard className="mb-6">
          <h3 className="text-xl font-bold mb-4">Participants</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnimatePresence>
              {room?.participants?.map((participant, index) => {
              // The host is whoever created the room - check host_id OR created_by fields
              const roomHostId = room.host_id || room.created_by;
              const isParticipantHost = participant.user_id === roomHostId;
              const isBot = (participant.user_id || '').startsWith('ai:') || (participant.name || '').toLowerCase().includes('ai bot');

              return (
                <motion.div
                  key={participant.user_id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="clay-card p-4 text-center relative"
                >
                  {isParticipantHost && (
                    <span className="absolute top-2 right-2 px-2 py-1 bg-yellow-400 text-white text-xs font-bold rounded-full">
                      Host
                    </span>
                  )}
                  {isBot && (
                    <span className="absolute top-2 left-2 px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                      <Bot className="w-3 h-3" /> AI
                    </span>
                  )}
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                    {participant.name?.charAt(0) || '?'}
                  </div>
                  <p className="font-semibold text-sm">{participant.name}</p>
                </motion.div>
              );
              })}


              {/* Empty slots */}
              {Array.from({ length: (room?.team_size || 4) - (room?.participants?.length || 0) }).map((_, index) => (
                <motion.div
                  key={`empty-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="clay-card p-4 text-center bg-gray-50"
                >
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">Waiting...</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ClayCard>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Camera & Mic */}
          <ClayCard>
            <h3 className="font-bold mb-4">Audio & Video</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                  cameraOn
                    ? 'bg-gradient-to-r from-green-400 to-teal-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Camera className="w-6 h-6 mx-auto mb-1" />
                Camera {cameraOn ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => setMicOn(!micOn)}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                  micOn
                    ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Mic className="w-6 h-6 mx-auto mb-1" />
                Mic {micOn ? 'On' : 'Off'}
              </button>
            </div>
          </ClayCard>

          {/* Start Button - Show for host */}
          {isHost ? (
            <ClayCard className="bg-gradient-to-br from-purple-50 to-blue-50">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startSession}
                className="w-full py-6 rounded-3xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
              >
                <Play className="w-8 h-8" />
                Start Call
              </motion.button>
              <p className="text-center text-sm text-gray-600 mt-3">
                Click to start the group discussion
              </p>
            </ClayCard>
          ) : (
            <ClayCard className="bg-gradient-to-br from-gray-50 to-blue-50">
              <div className="text-center py-4">
                <p className="font-bold text-lg text-gray-700">Waiting for host to start...</p>
                <p className="text-sm text-gray-500 mt-2">The host will start the GD session</p>
              </div>
            </ClayCard>
          )}
        </div>
      </div>
    </div>
  );
}