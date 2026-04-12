import { api } from '@/api/apiClient';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Mic, MicOff, Play, Square, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClayCard from '../components/shared/ClayCard';
import { createPageUrl } from '../utils';

export default function ExtemporeRoom() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('preparation'); // preparation, speaking, completed
  const [timer, setTimer] = useState(30);
  const [isRecording, setIsRecording] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [topic, setTopic] = useState('');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recogRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const stopCamera = () => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch {}
  };

  const urlParams = new URLSearchParams(window.location.search);
  const topicParam = urlParams.get('topic');
  const randomTopic = urlParams.get('random');

  useEffect(() => {
    if (topicParam) {
      setTopic(decodeURIComponent(topicParam));
    } else if (randomTopic) {
      const topics = [
        'The impact of artificial intelligence on employment',
        'Should social media platforms be regulated?',
        'The role of education in modern society',
        'Climate change and individual responsibility'
      ];
      setTopic(topics[Math.floor(Math.random() * topics.length)]);
    }
  }, []);

  useEffect(() => {
    if (timer <= 0) {
      if (phase === 'preparation') {
        setPhase('speaking');
        setTimer(300); // 5 minutes for speaking
      } else if (phase === 'speaking') {
        handleComplete();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, phase]);

  useEffect(() => {
    if (phase !== 'speaking' || !micOn) {
      try { recogRef.current && recogRef.current.stop(); } catch {}
      recogRef.current = null;
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window['webkitSpeechRecognition'];
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      let latestInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript?.trim();
        if (!text) continue;
        if (res.isFinal) {
          setTranscript((prev) => (prev ? `${prev} ${text}` : text));
          latestInterim = '';
        } else {
          latestInterim = text;
        }
      }
      setInterim(latestInterim);
    };

    rec.onerror = () => { try { rec.stop(); } catch {} };

    try { rec.start(); } catch {}
    recogRef.current = rec;
    setIsRecording(true);

    return () => {
      try { rec.stop(); } catch {}
      recogRef.current = null;
      setIsRecording(false);
    };
  }, [phase, micOn]);

  useEffect(() => {
    if (phase !== 'speaking' || !cameraOn) {
      stopCamera();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }

    let active = true;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Unable to access camera', err);
        stopCamera();
      });

    return () => {
      active = false;
      stopCamera();
    };
  }, [cameraOn, phase]);

  const handleComplete = async () => {
    try {
      const user = await api.auth.me();
      const uid = (user && (user.id || user.email)) || 'guest';
      try { recogRef.current && recogRef.current.stop(); } catch {}
      const finalTranscript = (transcript + (interim ? ` ${interim}` : '')).trim();
      const session = await api.entities.ExtemporeSession.create({
        user_id: uid,
        topic: topic,
        difficulty: 'medium',
        category: 'General',
        prep_time: 30,
        speaking_duration: 300 - timer,
        filler_words_count: 0,
        filler_words: [],
        strengths: [],
        improvements: [],
      });

      try {
        await api.entities.ExtemporeMessage.create({ session_id: session.id, user_id: uid, text: finalTranscript });
      } catch {}

      navigate(createPageUrl(`ExtemporeFeedback?sessionId=${session.id}`));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startSpeaking = () => {
    setPhase('speaking');
    setTimer(300);
    setIsRecording(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <AnimatePresence mode="wait">
          {phase === 'preparation' && (
            <motion.div
              key="preparation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="glass-panel p-12 text-center">
                <h2 className="text-white text-2xl font-bold mb-4">Preparation Time</h2>
                <div className="text-8xl font-bold text-white mb-8">
                  {formatTime(timer)}
                </div>
                
                <ClayCard className="mb-6">
                  <h3 className="text-sm text-gray-600 mb-3">Your Topic:</h3>
                  <p className="text-2xl font-bold gradient-text">{topic}</p>
                </ClayCard>

                <p className="text-white text-lg opacity-80">
                  Take this time to organize your thoughts
                </p>

                <button
                  onClick={startSpeaking}
                  className="mt-6 px-8 py-4 rounded-full bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold shadow-xl hover:shadow-2xl transition-all"
                >
                  <Play className="w-5 h-5 inline mr-2" />
                  Start Speaking Now
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'speaking' && (
            <motion.div
              key="speaking"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="glass-panel p-12 text-center">
                {/* Timer Ring */}
                <div className="relative w-48 h-48 mx-auto mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${2 * Math.PI * 88 * (1 - timer / 300)}`}
                      strokeLinecap="round"
                      className="transition-all"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white">{formatTime(timer)}</span>
                  </div>
                </div>

                <ClayCard className="mb-6">
                  <p className="text-xl font-bold gradient-text">{topic}</p>
                </ClayCard>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  <ClayCard className="h-80 flex flex-col items-center justify-center bg-black/40">
                    {cameraOn ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full rounded-2xl bg-black"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                        <Camera className="w-5 h-5 mr-2" />
                        <span>Camera is off</span>
                      </div>
                    )}
                  </ClayCard>

                  <ClayCard className="h-80 text-left overflow-y-auto flex flex-col">
                    <p className="text-sm text-gray-600 mb-2">Live Transcript</p>
                    <p className="whitespace-pre-wrap break-words text-gray-800 flex-1">
                      {(transcript + (interim ? ` ${interim}` : '')).trim() || '...'}
                    </p>
                  </ClayCard>
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-4 mb-6">
                  <button
                    onClick={() => setCameraOn(!cameraOn)}
                    className={`p-4 rounded-full ${
                      cameraOn ? 'bg-white/20' : 'bg-red-500'
                    } text-white transition-all`}
                  >
                    {cameraOn ? <Camera className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </button>
                  <button
                    onClick={() => setMicOn(!micOn)}
                    className={`p-4 rounded-full ${
                      micOn ? 'bg-white/20' : 'bg-red-500'
                    } text-white transition-all`}
                  >
                    {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                  </button>
                </div>

                <button
                  onClick={handleComplete}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold shadow-xl hover:shadow-2xl transition-all"
                >
                  <Square className="w-5 h-5 inline mr-2" />
                  End Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}