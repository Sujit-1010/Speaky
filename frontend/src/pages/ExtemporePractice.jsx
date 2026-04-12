import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';

import { Mic, Sparkles, Clock, Filter, Trophy } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExtemporePractice() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const allTopics = await api.entities.ExtemporeTopic.list();
      setTopics(allTopics);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const sampleTopics = [
    {
      title: 'Should social media platforms be regulated by the government?',
      difficulty: 'medium',
      category: 'Technology',
      tags: ['politics', 'society', 'technology']
    },
    {
      title: 'The impact of artificial intelligence on employment',
      difficulty: 'hard',
      category: 'Technology',
      tags: ['technology', 'AI', 'employment']
    },
    {
      title: 'The role of education in shaping society',
      difficulty: 'medium',
      category: 'Education',
      tags: ['education', 'society', 'development']
    },
    {
      title: 'Should college education be free for everyone?',
      difficulty: 'easy',
      category: 'Education',
      tags: ['education', 'policy', 'economics']
    },
    {
      title: 'The influence of technology on human relationships',
      difficulty: 'easy',
      category: 'Technology',
      tags: ['technology', 'relationships', 'society']
    }
  ];

  const displayTopics = topics.length > 0 ? topics : sampleTopics;
  const filteredTopics = filter === 'all' ? displayTopics : displayTopics.filter(t => t.difficulty === filter);

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-7xl mx-auto px-6 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold mb-2 gradient-text">Extempore Speaking</h1>
          <p className="text-gray-600 text-lg">Speak spontaneously on any topic</p>
        </motion.div>

        {/* Header Card */}
        <ClayCard className="mb-8 bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-500">
                  <Mic className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold gradient-text">How it Works</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="clay-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <p className="font-semibold">Preparation</p>
                  </div>
                  <p className="text-sm text-gray-600">30 seconds</p>
                </div>
                <div className="clay-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold">Speaking</p>
                  </div>
                  <p className="text-sm text-gray-600">Up to 5 min</p>
                </div>
                <div className="clay-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-pink-600" />
                    <p className="font-semibold">Feedback</p>
                  </div>
                  <p className="text-sm text-gray-600">AI Analysis</p>
                </div>
              </div>
            </div>
            <Link to={createPageUrl('ExtemporeRoom?random=true')}>
              <button className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Get Random Topic
              </button>
            </Link>
          </div>
        </ClayCard>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-5 h-5 text-gray-600" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="clay-card border-none w-48">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTopics.map((topic, index) => (
            <Link key={index} to={createPageUrl(`ExtemporeRoom?topic=${encodeURIComponent(topic.title)}`)}>
              <ClayCard>
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${difficultyColors[topic.difficulty]}`}>
                    {topic.difficulty}
                  </span>
                  <span className="text-sm text-gray-500">{topic.category}</span>
                </div>
                <h3 className="text-lg font-bold mb-3">{topic.title}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {topic.description || `Discuss the pros and cons of ${topic.title.toLowerCase()}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {topic.tags?.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </ClayCard>
            </Link>
          ))}
        </div>

        {/* Tournament Section */}
        <ClayCard className="mt-8 bg-gradient-to-br from-orange-50 to-pink-50 border-2 border-orange-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Extempore Tournaments</h3>
                <p className="text-gray-600">Compete in organized speaking competitions</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(createPageUrl('TournamentHub?type=extempore'))}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold shadow-xl"
            >
              View Tournaments
            </motion.button>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}