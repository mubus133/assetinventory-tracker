import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, Mail, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await api.auth.loginWithGoogle();
      // Navigation handled by useEffect
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google Login failed. Please ensure your institutional account is authorized.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.auth.login({ email, password });
      // Navigation handled by useEffect
    } catch (err: any) {
      console.error('Login Error:', err);
      let message = 'Invalid email or password. Please try again.';
      if (err.message) {
        if (err.message.includes('auth/invalid-credential')) {
          message = 'Invalid email or password. Check your entries and try again.';
        } else if (err.message.includes('auth/user-disabled')) {
          message = 'This account has been disabled. Please contact the administrator.';
        } else {
          message = err.message;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent text-black rounded-xl shadow-2xl mb-6 font-bold text-2xl">
            C
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">CRESCENT UNIVERSITY</h1>
          <p className="text-text-secondary text-sm mt-2 uppercase tracking-widest font-medium">Asset Management Console</p>
        </div>

        <div className="bg-bg-card p-8 rounded-2xl shadow-2xl border border-border">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-8">Institutional Login</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none transition-all text-sm text-text-primary placeholder:text-text-secondary/30"
                  placeholder="admin@crescent.edu.ng"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none transition-all text-sm text-text-primary placeholder:text-text-secondary/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3 rounded-lg shadow-lg shadow-accent/10 transition-all flex items-center justify-center gap-2 disabled:opacity-70 uppercase text-xs tracking-widest"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Access Terminal'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black"><span className="bg-bg-card px-4 text-text-secondary">Or Secure Login via</span></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-70 uppercase text-[10px] tracking-widest border border-slate-200"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
              Sign in with institutional Google Workspace
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-border text-center">
            <p className="text-[10px] text-text-secondary uppercase tracking-[0.2em] font-bold">
              Secure Three-Tier Architecture
            </p>
          </div>
        </div>

        <p className="text-center text-text-secondary text-[10px] mt-12 uppercase tracking-widest">
          © {new Date().getFullYear()} Crescent University ICT Department
        </p>
      </div>
    </div>
  );
};
