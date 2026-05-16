import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, CheckCircle, AlertCircle, RotateCcw, Home,
  FileText, Brain, BookOpen, Shield, Layers, Mic, Eye, Zap
} from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

const SCORE_METRICS = [
  { key: 'fluency_score',    label: 'Fluency',    icon: Mic,     color: 'from-purple-500 to-blue-500',     bg: 'bg-purple-50' },
  { key: 'clarity_score',    label: 'Clarity',    icon: Eye,     color: 'from-green-400 to-teal-500',      bg: 'bg-green-50' },
  { key: 'pacing_score',     label: 'Pacing',     icon: Zap,     color: 'from-orange-400 to-amber-500',    bg: 'bg-orange-50' },
  { key: 'confidence_score', label: 'Confidence', icon: Shield,  color: 'from-pink-500 to-rose-500',       bg: 'bg-pink-50' },
  { key: 'knowledge_score',  label: 'Knowledge',  icon: Brain,   color: 'from-cyan-500 to-blue-600',       bg: 'bg-cyan-50' },
  { key: 'grammar_score',    label: 'Grammar',    icon: BookOpen, color: 'from-indigo-500 to-violet-600',  bg: 'bg-indigo-50' },
  { key: 'vocabulary_score', label: 'Vocabulary', icon: FileText, color: 'from-teal-500 to-emerald-600',   bg: 'bg-teal-50' },
  { key: 'content_score',    label: 'Content',    icon: Layers,  color: 'from-yellow-500 to-orange-500',   bg: 'bg-yellow-50' },
];

function ScoreRing({ score, size = 80 }) {
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score / 10, 0), 1);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(0,0,0,0.08)" strokeWidth="6" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="url(#ring-grad)" strokeWidth="6" fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AnalyzingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 gap-8">
      <motion.div
        className="w-28 h-28 rounded-3xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-300"
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      >
        <Brain className="w-14 h-14 text-white" />
      </motion.div>
      <div className="text-center">
        <h2 className="text-3xl font-black gradient-text mb-2">Analyzing Your Speech</h2>
        <p className="text-gray-500 text-base">Our AI is evaluating all 8 performance metrics...</p>
      </div>
      <div className="grid grid-cols-4 gap-3 max-w-sm w-full px-4">
        {SCORE_METRICS.map((m, i) => (
          <motion.div
            key={m.key}
            className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white shadow"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.15 }}
          >
            <m.icon className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-gray-500 font-semibold">{m.label}</span>
          </motion.div>
        ))}
      </div>
      <p className="text-sm text-gray-400">This usually takes 5–15 seconds</p>
    </div>
  );
}

