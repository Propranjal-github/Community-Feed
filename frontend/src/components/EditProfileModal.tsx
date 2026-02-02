import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

// This component is currently unused in favor of the full AuthModal (Login/Signup).
// Kept for reference but disabled to prevent API errors.

interface EditProfileModalProps {
  currentUsername: string;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 p-6 text-center">
        <div className="flex justify-end">
             <button onClick={onClose}><X className="text-slate-400" /></button>
        </div>
        <ShieldCheck className="mx-auto text-emerald-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-white mb-2">Feature Deprecated</h2>
        <p className="text-slate-400 text-sm">
          Please use the Login/Signup buttons in the navigation bar to manage your identity.
        </p>
      </div>
    </div>
  );
};