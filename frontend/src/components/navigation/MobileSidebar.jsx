import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Compass, LayoutDashboard, LogOut, MessageCircle, Trophy, TrendingUp, User, X } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function MobileSidebar({
  open,
  onClose,
  activePage,
  currentUser,
  myProfile,
  profile,
  notifCount = 0,
  chatCount = 0,
  onLogout,
  onOpenNotifications,
  onOpenChat,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const username = currentUser?.full_name || currentUser?.email || 'User';
  const level = profile?.level || 1;
  const xp = profile?.xp_points || 0;
  const avatarUrl = myProfile?.avatar || null;

  const nav = useMemo(() => {
    return [
      { label: 'Dashboard', icon: LayoutDashboard, to: createPageUrl('Dashboard') },
      { label: 'Explore', icon: Compass, to: createPageUrl('Explore') },
      { label: 'Progress', icon: TrendingUp, to: createPageUrl('Progress') },
      { label: 'Leaderboard', icon: Trophy, to: createPageUrl('Leaderboard') },
    ];
  }, []);

  const isActive = (label, to) => {
    if (activePage) return activePage === label;
    if (!to) return false;
    const path = String(to).split('?')[0];
    return location?.pathname === path;
  };

  const go = (to) => {
    if (!to) return;
    navigate(to);
    onClose && onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onClose && onClose()}
        >
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />

          <motion.aside
            className="absolute left-0 top-0 h-full w-[82%] max-w-[340px] bg-white shadow-2xl flex flex-col"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 text-lg truncate">{username}</div>
                    <div className="text-sm text-gray-600 font-bold">
                      <span className="text-purple-600">Level {level}</span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span>{xp} XP</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onClose && onClose()}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onOpenNotifications && onOpenNotifications();
                    onClose && onClose();
                  }}
                  className="relative flex items-center justify-center gap-2 py-3 rounded-2xl bg-purple-50 border border-purple-100"
                >
                  <Bell className="w-5 h-5 text-purple-600" />
                  {notifCount > 0 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-black">
                      {notifCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    onOpenChat && onOpenChat();
                    onClose && onClose();
                  }}
                  className="relative flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-50 border border-blue-100"
                >
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  {chatCount > 0 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-black">
                      {chatCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="px-3 py-4 flex-1 overflow-y-auto">
              <div className="space-y-2">
                {nav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.label, item.to);
                  return (
                    <button
                      key={item.label}
                      onClick={() => go(item.to)}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all ${
                        active
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-700'}`} />
                      <span className="font-black text-base">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto px-3 pb-6">
              <div className="h-px bg-gray-100 mb-3" />

              <button
                onClick={() => go(createPageUrl('Profile'))}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left text-gray-700 hover:bg-gray-50 transition-all"
              >
                <User className="w-5 h-5 text-gray-700" />
                <span className="font-black text-base">My Profile</span>
              </button>

              <button
                onClick={() => {
                  onLogout && onLogout();
                  onClose && onClose();
                }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-black text-base">Logout</span>
              </button>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
