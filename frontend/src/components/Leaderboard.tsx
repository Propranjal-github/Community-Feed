import React from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, TrendingUp, Clock } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, loading }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-5 sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-yellow-500" size={20} />
          Top Makers
        </h2>
        <div className="bg-slate-700/50 text-slate-300 text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
          <Clock size={10} />
          Last 24h
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        Points earned from likes on posts (5pts) and comments (1pt) within the rolling 24-hour window.
      </p>

      {loading ? (
        <div className="space-y-4 animate-pulse">
           {[1,2,3].map(i => (
             <div key={i} className="h-12 bg-slate-700 rounded-lg"></div>
           ))}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div 
              key={entry.user.id} 
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/30 transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold text-sm ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-700' : 'text-slate-500'}`}>
                  #{entry.rank}
                </span>
                <img 
                  src={entry.user.avatarUrl} 
                  alt={entry.user.username} 
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium text-slate-200 text-sm">
                  {entry.user.username}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp size={12} className="text-emerald-500" />
                <span className="text-emerald-400 font-bold text-sm">
                  {entry.score}
                </span>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-center py-4 text-slate-500 text-sm">
              No activity in last 24h
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-slate-700 text-center">
        <a href="#" className="text-xs text-emerald-500 hover:text-emerald-400 font-medium">
          View All Rankings →
        </a>
      </div>
    </div>
  );
};