import { api } from '@/api/apiClient';
import { signInWithGooglePopup } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Chrome, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get('redirect');
  const redirect = (redirectParam && redirectParam.startsWith('/')) ? redirectParam : '/';

  const saveStreakPending = (resp) => {
    try {
      const u = resp?.user || resp;
      if (u && u.streakChanged) {
        sessionStorage.setItem('pendingStreakPopup', JSON.stringify({
          streakChanged: u.streakChanged,
          streakIncreased: u.streakIncreased,
          streakReset: u.streakReset,
          previousStreak: u.previousStreak ?? 0,
          isFirstLogin: u.isFirstLogin,
          streak: u.streak ?? 0,
        }));
      }
    } catch { }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      if (!emailOk) throw new Error('Please enter a valid email');
      if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');
      const resp = await api.auth.login({ email, password });
      saveStreakPending(resp);
      window.location.href = redirect;
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGLoading(true);
    try {
      const { idToken } = await signInWithGooglePopup();
      const resp = await api.auth.firebaseLogin({ idToken });
      saveStreakPending(resp);
      window.location.href = redirect;
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-950 to-blue-950 text-slate-50 overflow-hidden">
      <div className="absolute -top-24 -right-24 w-[36rem] h-[36rem] bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-[36rem] h-[36rem] bg-gradient-to-br from-blue-600/20 to-cyan-500/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
            <span className="text-white font-black text-xl">SU</span>
          </div>
          <h1 className="mt-3 text-3xl font-black">Welcome back</h1>
          <p className="text-sm text-slate-300">Sign in to continue your practice journey</p>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 backdrop-blur p-6 shadow-xl">
          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-800 rounded px-3 py-2">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm mb-1" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </motion.button>
            <div className="relative py-1 text-center text-xs text-slate-400">or</div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleGoogle}
              disabled={gLoading}
              className="w-full py-3 rounded-xl border border-slate-700 bg-slate-950 font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Chrome className="w-4 h-4" />
              {gLoading ? 'Continuing...' : 'Continue with Google'}
            </motion.button>
          </form>
          <p className="mt-4 text-sm text-center text-slate-300">
            Don't have an account?{' '}
            <Link to={redirectParam ? `/Register?redirect=${encodeURIComponent(redirectParam)}` : '/Register'} className="text-blue-400 hover:underline">Create one</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
