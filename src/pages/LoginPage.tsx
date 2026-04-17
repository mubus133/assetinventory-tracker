import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, Mail, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await api.auth.login({ email, password });
      login(token, user);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
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
