import React from 'react';
import { Clock } from 'lucide-react';

interface InactivityWarningModalProps {
  isOpen: boolean;
  countdownSeconds: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  countdownSeconds,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-amber-200 text-center animate-scaleIn">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-50">
          <Clock className="w-8 h-8 animate-pulse text-amber-600" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Session Expiring Soon
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Due to inactivity, your secure session will automatically terminate to protect school attendance records.
        </p>

        <div className="my-5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
          <div className="text-3xl font-extrabold font-mono text-amber-800">
            00:{countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mt-1">
            Seconds remaining
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer touch-manipulation"
          >
            Stay Logged In
          </button>
          <button
            type="button"
            onClick={onLogoutNow}
            className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
};
