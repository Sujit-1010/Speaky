import { api } from '@/api/apiClient';
import useVapi from '@/hooks/useVapi';
import TopNav from '../components/navigation/TopNav';
import * as pdfjsLib from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SimliClient, generateSimliSessionToken } from 'simli-client';

import {
  ArrowLeft,
  Bot,
  Mic,
  Clock,
  LogOut,
  Volume2,
  VolumeX,
  Upload,
  CheckCircle2,
  Wifi,
  WifiOff,
} from 'lucide-react';

// Set PDF.js worker source (must match installed version 4.4.168)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const SIMLI_API_KEY = import.meta.env.VITE_SIMLI_API_KEY || '';
const SIMLI_FACE_ID = 'cace3ef7-a4c4-425d-a8cf-a5358eb0c427';
const AVERY_PHOTO = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80';

const TECHNICAL_TOPICS = [
  'Python', 'Java', 'JavaScript', 'C++',
  'Data Structures', 'Algorithms',
  'DBMS', 'Operating Systems',
  'Machine Learning', 'React',
  'Node.js', 'SQL', 'System Design',
  'Computer Networks', 'OOP Concepts',
];

const interviewTypes = [
  { id: 'hr', label: 'HR Interview' },
  { id: 'technical', label: 'Technical Interview' },
  { id: 'behavioral', label: 'Behavioral Interview' },
  { id: 'case_study', label: 'Case Study' },
];



// ─────────────────────────────────────────────
// PDF Text Extraction
// ─────────────────────────────────────────────
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.filter((item) => 'str' in item).map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText.trim().slice(0, 6000);
}

