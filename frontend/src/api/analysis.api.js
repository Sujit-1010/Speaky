import { get, post, request } from './client';

export const analysis = {
  async start(args) {
    const a = args || {};
    const { sessionId, userId, audioUrl, topic, duration, participantCount } = a;
    console.log('analysis start payload:', { sessionId, userId, audioUrl });
    if (!sessionId || !userId || !audioUrl) throw new Error('Missing fields');
    return post('/api/analysis/start', { sessionId, userId, audioUrl, topic, duration, participantCount });
  },
  async get(sessionId, userId) {
    if (!sessionId) throw new Error('Missing sessionId');
    if (!userId) throw new Error('Missing userId');
    const params = new URLSearchParams();
    params.set('userId', String(userId));
    return get(`/api/analysis/${encodeURIComponent(String(sessionId))}?${params.toString()}`);
  },
  async getHistory(userId) {
    if (!userId) throw new Error('Missing userId');
    return get(`/api/analysis/history/${encodeURIComponent(String(userId))}`);
  },
};

export const interviewAnalysis = {
  async start(data) {
    return request('POST', '/api/interview-analysis/start', data);
  },
  async get(sessionId, userId) {
    if (!sessionId) throw new Error('Missing sessionId');
    const params = new URLSearchParams();
    if (userId) params.set('userId', String(userId));
    return get(`/api/interview-analysis/${encodeURIComponent(String(sessionId))}?${params.toString()}`);
  },
  async getHistory(userId) {
    if (!userId) throw new Error('Missing userId');
    return get(`/api/interview-analysis/history/${encodeURIComponent(String(userId))}`);
  },
};

export const extemporeAnalysis = {
  async start(data) {
    return request('POST', '/api/extempore-analysis/start', data);
  },
};
