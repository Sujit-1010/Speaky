import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, Mail, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please check your verification link.');
      return;
    }

    let isMounted = true;
    async function doVerify() {
      try {
        const res = await api.auth.verifyEmail({ token });
        if (isMounted) {
          setStatus('success');
          setMessage(res?.message || 'Email verified successfully! You can now log in.');
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setMessage(err.message || 'Verification failed. The token may be invalid or expired.');
        }
      }
    }

    doVerify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Countdown timer for automatic redirect on success
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/Login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendError('');
    setResendSuccess('');
    setResendLoading(true);

    try {
      if (!resendEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(resendEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      const res = await api.auth.resendVerification({ email: resendEmail });
      setResendSuccess(res?.message || 'Verification link sent! Check your inbox.');
    } catch (err) {
      setResendError(err.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-950 to-blue-950 text-slate-50 overflow-hidden px-4">
      {/* Dynamic Background Blurs */}
      <div className="absolute -top-24 -right-24 w-[36rem] h-[36rem] bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-[36rem] h-[36rem] bg-gradient-to-br from-blue-600/20 to-cyan-500/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="mb-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
            <span className="text-white font-black text-xl">SU</span>
          </div>
          <h1 className="mt-3 text-3xl font-black">Email Verification</h1>
          <p className="text-sm text-slate-300">SpeakUp Account Security</p>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 backdrop-blur p-6 shadow-xl text-center">
          {status === 'verifying' && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
              <p className="text-slate-300 font-medium">Verifying your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-emerald-300">Email Verified!</h2>
              <p className="text-sm text-slate-300">{message}</p>

              <div className="pt-4 w-full">
                <Link to="/Login">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>Sign In Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <p className="mt-3 text-xs text-slate-400">
                  Redirecting to login in <span className="text-purple-400 font-bold">{countdown}</span> seconds...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-red-300">Verification Failed</h2>
              <p className="text-sm text-slate-300">{message}</p>

              <div className="w-full border-t border-slate-800 pt-4 mt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-left">
                  Request a new link
                </h3>
                {resendError && (
                  <div className="mb-3 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded px-3 py-2 text-left">
                    {resendError}
                  </div>
                )}
                {resendSuccess && (
                  <div className="mb-3 text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-800 rounded px-3 py-2 text-left">
                    {resendSuccess}
                  </div>
                )}
                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative text-left">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-semibold text-sm transition-colors disabled:opacity-60"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </form>
              </div>

              <div className="pt-2 text-sm text-slate-400">
                Back to{' '}
                <Link to="/Login" className="text-blue-400 hover:underline">
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