// ─────────────────────────────────────────────
// SimliAvatar Component — Real lip-sync via Simli SDK
// ─────────────────────────────────────────────
function SimliAvatar({ isSpeaking }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const simliClientRef = useRef(null);
  const [simliReady, setSimliReady] = useState(false);
  const [simliFailed, setSimliFailed] = useState(false);

  useEffect(() => {
    if (!SIMLI_API_KEY) { setSimliFailed(true); return; }
    let cancelled = false;

    const initSimli = async () => {
      try {
        // Step 1: Generate session token
        const tokenResponse = await generateSimliSessionToken({
          apiKey: SIMLI_API_KEY,
          config: {
            faceId: SIMLI_FACE_ID,
            maxSessionLength: 3600,
            maxIdleTime: 600,
            handleSilence: true,
          }
        });
        const session_token = tokenResponse.session_token;
        if (cancelled) return;

        // Step 2: Initialize SimliClient in livekit mode
        const simliClient = new SimliClient(
          session_token,
          videoRef.current,
          audioRef.current,
          null,
          undefined,
          'livekit'
        );
        simliClientRef.current = simliClient;

        // Step 3: Start Simli
        await simliClient.start();
        if (cancelled) return;
        setSimliReady(true);
        console.log('✅ Simli connected - using built-in animation mode');

        // Keep Simli connection alive with silence — built-in animations handle the rest
        const startAudioCapture = async () => {
          try {
            // Vapi injects audio via Web Audio API internally, not via an audio element.
            // True lip sync would require Simli's own TTS which conflicts with Vapi.
            // Instead, use Simli's built-in handleSilence animations (eye blink + head movement)
            // and send periodic silence to keep the WebRTC connection alive.

            const keepAlive = setInterval(() => {
              if (!simliClientRef.current || cancelled) {
                clearInterval(keepAlive);
                return;
              }
              // Send 100ms of silence at 16kHz PCM16
              const samples = 1600; // 100ms * 16000Hz
              const silence = new Int16Array(samples);
              simliClientRef.current.sendAudioData(new Uint8Array(silence.buffer));
            }, 100);

            simliClientRef.current._keepAlive = keepAlive;
            console.log('✅ Simli running with built-in animations (eye blink + head movement)');

          } catch(err) {
            console.warn('Audio setup failed:', err);
          }
        };

        // Start keep-alive after 500ms
        setTimeout(startAudioCapture, 500);

      } catch (err) {
        console.error('Simli init error:', err);
        if (!cancelled) setSimliFailed(true);
      }
    };

    initSimli();

    return () => {
      cancelled = true;
      if (simliClientRef.current?._keepAlive) {
        clearInterval(simliClientRef.current._keepAlive);
      }
      try { simliClientRef.current?._workletNode?.disconnect(); } catch(e) {}
      try { simliClientRef.current?._audioContext?.close(); } catch(e) {}
      try { simliClientRef.current?.stop(); } catch(e) {}
      simliClientRef.current = null;
    };
  }, []);

  // FALLBACK: if Simli fails or API key missing — show professional static photo
  if (simliFailed || !SIMLI_API_KEY) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="relative rounded-2xl overflow-hidden w-full transition-all duration-500"
          style={{
            aspectRatio: '3/4',
            boxShadow: isSpeaking
              ? '0 0 0 4px rgba(52,211,153,0.9), 0 0 40px rgba(52,211,153,0.4)'
              : '0 0 0 2px rgba(100,116,139,0.3)',
            transform: isSpeaking ? 'scale(1.02)' : 'scale(1)',
            transition: 'box-shadow 0.4s ease, transform 0.4s ease',
          }}
        >
          <img
            src={AVERY_PHOTO}
            alt="Avery — AI Interviewer"
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
          {isSpeaking && (
            <div className="absolute bottom-0 inset-x-0 flex items-end justify-center pb-3 gap-1">
              {[1,2,3,4,5].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-emerald-400"
                  style={{
                    height: `${8 + i * 3}px`,
                    animation: `pulse 0.${4+i}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
        {isSpeaking && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-emerald-400/30"
            style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
          />
        )}
      </div>
    );
  }

  // SUCCESS: Simli live video
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!simliReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 rounded-2xl">
          <div className="w-10 h-10 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-400">Connecting Avery...</p>
        </div>
      )}
      <div
        className="relative rounded-2xl overflow-hidden w-full transition-all duration-300"
        style={{
          aspectRatio: '3/4',
          boxShadow: isSpeaking
            ? '0 0 0 4px rgba(52,211,153,0.9), 0 0 40px rgba(52,211,153,0.4)'
            : '0 0 0 2px rgba(100,116,139,0.3)',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
      {isSpeaking && simliReady && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-emerald-400/30"
          style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
        />
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function AIInterviewAI() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [aiMuted, setAiMuted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiInterviewId, setAiInterviewId] = useState(null);
  const [isEnding, setIsEnding] = useState(false);

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const resumeTextRef = useRef('');
  const [isParsing, setIsParsing] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [formError, setFormError] = useState('');

  const [config, setConfig] = useState({
    interview_type: 'hr',
    company: '',
    role: 'Software Engineer',
    duration: 15,
    focus_areas: '',
  });

  const { volumeLevel, isSessionActive, isSpeaking, conversation, toggleCall, stopCall, resetConversation } =
    useVapi();

  const chatEndRef = useRef(null);

  // ── Load user on mount
  useEffect(() => {
    api.auth.me().then(setUser).catch(console.error);
    return () => {
      resetConversation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Interview timer
  useEffect(() => {
    if (!interviewStarted) return;
    const timer = setInterval(() => setTimeElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [interviewStarted]);

  // ── Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // ── Format timer
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── File upload + PDF text extraction
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      setFormError('Please upload a .pdf, .doc, or .docx file');
      return;
    }
    setResumeFile(file);
    setFormError('');

    if (ext === '.pdf') {
      setIsParsing(true);
      try {
        const text = await extractTextFromPDF(file);
        setResumeText(text);
        resumeTextRef.current = text;
      } catch (err) {
        console.error('PDF parse error:', err);
        setResumeText('');
        resumeTextRef.current = '';
      } finally {
        setIsParsing(false);
      }
    } else {
      // For .doc/.docx we can't extract text client-side without extra libs
      // Store filename as context hint instead
      setResumeText('');
      resumeTextRef.current = '';
    }
  };

  // ── Topic toggle
  const toggleTopic = (topic) => {
    setSelectedTopics((prev) => {
      const next = prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic];
      if (next.length > 0) setFormError('');
      return next;
    });
  };

  // ── Get interview type label
  const getTypeLabel = (id) => {
    return interviewTypes.find((t) => t.id === id)?.label || id;
  };

  // ── Start Interview
  const startInterview = async () => {
    setFormError('');

    if (config.interview_type === 'technical') {
      if (!resumeFile && selectedTopics.length === 0) {
        setFormError('Please upload your resume OR select at least one topic');
        return;
      }
    } else {
      if (!config.role.trim()) {
        setFormError('Role is required');
        return;
      }
    }

    setLoading(true);

    try {
      const currentResumeText = resumeTextRef.current || '';
      const topicsStr = currentResumeText.length > 50
        ? 'Based on resume'
        : selectedTopics.join(', ');
      const resumeContext = currentResumeText.length > 50
        ? currentResumeText
        : 'No resume provided. Use selected topics.';

      const overrides = {
        variableValues: {
          interviewType: getTypeLabel(config.interview_type),
          company: config.company || 'a company',
          role: config.role || 'Software Engineer',
          topics: topicsStr,
          resumeText: resumeContext,
          focusAreas: config.focus_areas || '',
        },
      };

      await toggleCall(overrides);

      // Create AIInterview record
      if (user) {
        try {
          const code = `AIV${Date.now().toString().slice(-6)}`;
          const rec = await api.entities.AIInterview.create({
            room_code: code,
            host_id: user.email,
            host_name: user.full_name,
            interview_type: config.interview_type,
            company: config.company,
            role: config.role,
            duration: config.duration,
            status: 'active',
            participants: [
              { user_id: user.email, name: user.full_name, joined_at: new Date().toISOString() },
            ],
          });
          setAiInterviewId(rec?.id || rec?._id || null);
        } catch (err) {
          console.warn('AIInterview record creation failed:', err);
        }
      }

      setInterviewStarted(true);
      setTimeElapsed(0);
    } catch (err) {
      console.error('startInterview error:', err);
      setFormError('Failed to connect. Check your microphone permissions and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── End Interview
  const endInterview = async () => {
    if (isEnding) return;
    setIsEnding(true);

    try {
      await stopCall();
      // Wait 1s for conversation state to settle
      await new Promise((r) => setTimeout(r, 1000));

      const messages = conversation || [];
      console.log('Ending interview with', messages.length, 'messages');

      // Save session
      let savedSession = null;
      try {
        savedSession = await api.entities.AIInterviewSession.create({
          user_id: user?.email || 'guest',
          interview_type: config.interview_type,
          company: config.company || 'Practice Company',
          role: config.role || 'Software Engineer',
          messages,
          duration: timeElapsed,
        });
      } catch (err) {
        console.error('Session save error:', err);
      }

      // Update AIInterview status
      try {
        if (aiInterviewId) {
          await api.entities.AIInterview.update(aiInterviewId, { status: 'completed' });
        }
      } catch (err) {
        console.warn('AIInterview status update failed:', err);
      }

      // Start analysis pipeline
      try {
        await api.interviewAnalysis.start({
          sessionId: savedSession?._id || savedSession?.id || 'unknown',
          userId: user?.email,
          messages,
          interviewType: config.interview_type,
          company: config.company || 'Practice Company',
          role: config.role || 'Software Engineer',
          duration: timeElapsed,
          selectedTopics: selectedTopics || [],
          resumeText: resumeTextRef.current || '',
        });
      } catch (err) {
        console.error('Analysis start error:', err);
      }

      const sid = savedSession?._id || savedSession?.id;
      navigate(`/AIInterviewAnalysis?sessionId=${sid}&userId=${encodeURIComponent(user?.email || '')}`);
    } catch (err) {
      console.error('endInterview error:', err);
      navigate('/Dashboard');
    }
  };

  // ─────────────────────────────────────────────
  // SCREEN 1: Setup Form
  // ─────────────────────────────────────────────
  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-slate-950 pb-20 relative overflow-hidden">
        {/* Glow effect */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <TopNav activePage="Explore" user={user} />

        <div className="relative max-w-xl mx-auto pt-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-3xl p-8 shadow-2xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2">AI Voice Interview</h1>
              <p className="text-slate-400">Real-time voice conversation with AI interviewer Avery</p>
            </div>

            <div className="space-y-5">
              {/* Interview Type */}
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Interview Type</label>
                <select
                  value={config.interview_type}
                  onChange={(e) => {
                    setConfig({ ...config, interview_type: e.target.value });
                    setFormError('');
                  }}
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 text-white px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  {interviewTypes.map((type) => (
                    <option key={type.id} value={type.id} className="bg-slate-800">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic fields based on type */}
              <AnimatePresence mode="wait">
                {config.interview_type === 'technical' ? (
                  <motion.div
                    key="technical"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 overflow-hidden"
                  >
                    {/* Resume Upload */}
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-1 block">
                        Upload Resume <span className="text-slate-500 font-normal">(Recommended)</span>
                      </label>
                      <p className="text-xs text-slate-500 mb-2">Questions will be personalised based on your resume</p>
                      <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-5 hover:border-emerald-500/60 transition-colors bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer min-h-[80px]">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {isParsing ? (
                          <div className="flex items-center gap-2 text-emerald-400">
                            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                            <span className="text-sm">Extracting text...</span>
                          </div>
                        ) : resumeFile ? (
                          <div className="flex items-center gap-2 text-emerald-400 font-medium select-none">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            <span className="truncate max-w-[220px] text-sm">{resumeFile.name}</span>
                            {resumeText && (
                              <span className="text-xs text-emerald-500/70 ml-1">· text extracted</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center select-none text-slate-500">
                            <Upload className="w-6 h-6 mb-2 text-slate-600" />
                            <span className="text-sm">Click or drag to upload (.pdf, .doc, .docx)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OR divider */}
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-slate-700 flex-1" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">or</span>
                      <div className="h-px bg-slate-700 flex-1" />
                    </div>

                    {/* Technical Topics */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-slate-300">
                          Select Topics{' '}
                          <span className="text-slate-500 font-normal">{resumeFile ? '(Optional)' : '(Required)'}</span>
                        </label>
                        {selectedTopics.length > 0 && (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {selectedTopics.length} selected
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                        {TECHNICAL_TOPICS.map((topic) => {
                          const active = selectedTopics.includes(topic);
                          return (
                            <label
                              key={topic}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                active
                                  ? 'border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => toggleTopic(topic)}
                                className="w-4 h-4 accent-emerald-500 flex-shrink-0"
                              />
                              <span className={`text-sm ${active ? 'text-emerald-300 font-medium' : 'text-slate-400'}`}>
                                {topic}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Company */}
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">
                        Company <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        placeholder="e.g., Google, Amazon"
                        value={config.company}
                        onChange={(e) => setConfig({ ...config, company: e.target.value })}
                        className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 text-white px-3 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">Role</label>
                      <input
                        placeholder="e.g., Software Engineer"
                        value={config.role}
                        onChange={(e) => {
                          setConfig({ ...config, role: e.target.value });
                          if (e.target.value.trim()) setFormError('');
                        }}
                        className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 text-white px-3 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="non-technical"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 overflow-hidden"
                  >
                    {/* Company */}
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">
                        Company <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        placeholder="e.g., Google, Amazon"
                        value={config.company}
                        onChange={(e) => setConfig({ ...config, company: e.target.value })}
                        className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 text-white px-3 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">Role</label>
                      <input
                        placeholder="e.g., Marketing Manager, Product Designer"
                        value={config.role}
                        onChange={(e) => {
                          setConfig({ ...config, role: e.target.value });
                          if (e.target.value.trim()) setFormError('');
                        }}
                        className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 text-white px-3 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>

                    {/* Focus Areas */}
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">
                        Focus Areas <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        placeholder="e.g., Leadership, conflict resolution, past project experience..."
                        value={config.focus_areas}
                        onChange={(e) => setConfig({ ...config, focus_areas: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 text-white px-3 py-3 placeholder:text-slate-600 min-h-[90px] resize-y focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Error */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={startInterview}
                disabled={loading || isParsing}
                className="w-full py-4 mt-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting…
                  </span>
                ) : isParsing ? (
                  'Parsing resume…'
                ) : (
                  'Start AI Interview'
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // SCREEN 2: Live Interview
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">

      {/* Full-screen saving overlay */}
      <AnimatePresence>
        {isEnding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex flex-col items-center justify-center gap-5"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
            <p className="text-white text-2xl font-black">Analyzing your interview...</p>
            <p className="text-slate-400 text-sm">Please keep this tab open</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Status badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
          isSessionActive
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-slate-800 border-slate-700 text-slate-500'
        }`}>
          {isSessionActive ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              Disconnected
            </>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 text-slate-300 bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-700/50">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-sm font-bold">{formatTime(timeElapsed)}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          {/* LEFT PANEL — Avatar */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-3xl p-5 backdrop-blur"
            >
              {/* Avatar */}
              <div className="flex justify-center mb-4" style={{ minHeight: 280 }}>
                <SimliAvatar isSpeaking={isSpeaking} />
              </div>

              {/* Interviewer info */}
              <div className="text-center">
                <h3 className="text-white font-black text-lg">Avery</h3>
                <p className="text-slate-500 text-xs mb-3">AI Interviewer</p>

                {/* Speaking status */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                  isSpeaking
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border border-slate-700 text-slate-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  {isSpeaking ? 'Speaking' : 'Listening'}
                </div>
              </div>

              {/* Interview details */}
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Role</span>
                  <span className="text-slate-300 font-medium">{config.role}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-300 font-medium">{getTypeLabel(config.interview_type)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Company</span>
                  <span className="text-slate-300 font-medium">{config.company || 'Practice'}</span>
                </div>
                {resumeTextRef.current && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Resume</span>
                    <span className="text-emerald-400 font-medium">✓ Loaded</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT PANEL — Transcript + Controls */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-3xl p-5 backdrop-blur flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-0.5">Live Interview</p>
                  <h2 className="text-xl font-black text-white">{config.role}</h2>
                  <p className="text-xs text-slate-500">{config.company || 'Practice'} · {getTypeLabel(config.interview_type)}</p>
                </div>
                <button
                  onClick={endInterview}
                  disabled={isEnding}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm disabled:opacity-50 transition-colors shadow-lg shadow-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  {isEnding ? 'Saving...' : 'End Interview'}
                </button>
              </div>

              {/* Transcript */}
              <div
                className="flex-1 rounded-2xl bg-slate-950/60 border border-slate-800 p-4 overflow-y-auto space-y-3"
                style={{ minHeight: 280, maxHeight: 420 }}
              >
                {conversation.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                      <Mic className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Waiting for Avery...</p>
                    <p className="text-slate-600 text-xs mt-1">The conversation will appear here</p>
                  </div>
                ) : (
                  conversation.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar dot */}
                      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                        msg.role === 'ai'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}>
                        {msg.role === 'ai' ? 'A' : 'Y'}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'ai'
                            ? 'bg-slate-800 text-slate-200 rounded-tl-sm'
                            : 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/20 rounded-tr-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setAiMuted((prev) => !prev)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                    aiMuted
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {aiMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {aiMuted ? 'AI Muted' : 'Mute AI'}
                </button>

                <div className="flex-1 text-right text-xs text-slate-600">
                  {conversation.length > 0 && `${conversation.length} messages`}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}