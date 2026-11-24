import React, { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { serverApi, signInWithGoogleFirebase, ensureFirebaseProfile, type AppStateSnapshot } from '../lib/snackApi';
import type { User } from 'firebase/auth';

interface Props {
  isOpen: boolean;
  initialTab?: 'login' | 'signup';
  onClose: () => void;
  onServerAuthSuccess: (token: string, state: AppStateSnapshot) => void;
  onFirebaseAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  initialTab = 'signup',
  onClose,
  onServerAuthSuccess,
  onFirebaseAuthSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    setTab(initialTab);
    setError(null);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (tab === 'signup' && !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setError('Username must be 3–20 characters (letters, numbers, underscores).');
      return;
    }

    setBusy(true);
    try {
      const res =
        tab === 'signup'
          ? await serverApi.register(cleanEmail, password, username.trim())
          : await serverApi.login(cleanEmail, password);
      onServerAuthSuccess(res.token, res.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await serverApi.demoLogin(username.trim() || undefined);
      onServerAuthSuccess(res.token, res.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start demo session.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const user = await signInWithGoogleFirebase();
      await ensureFirebaseProfile(user, username.trim() || undefined);
      onFirebaseAuthSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In was cancelled or blocked.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-[#131822] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-white font-display">
              {tab === 'signup' ? 'Create your SnackStakes account' : 'Log in to SnackStakes'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              500 starter Coins + Egg &amp; Monday Snack tokens included
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Segmented Tab Control */}
          <div className="grid grid-cols-2 p-1 bg-[#0B0E14] rounded-lg border border-white/8">
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tab === 'signup'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tab === 'login'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {tab === 'signup' && (
              <div>
                <label htmlFor="auth-username" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Unique Username
                </label>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. TundeVIP"
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0E14] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0E14] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0E14] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {tab === 'signup' ? 'Create Account & Enter Lounge' : 'Log In to Lounge'}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-white/8" />
            <span className="px-3 text-xs text-slate-500">or instant access</span>
            <div className="flex-grow border-t border-white/8" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={handleQuickDemo}
              className="py-2.5 px-3 rounded-lg bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Demo Mode
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleSignIn}
              className="py-2.5 px-3 rounded-lg bg-white/5 border border-white/12 hover:bg-white/10 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
