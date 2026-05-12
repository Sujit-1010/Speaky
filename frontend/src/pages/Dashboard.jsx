import { useEffect, useState } from 'react';
import { api } from '@/api/apiClient';

import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Award, Users, MessageSquare, Mic, Swords, Bot } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [streakPopup, setStreakPopup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Show streak popup once per session when user data loads
  useEffect(() => {
    if (!user) return;

    const sessionKey = 'streakPopupShown';
    if (sessionStorage.getItem(sessionKey)) return;

    // Prefer streak data saved at login time (pendingStreakPopup) over
    // /auth/me data, because /auth/me is called on the same day and
    // returns changed: false once the streak has already been updated.
    let streakData = null;
    try {
      const pending = sessionStorage.getItem('pendingStreakPopup');
      if (pending) {
        const parsed = JSON.parse(pending);
        if (parsed && parsed.streakChanged) streakData = parsed;
        sessionStorage.removeItem('pendingStreakPopup');
      }
    } catch { }

    // Fall back to the live user object (handles /auth/me returning changed:true)
    if (!streakData && user.streakChanged) {
      streakData = {
        streakChanged: user.streakChanged,
        streakIncreased: user.streakIncreased,
        streakReset: user.streakReset,
        previousStreak: user.previousStreak ?? 0,
        isFirstLogin: user.isFirstLogin,
        streak: user.streak ?? 0,
      };
    }

    if (!streakData) return;

    sessionStorage.setItem(sessionKey, 'true');

    const streak = streakData.streak || 0;

    if (streakData.isFirstLogin) {
      setStreakPopup({ type: 'start', streak: 1, message: 'Welcome! Your streak has started!', emoji: '🔥', color: 'green' });
    } else if (streakData.streakReset) {
      setStreakPopup({ type: 'reset', streak: 1, previousStreak: streakData.previousStreak, message: 'Streak Reset! Start fresh today!', emoji: '😢', color: 'red' });
    } else if (streakData.streakIncreased) {
      setStreakPopup({ type: 'increase', streak, previousStreak: streakData.previousStreak, message: `${streak} Day Streak!`, emoji: '🔥', color: 'orange' });
    }

    setTimeout(() => setStreakPopup(null), 6000);
  }, [user?.streak, user?.streakChanged]);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();

      setUser(currentUser);
      
      const profiles = await api.entities.UserProfile.filter({ user_id: currentUser.id });

      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        const newProfile = await api.entities.UserProfile.create({
          user_id: currentUser.id,
          xp_points: 0,
          level: 1
        });
        setProfile(newProfile);
      }

      // Fetch all types of sessions for recent activity
      const [gdSessions, extemporeSessions, gdRooms, aiInterviews] = await Promise.all([
        api.entities.GDSession.list('-created_date', 20),
        api.entities.ExtemporeSession.list('-created_date', 20),
        api.entities.GDRoom.filter({ status: 'completed' }, '-created_date', 20),
        api.entities.AIInterview.filter({ status: 'completed' }, '-created_date', 20)
      ]);

      // Filter sessions that belong to current user
      const userGdSessions = gdSessions.filter(s => 
        s.participants?.some(p => p.user_id === currentUser.email || p.user_id === currentUser.id) ||
        s.created_by === currentUser.email
      );
      
      const userExtemporeSessions = extemporeSessions.filter(s => 
        s.user_id === currentUser.email || s.user_id === currentUser.id || s.created_by === currentUser.email
      );
      
      const userGdRooms = gdRooms.filter(s => 
        s.host_id === currentUser.email || 
        s.participants?.some(p => p.user_id === currentUser.email || p.user_id === currentUser.id)
      );
      
      const userAiInterviews = aiInterviews.filter(s => 
        s.host_id === currentUser.email ||
        s.participants?.some(p => p.user_id === currentUser.email)
      );

      // Combine and sort all sessions
      const allSessions = [
        ...userGdSessions.map(s => ({ ...s, type: 'gd', date: s.completed_at || s.created_date })),
        ...userExtemporeSessions.map(s => ({ ...s, type: 'extempore', date: s.created_date })),
        ...userGdRooms.map(s => ({ ...s, type: 'gd_room', date: s.started_at || s.created_date })),
        ...userAiInterviews.map(s => ({ ...s, type: 'interview', date: s.created_date }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

      setRecentSessions(allSessions);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedActivity = showAllActivity 
    ? recentSessions 
    : recentSessions.slice(0, 3);

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <TopNav activePage="Dashboard" user={profile} />
      
      {/* Streak Popup Overlay */}
      {streakPopup && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, animation: 'fadeIn 0.3s ease'
        }} onClick={() => setStreakPopup(null)}>
          <div style={{
            background: streakPopup.color === 'red'
              ? 'linear-gradient(135deg, #ff6b6b, #ee5a24)'
              : streakPopup.color === 'green'
              ? 'linear-gradient(135deg, #00b894, #00cec9)'
              : 'linear-gradient(135deg, #f9ca24, #f0932b)',
            borderRadius: '24px', padding: '40px',
            textAlign: 'center', color: 'white', minWidth: '300px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.4s ease'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '64px', marginBottom: '16px', display: 'inline-block', animation: 'bounceEmoji 0.6s infinite alternate' }}>
              {streakPopup.emoji}
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
              {streakPopup.streak}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              {streakPopup.message}
            </div>
            {streakPopup.type === 'increase' && (
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '8px' }}>+1 from yesterday 🎉</div>
            )}
            {streakPopup.type === 'reset' && (
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '8px' }}>Previous streak: {streakPopup.previousStreak} days</div>
            )}
            <div style={{ marginTop: '20px', fontSize: '13px', opacity: 0.8 }}>Login daily to maintain your streak!</div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border-2 border-gray-100">
            <div className="flex items-start sm:items-center gap-4 mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black mb-1">
                  Welcome back! 👋
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">Ready to practice and improve your skills?</p>
              </div>
            </div>
            
            {/* Stats pills: skeleton while loading, real data after */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {isLoading ? (
                // Skeleton pills
                <>
                  <div className="px-6 py-3 rounded-full bg-gray-100 animate-pulse w-28 h-10" />
                  <div className="px-6 py-3 rounded-full bg-gray-100 animate-pulse w-24 h-10" />
                  <div className="px-6 py-3 rounded-full bg-gray-100 animate-pulse w-32 h-10" />
                </>
              ) : (
                <>
                  <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-white shadow-md border-2 border-gray-100 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="font-bold text-gray-700 text-sm sm:text-base">Level {profile?.level || 1}</span>
                  </div>
                  <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-yellow-50 to-orange-50 shadow-md border-2 border-yellow-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-gray-700 text-sm sm:text-base">{profile?.totalXP || user?.totalXP || 0} XP</span>
                  </div>
                  <div className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-md border-2 flex items-center gap-2 ${
                    (user?.streak || 0) > 0
                      ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <span className={`text-base sm:text-lg ${(user?.streak || 0) > 0 ? '' : 'opacity-50 grayscale'}`}>🔥</span>
                    <span className={`font-bold text-sm sm:text-base ${(user?.streak || 0) > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {user?.streak || 0} Day Streak
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Link to={createPageUrl('GDArena')}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border-2 border-gray-100 hover:border-cyan-200 hover:shadow-xl transition-all h-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="font-black text-base sm:text-lg mb-1 sm:mb-2">Quick Start GD</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-snug">Jump into a random group discussion</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl('ExtemporePractice')}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border-2 border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all h-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="font-black text-base sm:text-lg mb-1 sm:mb-2">Practice Solo</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-snug">Improve with AI-powered practice</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl('AIInterviewHub')}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border-2 border-gray-100 hover:border-green-200 hover:shadow-xl transition-all h-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="font-black text-base sm:text-lg mb-1 sm:mb-2">AI Interview</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-snug">Practice with AI-powered interviews</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl('ExtemporePractice')}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border-2 border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all h-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="font-black text-base sm:text-lg mb-1 sm:mb-2">Extempore</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-snug">Speak on any topic, improve fluency</p>
            </motion.div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border-2 border-gray-100">
          <h3 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6">Recent Activity</h3>
          {isLoading ? (
            // Skeleton activity rows
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl flex items-center gap-4 bg-gray-50">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-40" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                  <div className="w-16 h-3 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : recentSessions.length > 0 ? (
            <div className="space-y-3">
              {displayedActivity.map((session) => {
                const typeConfig = {
                  gd: { icon: MessageSquare, color: 'from-cyan-400 to-blue-500', label: 'Group Discussion' },
                  gd_room: { icon: Users, color: 'from-cyan-400 to-blue-500', label: 'GD Room' },
                  extempore: { icon: Mic, color: 'from-purple-400 to-pink-500', label: 'Extempore' },
                  debate: { icon: Swords, color: 'from-red-400 to-orange-500', label: 'Debate' },
                  interview: { icon: Bot, color: 'from-green-400 to-teal-500', label: 'AI Interview' }
                };
                const config = typeConfig[session.type] || typeConfig.gd;
                const Icon = config.icon;

                return (
                  <div key={session.id} className="p-4 bg-white/50 rounded-2xl flex items-center gap-4 hover:bg-white/70 transition-colors">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{session.topic || config.label}</p>
                      <p className="text-sm text-gray-600">
                        {session.type === 'extempore' 
                          ? `Score: ${session.fluency_score || 0}%` 
                          : session.participants?.length 
                            ? `${session.participants.length} participants` 
                            : config.label}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(session.date).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
              
              {recentSessions.length > 3 && (
                <button
                  onClick={() => setShowAllActivity(!showAllActivity)}
                  className="w-full mt-4 flex items-center justify-center py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {showAllActivity ? (
                    <>
                      Show Less
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      See More ({recentSessions.length - 3} more)
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No recent activity yet</p>
              <p className="text-sm text-gray-400">Start practicing to see your progress here!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}