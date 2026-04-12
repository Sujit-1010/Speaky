import { api } from '@/api/apiClient';
import TopNav from '@/components/navigation/TopNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useSocket } from '@/lib/SocketContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Download, MessageCircle, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

function scoreColor(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'text-green-600';
  if (s >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'from-green-500 to-emerald-500';
  if (s >= 60) return 'from-yellow-500 to-orange-500';
  return 'from-red-500 to-rose-500';
}

function overallGradient(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'from-green-500 to-green-600';
  if (s >= 60) return 'from-purple-500 to-blue-600';
  return 'from-orange-500 to-red-500';
}

function overallLabel(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'Excellent Performance 🌟';
  if (s >= 60) return 'Good Performance 👍';
  if (s >= 40) return 'Average Performance 📈';
  return 'Needs Improvement 💪';
}

function ringColor(score) {
  const s = Number(score) || 0;
  if (s > 70) return '#16a34a';
  if (s >= 50) return '#f59e0b';
  return '#ef4444';
}

function formatSpeakingTime(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${r}s`;
  }
  return `${s}s`;
}

function AnimatedDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="animate-bounce [animation-delay:-0.2s]">.</span>
      <span className="animate-bounce [animation-delay:-0.1s]">.</span>
      <span className="animate-bounce">.</span>
    </span>
  );
}

function ScoreRing({ value }) {
  const v = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  const size = 86;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color = ringColor(v);
  return (
    <div className="relative w-[86px] h-[86px]">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="transparent" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-lg font-bold text-slate-900">{v}</div>
      </div>
    </div>
  );
}

function downloadText(filename, text) {
  const blob = new Blob([String(text || '')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch {}
  }, 2000);
}

export default function GDAnalysis() {
  const navigate = useNavigate();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = params.get('sessionId');
  const userId = params.get('userId');
  const uploadError = params.get('error');

  const [showTranscript, setShowTranscript] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [startedAt] = useState(() => Date.now());
  const [xpPopup, setXpPopup] = useState(null);

  const query = useQuery({
    queryKey: ['analysis', sessionId, userId],
    queryFn: async () => {
      if (!sessionId || !userId) throw new Error('Missing sessionId or userId');
      return await api.analysis.get(sessionId, userId);
    },
    enabled: !!sessionId && !!userId,
    refetchInterval: (q) => {
      if (!isOnline) return false;
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= 10 * 60 * 1000) return false;
      const status = q?.state?.data?.status;
      if (!status) return 3000;
      return status !== 'completed' && status !== 'failed' ? 3000 : false;
    },
  });

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    try {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
    } catch {}
    return () => {
      try { window.removeEventListener('online', onOnline); } catch {}
      try { window.removeEventListener('offline', onOffline); } catch {}
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onReady = (payload) => {
      if (!payload) return;
      if (payload.userId && String(payload.userId) !== String(userId || '')) return;
      if (payload.sessionId && String(payload.sessionId) !== String(sessionId || '')) return;
      queryClient.invalidateQueries({ queryKey: ['analysis', sessionId, userId] }).catch(() => {});
      
      const popupKey = `xp_shown_${sessionId}`;
      if (!sessionStorage.getItem(popupKey) && payload.xpEarned > 0) {
        sessionStorage.setItem(popupKey, 'true');
        setXpPopup({
          xpEarned: payload.xpEarned,
          newTotalXP: payload.newTotalXP,
          leveledUp: payload.leveledUp,
          newLevel: payload.newLevel
        });
        setTimeout(() => setXpPopup(null), 4000);
        api.auth.me().catch(() => {});
      }
    };
    const onFailed = (payload) => {
      if (!payload) return;
      if (payload.userId && String(payload.userId) !== String(userId || '')) return;
      queryClient.invalidateQueries({ queryKey: ['analysis', sessionId, userId] }).catch(() => {});
    };

    const onUpdated = (payload) => {
      if (!payload) return;
      if (payload.sessionId && String(payload.sessionId) !== String(sessionId || '')) return;
      queryClient.invalidateQueries({ queryKey: ['analysis', sessionId, userId] }).catch(() => {});
      try {
        toast({
          title: 'Scores updated',
          description: 'Your scores have been updated based on group participation',
        });
      } catch {}
    };

    socket.on('analysis_ready', onReady);
    socket.on('analysis_failed', onFailed);
    socket.on('analysis_updated', onUpdated);
    return () => {
      try { socket.off('analysis_ready', onReady); } catch {}
      try { socket.off('analysis_failed', onFailed); } catch {}
      try { socket.off('analysis_updated', onUpdated); } catch {}
    };
  }, [socket, queryClient, sessionId, userId]);

  const analysis = query.data;

  const status = analysis?.status;

  if (uploadError === 'upload_failed') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <TopNav activePage="Dashboard" />
        <div className="max-w-md mx-auto px-6 pt-28">
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">Analysis Failed</div>
              <div className="text-sm text-slate-600 mt-1">Audio upload failed. Your analysis could not be started.</div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={() => navigate(createPageUrl('GDArena'))} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  Practice Again
                </Button>
                <Button onClick={() => navigate(createPageUrl('Dashboard'))} variant="outline" className="w-full">
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!sessionId || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
          <h2 className="text-xl font-bold">Missing session info</h2>
          <p className="text-sm text-slate-600">This page requires sessionId and userId in the URL.</p>
          <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <TopNav activePage="Dashboard" />
        <div className="max-w-md mx-auto px-6 pt-28">
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full" />
              </div>
              <div className="text-2xl font-bold text-slate-900">Analyzing your performance...</div>
              <div className="text-sm text-slate-600 mt-1">This usually takes 1-2 minutes</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Audio uploaded</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <div className="animate-spin w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full" />
                  <span className="font-medium">Transcribing speech<AnimatedDots /></span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Analyzing content</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Generating report</span>
                </div>
                {!isOnline && (
                  <div className="pt-2 text-center text-sm font-semibold text-orange-700">Waiting for connection...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <TopNav activePage="Dashboard" />
        <div className="max-w-md mx-auto px-6 pt-28">
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">Analysis Failed</div>
              <div className="text-sm text-slate-600 mt-1">{query.error?.message || 'Please try again later.'}</div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={() => query.refetch()} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  Try Again
                </Button>
                <Button onClick={() => navigate(createPageUrl('Dashboard'))} variant="outline" className="w-full">
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <TopNav activePage="Dashboard" />
        <div className="max-w-md mx-auto px-6 pt-28">
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="text-center">
              <div className="text-xl font-bold text-slate-900">No analysis found</div>
              <div className="text-sm text-slate-600 mt-1">Please wait a moment and refresh.</div>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => query.refetch()} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                Refresh
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status !== 'completed') {
    const isFailed = status === 'failed';
    const reason = analysis?.errorReason || analysis?.message || analysis?.error || null;
    const elapsedMs = Date.now() - startedAt;
    const isSlow = !isFailed && elapsedMs >= 5 * 60 * 1000;
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <TopNav activePage="Dashboard" />
        <div className="max-w-md mx-auto px-6 pt-28">
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="text-center pb-2">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${isFailed ? 'bg-red-100' : 'bg-purple-50'} flex items-center justify-center`}>
                {isFailed ? (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                ) : (
                  <div className="animate-spin w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full" />
                )}
              </div>

              {isFailed ? (
                <>
                  <div className="text-2xl font-bold text-slate-900">Analysis Failed</div>
                  <div className="text-sm text-slate-600 mt-1">{reason || 'Please try again later.'}</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900">Analyzing your performance...</div>
                  <div className="text-sm text-slate-600 mt-1">This usually takes 1-2 minutes</div>
                </>
              )}
            </CardHeader>
            <CardContent>
              {isFailed ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={() => navigate(createPageUrl('GDArena'))} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    Practice Again
                  </Button>
                  <Button onClick={() => navigate(createPageUrl('Dashboard'))} variant="outline" className="w-full">
                    Back to Dashboard
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Audio uploaded</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-700">
                      <div className="animate-spin w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full" />
                      <span className="font-medium">Transcribing speech<AnimatedDots /></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>Analyzing content</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>Generating report</span>
                    </div>
                    {!isOnline && (
                      <div className="pt-2 text-center text-sm font-semibold text-orange-700">Waiting for connection...</div>
                    )}
                  </div>

                  {isSlow && (
                    <div className="mt-6 text-center">
                      <p className="text-sm font-semibold text-slate-900">This is taking longer than usual.</p>
                      <p className="text-sm text-slate-600">You can check back later.</p>
                      <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        Go to Dashboard
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const scores = analysis.scores || {};
  const metrics = analysis.metrics || {};
  const feedback = analysis.feedback || {};

  const noSpeech = !analysis.transcript || 
    analysis.transcript.trim() === '' ||
    analysis.transcript === '-' ||
    analysis.metrics?.totalWords === 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <TopNav activePage="Dashboard" />

      {/* XP Popup Animation */}
      <AnimatePresence>
        {xpPopup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <div className={`rounded-[2rem] p-8 shadow-2xl max-w-sm w-full text-center border-4 ${xpPopup.leveledUp ? 'bg-gradient-to-b from-yellow-50 to-orange-50 border-yellow-400' : 'bg-gradient-to-b from-white to-gray-50 border-purple-200'}`}>
              {xpPopup.leveledUp ? (
                <>
                  <h2 className="text-3xl font-black text-orange-600 mb-2">🎉 Level Up!</h2>
                  <p className="text-lg font-bold text-gray-700 mb-4">Level {xpPopup.newLevel - 1} → Level {xpPopup.newLevel}</p>
                </>
              ) : (
                <h2 className="text-2xl font-black text-purple-600 mb-2">⭐ XP Earned!</h2>
              )}
              
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: [1.2, 1, 1.1, 1] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-6xl my-4 inline-block font-black text-yellow-500 drop-shadow-md"
              >
                +{xpPopup.xpEarned} XP
              </motion.div>
              
              <div className="text-sm font-bold text-gray-600 mb-2">
                Total: {xpPopup.newTotalXP} XP • Level {xpPopup.newLevel}
              </div>
              
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-1 relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(xpPopup.newTotalXP % 500) / 5}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                />
              </div>
              <p className="text-xs text-center text-gray-500 font-medium">
                {xpPopup.newTotalXP % 500} / 500 XP to next level
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
        <div className="flex items-start justify-between gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shadow-sm">
                <Trophy className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">GD Performance Analysis</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Here's how you performed in the discussion</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <MessageCircle className="w-4 h-4 text-purple-600" />
                  <div className="text-sm font-semibold">Topic</div>
                </div>
                <div className="mt-2 text-sm text-slate-900 font-medium truncate" title={analysis.topic || ''}>{analysis.topic || '—'}</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <div className="text-sm font-semibold">Duration</div>
                </div>
                <div className="mt-2 text-sm text-slate-900 font-medium">{Math.round((Number(analysis.duration) || 0) / 60)} min</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Users className="w-4 h-4 text-purple-600" />
                  <div className="text-sm font-semibold">Participants</div>
                </div>
                <div className="mt-2 text-sm text-slate-900 font-medium">{analysis.participantCount ? `${analysis.participantCount} participants` : '—'}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex lg:justify-end">
            <Button
              onClick={() => downloadText(`gd-transcript-${String(sessionId)}.txt`, analysis.transcript || '')}
              disabled={!analysis.transcript}
              className="w-full lg:w-auto bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Transcript
            </Button>
          </div>
        </div>

        <Card className={`rounded-2xl shadow-md bg-gradient-to-r ${overallGradient(scores.overall)} text-white mb-6 overflow-hidden`}>
          <CardContent className="p-8 text-center">
            <div className="text-sm/90 font-semibold">Overall Performance</div>
            <div className="mt-2 text-6xl font-bold tracking-tight">{Math.round(scores.overall || 0)}</div>
            <div className="text-sm/90 mt-1">out of 100</div>
            <div className="mt-4 text-base font-semibold">{overallLabel(scores.overall)}</div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">Score Breakdown</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Participation', value: scores.participation, weight: '25%' },
              { label: 'Communication', value: scores.communication, weight: '25%' },
              { label: 'Knowledge', value: scores.knowledge, weight: '25%' },
              { label: 'Grammar', value: scores.grammar, weight: '15%' },
              { label: 'Teamwork', value: scores.teamwork, weight: '10%' },
            ].map((s) => (
              <Card key={s.label} className="rounded-xl shadow-sm">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <ScoreRing value={s.value} />
                  <div className="mt-3 text-sm font-semibold text-slate-900">{s.label}</div>
                  <div className="text-xs text-slate-500">({s.weight})</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Session Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 font-semibold">🕐 Speaking Time</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{formatSpeakingTime(metrics.speakingTime)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 font-semibold">⚡ Words/Min</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{Math.round(metrics.wpm || 0)} WPM</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 font-semibold">📝 Total Words</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{Math.round(metrics.totalWords || 0)} words</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 font-semibold">🔤 Filler Words</div>
                <div className={`mt-2 text-lg font-bold ${Number(metrics.fillerCount || 0) > 10 ? 'text-red-600' : 'text-slate-900'}`}>{Math.round(metrics.fillerCount || 0)} times</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 font-semibold">🔄 Speaking Turns</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{Math.round(metrics.turnCount || 0)} turns</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="rounded-2xl shadow-sm bg-green-50 border-green-100">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <div className="text-lg font-bold">Strengths</div>
              </div>
            </CardHeader>
            <CardContent>
              {noSpeech ? null : (feedback.strengths || []).length > 0 ? (
                <ul className="space-y-2">
                  {(feedback.strengths || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                      <span className="mt-2 w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-700">Keep practicing to develop strengths!</div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm bg-orange-50 border-orange-100">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-5 h-5" />
                <div className="text-lg font-bold">Areas to Improve</div>
              </div>
            </CardHeader>
            <CardContent>
              {(feedback.improvements || []).length > 0 ? (
                <ul className="space-y-2">
                  {(feedback.improvements || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                      <span className="mt-2 w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-700">Great job! No major areas to improve.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Grammar Corrections</h2>
          {noSpeech ? (
            <Card className="rounded-2xl shadow-sm bg-slate-50 border-slate-200">
              <CardContent className="p-4 text-sm text-slate-600 font-medium text-center">No speech detected. Grammar cannot be analyzed.</CardContent>
            </Card>
          ) : Array.isArray(feedback.grammarErrors) && feedback.grammarErrors.length > 0 ? (
            <div className="space-y-4">
              {(feedback.grammarErrors || []).slice(0, 3).map((e, i) => {
                const isObj = e && typeof e === 'object';
                const wrongText = isObj ? e.wrong : e;
                const correctText = isObj ? e.correct : (feedback.grammarCorrections || [])[i] || '—';
                return (
                  <Card key={i} className="rounded-xl shadow-sm overflow-hidden border border-slate-200">
                    <div className="flex flex-col">
                      <div className="bg-rose-50 p-4 border-b border-rose-100">
                        <div className="text-sm text-rose-900 font-medium flex items-start gap-2">
                          <span>❌</span> <span>{wrongText}</span>
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 border-b border-green-100">
                        <div className="text-sm text-green-900 font-medium flex items-start gap-2">
                          <span>✅</span> <span>{correctText}</span>
                        </div>
                      </div>
                      {isObj && e.explanation && (
                        <div className="bg-blue-50 p-4">
                          <div className="text-sm text-blue-900 font-medium flex items-start gap-2">
                            <span>💡</span> <span>{e.explanation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-2xl shadow-sm bg-green-50 border-green-100">
              <CardContent className="p-4 text-sm text-green-800 font-medium text-center">Great grammar! No errors found. ✅</CardContent>
            </Card>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Tips for Next Time</h2>
          <div className="space-y-3">
            {(feedback.tips || []).slice(0, 3).map((t, i) => (
              <Card key={i} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-900">{t}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(feedback.tips || []).length === 0 && (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4 text-sm text-slate-700">—</CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-lg font-bold text-slate-900">Full Transcript</h2>
            <Button variant="outline" onClick={() => setShowTranscript((v) => !v)} className="rounded-xl">
              {showTranscript ? 'Hide Transcript ▲' : 'View Transcript ▼'}
            </Button>
          </div>

          {showTranscript && (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm text-slate-600">Transcript</div>
                  <Button
                    onClick={() => downloadText(`gd-transcript-${String(sessionId)}.txt`, analysis.transcript || '')}
                    disabled={!analysis.transcript}
                    variant="outline"
                    className="rounded-xl"
                  >
                    Download Transcript 📄
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-auto rounded-xl bg-slate-100 p-4">
                  <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">{analysis.transcript || '—'}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => navigate(createPageUrl('Dashboard'))} variant="outline" className="w-full rounded-2xl">
              ← Back to Dashboard
            </Button>
            <Button onClick={() => navigate(createPageUrl('GDArena'))} className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              Practice Again 🎯
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
