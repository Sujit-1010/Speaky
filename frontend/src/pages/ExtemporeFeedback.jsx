import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';

import { TrendingUp, CheckCircle, AlertCircle, RotateCcw, Home, FileText } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function ExtemporeFeedback() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const sessionData = await api.entities.ExtemporeSession.filter({ id: sessionId });
      if (sessionData.length > 0) {
        setSession(sessionData[0]);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Dashboard" />
      
      <div className="max-w-5xl mx-auto px-6 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-2xl">
              <TrendingUp className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-2 gradient-text">Performance Report</h1>
            <p className="text-gray-600 text-lg">Here's your detailed feedback</p>
          </div>

          <ClayCard className="bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 mb-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Topic</p>
              <p className="text-xl font-bold">{session?.topic}</p>
            </div>
          </ClayCard>
        </motion.div>

        {/* Performance Scores */}
        <ClayCard className="mb-6">
          <h2 className="text-2xl font-bold mb-6">Performance Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Fluency</span>
                <span className="text-2xl font-bold gradient-text">{session?.fluency_score || 0}/10</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                  style={{ width: `${(session?.fluency_score || 0) * 10}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Clarity</span>
                <span className="text-2xl font-bold gradient-text">{session?.clarity_score || 0}/10</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-teal-500 transition-all"
                  style={{ width: `${(session?.clarity_score || 0) * 10}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Pacing</span>
                <span className="text-2xl font-bold gradient-text">{session?.pacing_score || 0}/10</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-pink-500 transition-all"
                  style={{ width: `${(session?.pacing_score || 0) * 10}%` }}
                />
              </div>
            </div>
          </div>
        </ClayCard>

        {/* Feedback Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <ClayCard className="bg-gradient-to-br from-green-50 to-teal-50">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {session?.strengths?.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </ClayCard>

          {/* Areas for Improvement */}
          <ClayCard className="bg-gradient-to-br from-orange-50 to-red-50">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-bold">Areas for Improvement</h3>
            </div>
            <ul className="space-y-3">
              {session?.improvements?.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{improvement}</span>
                </li>
              ))}
            </ul>
          </ClayCard>
        </div>

        {/* Overall Feedback */}
        <ClayCard className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold">Overall Feedback</h3>
          </div>
          <p className="text-gray-700 leading-relaxed">{session?.ai_feedback}</p>
        </ClayCard>

        {/* Filler Words */}
        <ClayCard className="mb-6 bg-gradient-to-br from-yellow-50 to-orange-50">
          <h3 className="text-xl font-bold mb-4">Filler Words Analysis</h3>
          <div className="mb-4">
            <span className="text-4xl font-bold text-orange-600">{session?.filler_words_count || 0}</span>
            <span className="text-gray-600 ml-2">filler words detected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {session?.filler_words?.map((word, index) => (
              <span key={index} className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm font-medium">
                {word}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4">
            💡 Try to minimize filler words by pausing briefly instead
          </p>
        </ClayCard>

        {/* Transcript */}
        <ClayCard className="mb-6">
          <h3 className="text-xl font-bold mb-4">Transcript</h3>
          <div className="p-4 bg-gray-50 rounded-2xl">
            <p className="text-gray-700 leading-relaxed">{session?.transcript}</p>
          </div>
        </ClayCard>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate(createPageUrl('ExtemporePractice'))}
            className="py-4 rounded-3xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Practice Another Topic
          </button>
          <button
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="py-4 rounded-3xl bg-white text-purple-600 font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}