export default function ExtemporeFeedback() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const loadSession = async () => {
    try {
      const data = await api.entities.ExtemporeSession.filter({ id: sessionId });
      if (data.length > 0) {
        const s = data[0];
        setSession(s);
        if (s.status === 'completed' || s.status === 'failed') {
          setIsLoading(false);
          clearInterval(pollRef.current);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  useEffect(() => {
    if (!sessionId) return;
    loadSession();
    // Poll every 3 seconds until the AI analysis completes
    pollRef.current = setInterval(loadSession, 3000);
    return () => clearInterval(pollRef.current);
  }, [sessionId]);

  const overallScore = session
    ? Math.round(
        SCORE_METRICS.reduce((sum, m) => sum + (session[m.key] || 0), 0) / SCORE_METRICS.length * 10
      )
    : 0;

  if (isLoading) return <AnalyzingScreen />;

  return (
    <div className="min-h-screen pb-24">
      <TopNav activePage="Dashboard" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-200">
            <TrendingUp className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black mb-2 gradient-text">Performance Report</h1>
          <p className="text-gray-500 text-lg">Here's your complete AI-powered analysis</p>
        </motion.div>

        {/* Topic + Overall Score */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <ClayCard className="bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Topic</p>
              <p className="text-2xl font-bold text-gray-800">{session?.topic}</p>
              <p className="text-sm text-gray-500 mt-1">
                Speaking time: {Math.round((session?.speaking_duration || 0) / 60)}m {(session?.speaking_duration || 0) % 60}s
              </p>
            </div>
            <div className="relative flex-shrink-0 flex flex-col items-center">
              <ScoreRing score={overallScore / 10} size={96} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black gradient-text">{overallScore}</span>
                <span className="text-xs text-gray-500">/ 100</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-semibold">Overall</p>
            </div>
          </ClayCard>
        </motion.div>

        {/* 8 Score Metrics Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ClayCard className="mb-6">
            <h2 className="text-2xl font-bold mb-6">Performance Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SCORE_METRICS.map((metric, idx) => {
                const score = session?.[metric.key] || 0;
                const pct = score * 10;
                return (
                  <motion.div
                    key={metric.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className={`${metric.bg} rounded-2xl p-4 flex flex-col items-center gap-2`}
                  >
                    <metric.icon className="w-6 h-6 text-gray-600" />
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{metric.label}</p>
                    <div className="text-3xl font-black gradient-text">{score}<span className="text-base text-gray-400 font-normal">/10</span></div>
                    <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${metric.color} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.3 + idx * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ClayCard>
        </motion.div>

        {/* Strengths & Improvements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <ClayCard className="bg-gradient-to-br from-green-50 to-teal-50">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {(session?.strengths?.length > 0 ? session.strengths : ['No strengths data available.']).map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{s}</span>
                </li>
              ))}
            </ul>
          </ClayCard>

          <ClayCard className="bg-gradient-to-br from-orange-50 to-red-50">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-bold">Areas for Improvement</h3>
            </div>
            <ul className="space-y-3">
              {(session?.improvements?.length > 0 ? session.improvements : ['No improvement data available.']).map((imp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{imp}</span>
                </li>
              ))}
            </ul>
          </ClayCard>
        </motion.div>

        {/* AI Feedback */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <ClayCard className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold">AI Coach Feedback</h3>
            </div>
            <p className="text-gray-700 leading-relaxed text-base">
              {session?.ai_feedback || 'AI feedback not available for this session.'}
            </p>
          </ClayCard>
        </motion.div>

        {/* Grammar & Sentence Corrections */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <ClayCard className="mb-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold">Grammar & Sentence Corrections</h3>
            </div>
            {!session?.grammar_errors || session.grammar_errors.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <p className="text-green-700 font-semibold">Excellent! No major grammatical errors were found in your speech. 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {session.grammar_errors.map((err, i) => (
                  <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Wrong Sentence */}
                    <div className="flex items-start gap-3 p-4 bg-red-50 border-b border-red-100">
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">You said (Wrong)</p>
                        <p className="text-gray-800 font-medium">"{err.wrong}"</p>
                      </div>
                    </div>
                    {/* Correct Sentence */}
                    <div className="flex items-start gap-3 p-4 bg-green-50 border-b border-green-100">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Should be (Correct)</p>
                        <p className="text-gray-800 font-medium">"{err.correct}"</p>
                      </div>
                    </div>
                    {/* Explanation */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-black">?</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Why it's wrong</p>
                        <p className="text-gray-700 text-sm">{err.explanation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ClayCard>
        </motion.div>

        {/* Tips */}
        {session?.tips?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <ClayCard className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold">Tips to Improve</h3>
              </div>
              <ul className="space-y-2">
                {session.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </ClayCard>
          </motion.div>
        )}

        {/* Filler Words */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <ClayCard className="mb-6 bg-gradient-to-br from-yellow-50 to-orange-50">
            <h3 className="text-xl font-bold mb-4">Filler Words Analysis</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-orange-600">{session?.filler_words_count || 0}</span>
              <span className="text-gray-600 ml-2">filler words detected</span>
            </div>
            {session?.filler_words?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {session.filler_words.map((word, i) => (
                  <span key={i} className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm font-semibold">{word}</span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Great — no filler words detected! 🎉</p>
            )}
            <p className="text-sm text-gray-500 mt-4">💡 Replace filler words with a brief confident pause instead.</p>
          </ClayCard>
        </motion.div>

        {/* Transcript */}
        {session?.transcript && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <ClayCard className="mb-6">
              <h3 className="text-xl font-bold mb-4">Your Transcript</h3>
              <div className="p-4 bg-gray-50 rounded-2xl max-h-48 overflow-y-auto">
                <p className="text-gray-700 leading-relaxed">{session.transcript}</p>
              </div>
            </ClayCard>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate(createPageUrl('ExtemporePractice'))}
            className="py-4 rounded-3xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Practice Another Topic
          </button>
          <button
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="py-4 rounded-3xl bg-white text-purple-600 font-bold text-lg shadow-lg hover:shadow-xl border border-purple-100 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  );
}