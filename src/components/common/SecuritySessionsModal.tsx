import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Monitor, LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveSession } from '../../types';

interface SecuritySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySessionsModal: React.FC<SecuritySessionsModalProps> = ({ isOpen, onClose }) => {
  const { getActiveSessions, logoutAllDevices } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const list = await getActiveSessions();
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      setStatusMsg('');
    }
  }, [isOpen]);

  const handleLogoutAll = async () => {
    setIsLoading(true);
    try {
      await logoutAllDevices();
      onClose();
    } catch {
      setStatusMsg('Failed to sign out of other devices.');
      setIsLoading(false);
    }
  };

  const formatActivityTime = (isoString: string, isCurrent: boolean) => {
    if (isCurrent) return 'Active now';
    try {
      const date = new Date(isoString);
      return `Last active at ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Recently active';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Active Sessions
            </h3>
            <p className="text-xs text-slate-500">
              Devices currently signed in to your account
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-xs border border-amber-200">
            {statusMsg}
          </div>
        )}

        <div className="space-y-2.5 mb-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span>Signed-in Devices ({sessions.length})</span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <span>Checking active devices...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-500 border border-slate-200/80">
              Current device active.
            </div>
          ) : (
            sessions.map((s, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  s.isCurrent
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    s.deviceType === 'Mobile' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {s.deviceType === 'Mobile' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">
                        {s.browser} ({s.deviceType})
                      </span>
                      {s.isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>This device</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatActivityTime(s.lastActivityAt, s.isCurrent)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleLogoutAll}
            disabled={isLoading || sessions.length <= 1}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation disabled:opacity-40"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out All Other Devices</span>
          </button>
        </div>
      </div>
    </div>
  );
};
