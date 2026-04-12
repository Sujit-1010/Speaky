import { api } from '@/api/apiClient';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, CheckCircle2, ChevronDown, ChevronUp, TrendingUp,
  MessageSquare, Star, AlertCircle, Lightbulb, ArrowLeft,
  RotateCcw, Home
} from 'lucide-react';
import TopNav from '../components/navigation/TopNav';

const SCORE_RING_SIZE = 100;

function ScoreRing({ score, label, color = '#14b8a6', size = 90 }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <motion.circle
            cx="45" cy="45" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            transform="rotate(-90 45 45)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>{Math.round(pct)}</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

function getLabel(score) {
  if (score >= 90) return { text: 'Outstanding! 🌟', color: 'text-emerald-600' };
  if (score >= 70) return { text: 'Good Performance! 👍', color: 'text-teal-600' };
  if (score >= 50) return { text: 'Average Performance 📈', color: 'text-yellow-600' };
  if (score >= 30) return { text: 'Needs Improvement 💪', color: 'text-orange-500' };
  return { text: 'Keep Practicing 🎯', color: 'text-red-500' };
}

function calculateXP(score) {
  if (score === 0) return 0;
  if (score < 30) return 2;
  if (score < 60) return 5;
  if (score < 90) return 8;
  return 10;
}

export default function AIInterviewAnalysis() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | processing | completed | failed | not_found
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [xpPopup, setXpPopup] = useState(null); // { xpEarned }
  const pollRef = useRef(null);

  const sessionId = searchParams.get('sessionId');
  const userId = searchParams.get('userId');

  useEffect(() => {
    api.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) { setStatus('not_found'); return; }
    fetchAnalysis();
  }, [sessionId]);

  const fetchAnalysis = async () => {
    try {
      const data = await api.interviewAnalysis.get(sessionId, userId);
      if (!data) { setStatus('not_found'); return; }

      setAnalysis(data);

      if (data.status === 'processing') {
        setStatus('processing');
        // Poll every 3 seconds
        pollRef.current = setTimeout(fetchAnalysis, 3000);
      } else if (data.status === 'failed') {
        setStatus('failed');
      } else {
        setStatus('completed');
        // Show XP popup once
        const popupKey = `interview_xp_shown_${sessionId}`;
        if (sessionId && !sessionStorage.getItem(popupKey)) {
          sessionStorage.setItem(popupKey, 'true');
          const xpEarned = calculateXP(data.scores?.overall || 0);
          if (xpEarned > 0) {
            setXpPopup({ xpEarned });
            setTimeout(() => setXpPopup(null), 4000);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
      // If not found (404), retry as it may still be creating
      if (err?.status === 404 || err?.message?.includes('404') || err?.message?.includes('not found')) {
        setStatus('processing');
        pollRef.current = setTimeout(fetchAnalysis, 3000);
      } else {
        setStatus('failed');
      }
    }
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const scores = analysis?.scores || {};
  const feedback = analysis?.feedback || {};
  const overallScore = scores.overall || 0;
  const label = getLabel(overallScore);

  if (status === 'loading' || status === 'processing') {
    const steps = [
      { label: '✅ Interview saved', done: true },
      { label: '⏳ Analyzing responses...', done: status === 'completed' },
      { label: '⏳ Generating feedback...', done: false },
      { label: '⏳ Preparing report...', done: false },
    ];
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-cyan-50 to-white pb-16">
        <TopNav activePage="Explore" user={user} />
        <div className="max-w-xl mx-auto pt-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-black mb-2">Analyzing your performance...</h2>
            <p className="text-gray-500 mb-8">This usually takes 1–2 minutes</p>
            <div className="space-y-3 text-left">
              {steps.map(({ label, done }, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                  <span className="text-base">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (status === 'not_found' || status === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-cyan-50 to-white pb-16">
        <TopNav activePage="Explore" user={user} />
        <div className="max-w-xl mx-auto pt-20 px-4 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">{status === 'failed' ? 'Analysis Failed' : 'Analysis Not Found'}</h2>
          <p className="text-gray-500 mb-6">
            {status === 'failed' ? 'Something went wrong while analyzing your interview.' : 'We could not find your analysis.'}
          </p>
          <button onClick={() => navigate('/Dashboard')} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold shadow-lg hover:shadow-teal-300/40 transition-all">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-cyan-50 to-white pb-20 relative">
      <TopNav activePage="Explore" user={user} />

      {/* XP Popup */}
      <AnimatePresence>
        {xpPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: -40 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 text-white rounded-2xl px-8 py-5 shadow-2xl text-center min-w-[220px]">
              <div className="text-3xl mb-1">⭐</div>
              <div className="text-2xl font-black tracking-wide">XP Earned!</div>
              <div className="text-4xl font-black mt-1">+{xpPopup.xpEarned} XP</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-3xl mx-auto pt-8 px-4 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">AI Interview Analysis</h1>
              <p className="text-sm text-gray-500">{analysis?.role} • {analysis?.company || 'Practice'} • {analysis?.interviewType?.toUpperCase()} Interview</p>
            </div>
          </div>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-8 shadow-xl text-white text-center"
        >
          <p className="text-emerald-100 uppercase tracking-widest text-xs font-semibold mb-2">Overall Score</p>
          <div className="text-8xl font-black mb-2">{Math.round(overallScore)}</div>
          <div className={`text-xl font-bold ${label.color.replace('text-', 'text-white opacity-90 ')} text-white`}>{label.text}</div>
        </motion.div>

        {/* Score Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
        >
          <h2 className="text-lg font-black mb-6">Score Breakdown</h2>
          <div className="flex flex-wrap justify-around gap-6">
            <ScoreRing score={scores.overall || 0} label="Overall" color="#14b8a6" />
            <ScoreRing score={scores.communication || 0} label="Communication" color="#6366f1" />
            <ScoreRing score={scores.technical || 0} label="Technical" color="#f59e0b" />
            <ScoreRing score={scores.confidence || 0} label="Confidence" color="#ec4899" />
            <ScoreRing score={scores.relevance || 0} label="Relevance" color="#10b981" />
          </div>
        </motion.div>

        {/* Overall Comment */}
        {feedback.overallComment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
          >
            <div className="flex gap-3 items-start">
              <MessageSquare className="w-6 h-6 text-teal-500 flex-shrink-0 mt-1" />
              <p className="text-gray-700 leading-relaxed italic text-base">"{feedback.overallComment}"</p>
            </div>
          </motion.div>
        )}

        {/* Strengths */}
        {(feedback.strengths || []).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
          >
            <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-emerald-500" /> Strengths</h2>
            <ul className="space-y-2">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-emerald-50 rounded-xl px-4 py-3">
                  <span className="text-emerald-500 font-bold flex-shrink-0">✅</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Areas to Improve */}
        {(feedback.improvements || []).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
          >
            <h2 className="text-lg font-black mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-orange-500" /> Areas to Improve</h2>
            <ul className="space-y-2">
              {feedback.improvements.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-orange-50 rounded-xl px-4 py-3">
                  <span className="text-orange-500 font-bold flex-shrink-0">⚠️</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Question by Question Feedback */}
        {(feedback.questionFeedback || []).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
          >
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" /> Question-by-Question Feedback
            </h2>
            <div className="space-y-4">
              {feedback.questionFeedback.map((qf, i) => {
                const qScore = qf.score || 0;
                const barWidth = `${Math.min(100, qScore)}%`;
                return (
                  <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-sm font-bold text-gray-800 mb-1">🎯 {qf.question}</div>
                    {qf.answer && (
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-semibold text-gray-500">💬 Your Answer: </span>{qf.answer}
                      </div>
                    )}
                    {qf.feedback && (
                      <div className="text-xs text-gray-600 mb-3">
                        <span className="font-semibold text-gray-500">📝 Feedback: </span>{qf.feedback}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: barWidth }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-12 text-right">{Math.round(qScore)}/100</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Tips */}
        {(feedback.tips || []).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
          >
            <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-500" /> Tips for Next Time</h2>
            <ol className="space-y-2 list-decimal list-inside">
              {feedback.tips.map((tip, i) => (
                <li key={i} className="text-sm text-gray-700 bg-yellow-50 rounded-xl px-4 py-3">{tip}</li>
              ))}
            </ol>
          </motion.div>
        )}

        {/* Full Transcript (collapsible) */}
        {analysis?.transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => setTranscriptOpen(o => !o)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <span className="text-base font-black">📝 Full Transcript</span>
              {transcriptOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            <AnimatePresence>
              {transcriptOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                  className="px-6 pb-6 max-h-[400px] overflow-y-auto"
                >
                  {analysis.transcript.split('\n').map((line, i) => {
                    const isAI = line.startsWith('AI:') || line.startsWith('ASSISTANT:');
                    const isUser = line.startsWith('USER:');
                    return (
                      <div key={i} className={`mb-2 px-3 py-2 rounded-xl text-sm ${isAI ? 'bg-blue-50 text-blue-800' : isUser ? 'bg-emerald-50 text-emerald-800' : 'text-gray-500 text-xs'}`}>
                        {line}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 pb-4"
        >
          <button
            onClick={() => navigate('/AIInterviewAI')}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-teal-500 text-teal-600 font-bold hover:bg-teal-50 transition-all"
          >
            <RotateCcw className="w-5 h-5" /> Practice Again
          </button>
          <button
            onClick={() => navigate('/Dashboard')}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold shadow-lg hover:shadow-teal-300/40 transition-all"
          >
            <Home className="w-5 h-5" /> Back to Dashboard
          </button>
        </motion.div>

      </div>
    </div>
  );
}
