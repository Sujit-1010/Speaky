import { api } from '@/api/apiClient';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import { motion } from 'framer-motion';
import { ArrowLeft, Check, Flame, Mail, MessageCircle, UserPlus } from 'lucide-react';

import { useSocket } from '@/lib/SocketContext';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function UserProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId') || urlParams.get('userid') || urlParams.get('email') || urlParams.get('id');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [viewedUser, setViewedUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const me = await api.auth.me();

      setCurrentUser(me);

      // Get all users
      const allUsers = await api.entities.User.list();
      
      // Find target user - try multiple matching strategies
      let targetUser = allUsers.find(u => u.id === userId) || allUsers.find(u => u.email === userId);

      // If still not found, the userId might be the profile's user_id
      if (!targetUser) {
        const allProfiles = await api.entities.UserProfile.list();
        const matchingProfile = allProfiles.find(p => p.user_id === userId);
        if (matchingProfile) {
          // use existing user if found, else build fallback from profile
          targetUser =
            allUsers.find(u => u.email === matchingProfile.user_id || u.id === matchingProfile.user_id) ||
            {
              id: matchingProfile.user_id,
              email: matchingProfile.user_id,
              full_name: matchingProfile.full_name || matchingProfile.name || (matchingProfile.user_id || '').split('@')[0]
            };
          setProfile(matchingProfile);
        }
      }

      // Final fallback: build minimal user from param
      if (!targetUser && userId) {
        targetUser = { id: userId, email: userId, full_name: (userId.includes('@') ? userId.split('@')[0] : String(userId)) };
      }

      setViewedUser(targetUser || null);

      if (targetUser) {
        // Get profile if not already found
        if (!profile) {
          let profiles = await api.entities.UserProfile.filter({ user_id: targetUser.email });
          if (profiles.length === 0) {
            profiles = await api.entities.UserProfile.filter({ user_id: targetUser.id });
          }
          
          if (profiles.length > 0) {
            setProfile(profiles[0]);
          }
        }

        // Check if already friends - check my profile
        let myProfiles = await api.entities.UserProfile.filter({ user_id: me.email });
        if (myProfiles.length === 0) {
          myProfiles = await api.entities.UserProfile.filter({ user_id: me.id });
        }
        
        if (myProfiles.length > 0 && myProfiles[0].friends) {
          if (myProfiles[0].friends.includes(targetUser.email) || myProfiles[0].friends.includes(targetUser.id)) {
            setIsFriend(true);
          }
        }

        // Check if friend request already sent
        const existingRequests = await api.entities.FriendRequest.filter({
          from_user_id: me.email,
          to_user_id: targetUser.email,
          status: 'pending'
        });

        if (existingRequests.length > 0) {
          setFriendRequestSent(true);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!currentUser || !viewedUser) return;

    // Double check if already friends
    if (isFriend) {
      alert('You are already friends!');
      return;
    }

    const friendReq = await api.entities.FriendRequest.create({
      from_user_id: currentUser.email,
      from_user_name: currentUser.full_name,
      to_user_id: viewedUser.email,
      message: `${currentUser.full_name} wants to be your friend`,
      status: 'pending'
    });
    
    // Create notification
    const notif = await api.entities.Notification.create({
      user_id: viewedUser.email,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${currentUser.full_name} sent you a friend request`,
      from_user_id: currentUser.email,
      is_read: false
    });

    if (socket) {
      socket.emit('friend_request_notification', {
        to_user_id: viewedUser.email,
        from_user_id: currentUser.email,
        from_user_name: currentUser.full_name,
        notification: notif,
        friend_request: friendReq,
      });
    }

    setFriendRequestSent(true);
  };

  const startChat = () => {
    const targetId = viewedUser?.email || userId;
    navigate(createPageUrl('Chat', { friendId: targetId }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!viewedUser) {
    return (
      <div className="min-h-screen pb-20">
        <TopNav activePage="Leaderboard" user={null} />
        <div className="max-w-4xl mx-auto px-6 pt-28 text-center">
          <h1 className="text-2xl font-bold text-gray-700">User not found</h1>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 rounded-xl bg-purple-500 text-white font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Leaderboard" user={profile} />
      
      <div className="max-w-4xl mx-auto px-6 pt-28">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ClayCard className="mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                {viewedUser.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-black">{viewedUser.full_name}</h1>
                <p className="text-gray-600 flex items-center justify-center md:justify-start gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {viewedUser.email}
                </p>
                <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                    Level {profile?.level || 1}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    {profile?.totalXP || profile?.xp || 0} XP
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                {isFriend ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startChat}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold flex items-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Message
                  </motion.button>
                ) : friendRequestSent ? (
                  <div className="px-6 py-3 rounded-xl bg-gray-200 text-gray-600 font-bold flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Request Sent
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={sendFriendRequest}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Add Friend
                  </motion.button>
                )}
              </div>
            </div>
          </ClayCard>
        </motion.div>

        {/* Stats - Only show Level and Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <ClayCard className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{profile?.level || 1}</span>
            </div>
            <p className="text-lg font-bold">Level {profile?.level || 1}</p>
            <p className="text-sm text-gray-600">{profile?.totalXP || profile?.xp || 0} XP</p>
          </ClayCard>
          <ClayCard className="text-center py-6">
            <Flame className="w-16 h-16 mx-auto mb-3 text-orange-500" />
            <p className="text-lg font-bold">{profile?.streak || 0} Days</p>
            <p className="text-sm text-gray-600">Current Streak</p>
          </ClayCard>
        </motion.div>
      </div>
    </div>
  );
}