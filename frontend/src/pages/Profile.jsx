import { api } from '@/api/apiClient';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Camera, Crown, LogOut, Mail, TrendingUp, Users, UserPlus, Search, X, MessageCircle, Check } from 'lucide-react';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/navigation/TopNav';
import AvatarSelector from '../components/shared/AvatarSelector';
import ClayCard from '../components/shared/ClayCard';
import XPBadge from '../components/shared/XPBadge';
import { createPageUrl } from '../utils';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendSearchResult, setFriendSearchResult] = useState(null);
  const [friendBusy, setFriendBusy] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [friendTab, setFriendTab] = useState('friends'); // friends | invitations | sent
  const [sentRequests, setSentRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(currentUser);

      let profiles = await api.entities.UserProfile.filter({ user_id: currentUser.email });
      if (profiles.length === 0) {
        profiles = await api.entities.UserProfile.filter({ user_id: currentUser.id });
      }
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        const created = await api.entities.UserProfile.create({ user_id: currentUser.email || currentUser.id, xp_points: 0, level: 1, friends: [] });
        setProfile(created);
      }

      // Load all users for friend name mapping and global search
      const users = await api.entities.User.list();
      setAllUsers(users);

      // Load friend requests
      const incoming = await api.entities.FriendRequest.filter({ to_user_id: currentUser.email, status: 'pending' });
      const sent = await api.entities.FriendRequest.filter({ from_user_id: currentUser.email, status: 'pending' });
      setIncomingRequests(incoming);
      setSentRequests(sent);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
  };

  const handleAvatarSelect = async (avatarUrl) => {
    if (!profile) return;
    await api.entities.UserProfile.update(profile.id, { avatar: avatarUrl });
    setProfile({ ...profile, avatar: avatarUrl });
    setShowAvatarSelector(false);
  };

  const searchFriend = async () => {
    if (!friendSearch.trim()) return;
    setFriendBusy(true);
    try {
      const q = friendSearch.trim().toLowerCase();
      let users = allUsers;
      if (!users || users.length === 0) {
        users = await api.entities.User.list();
        setAllUsers(users);
      }
      const results = (users || []).filter(u => {
        const email = (u.email || '').toLowerCase();
        const name = (u.full_name || '').toLowerCase();
        return u.id === friendSearch.trim() || email === q || email.includes(q) || name.includes(q);
      });
      setFriendSearchResult(results[0] || null);
    } finally {
      setFriendBusy(false);
    }
  };

  const addFriend = async () => {
    if (!profile || !friendSearchResult || !user) return;
    const target = friendSearchResult;
    const targetEmail = target.email || target.id;
    // Already a friend?
    const current = profile.friends || [];
    if (current.includes(targetEmail) || current.includes(target.id)) return;
    // Existing pending?
    const exists = await api.entities.FriendRequest.filter({ from_user_id: user.email, to_user_id: targetEmail, status: 'pending' });
    if (exists.length > 0) {
      setFriendSearch('');
      setFriendSearchResult(null);
      return;
    }
    // Create friend request
    const fr = await api.entities.FriendRequest.create({
      from_user_id: user.email,
      from_user_name: user.full_name,
      to_user_id: targetEmail,
      status: 'pending'
    });
    await api.entities.Notification.create({
      user_id: targetEmail,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${user.full_name} sent you a friend request`,
      from_user_id: user.email,
      is_read: false
    });
    setSentRequests([fr, ...sentRequests]);
    setFriendSearch('');
    setFriendSearchResult(null);
    setFriendTab('sent');
  };

  const removeFriend = async (fid) => {
    if (!profile) return;
    const current = profile.friends || [];
    const updated = current.filter(f => f !== fid);
    await api.entities.UserProfile.update(profile.id, { friends: updated });
    setProfile({ ...profile, friends: updated });
  };

  const acceptInvite = async (request) => {
    // Single server-side call handles status, both friends lists, notification, socket, and push.
    await api.friendRequests.accept(request.id);
    setIncomingRequests(incomingRequests.filter(r => r.id !== request.id));
    setProfile({ ...profile, friends: Array.from(new Set([...(profile.friends || []), request.from_user_id])) });
  };

  const declineInvite = async (request) => {
    await api.friendRequests.reject(request.id);
    setIncomingRequests(incomingRequests.filter(r => r.id !== request.id));
  };

  const cancelRequest = async (request) => {
    try { await api.entities.FriendRequest.delete(request.id); } catch {}
    setSentRequests(sentRequests.filter(r => r.id !== request.id));
  };


  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Profile" user={profile} />
      
      <div className="max-w-5xl mx-auto px-6 pt-28">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <ClayCard className="bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative group">
                {profile?.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt="Avatar" 
                    className="w-32 h-32 rounded-full object-cover shadow-2xl bg-gray-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-5xl shadow-2xl">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
                <button
                  onClick={() => setShowAvatarSelector(true)}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Camera className="w-8 h-8 text-white" />
                </button>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold mb-2">{user?.full_name}</h1>
                <div className="flex flex-col md:flex-row items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{user?.email}</span>
                  </div>
                  {user?.role === 'admin' && (
                    <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-sm font-bold flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      Admin
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <XPBadge xp={user?.totalXP || profile?.xp_points || 0} level={user?.level || profile?.level || 1} />
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-2 shadow-lg transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </ClayCard>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ClayCard gradient>
            <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
            <p className="text-sm text-gray-600">Streak</p>
            <p className="text-3xl font-bold gradient-text">{profile?.streak || user?.streak || 0}</p>
          </ClayCard>

          <ClayCard gradient>
            <Users className="w-8 h-8 text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">GD Sessions</p>
            <p className="text-3xl font-bold gradient-text">{profile?.total_gd_sessions || 0}</p>
          </ClayCard>

          <ClayCard gradient>
            <Award className="w-8 h-8 text-orange-600 mb-2" />
            <p className="text-sm text-gray-600">Extempore</p>
            <p className="text-3xl font-bold gradient-text">{profile?.total_extempore_sessions || 0}</p>
          </ClayCard>

          <ClayCard gradient>
            <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-sm text-gray-600">Avg Rating</p>
            <p className="text-3xl font-bold gradient-text">
              {profile?.average_rating ? profile.average_rating.toFixed(1) : 'N/A'}
            </p>
          </ClayCard>
        </div>

        {/* Badges */}
        {profile?.badges && profile.badges.length > 0 && (
          <ClayCard className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              Badges Earned
            </h2>
            <div className="flex flex-wrap gap-3">
              {profile.badges.map((badge, index) => (
                <div key={index} className="clay-card p-4 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-sm font-semibold">{badge}</p>
                </div>
              ))}
            </div>
          </ClayCard>
        )}

        <ClayCard className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Friends Management</h2>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button onClick={() => setFriendTab('friends')} className={`px-4 py-2 rounded-full font-bold ${friendTab==='friends' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Friends</button>
            <button onClick={() => setFriendTab('invitations')} className={`px-4 py-2 rounded-full font-bold ${friendTab==='invitations' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Invitations {incomingRequests.length > 0 ? `(${incomingRequests.length})` : ''}</button>
            <button onClick={() => setFriendTab('sent')} className={`px-4 py-2 rounded-full font-bold ${friendTab==='sent' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Sent {sentRequests.length > 0 ? `(${sentRequests.length})` : ''}</button>
          </div>

          {/* Search and send request */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-500" />
              <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Search by name or email" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <button onClick={searchFriend} disabled={friendBusy || !friendSearch.trim()} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold">
              Search
            </button>
          </div>
          {friendSearchResult && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 border mb-4">
              <div>
                <p className="font-semibold">{friendSearchResult.full_name || 'User'}</p>
                <p className="text-sm text-gray-500">{friendSearchResult.email || friendSearchResult.id}</p>
              </div>
              <button onClick={addFriend} className="px-3 py-2 rounded-xl bg-green-500 text-white font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Send Request
              </button>
            </div>
          )}

          {/* Tab content */}
          {friendTab === 'friends' && (
            <div>
              <h3 className="font-bold mb-2">Your Friends</h3>
              {(profile?.friends && profile.friends.length > 0) ? (
                <div className="space-y-2">
                  {profile.friends.map(fid => {
                    const friendUser = (allUsers || []).find(u => u.email === fid || u.id === fid);
                    const displayName = friendUser?.full_name || 'User';
                    const displayEmail = friendUser?.email || fid;
                    return (
                      <div key={fid} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border">
                        <div className="flex items-center gap-3">
                          <Link to={createPageUrl('Chat', { friendId: fid })} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Message">
                            <MessageCircle className="w-5 h-5 text-gray-700" />
                          </Link>
                          <div>
                            <p className="font-semibold leading-tight">{displayName}</p>
                            <p className="text-xs text-gray-500">{displayEmail}</p>
                          </div>
                        </div>
                        <button onClick={() => removeFriend(fid)} className="px-3 py-2 rounded-xl bg-red-500 text-white font-bold flex items-center gap-2">
                          <X className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No friends yet</p>
              )}
            </div>
          )}

          {friendTab === 'invitations' && (
            <div>
              <h3 className="font-bold mb-2">Invitations</h3>
              {incomingRequests.length > 0 ? (
                <div className="space-y-2">
                  {incomingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border">
                      <div>
                        <p className="font-semibold">{req.from_user_name || req.from_user_id}</p>
                        <p className="text-xs text-gray-500">{req.from_user_id}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptInvite(req)} className="px-3 py-2 rounded-xl bg-green-500 text-white font-bold flex items-center gap-2">
                          <Check className="w-4 h-4" /> Accept
                        </button>
                        <button onClick={() => declineInvite(req)} className="px-3 py-2 rounded-xl bg-gray-200 text-gray-700 font-bold">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No invitations</p>
              )}
            </div>
          )}

          {friendTab === 'sent' && (
            <div>
              <h3 className="font-bold mb-2">Sent Requests</h3>
              {sentRequests.length > 0 ? (
                <div className="space-y-2">
                  {sentRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border">
                      <div>
                        <p className="font-semibold">To: {req.to_user_id}</p>
                        <p className="text-xs text-gray-500">Status: {req.status}</p>
                      </div>
                      {req.status === 'pending' && (
                        <button onClick={() => cancelRequest(req)} className="px-3 py-2 rounded-xl bg-red-500 text-white font-bold">Cancel</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No sent requests</p>
              )}
            </div>
          )}
        </ClayCard>


      </div>

      <AnimatePresence>
        {showAvatarSelector && (
          <AvatarSelector
            selectedAvatar={profile?.avatar}
            onSelect={handleAvatarSelect}
            onClose={() => setShowAvatarSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}