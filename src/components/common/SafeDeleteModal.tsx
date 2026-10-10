import React, { useState } from 'react';
import { AlertTriangle, Archive, Trash2, ShieldAlert, X, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface SafeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'Class' | 'Subject' | 'Staff' | 'Student';
  itemId: string;
  itemName: string;
  dependencySummary?: {
    label: string;
    count: number;
    description: string;
  }[];
  onArchive: () => Promise<void> | void;
  onPermanentDelete: (forceCascade: boolean) => Promise<void> | void;
}

export const SafeDeleteModal: React.FC<SafeDeleteModalProps> = ({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName,
  dependencySummary = [],
  onArchive,
  onPermanentDelete,
}) => {
  const { reauthenticate } = useAuth();
  const [mode, setMode] = useState<'choose' | 'confirm_name' | 'second_warning_auth'>('choose');
  const [typedName, setTypedName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [forceCascade, setForceCascade] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const totalDependencies = dependencySummary.reduce((acc, d) => acc + d.count, 0);

  const resetAndClose = () => {
    if (isProcessing) return;
    setMode('choose');
    setTypedName('');
    setAdminPassword('');
    setForceCascade(false);
    setErrorMessage('');
    onClose();
  };

  const handleExecuteArchive = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      await onArchive();
      resetAndClose();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to archive item.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (typedName.trim().toLowerCase() !== itemName.trim().toLowerCase()) {
      setErrorMessage(`Name does not match. Please type "${itemName}" exactly to proceed.`);
      return;
    }
    setMode('second_warning_auth');
  };

  const handleExecutePermanentDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const reauthRes = await reauthenticate(adminPassword);
      if (!reauthRes.success) {
        setErrorMessage(reauthRes.error || 'Administrator password verification failed.');
        setIsProcessing(false);
        return;
      }

      const verifyRes = await fetch('/api/records/verify-permanent-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('ams_auth_token') || ''}`
        },
        body: JSON.stringify({
          itemType,
          itemId,
          expectedName: itemName,
          confirmationInput: typedName,
          hasDependencies: totalDependencies > 0,
          confirmCascade: forceCascade
        })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setErrorMessage(verifyData.error || 'Backend verification failed.');
        setIsProcessing(false);
        return;
      }

      await onPermanentDelete(forceCascade);
      resetAndClose();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to complete permanent deletion.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={resetAndClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative animate-scaleIn max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={resetAndClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            mode === 'choose' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
          }`}>
            {mode === 'choose' ? <Archive className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {mode === 'choose' && `Safe Removal Protocol: ${itemType}`}
              {mode === 'confirm_name' && `Step 1 of 2: Type Item Name to Confirm`}
              {mode === 'second_warning_auth' && `Step 2 of 2: Irreversible Action Verification`}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Target: <span className="font-bold text-slate-800">&quot;{itemName}&quot;</span>
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {mode === 'choose' && (
          <div className="space-y-4 text-xs">
            {totalDependencies > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Linked Historical Records Detected:</span>
                </p>
                <div className="space-y-1 pl-5 text-[11px] text-amber-800">
                  {dependencySummary.map((dep, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{dep.label}:</span>
                      <strong className="font-mono">{dep.count} records</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <Archive className="w-4 h-4 text-emerald-700" />
                <span>Recommended: Archive / Soft Delete</span>
              </div>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                Hides this {itemType.toLowerCase()} from active attendance rosters, while <strong>safely preserving all historical student attendance</strong> and timetable logs. You can restore it anytime with one click.
              </p>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteArchive}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                {isProcessing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Archive &quot;{itemName}&quot; (Safe)</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setMode('confirm_name')}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanent Destruction Protocol...</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'confirm_name' && (
          <form onSubmit={handleProceedToStep2} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
              <p className="font-bold mb-1">Step 1 Confirmation (Anti-Accidental Delete)</p>
              <p>
                To prevent accidental deletion, please type the exact name{' '}
                <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-300 text-rose-800">
                  {itemName}
                </strong>{' '}
                below to continue.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type <span className="font-mono text-rose-700">&quot;{itemName}&quot;</span> to confirm:
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={`Type "${itemName}" here`}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium focus:border-rose-600 focus:ring-2 focus:ring-rose-100 outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={typedName.trim().toLowerCase() !== itemName.trim().toLowerCase()}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Step 2</span>
                <span>&rarr;</span>
              </button>
            </div>
          </form>
        )}

        {mode === 'second_warning_auth' && (
          <form onSubmit={handleExecutePermanentDelete} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-950 text-[11px] leading-relaxed">
              <div className="flex items-center gap-2 font-bold mb-1 text-rose-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Second & Final Confirmation: Irreversible Action</span>
              </div>
              <p>
                Permanent deletion will <strong>completely purge this {itemType.toLowerCase()}</strong> from both local storage and cloud database.
                This action cannot be undone under any circumstances.
              </p>
            </div>

            {totalDependencies > 0 && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceCascade}
                  onChange={(e) => setForceCascade(e.target.checked)}
                  required
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-[11px] text-slate-700 leading-tight">
                  I understand that {totalDependencies} linked records exist, and I explicitly confirm permanent cascade removal of these links.
                </span>
              </label>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Re-enter Administrator Password for Authorization:</span>
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter Principal password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:border-rose-600 outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setMode('confirm_name')}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={isProcessing || !adminPassword}
                className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-lg shadow-rose-700/30 transition-all flex items-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Authorize Permanent Destruction</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
