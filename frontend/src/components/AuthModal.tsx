import React, { useState } from 'react';
import { X, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultTab?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess, defaultTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'login') {
        await api.login(username, password);
      } else {
        await api.signup(username, password);
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header with Tabs */}
        <div className="flex border-b border-slate-700">
          <button 
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'login' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Log In
          </button>
          <button 
            onClick={() => { setActiveTab('signup'); setError(''); }}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'signup' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sign Up
          </button>
          <button onClick={onClose} className="px-4 text-slate-500 hover:text-slate-300">
             <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
             <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Username</label>
             <input
                type="text"
                autoFocus
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
             />
          </div>

          <div>
             <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Password</label>
             <input
                type="password"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
             />
          </div>
          
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all mt-6"
          >
            {loading ? (
              <span>Please wait...</span>
            ) : (
              <>
                {activeTab === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                {activeTab === 'login' ? 'Log In' : 'Create Account'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
