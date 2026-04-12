import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { Award, BarChart3, Bot, Calendar, Clock, Flame, MessageSquare, Mic, Target, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '../utils';

const CardAny = /** @type {any} */ (Card);
const CardHeaderAny = /** @type {any} */ (CardHeader);
const CardContentAny = /** @type {any} */ (CardContent);
const ButtonAny = /** @type {any} */ (Button);
const BadgeAny = /** @type {any} */ (Badge);
const SkeletonAny = /** @type {any} */ (Skeleton);

export default function Progress() {
  const { refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(3);
  const [stats, setStats] = useState({
    totalGDSessions: 0,
    totalExtemporeSessions: 0,
    totalInterviews: 0,
    avgGDScore: 0,
    avgExtemporeScore: 0,
    thisWeekSessions: 0,
    thisMonthSessions: 0
  });
  const [loading, setLoading] = useState(true);

  const userId = user?.email || user?.id || null;

  const analysisHistoryQuery = useQuery({
    queryKey: ['analysisHistory', userId],
    queryFn: () => api.analysis.getHistory(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  const interviewHistoryQuery = useQuery({
    queryKey: ['interviewHistory', userId],
    queryFn: () => api.interviewAnalysis.getHistory(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  const analysisHistory = Array.isArray(analysisHistoryQuery.data) ? analysisHistoryQuery.data : [];
  const interviewHistory = Array.isArray(interviewHistoryQuery.data) ? interviewHistoryQuery.data : [];

  // Combined and sorted history
  const combinedHistory = [
    ...analysisHistory.map(s => ({ ...s, _type: 'gd' })),
    ...interviewHistory.map(s => ({ ...s, _type: 'interview' }))
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const formatHistoryDateTime = (d) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const overallCircleClass = (v) => {
    const s = Number(v) || 0;
    if (s > 60) return 'bg-green-50 text-green-700 border-green-300';
    if (s >= 40) return 'bg-orange-50 text-orange-700 border-orange-300';
    return 'bg-red-50 text-red-700 border-red-300';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();

      setUser(currentUser);

      // Get user profile
      let profiles = await api.entities.UserProfile.filter({ user_id: currentUser.email });
      if (profiles.length === 0) {
        profiles = await api.entities.UserProfile.filter({ user_id: currentUser.id });
      }

      if (profiles.length > 0) {
        setProfile(profiles[0]);
      }

      // Fetch all session types
      const [gdSessions, extemporeSessions, aiInterviews, gdRooms] = await Promise.all([
        api.entities.GDSession.list('-created_date', 100),
        api.entities.ExtemporeSession.list('-created_date', 100),
        api.entities.AIInterview.list('-created_date', 100),
        api.entities.GDRoom.filter({ status: 'completed' }, '-created_date', 100)
      ]);

      // Filter user sessions
      const userGDSessions = gdSessions.filter(s => 
        s.participants?.some(p => p.user_id === currentUser.email || p.user_id === currentUser.id) ||
        s.created_by === currentUser.email
      );

      const userExtemporeSessions = extemporeSessions.filter(s => 
        s.user_id === currentUser.email || s.user_id === currentUser.id || s.created_by === currentUser.email
      );

      const userInterviews = (aiInterviews || []).filter(s => 
        s.host_id === currentUser.email || 
        s.participants?.some(p => p.user_id === currentUser.email || p.user_id === currentUser.id)
      );

      const userGDRooms = gdRooms.filter(s => 
        s.host_id === currentUser.email || 
        s.participants?.some(p => p.user_id === currentUser.email || p.user_id === currentUser.id)
      );

      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const normalizeDate = (obj) => obj?.created_date || obj?.completed_at || obj?.started_at || obj?.createdAt || obj?.updatedAt || obj?.date || Date.now();
      const allUserSessions = [
        ...userGDSessions.map(s => ({ ...s, date: normalizeDate(s) })),
        ...userExtemporeSessions.map(s => ({ ...s, date: normalizeDate(s) })),
        ...userInterviews.map(s => ({ ...s, date: normalizeDate(s) })),
        ...userGDRooms.map(s => ({ ...s, date: normalizeDate(s) }))
      ];

      const thisWeekSessions = allUserSessions.filter(s => new Date(s.date) >= weekAgo).length;
      const thisMonthSessions = allUserSessions.filter(s => new Date(s.date) >= monthAgo).length;

      // Calculate average scores
      const extemporeScores = userExtemporeSessions
        .filter(s => s.fluency_score)
        .map(s => s.fluency_score);
      const avgExtemporeScore = extemporeScores.length > 0 
        ? Math.round(extemporeScores.reduce((a, b) => a + b, 0) / extemporeScores.length)
        : 0;

      setStats(prev => ({
        ...prev,
        totalGDSessions: userGDSessions.length + userGDRooms.length,
        totalExtemporeSessions: userExtemporeSessions.length,
        totalInterviews: userInterviews.length,
        avgExtemporeScore,
        thisWeekSessions,
        thisMonthSessions
      }));

      // Update interview count from analysis records (more accurate)
      try {
        const interviewAnalyses = await api.interviewAnalysis.getHistory(currentUser.email);
        if (Array.isArray(interviewAnalyses)) {
          setStats(prev => ({ ...prev, totalInterviews: interviewAnalyses.length }));
        }
      } catch { /* fallback to aiInterviews count */ }

      // Refresh global context so navbar XP updates everywhere
      await refreshUser?.();
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  console.log('Progress streak data:', {
    userStreak: user?.streak,
    profileStreak: profile?.streak,
    rawProfile: profile
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const level = profile?.level || user?.level || 1;
  const totalXP = profile?.totalXP || user?.totalXP || 0;
  const xpForCurrentLevel = (level - 1) * 100;
  const xpNeeded = 100; // each level needs 100 XP
  const xpProgress = Math.max(0, totalXP - xpForCurrentLevel);
  const progressPercent = Math.min((xpProgress / xpNeeded) * 100, 100);

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Progress" user={profile} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-2 gradient-text">My Progress</h1>
          <p className="text-gray-600 text-lg">Track your improvement journey</p>
        </motion.div>

        {/* Level & XP Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <ClayCard className="bg-white border-2 border-purple-200 p-6 md:p-8">
            <div className="w-full">
              <div className="flex justify-between items-center text-sm md:text-base font-bold text-gray-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-500"></span>
                  <span className="uppercase tracking-wider">Level {level}</span>
                </div>
                <div className="text-purple-600">Next: Level {level + 1}</div>
              </div>
              
              <div className="font-black text-2xl md:text-3xl text-gray-900 mb-6">
                {user?.full_name || 'Anonymous User'}
              </div>
              
              <div className="flex flex-col gap-3 mb-8">
                <p className="text-gray-700 text-lg md:text-xl font-bold bg-purple-50 w-max px-4 py-1.5 rounded-lg border border-purple-100">{totalXP} XP earned</p>
                <div className="flex items-center gap-2 bg-orange-50 w-max px-4 py-1.5 rounded-lg border border-orange-100">
                  <Flame className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                  <span className="font-bold text-gray-800 text-lg">{user?.streak || 0} Day Streak</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 h-4 sm:h-5 bg-gray-100 rounded-full overflow-hidden shadow-inner relative border border-gray-200">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full" 
                    />
                  </div>
                  <div className="text-sm md:text-base font-bold text-gray-600 shrink-0 w-24 text-right">
                    {xpProgress} / {xpNeeded} XP
                  </div>
                </div>
                
                <div className="text-sm font-bold text-gray-500 mt-1">
                  {xpNeeded - xpProgress} XP to next level
                </div>
              </div>
            </div>
          </ClayCard>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <ClayCard className="text-center py-6">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-cyan-500" />
            <p className="text-3xl font-black text-gray-900">{stats.totalGDSessions}</p>
            <p className="text-sm text-gray-700 font-medium">GD Sessions</p>
          </ClayCard>
          <ClayCard className="text-center py-6">
            <Mic className="w-10 h-10 mx-auto mb-3 text-purple-500" />
            <p className="text-3xl font-black text-gray-900">{stats.totalExtemporeSessions}</p>
            <p className="text-sm text-gray-700 font-medium">Extempore</p>
          </ClayCard>
          <ClayCard className="text-center py-6">
            <Bot className="w-10 h-10 mx-auto mb-3 text-green-500" />
            <p className="text-3xl font-black text-gray-900">{stats.totalInterviews}</p>
            <p className="text-sm text-gray-700 font-medium">Interviews</p>
          </ClayCard>
          <ClayCard className="text-center py-6">
            <Target className="w-10 h-10 mx-auto mb-3 text-orange-500" />
            <p className="text-3xl font-black text-gray-900">{stats.avgExtemporeScore}%</p>
            <p className="text-sm text-gray-700 font-medium">Avg Score</p>
          </ClayCard>
        </motion.div>

        {/* Activity Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"
        >
          <ClayCard className="bg-gradient-to-br from-green-50 to-teal-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-3xl font-black">{stats.thisWeekSessions} Sessions</p>
              </div>
            </div>
          </ClayCard>
          <ClayCard className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-3xl font-black">{stats.thisMonthSessions} Sessions</p>
              </div>
            </div>
          </ClayCard>
        </motion.div>

        {/* Badges */}
        {profile?.badges?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <ClayCard>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                Earned Badges
              </h3>
              <div className="flex flex-wrap gap-3">
                {profile.badges.map((badge, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </ClayCard>
          </motion.div>
        )}

        {/* == 2. PRACTICE HISTORY == */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5 }}
           className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Practice History</h2>
              <p className="text-gray-600">Your recent practice sessions</p>
            </div>
            <div>
              <BadgeAny variant="secondary" className="rounded-full px-3 py-1 bg-white border border-gray-200 shadow-sm">
                {combinedHistory.length} sessions
              </BadgeAny>
            </div>
          </div>

          {(analysisHistoryQuery.isLoading || interviewHistoryQuery.isLoading) && (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl overflow-hidden shadow-sm">
                  <SkeletonAny className="h-[140px] rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {!analysisHistoryQuery.isLoading && !interviewHistoryQuery.isLoading && (analysisHistoryQuery.isError || !userId) && (
            <CardAny className="rounded-2xl shadow-sm border border-gray-100 bg-white">
              <CardContentAny className="p-8 text-center text-sm text-gray-600">
                Could not load practice history right now.
              </CardContentAny>
            </CardAny>
          )}

          {!analysisHistoryQuery.isLoading && !interviewHistoryQuery.isLoading && !analysisHistoryQuery.isError && userId && combinedHistory.length === 0 && (
            <CardAny className="rounded-2xl shadow-sm border border-gray-100 bg-white">
              <CardHeaderAny className="text-center pt-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center shadow-inner">
                  <Mic className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-xl font-bold text-gray-900">No sessions yet</div>
                <div className="text-sm text-gray-600 mt-2">Start practicing to see your progress here!</div>
              </CardHeaderAny>
              <CardContentAny className="flex justify-center pb-8">
                <ButtonAny onClick={() => window.location.assign(createPageUrl('Explore'))} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full px-6 py-2 shadow-md hover:shadow-lg transition-all">
                  Start Practicing
                </ButtonAny>
              </CardContentAny>
            </CardAny>
          )}

          {!analysisHistoryQuery.isLoading && !interviewHistoryQuery.isLoading && !analysisHistoryQuery.isError && userId && combinedHistory.length > 0 && (
            <div className="space-y-4">
              {combinedHistory.slice(0, historyVisibleCount).map((item) => {
                const overall = Math.round(item?.scores?.overall || 0);
                const createdAt = item?.createdAt;

                if (item._type === 'interview') {
                  // Interview card
                  return (
                    <CardAny key={String(item?._id || item?.sessionId)} className="rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white overflow-hidden group">
                      <CardContentAny className="p-5 sm:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">🤖</span>
                              <BadgeAny variant="outline" className="border-green-200 text-green-700 bg-green-50 rounded-lg text-xs">AI Interview</BadgeAny>
                            </div>
                            <div className="font-bold text-lg text-gray-900 truncate group-hover:text-green-700 transition-colors">
                              {item?.role || 'Software Engineer'} — {(item?.interviewType || 'hr').toUpperCase()}
                            </div>
                            <div className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {createdAt ? formatHistoryDateTime(createdAt) : '—'}
                            </div>
                            {item?.company && (
                              <div className="text-xs text-gray-500 mt-1">@ {item.company}</div>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 shadow-sm">OVR: {Math.round(item?.scores?.overall || 0)}</span>
                              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm">COM: {Math.round(item?.scores?.communication || 0)}</span>
                              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 shadow-sm">TEC: {Math.round(item?.scores?.technical || 0)}</span>
                              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200 shadow-sm">CON: {Math.round(item?.scores?.confidence || 0)}</span>
                              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">REL: {Math.round(item?.scores?.relevance || 0)}</span>
                            </div>
                          </div>
                          <div className="flex md:flex-col items-center md:items-end justify-between gap-4 border-t border-gray-100 md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0">
                            <div className="flex items-center gap-3">
                              <div className="text-right hidden md:block">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall</p>
                                <p className="text-sm font-medium text-gray-400">Score</p>
                              </div>
                              <div className={`w-14 h-14 rounded-full border-[3px] flex flex-col items-center justify-center shadow-sm ${overallCircleClass(overall)}`}>
                                <div className="text-xl font-black leading-none">{overall}</div>
                              </div>
                            </div>
                            <ButtonAny
                              variant="outline"
                              size="sm"
                              className="bg-white border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 rounded-full font-bold shadow-sm transition-all"
                              onClick={() => window.location.assign(`/AIInterviewAnalysis?sessionId=${item?._id || item?.sessionId}&userId=${userId}`)}
                            >
                              View Report
                            </ButtonAny>
                          </div>
                        </div>
                      </CardContentAny>
                    </CardAny>
                  );
                }

                // GD card (existing)
                const topic = String(item?.topic || '—');
                const topicShort = topic.length > 50 ? `${topic.slice(0, 50)}…` : topic;
                const durationMin = Math.round((Number(item?.duration) || 0) / 60);
                const participants = Number(item?.participantCount) || 0;

                return (
                  <CardAny key={String(item?.analysisId || item?.sessionId)} className="rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white overflow-hidden group">
                    <CardContentAny className="p-5 sm:p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">💬</span>
                            <BadgeAny variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 rounded-lg text-xs">Group Discussion</BadgeAny>
                          </div>
                          <div className="font-bold text-lg text-gray-900 truncate group-hover:text-purple-700 transition-colors" title={topic}>
                            {topicShort}
                          </div>
                          <div className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {createdAt ? formatHistoryDateTime(createdAt) : '—'}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <BadgeAny variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 rounded-lg shrink-0">
                              {durationMin} min
                            </BadgeAny>
                            <BadgeAny variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50 rounded-lg shrink-0">
                              <Users className="w-3 h-3 mr-1" />
                              {participants || 1} participant{(participants || 1) !== 1 ? 's' : ''}
                            </BadgeAny>
                          </div>
                        </div>

                        <div className="flex md:flex-col items-center md:items-end justify-between gap-4 border-t border-gray-100 md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0">
                          <div className="flex items-center gap-3">
                            <div className="text-right hidden md:block">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall</p>
                              <p className="text-sm font-medium text-gray-400">Score</p>
                            </div>
                            <div className={`w-14 h-14 rounded-full border-[3px] flex flex-col items-center justify-center shadow-sm ${overallCircleClass(overall)}`}>
                              <div className="text-xl font-black leading-none">{overall}</div>
                            </div>
                          </div>
                          <ButtonAny
                            variant="outline"
                            size="sm"
                            className="bg-white border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 rounded-full font-bold shadow-sm transition-all"
                            onClick={() => window.location.assign(createPageUrl('GDAnalysis', { sessionId: item?.sessionId, userId }))}
                          >
                            View Report
                          </ButtonAny>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-50">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                          P: {Math.round(item?.scores?.participation || 0)}
                        </span>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-200 shadow-sm">
                          C: {Math.round(item?.scores?.communication || 0)}
                        </span>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shadow-sm">
                          K: {Math.round(item?.scores?.knowledge || 0)}
                        </span>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 shadow-sm">
                          G: {Math.round(item?.scores?.grammar || 0)}
                        </span>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200 shadow-sm">
                          T: {Math.round(item?.scores?.teamwork || 0)}
                        </span>
                      </div>
                    </CardContentAny>
                  </CardAny>
                );
              })}

              {combinedHistory.length > historyVisibleCount && (
                <div className="flex justify-center pt-4 pb-2">
                  <ButtonAny
                    variant="outline"
                    className="border-2 border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 rounded-full font-bold px-8 shadow-sm transition-all"
                    onClick={() => setHistoryVisibleCount((c) => Math.min(combinedHistory.length, c + 3))}
                  >
                    Load More Sessions
                  </ButtonAny>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}