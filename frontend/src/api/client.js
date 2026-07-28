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
  (viteEnv && viteEnv.VITE_API_BASE_URL)
  || ((typeof globalThis !== 'undefined' && globalThis['__API_BASE_URL__']) || inferBase());

const jsonHeaders = { 'Content-Type': 'application/json' };

const safeJson = async (resp) => { try { return await resp.json(); } catch { return null; } };

export async function request(method, path, body, headers = {}) {
  /** @type {RequestInit} */
  const init = { method, headers: { ...jsonHeaders, ...headers }, credentials: 'include' };
  if (body !== undefined) init.body = JSON.stringify(body);
  const resp = await fetch(`${API_BASE_URL}${path}`, init);
  if (!resp.ok) {
    const msg = await safeJson(resp);
    const error = new Error(msg?.message || `Request failed: ${resp.status}`);
    error['status'] = resp.status;
    throw error;
  }
  return await safeJson(resp);
}

export const get = (p, headers) => request('GET', p, undefined, headers);
export const post = (p, b, headers) => request('POST', p, b, headers);
export const patchReq = (p, b, headers) => request('PATCH', p, b, headers);
export const del = (p, headers) => request('DELETE', p, undefined, headers);

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

export const makeEntity = (path) => ({
  async list(sort, limit) {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort === '-created_date' ? '-createdAt' : (sort === 'created_date' ? 'createdAt' : String(sort)));
    if (limit) params.set('limit', String(limit));
    const url = `${path}${params.toString() ? `?${params.toString()}` : ''}`;
    const data = await get(url);
    return Array.isArray(data) ? data : (data ? [data] : []);
  },
  async filter(query = {}, sort, limit) {
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

export const entities = {
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
