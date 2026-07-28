import { get, post } from './client';

export function ensureGuest() {
  try {
    const existing = localStorage.getItem('app_guest_user');
    if (existing) return JSON.parse(existing);
  } catch { }
  const guest = { id: 'guest', email: 'guest@example.com', full_name: 'Guest User' };
  try { localStorage.setItem('app_guest_user', JSON.stringify(guest)); } catch { }
  return guest;
}

export const auth = {
  async me() {
    try {
      return await get('/api/auth/me');
    } catch (error) {
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
  async verifyEmail({ token }) {
    return get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  },
  async resendVerification({ email }) {
    return post('/api/auth/resend-verification', { email });
  },
  async firebaseLogin({ idToken, full_name = undefined, avatar = undefined }) {
    return post('/api/auth/firebase', { idToken, full_name, avatar });
  },
  async logout(redirectUrl) {
    try {
      await post('/api/auth/logout', {});
    } catch { }
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
