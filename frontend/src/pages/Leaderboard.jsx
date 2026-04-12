import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { Award, Crown, Eye, Flame, Star, Trophy, UserPlus, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { createPageUrl } from '../utils';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [pendingOut, setPendingOut] = useState([]); // requests I've sent
  const [pendingIn, setPendingIn] = useState([]);  // requests to me

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await api.auth.me();

      setCurrentUser(user);

      // Load my profile for friend list
      if (user) {
        let mine = await api.entities.UserProfile.filter({ user_id: user.email });
        if (mine.length === 0) {
          mine = await api.entities.UserProfile.filter({ user_id: user.id });
        }
        if (mine.length > 0) setMyProfile(mine[0]); else setMyProfile(null);

        // Pending friend requests
        const out = await api.entities.FriendRequest.filter({ from_user_id: user.email, status: 'pending' });
        const inn = await api.entities.FriendRequest.filter({ to_user_id: user.email, status: 'pending' });
        setPendingOut(out || []);
        setPendingIn(inn || []);
      }

      const [allProfiles, allUsers] = await Promise.all([
        api.entities.UserProfile.list('-totalXP', 100), // fetch more since we will filter
        api.entities.User.list()
      ]);

      const userMap = {};
      allUsers.forEach(u => { userMap[u.id] = u; userMap[u.email] = u; });
      setUsers(userMap);

      const seen = new Set();
      const deduped = [];
      for (const p of allProfiles) {
        // Apply streak filter: streak >= 1
        if (!p.streak || p.streak < 1) continue;

        const u = userMap[p.user_id];
        const key = (u && u.email) || p.user_id;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(p);
        }
      }

      // Sort again by totalXP just in case, though the API did
      deduped.sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));

      setProfiles(deduped);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getUserName = (userId) => {
    const user = users[userId];
    return user?.full_name || 'Anonymous User';
  };

  const getProfileAvatar = (profile) => {
    return profile?.avatar;
  };

  const handleAddFriend = async (profileUserId) => {
    if (!currentUser) return;

    // Get the target user's email from the users map
    const targetUser = users[profileUserId];
    const targetEmail = targetUser?.email || profileUserId;

    // Check if already friends
    let myProfile = await api.entities.UserProfile.filter({ user_id: currentUser.email });
    if (myProfile.length === 0) {
      myProfile = await api.entities.UserProfile.filter({ user_id: currentUser.id });
    }

    if (myProfile.length > 0 && myProfile[0].friends) {
      if (myProfile[0].friends.includes(targetEmail) || myProfile[0].friends.includes(profileUserId)) {
        alert('You are already friends!');
        setSelectedUser(null);
        return;
      }
    }

    // Check if request already exists
    const existingRequests = await api.entities.FriendRequest.filter({
      from_user_id: currentUser.email,
      to_user_id: targetEmail,
      status: 'pending'
    });

    if (existingRequests.length > 0) {
      alert('Friend request already sent!');
      setSelectedUser(null);
      return;
    }

    // Create friend request with recipient's email
    await api.entities.FriendRequest.create({
      from_user_id: currentUser.email,
      from_user_name: currentUser.full_name,
      to_user_id: targetEmail,
      to_user_name: targetUser?.full_name || 'User',
      status: 'pending'
    });

    // Create notification for the recipient using their email
    await api.entities.Notification.create({
      user_id: targetEmail,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${currentUser.full_name} sent you a friend request`,
      from_user_id: currentUser.email,
      is_read: false
    });

    alert('Friend request sent!');
    setSelectedUser(null);
  };

  const viewProfile = (userId) => {
    const target = users[userId] || Object.values(users).find(u => u.id === userId || u.email === userId);
    const param = target?.email || userId;
    navigate(createPageUrl(`UserProfile?userId=${param}`));
    setSelectedUser(null);
  };

  const getTargetEmail = (userId) => {
    const target = users[userId] || users[(users[userId]?.email)];
    return (users[userId]?.email) || (target?.email) || userId;
  };

  const isAlreadyFriend = (userId) => {
    const email = getTargetEmail(userId);
    const f = myProfile?.friends || [];
    return f.includes(email) || f.includes(userId);
  };

  const isPendingWith = (userId) => {
    const email = getTargetEmail(userId);
    const out = pendingOut.some(r => r.to_user_id === email);
    const inn = pendingIn.some(r => r.from_user_id === email);
    return { out, inn };
  };

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Leaderboard" user={profiles.find(p => p.user_id === currentUser?.id)} />

      <div className="max-w-5xl mx-auto px-6 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-1 gradient-text">Leaderboard</h1>
          <p className="text-gray-600">See how you rank against others</p>
        </motion.div>

        {/* Top 3 Podium */}
        {profiles.length > 0 ? (
          <div className="flex items-end justify-center gap-3 sm:gap-6 mb-12 px-2">
            {[1, 0, 2].map((actualIndex, displayIndex) => {
              const actualProfile = profiles[actualIndex];
              if (!actualProfile) return null;

              const heights = ['h-52 sm:h-64', 'h-64 sm:h-80', 'h-44 sm:h-56'];
              const avatarSizes = ['w-20 h-20 sm:w-24 sm:h-24', 'w-24 h-24 sm:w-32 sm:h-32', 'w-16 h-16 sm:w-20 sm:h-20'];
              const gradients = [
                'from-gray-400 to-gray-500',
                'from-yellow-400 to-orange-500',
                'from-amber-600 to-orange-600'
              ];

              return (
                <motion.div
                  key={actualProfile.id}
                  initial={{ opacity: 0, y: 80, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: displayIndex * 0.2, type: "spring", stiffness: 150, damping: 15 }}
                  className="flex flex-col items-center"
                >
                  <div className="flex flex-col items-center mb-4">
                    {/* Crown for Top 3 */}
                    {actualIndex <= 2 && (
                      <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="z-10 -mb-3 sm:-mb-4"
                      >
                        <Crown
                          className={`w-8 h-8 ${actualIndex === 0 ? 'text-yellow-400' :
                              actualIndex === 1 ? 'text-slate-400' :
                                'text-amber-600'
                            }`}
                          fill={
                            actualIndex === 0 ? '#FFD700' : // Gold
                              actualIndex === 1 ? '#C0C0C0' : // Silver
                                '#CD7F32'                       // Bronze
                          }
                        />
                      </motion.div>
                    )}

                    {/* Avatar with ring */}
                    <div className="relative inline-block">

                    {/* Avatar Ring */}
                    <motion.div
                      className={`${avatarSizes[displayIndex]} rounded-full p-1 sm:p-1.5 bg-gradient-to-br ${gradients[actualIndex]} shadow-2xl`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {getProfileAvatar(actualProfile) ? (
                        <img
                          src={getProfileAvatar(actualProfile)}
                          alt="Avatar"
                          className="w-full h-full rounded-full object-cover bg-white"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl sm:text-3xl font-bold text-gray-700">
                          {getUserName(actualProfile.user_id)?.charAt(0)}
                        </div>
                      )}
                    </motion.div>

                    {/* Rank badge */}
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${gradients[actualIndex]} flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-xl border-3 border-white`}>
                      {actualIndex + 1}
                    </div>
                  </div>
                </div>

                  {/* Podium */}
                  <div className={`${heights[displayIndex]} w-28 sm:w-40 md:w-48 rounded-t-3xl bg-gradient-to-b ${gradients[actualIndex]} text-white relative overflow-hidden shadow-2xl`}>
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent" />

                    <div className="h-full flex flex-col items-center justify-start pt-4 sm:pt-6 p-3 sm:p-4 relative z-10">
                      <p className="font-bold text-sm sm:text-lg mb-1 text-center truncate w-full px-1">{getUserName(actualProfile.user_id)}</p>
                      <div className="flex items-center gap-1 mb-3 opacity-90">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm font-medium">Lvl {actualProfile.level || 1}</span>
                      </div>

                      <div className="mt-auto bg-white/25 rounded-2xl px-4 sm:px-6 py-2 sm:py-3 backdrop-blur-sm text-center w-full">
                        <p className="text-2xl sm:text-3xl font-black leading-tight">{actualProfile.totalXP || 0}</p>
                        <p className="text-xs sm:text-sm font-medium opacity-90">XP</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 mb-4 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Flame className="w-10 h-10 text-gray-400 grayscale" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">No active users in leaderboard</h3>
            <p className="text-gray-500 text-center max-w-sm">
              Start practicing to build your streak and claim your spot on the leaderboard!
            </p>
          </div>
        )}

        {/* Full Leaderboard */}
        <ClayCard elevated>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              All Rankings
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{profiles.length} players</span>
            </div>
          </div>
          {profiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No active users to display.
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className={`relative flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer ${profile.user_id === currentUser?.id || profile.user_id === currentUser?.email
                      ? 'bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-400 shadow-lg'
                      : 'bg-white/70 hover:bg-white hover:shadow-md'
                    } ${selectedUser === profile.id ? 'z-20 mb-6' : ''}`}
                  onClick={() => setSelectedUser(selectedUser === profile.id ? null : profile.id)}
                >
                  {/* Rank Number */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${index < 3
                      ? `bg-gradient-to-br ${['from-yellow-400 to-orange-400', 'from-gray-300 to-gray-400', 'from-amber-500 to-orange-400'][index]} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="relative flex-shrink-0 -ml-1">
                    {getProfileAvatar(profile) ? (
                      <img
                        src={getProfileAvatar(profile)}
                        alt="Avatar"
                        className="w-11 h-11 rounded-full object-cover bg-gray-100 border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-md">
                        {getUserName(profile.user_id)?.charAt(0)}
                      </div>
                    )}
                    {index < 3 && (
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                        }`}>
                        {index === 0 ? <Crown className="w-2.5 h-2.5 text-white" /> :
                          index === 1 ? <Award className="w-2.5 h-2.5 text-white" /> :
                            <Trophy className="w-2.5 h-2.5 text-white" />}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 relative min-w-0">
                    <div className="font-bold flex items-center gap-2 truncate">
                      <span className="truncate">{getUserName(profile.user_id)}</span>
                      {(profile.user_id === currentUser?.id || profile.user_id === currentUser?.email) && (
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-bold">You</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-purple-500" />
                        Lvl {profile.level || 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {profile.streak || 0} streak
                      </span>
                    </div>

                    {/* User Action Popup */}
                    {selectedUser === profile.id && profile.user_id !== currentUser?.id && profile.user_id !== currentUser?.email && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="absolute left-16 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 ring-1 ring-black/5 p-2 z-[100] min-w-[200px] backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => viewProfile(profile.user_id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 w-full transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Profile
                        </button>
                        {isAlreadyFriend(profile.user_id) ? (
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-gray-400 cursor-default">
                            <UserPlus className="w-4 h-4" />
                            Friend
                          </div>
                        ) : (
                          (() => {
                            const pend = isPendingWith(profile.user_id);
                            if (pend.out) {
                              return (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-gray-400 cursor-default">
                                  <UserPlus className="w-4 h-4" />
                                  Request Sent
                                </div>
                              );
                            }
                            if (pend.inn) {
                              return (
                                <button
                                  onClick={() => navigate(createPageUrl('Profile'))}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-purple-50 text-purple-600 w-full transition-colors"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Respond to Invite
                                </button>
                              );
                            }
                            return (
                              <button
                                onClick={() => handleAddFriend(profile.user_id)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-green-50 text-green-600 w-full transition-colors"
                              >
                                <UserPlus className="w-4 h-4" />
                                Add Friend
                              </button>
                            );
                          })()
                        )}
                      </motion.div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-black gradient-text">{profile.totalXP || 0}</p>
                    <p className="text-xs text-gray-500 font-medium">XP</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ClayCard>
      </div>
    </div>
  );
}