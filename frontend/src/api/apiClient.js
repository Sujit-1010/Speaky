// Lightweight API client replacing prior vendor SDK. No external auth provider dependency.

const inferBase = () => {
  try {
    const proto = window.location.protocol.startsWith('https') ? 'https' : 'http';
    const host = window.location.hostname || 'localhost';
    const port = '5000';
    return `${proto}://${host}:${port}`;
  } catch {
    return 'http://localhost:5000';
  }
};
const viteEnv =
  (typeof import.meta !== 'undefined' && import.meta && import.meta.env)
    ? import.meta.env
    : ((typeof import.meta !== 'undefined' && import.meta && import.meta['env']) ? import.meta['env'] : undefined);
export const API_BASE_URL =
  // 1) Prefer build-time Vite env, shared across all devices
  (viteEnv && viteEnv.VITE_API_BASE_URL)
  // 2) Then any runtime override injected on window (set via localStorage api_base_url)
  || ((typeof globalThis !== 'undefined' && globalThis['__API_BASE_URL__']) || inferBase());

const jsonHeaders = { 'Content-Type': 'application/json' };

const safeJson = async (resp) => { try { return await resp.json(); } catch { return null; } };

/**
 * Makes a request to the API.
 * 
 * @param {string} method - The HTTP method to use.
 * @param {string} path - The path to the API endpoint.
 * @param {object} [body] - The request body.
 * @param {object} [headers] - Additional headers to include in the request.
 * @returns {Promise<object>} The response data.
 */
async function request(method, path, body, headers = {}) {
  /** @type {RequestInit} */
  const init = { method, headers: { ...jsonHeaders, ...headers }, credentials: 'include' };
  if (body !== undefined) init.body = JSON.stringify(body);
  const resp = await fetch(`${API_BASE_URL}${path}`, init);
  if (!resp.ok) {
    const msg = await safeJson(resp);
    const error = new Error(msg?.message || `Request failed: ${resp.status}`);
    // Attach status so callers can distinguish 401, 403, etc.
    error['status'] = resp.status;
    throw error;
  }
  return await safeJson(resp);
}

const get = (p, headers) => request('GET', p, undefined, headers);
const post = (p, b, headers) => request('POST', p, b, headers);
const patchReq = (p, b, headers) => request('PATCH', p, b, headers);
const del = (p, headers) => request('DELETE', p, undefined, headers);

// Map entity model name -> backend route
const entityToPath = {
  User: '/api/users',
  UserProfile: '/api/user-profiles',
  FriendRequest: '/api/friend-requests',
  Notification: '/api/notifications',
  Tournament: '/api/tournaments',
  TournamentRegistration: '/api/tournament-registrations',
  GDRoom: '/api/gd-rooms',
  GDSession: '/api/gd-sessions',
  ExtemporeSession: '/api/extempore-sessions',
  ExtemporeMessage: '/api/extempore-messages',
  AIInterview: '/api/ai-interviews',
  AIInterviewSession: '/api/ai-interview-sessions',
  ChatMessage: '/api/chat-messages',
  ExtemporeTopic: '/api/extempore-topics',
  SoloPracticeSession: '/api/solo-practice-sessions',
};

const makeEntity = (path) => ({
  async list(sort, limit) {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort === '-created_date' ? '-createdAt' : (sort === 'created_date' ? 'createdAt' : String(sort)));
    if (limit) params.set('limit', String(limit));
    const url = `${path}${params.toString() ? `?${params.toString()}` : ''}`;
    const data = await get(url);
    return Array.isArray(data) ? data : (data ? [data] : []);
  },
  async filter(query = {}, sort, limit) {
    // If filtering by id, hit /:id directly
    const q = query || {};
    if (q && typeof q === 'object' && Object.keys(q).length === 1 && (q['id'] || q['_id'])) {
      const id = q['id'] || q['_id'];
      const item = await get(`${path}/${id}`);
      return item ? [item] : [];
    }
    const hasNested = Object.values(q).some(v => typeof v === 'object' && v !== null);
    if (hasNested) {
      const all = await get(path);
      return (all || []).filter(item => {
        return Object.entries(q).every(([k, v]) => {
          const val = item?.[k];
          if (v && typeof v === 'object') {
            if (Array.isArray(v.$in)) return v.$in.includes(val);
          }
          return val === v;
        });
      });
    }
    const params = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]));
    if (sort) params.set('sort', sort === '-created_date' ? '-createdAt' : (sort === 'created_date' ? 'createdAt' : String(sort)));
    if (limit) params.set('limit', String(limit));
    const data = await get(`${path}${params.toString() ? `?${params.toString()}` : ''}`);
    return Array.isArray(data) ? data : (data ? [data] : []);
  },
  async create(data) { return post(path, data); },
  async update(id, patch) { return patchReq(`${path}/${id}`, patch); },
  async delete(id) { return del(`${path}/${id}`); },
});

