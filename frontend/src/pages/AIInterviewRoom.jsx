import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';

import { motion } from 'framer-motion';
import { Bot, Mic, MicOff, Video, VideoOff, PhoneOff, Send, User, Clock, Copy, Check, ArrowLeft } from 'lucide-react';


export default function AIInterviewRoom() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId');
  
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (room?.status === 'active') {
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [room?.status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();

      setUser(currentUser);

      const [roomData] = await api.entities.AIInterview.filter({ id: roomId });

      setRoom(roomData);

      if (roomData.status === 'lobby') {
        // Start the interview
        await api.entities.AIInterview.update(roomId, { status: 'active' });

        setRoom({ ...roomData, status: 'active' });
        
        // Initial AI greeting
        const greeting = await generateAIResponse(roomData, []);
        setMessages([{ role: 'ai', content: greeting }]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generateAIResponse = async (roomData, conversationHistory) => {
    const typeDescriptions = {
      hr: 'HR interview focusing on cultural fit, motivation, and career goals',
      technical: 'Technical interview with coding and system design questions',
      behavioral: 'Behavioral interview using STAR method questions',
      case_study: 'Case study interview with business problem solving'
    };

    const prompt = `You are an AI interviewer conducting a ${typeDescriptions[roomData.interview_type]}.
${roomData.company ? `Company: ${roomData.company}` : ''}
${roomData.role ? `Role: ${roomData.role}` : ''}

Conversation so far:
${conversationHistory.map(m => `${m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n')}

${conversationHistory.length === 0 
  ? 'Start by introducing yourself and asking the first interview question.'
  : 'Respond naturally to the candidate, provide brief feedback if appropriate, then ask a follow-up or new question. Keep responses concise.'}`;

    const response = await api.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          response: { type: 'string' }
        }
      }
    });

    return response.response;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = { role: 'user', content: inputMessage };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);

    try {
      const aiResponse = await generateAIResponse(room, newMessages);

      setMessages([...newMessages, { role: 'ai', content: aiResponse }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setLoading(false);
    }
  };

  const endInterview = async () => {
    await api.entities.AIInterview.update(roomId, { status: 'completed' });

    navigate(createPageUrl('AIInterviewHub'));
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room?.room_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={endInterview}
            className="flex items-center gap-2 text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            <span className="text-white font-bold">AI Interview</span>
          </div>
          <button
            onClick={copyRoomCode}
            className="px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {room.room_code}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5 text-cyan-400" />
            {formatTime(timer)}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Video Section */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* AI Video */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center relative">
              <Bot className="w-24 h-24 text-white opacity-80" />
              <span className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                AI Interviewer
              </span>
            </div>
            
            {/* User Video */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center relative">
              {cameraOn ? (
                <User className="w-24 h-24 text-white opacity-80" />
              ) : (
                <VideoOff className="w-16 h-16 text-white opacity-50" />
              )}
              <span className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                {user?.full_name || 'You'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`p-4 rounded-full transition-all ${
                micOn ? 'bg-gray-700 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setCameraOn(!cameraOn)}
              className={`p-4 rounded-full transition-all ${
                cameraOn ? 'bg-gray-700 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            <button
              onClick={endInterview}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-96 bg-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-bold">Interview Chat</h3>
            <p className="text-gray-400 text-sm">Type your responses below</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {message.role === 'ai' && (
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-cyan-400">AI Interviewer</span>
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your answer..."
                className="flex-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                className="p-3 rounded-xl bg-cyan-500 text-white disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}