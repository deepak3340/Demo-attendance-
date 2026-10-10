import React, { useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, logout } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleConfirmLogout = async () => {
    setIsProcessing(true);
    try {
      await logout();
      onClose();
    } catch (e) {
      console.error('Logout error:', e);
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative animate-scaleIn text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs border border-rose-100 ring-4 ring-rose-50/50">
          <LogOut className="w-6 h-6 text-rose-600 ml-0.5" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Sign out of Attendance System?
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Signed in as <strong className="text-slate-800">{currentUser.fullName}</strong> ({currentUser.role === 'principal' ? 'Principal Administrator' : 'Faculty Member'}).
        </p>

        <div className="grid grid-cols-2 gap-2.5 mt-6 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirmLogout}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