const entities = {
  User: makeEntity(entityToPath.User),
  UserProfile: makeEntity(entityToPath.UserProfile),
  FriendRequest: makeEntity(entityToPath.FriendRequest),
  Notification: makeEntity(entityToPath.Notification),
  Tournament: makeEntity(entityToPath.Tournament),
  TournamentRegistration: makeEntity(entityToPath.TournamentRegistration),
  GDRoom: makeEntity(entityToPath.GDRoom),
  GDSession: makeEntity(entityToPath.GDSession),
  ExtemporeSession: makeEntity(entityToPath.ExtemporeSession),
  ExtemporeMessage: makeEntity(entityToPath.ExtemporeMessage),
  AIInterview: makeEntity(entityToPath.AIInterview),
  AIInterviewSession: makeEntity(entityToPath.AIInterviewSession),
  ChatMessage: makeEntity(entityToPath.ChatMessage),
  ExtemporeTopic: makeEntity(entityToPath.ExtemporeTopic),
  SoloPracticeSession: makeEntity(entityToPath.SoloPracticeSession),
};

const tournaments = {
  async register(args) {
    const a = args || {};
    const { tournamentId, user_id, user_name, user_email, group_number, accepted_rules } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    return post(`/api/tournaments/${tournamentId}/register`, { user_id, user_name, user_email, group_number, accepted_rules });
  },
  async createOrganiserLink(args) {
    const a = args || {};
    const { tournamentId, organiser_email, organiser_name, expires_in_hours } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    return post(`/api/tournaments/${tournamentId}/organiser-link`, { organiser_email, organiser_name, expires_in_hours });
  },
  async validateAccess(args) {
    const a = args || {};
    const { tournamentId, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const params = new URLSearchParams();
    if (accessToken) params.set('accessToken', accessToken);
    return get(`/api/tournaments/${tournamentId}/validate-access${params.toString() ? `?${params.toString()}` : ''}`);
  },
  async validateOrganiserSession(tournamentId) {
    if (!tournamentId) throw new Error('Missing tournamentId');
    return get(`/api/tournaments/${tournamentId}/validate-organiser`);
  },
  async inviteJudge(args) {
    const a = args || {};
    const { tournamentId, email, name, host_email, expires_in_hours, frontendUrl, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const headers = {};
    if (accessToken) headers['x-access-token'] = accessToken;
    return post(`/api/tournaments/${tournamentId}/invite-judge`, { email, name, host_email, expires_in_hours, frontendUrl }, headers);
  },
  async sendTimeSlot(args) {
    const a = args || {};
    const { tournamentId, registration_id, user_email, group_number, room_code, time_slot, host_email, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const headers = {};
    if (accessToken) headers['x-access-token'] = accessToken;
    return post(`/api/tournaments/${tournamentId}/send-time-slot`, { registration_id, user_email, group_number, room_code, time_slot, host_email }, headers);
  },
  async start(args) {
    const a = args || {};
    const { tournamentId, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const headers = {};
    if (accessToken) headers['x-access-token'] = accessToken;
    return post(`/api/tournaments/${tournamentId}/start`, {}, headers);
  },
  async restart(args) {
    const a = args || {};
    const { tournamentId, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const headers = {};
    if (accessToken) headers['x-access-token'] = accessToken;
    return post(`/api/tournaments/${tournamentId}/restart`, {}, headers);
  },
  /**
   * Fetches tournament + registrations + rooms in a single request.
   * Used by Organiser.jsx and JudgePanel.jsx (magic-link pages).
   * No JWT required — the accessToken IS the credential.
   */
  async getPanelData({ tournamentId, accessToken }) {
    if (!tournamentId) throw new Error('Missing tournamentId');
    if (!accessToken) throw new Error('Missing accessToken');
    const params = new URLSearchParams();
    params.set('token', accessToken);
    return get(`/api/tournaments/${tournamentId}/panel-data?${params.toString()}`);
  },
};

function ensureGuest() {
  try {
    const existing = localStorage.getItem('app_guest_user');
    if (existing) return JSON.parse(existing);
  } catch { }
  const guest = { id: 'guest', email: 'guest@example.com', full_name: 'Guest User' };
  try { localStorage.setItem('app_guest_user', JSON.stringify(guest)); } catch { }
  return guest;
}

const auth = {
  async me() {
    try {
      return await get('/api/auth/me');
    } catch (error) {
      // If not logged in, backend returns 401. Represent this as null instead of throwing.
      if (error && Number(error['status']) === 401) return null;
      throw error;
    }
  },
  async login({ email, password }) {
    return post('/api/auth/login', { email, password });
  },
  async register({ email, password, full_name }) {
    return post('/api/auth/register', { email, password, full_name });
  },
  async firebaseLogin({ idToken, full_name, avatar }) {
    return post('/api/auth/firebase', { idToken, full_name, avatar });
  },
  async logout(redirectUrl) {
    try {
      await post('/api/auth/logout', {});
    } catch {
      // ignore logout errors
    }
    try { localStorage.removeItem('app_guest_user'); } catch { }
    if (redirectUrl) window.location.href = redirectUrl;
  },
  redirectToLogin() {
    const current = (() => {
      try {
        return `${window.location.pathname || ''}${window.location.search || ''}${window.location.hash || ''}`;
      } catch {
        return '/';
      }
    })();
    window.location.href = `/Login?redirect=${encodeURIComponent(current || '/')}`;
  },
};

const appLogs = {
  async logUserInApp(pageName) {
    try {
      const key = 'app_logs';
      const logs = JSON.parse(localStorage.getItem(key) || '[]');
      logs.push({ page: pageName, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(logs));
    } catch { }
    return { success: true };
  },
};

const integrations = {
  Core: {
    async InvokeLLM(args) {
      const prompt = args && args.prompt;
      const response_json_schema = args && args.response_json_schema;
      const props = response_json_schema?.properties || {};
      const keys = Object.keys(props);
      // Generic chat style
      if (keys.includes('message') && keys.includes('question')) {
        return { message: "Hello! Let's begin your interview.", question: 'Tell me about yourself.' };
      }
      // Interview turn feedback
      if (keys.includes('feedback') && keys.includes('next_question')) {
        return { feedback: 'Thanks, that was a clear response.', next_question: "What's a challenging problem you've solved recently?" };
      }
      // Single text response
      if (keys.includes('response')) {
        return { response: 'Welcome! Please introduce yourself and share your background briefly.' };
      }
      // Per-participant schema
      if (keys.includes('participationSummary') && keys.includes('overallScore') && keys.includes('knowledgeScore')) {
        return {
          overallScore: 70,
          communicationScore: 72,
          knowledgeScore: 66,
          participationSummary: 'Shared multiple points and responded to peers with respect.',
          strengths: ['Structured points', 'Good eye contact', 'Calm tone'],
          improvements: ['Add data points', 'Trim filler words', 'Summarize more often']
        };
      }
      // Fallback
      return { content: `LLM is not connected. Stub for prompt: ${String(prompt || '').slice(0, 80)}...` };
    },
  }
};

const zego = {
  async getRoomToken({ roomId, user_id, user_name, canPublish = true }) {
    return post('/api/zego/token', { roomId, user_id, user_name, canPublish });
  },
};

const push = {
  async subscribe(args) {
    const a = /** @type {any} */ (args || {});
    return post('/api/push/subscribe', { token: a.token, platform: a.platform || 'web', user_agent: a.user_agent });
  },
  async unsubscribe(args) {
    const a = /** @type {any} */ (args || {});
    return post('/api/push/unsubscribe', { token: a.token });
  },
  async status() {
    return get('/api/push/status');
  },
  async test(args) {
    const a = /** @type {any} */ (args || {});
    return post('/api/push/test', { title: a.title, body: a.body, url: a.url });
  },
};

const globalGd = {
  async join({ userId, name }) {
    return post('/api/global-gd/join', { userId, name });
  },
  async status({ userId }) {
    const params = new URLSearchParams();
    params.set('userId', String(userId));
    return get(`/api/global-gd/status?${params.toString()}`);
  },
  async leave({ userId }) {
    return post('/api/global-gd/leave', { userId });
  },
  async leaveRoom({ userId, roomId }) {
    return post('/api/global-gd/leave-room', { userId, roomId });
  },
};

const analysis = {
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

let api = { auth, entities, appLogs, integrations, zego, push, globalGd, analysis };

const interviewAnalysis = {
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
const rooms = {
  gd: {
    async join(id, args) {
      const a = args || {};
      return post(`/api/gd-rooms/${id}/join`, { user_id: a.user_id, user_name: a.user_name });
    },
    async start(id, args) {
      const a = args || {};
      const headers = {};
      if (a.accessToken) headers['x-access-token'] = a.accessToken;
      return post(`/api/gd-rooms/${id}/start`, { host_email: a.host_email }, headers);
    },
    async stop(id, args) {
      const a = args || {};
      const headers = {};
      if (a.accessToken) headers['x-access-token'] = a.accessToken;
      return post(`/api/gd-rooms/${id}/stop`, { host_email: a.host_email }, headers);
    },
    async restart(id, args) {
      const a = args || {};
      const headers = {};
      if (a.accessToken) headers['x-access-token'] = a.accessToken;
      return post(`/api/gd-rooms/${id}/restart`, { host_email: a.host_email }, headers);
    },
    async forceClose(id, args) {
      const a = args || {};
      const headers = {};
      if (a.accessToken) headers['x-access-token'] = a.accessToken;
      return post(`/api/gd-rooms/${id}/force-close`, { host_email: a.host_email }, headers);
    },
  },
};

// Final export including tournaments/rooms
const extemporeAnalysis = {
  async start(data) {
    return request('POST', '/api/extempore-analysis/start', data);
  },
};

api = { ...api, tournaments, rooms, interviewAnalysis, extemporeAnalysis };
export { api };

