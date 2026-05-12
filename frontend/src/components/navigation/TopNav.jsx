import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { useSocket } from '@/lib/SocketContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, LogOut, Menu, MessageCircle, Search, User, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import MobileSidebar from './MobileSidebar';
import XPBadge from '../shared/XPBadge';
const speakupLogo = new URL('../../assets/logo-removebg-preview.png', import.meta.url).href;

export default function TopNav({ activePage = 'Dashboard', user = null }) {
  const { user: authUser, refreshUser, logout, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [currentUser, setCurrentUser] = useState(authUser); // Init from context — prevents flicker
  const [myProfile, setMyProfile] = useState(null);
  const socket = useSocket();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadByFriend, setUnreadByFriend] = useState({});

  // Keep currentUser in sync with global auth state (handles logout, session expiry)
  useEffect(() => {
    if (authUser) {
      setCurrentUser(prev => prev ?? authUser); // Only update if not already set by loadNotifications
    } else if (!isLoadingAuth) {
      setCurrentUser(null); // Logged out
    }
  }, [authUser, isLoadingAuth]);

  const navItems = currentUser
    ? ['Dashboard', 'Explore', 'Progress', 'Leaderboard']
    : ['Home', 'About', 'Contact'];

  useEffect(() => {
    loadNotifications();
    refreshUser?.();
  }, []);

  useEffect(() => {
    setShowMobileSidebar(false);
     
  }, [location?.pathname]);

  const upsertNotification = (notif) => {
    if (!notif) return;
    const id = notif.id || notif._id;
    if (!id) return;

    setNotifications((prev) => {
      const existed = (prev || []).some((n) => n.id === id);
      const next = [{ ...notif, id }, ...(prev || []).filter((n) => n.id !== id)].slice(0, 50);
      if (!existed && !notif.is_read) {
        setUnreadCount((c) => c + 1);
      }
      return next;
    });
  };

  const markNotificationReadLocal = (id) => {
    if (!id) return;
    setNotifications((prev) => {
      let didChange = false;
      const next = (prev || []).map((n) => {
        if ((n.id || n._id) !== id) return n;
        if (n.is_read) return n;
        didChange = true;
        return { ...n, is_read: true };
      });
      if (didChange) setUnreadCount((c) => Math.max(0, c - 1));
      return next;
    });
  };

  const removeNotificationsLocal = (predicate) => {
    setNotifications((prev) => {
      const kept = (prev || []).filter((n) => !predicate(n));
      const nextUnread = kept.filter((n) => !n.is_read).length;
      setUnreadCount(nextUnread);
      return kept;
    });
  };

  const upsertFriendRequest = (req) => {
    if (!req) return;
    const id = req.id || req._id;
    if (!id) return;
    if (req.status && req.status !== 'pending') return;

    setFriendRequests((prev) => {
      const next = [{ ...req, id }, ...(prev || []).filter((r) => r.id !== id)];
      return next;
    });
  };

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleFriendRequestNotification = (payload) => {
      if (!payload || payload.to_user_id !== currentUser.email) return;
      if (payload.friend_request) upsertFriendRequest(payload.friend_request);
      if (payload.notification) upsertNotification(payload.notification);
    };
    const handleRoomInviteNotification = (payload) => {
      if (!payload || payload.to_user_id !== currentUser.email) return;
      if (payload.notification) upsertNotification(payload.notification);
    };
    const handleChatMessageNotification = (payload) => {
      if (!payload || payload.to_user_id !== currentUser.email) return;
      setUnreadChatCount((c) => c + 1);
      setUnreadByFriend((m) => {
        const key = payload.from_user_id;
        return { ...m, [key]: (m[key] || 0) + 1 };
      });
    };

    const handleNotificationCreated = (payload) => {
      const n = payload?.notification;
      if (!n || n.user_id !== currentUser.email) return;
      upsertNotification(n);
    };
    const handleMessageRead = (payload = {}) => {
      if (payload.to_user_id !== currentUser.email) return;
      setUnreadChatCount((c) => Math.max(0, c - 1));
      setUnreadByFriend((m) => {
        const key = payload.from_user_id;
        const next = Math.max(0, (m[key] || 0) - 1);
        return { ...m, [key]: next };
      });
    };

    socket.on('friend_request_notification', handleFriendRequestNotification);
    socket.on('room_invite_notification', handleRoomInviteNotification);
    socket.on('chat_message_notification', handleChatMessageNotification);
    socket.on('notification_created', handleNotificationCreated);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('friend_request_notification', handleFriendRequestNotification);
      socket.off('room_invite_notification', handleRoomInviteNotification);
      socket.off('chat_message_notification', handleChatMessageNotification);
      socket.off('notification_created', handleNotificationCreated);
      socket.off('message_read', handleMessageRead);
    };
  }, [socket, currentUser]);

  const loadNotifications = async () => {
    try {
      const me = await api.auth.me();

      if (!me) {
        setCurrentUser(null);
        setFriendRequests([]);
        setNotifications([]);
        setFriends([]);
        return;
      }

      setCurrentUser(me);

      // Get pending friend requests
      const pendingRequests = await api.entities.FriendRequest.filter({
        to_user_id: me.email,
        status: 'pending'
      });
      setFriendRequests(pendingRequests);

      // Get notifications (all, newest first)
      const notifs = await api.entities.Notification.filter({ user_id: me.email }, '-created_date', 50);
      setNotifications(notifs);
      setUnreadCount((notifs || []).filter(n => !n.is_read).length);

      const chatMsgs = await api.entities.ChatMessage.list('-created_date', 200);
      const unreadMap = {};
      for (const m of (chatMsgs || [])) {
        if (m.to_user_id === me.email && !m.is_read) {
          unreadMap[m.from_user_id] = (unreadMap[m.from_user_id] || 0) + 1;
        }
      }
      setUnreadByFriend(unreadMap);
      setUnreadChatCount(Object.values(unreadMap).reduce((a, b) => a + b, 0));

      // Get friends for chat - check both email and id
      let profileData = await api.entities.UserProfile.filter({ user_id: me.email });
      if (profileData.length === 0) {
        profileData = await api.entities.UserProfile.filter({ user_id: me.id });
      }

      if (profileData.length > 0) {
        setMyProfile(profileData[0]);
        if (profileData[0].friends && profileData[0].friends.length > 0) {
          const allUsers = await api.entities.User.list();
          const friendList = allUsers.filter(u =>
            profileData[0].friends.includes(u.email) || profileData[0].friends.includes(u.id)
          );
          setFriends(friendList);
        } else {
          setFriends([]);
        }
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const acceptFriendRequest = async (request) => {
    // Update request status
    await api.entities.FriendRequest.update(request.id, { status: 'accepted' });

    // Add to both users' friends lists
    let myProfiles = await api.entities.UserProfile.filter({ user_id: currentUser.email });
    if (myProfiles.length === 0) {
      myProfiles = await api.entities.UserProfile.filter({ user_id: currentUser.id });
    }
    let theirProfiles = await api.entities.UserProfile.filter({ user_id: request.from_user_id });
    if (theirProfiles.length === 0) {
      // create their profile if missing
      const created = await api.entities.UserProfile.create({ user_id: request.from_user_id, xp_points: 0, level: 1, friends: [] });
      theirProfiles = [created];
    }
    if (myProfiles.length === 0) {
      const createdMine = await api.entities.UserProfile.create({ user_id: currentUser.email, xp_points: 0, level: 1, friends: [] });
      myProfiles = [createdMine];
    }

    const myFriends = Array.from(new Set([...(myProfiles[0].friends || []), request.from_user_id]));
    await api.entities.UserProfile.update(myProfiles[0].id, { friends: myFriends });

    const theirFriends = Array.from(new Set([...(theirProfiles[0].friends || []), currentUser.email]));
    await api.entities.UserProfile.update(theirProfiles[0].id, { friends: theirFriends });

    // Send notification to the requester
    await api.entities.Notification.create({
      user_id: request.from_user_id,
      type: 'friend_request',
      title: 'Friend Request Accepted',
      message: `${currentUser.full_name} accepted your friend request`,
      from_user_id: currentUser.email,
      is_read: false
    });

    setFriendRequests((prev) => (prev || []).filter((r) => r.id !== request.id));
  };

  const rejectFriendRequest = async (request) => {
    await api.entities.FriendRequest.update(request.id, { status: 'rejected' });
    setFriendRequests((prev) => (prev || []).filter((r) => r.id !== request.id));
  };

  const openChat = (friendId) => {
    navigate(createPageUrl('Chat', { friendId }));
    setShowChat(false);
  };

  const toggleNotifications = async () => {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);
    setShowChat(false);
    setShowProfileMenu(false);
  };

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-white border-b-2 border-gray-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 flex-wrap gap-y-2">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowMobileSidebar(true);
                setShowNotifications(false);
                setShowChat(false);
                setShowProfileMenu(false);
              }}
              className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-all md:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-gray-800" />
            </button>
            <img
              src={speakupLogo}
              alt="SpeakUp Logo"
              className="h-16 sm:h-20 w-auto object-contain"
              draggable={false}
            />
            <Link to="/dashboard">
              <span className="text-xl sm:text-2xl font-black text-gray-900">
                SpeakUp
              </span>
            </Link>
          </div>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-3">
            {navItems.map((item) => (
              <Link
                key={item}
                to={item === 'Home' ? '/' : createPageUrl(item)}
                className={`px-6 py-2.5 rounded-full font-bold transition-all ${(item === 'Home' ? activePage === 'Landing' : activePage === item)
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-xl'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block">
                <XPBadge xp={authUser?.totalXP || 0} level={authUser?.level || 1} />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="p-2.5 sm:p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-all relative"
                >
                  <Bell className="w-5 h-5 text-gray-700" />
                  {(friendRequests.length > 0 || unreadCount > 0) && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold pointer-events-none">
                      {friendRequests.length + unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Notifications Sidebar Portal */}
              {createPortal(
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        key="notif-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 z-[998]"
                        onClick={() => setShowNotifications(false)}
                      />

                      {/* Sidebar */}
                      <motion.div
                        key="notif-sidebar"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white shadow-2xl z-[999] flex flex-col"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                          <h2 className="text-xl font-black text-gray-900">Notifications</h2>
                          <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                              <button
                                onClick={async () => {
                                  try {
                                    const unread = await api.entities.Notification.filter({ user_id: currentUser.email, is_read: false });
                                    await Promise.all(unread.map(n => api.entities.Notification.update(n.id, { is_read: true })));
                                    setNotifications((prev) => (prev || []).map((n) => ({ ...n, is_read: true })));
                                    setUnreadCount(0);
                                  } catch {}
                                }}
                                className="text-xs font-bold text-blue-600 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 transition-all"
                              >
                                Mark all read
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                try {
                                  const me = await api.auth.me();
                                  if (!me) return;
                                  const all = await api.entities.Notification.filter({ user_id: me.email });
                                  await Promise.all((all || []).map(n => api.entities.Notification.delete(n.id)));
                                  setNotifications([]);
                                  setUnreadCount(0);
                                } catch {}
                              }}
                              className="text-xs font-bold text-red-500 hover:underline px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
                            >
                              Clear all
                            </button>
                            <button
                              onClick={() => setShowNotifications(false)}
                              className="p-2 rounded-full hover:bg-gray-100 transition-all"
                              aria-label="Close notifications"
                            >
                              <X className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

                          {/* Friend Requests */}
                          {friendRequests.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Friend Requests</p>
                              <div className="space-y-2">
                                {friendRequests.map((request) => (
                                  <div key={request.id} className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                                        {request.from_user_name?.charAt(0)?.toUpperCase() || 'U'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate">{request.from_user_name}</p>
                                        <p className="text-xs text-gray-500">Wants to be your friend</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                      <button
                                        onClick={() => acceptFriendRequest(request)}
                                        className="flex-1 py-2 rounded-lg bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-1 hover:bg-green-600 transition-all"
                                      >
                                        <Check className="w-4 h-4" />
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => rejectFriendRequest(request)}
                                        className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center gap-1 hover:bg-gray-300 transition-all"
                                      >
                                        <X className="w-4 h-4" />
                                        Decline
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Other Notifications */}
                          {notifications.length > 0 ? (
                            <div>
                              {(friendRequests.length > 0) && (
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Recent</p>
                              )}
                              <div className="space-y-2">
                                {notifications.map((notif) => (
                                  <div
                                    key={notif.id}
                                    className={`p-3 rounded-xl border transition-all ${notif.is_read ? 'bg-gray-50 border-transparent' : 'bg-blue-50 border-blue-100'}`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${notif.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{notif.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-2 pl-4">
                                      {notif.type === 'room_invite' && notif.room_id && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              const stillValid = await api.entities.Notification.filter({ id: notif.id });
                                              if (!stillValid || stillValid.length === 0) {
                                                removeNotificationsLocal((n) => (n.id || n._id) === notif.id);
                                                return;
                                              }
                                              const me = await api.auth.me();
                                              const rooms = await api.entities.GDRoom.filter({ id: notif.room_id });
                                              if (rooms.length === 0) return;
                                              const room = rooms[0];
                                              const isAlready = (room.participants || []).some(p => p.user_id === me.email || p.user_id === me.id);
                                              if (!isAlready) {
                                                const updated = { participants: [ ...(room.participants || []), { user_id: me.email, name: me.full_name, joined_at: new Date().toISOString() } ] };
                                                await api.entities.GDRoom.update(room.id, updated);
                                              }
                                              const allInvites = await api.entities.Notification.filter({ user_id: me.email, type: 'room_invite', room_id: room.id });
                                              await Promise.all((allInvites || []).map(n => api.entities.Notification.delete(n.id)));
                                              removeNotificationsLocal((n) => n.type === 'room_invite' && (n.room_id === room.id || n.room_id === notif.room_id));
                                              if (room.status === 'lobby') {
                                                navigate(createPageUrl(`Lobby?roomId=${room.id}`));
                                              } else {
                                                navigate(createPageUrl(`Call?roomId=${room.id}`));
                                              }
                                            } catch (e) {}
                                          }}
                                          className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-all"
                                        >
                                          Accept & Join
                                        </button>
                                      )}
                                      {!notif.is_read && (
                                        <button
                                          onClick={async () => { try { await api.entities.Notification.update(notif.id, { is_read: true }); markNotificationReadLocal(notif.id); } catch {} }}
                                          className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 transition-all"
                                        >
                                          Mark read
                                        </button>
                                      )}
                                      {notif.is_read && (
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                          <Check className="w-3 h-3" />
                                          Read
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : friendRequests.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                              <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
                              <p className="text-sm font-medium">No new notifications</p>
                              <p className="text-xs mt-1">You're all caught up!</p>
                            </div>
                          ) : null}

                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>,
                document.body
              )}

              {/* Chat */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowChat(!showChat);
                    setChatSearch('');
                    setShowNotifications(false);
                    setShowProfileMenu(false);
                  }}
                  className="p-2.5 sm:p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  <MessageCircle className="w-5 h-5 text-gray-700" />
                </button>
                {unreadChatCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold pointer-events-none">
                    {unreadChatCount}
                  </span>
                )}
              </div>

              {/* Chat Sidebar Portal */}
              {createPortal(
                <AnimatePresence>
                  {showChat && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        key="chat-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 z-[998]"
                        onClick={() => { setShowChat(false); setChatSearch(''); }}
                      />

                      {/* Sidebar */}
                      <motion.div
                        key="chat-sidebar"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white shadow-2xl z-[999] flex flex-col"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                          <h2 className="text-xl font-black text-gray-900">Messages</h2>
                          <button
                            onClick={() => { setShowChat(false); setChatSearch(''); }}
                            className="p-2 rounded-full hover:bg-gray-100 transition-all"
                            aria-label="Close messages"
                          >
                            <X className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>

                        {/* Search bar */}
                        <div className="px-5 py-3">
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
                            <Search className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                              type="text"
                              value={chatSearch}
                              onChange={(e) => setChatSearch(e.target.value)}
                              placeholder="Search conversations..."
                              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                            />
                          </div>
                        </div>

                        {/* Friends list */}
                        <div className="flex-1 overflow-y-auto px-3 pb-4">
                          {friends.length > 0 ? (() => {
                            const filtered = friends.filter(f =>
                              !chatSearch.trim() ||
                              f.full_name?.toLowerCase().includes(chatSearch.trim().toLowerCase())
                            );
                            return filtered.length > 0 ? (
                              <div className="space-y-1">
                                {filtered.map((friend) => (
                                  <button
                                    key={friend.id}
                                    onClick={() => openChat(friend.email)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all group"
                                  >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-base shadow">
                                        {friend.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                      </div>
                                      {/* Online dot (static green; replace with real presence if available) */}
                                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 text-left min-w-0">
                                      <p className="font-bold text-gray-900 text-sm truncate">{friend.full_name}</p>
                                      <p className="text-xs text-gray-500">Click to chat</p>
                                    </div>

                                    {/* Unread badge */}
                                    {(unreadByFriend[friend.email] || unreadByFriend[friend.id]) > 0 && (
                                      <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                                        {unreadByFriend[friend.email] || unreadByFriend[friend.id]}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-16 text-gray-400">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No results for "{chatSearch}"</p>
                              </div>
                            );
                          })() : (
                            <div className="text-center py-16 text-gray-400">
                              <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
                              <p className="text-sm font-medium">No friends yet</p>
                              <p className="text-xs mt-1">Add friends from the leaderboard!</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>,
                document.body
              )}

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu);
                    setShowNotifications(false);
                    setShowChat(false);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                >
                  {myProfile?.avatar ? (
                    <img src={myProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl p-2 shadow-2xl border border-gray-100 z-50 transform-gpu"
                    >
                      <Link
                        to={createPageUrl('Profile')}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <User className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">Profile</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">

              <Link
                to={createPageUrl('Login')}
                className="px-4 py-2.5 rounded-full font-bold text-gray-700 hover:bg-gray-100"
              >
                Log in
              </Link>
              <Link
                to={createPageUrl('Register')}
                className="px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      <MobileSidebar
        open={showMobileSidebar}
        onClose={() => setShowMobileSidebar(false)}
        activePage={activePage}
        currentUser={currentUser}
        myProfile={myProfile}
        profile={user}
        notifCount={(friendRequests?.length || 0) + (unreadCount || 0)}
        chatCount={unreadChatCount || 0}
        onLogout={() => {
          setShowProfileMenu(false);
          logout();
        }}
        onOpenNotifications={() => {
          setShowNotifications(true);
          setShowChat(false);
          setShowProfileMenu(false);
        }}
        onOpenChat={() => {
          setShowChat(true);
          setShowNotifications(false);
          setShowProfileMenu(false);
        }}
      />
    </nav>
  );
}