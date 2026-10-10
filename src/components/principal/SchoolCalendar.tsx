import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Holiday, SchoolCalendarConfig } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Plus,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';

export const SchoolCalendar: React.FC = () => {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState<SchoolCalendarConfig>(() => storage.getCalendarConfig());
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<'national' | 'festival' | 'vacation' | 'school'>('festival');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const refreshConfig = () => {
    setConfig(storage.getCalendarConfig());
  };

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      refreshConfig();
    });
    return unsub;
  }, []);

  const handleOpenAdd = () => {
    setName('');
    const today = storage.getTodayInKolkata();
    setStartDate(today);
    setEndDate(today);
    setType('festival');
    setDescription('');
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');

    if (!name.trim() || !startDate || !endDate) {
      setErrorMsg('Please fill in holiday name and dates.');
      return;
    }
    if (startDate > endDate) {
      setErrorMsg('Start date cannot be after end date.');
      return;
    }

    storage.addHoliday(
      {
        name: name.trim(),
        startDate,
        endDate,
        type,
        description: description.trim() || undefined,
      },
      currentUser
    );

    refreshConfig();
    setIsAddModalOpen(false);
  };

  const handleDeleteHoliday = (id: string) => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Remove Holiday?',
      message: 'Are you sure you want to remove this holiday from the school calendar?',
      confirmText: 'Remove Holiday',
      onConfirm: () => {
        storage.deleteHoliday(id, currentUser);
        refreshConfig();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            School Calendar & Holidays
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configured non-working days and vacations are automatically excluded from attendance denominator
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Holiday</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Academic Year
          </p>
          <p className="text-xl font-extrabold text-slate-800 mt-1 font-mono">
            {config.academicYear}
          </p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Weekly Non-Working Days
          </p>
          <div className="flex gap-1.5 mt-2">
            {config.weeklyOffDays.map((d) => (
              <span
                key={d}
                className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Declared Holidays
          </p>
          <p className="text-xl font-extrabold text-indigo-700 mt-1">
            {config.holidays.length} Events
          </p>
        </div>
      </div>

      {/* Holidays List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Institutional Holidays Schedule
          </span>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Event / Holiday Name</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {config.holidays.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {h.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                    {h.startDate === h.endDate ? h.startDate : `${h.startDate} to ${h.endDate}`}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      h.type === 'national'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : h.type === 'festival'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {h.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {h.description || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-slate-100">
          {config.holidays.map((h) => (
            <div key={h.id} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900">{h.name}</p>
                  <p className="text-xs text-indigo-700 font-mono font-semibold">
                    {h.startDate === h.endDate ? h.startDate : `${h.startDate} to ${h.endDate}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteHoliday(h.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer touch-manipulation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  h.type === 'national'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : h.type === 'festival'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {h.type}
                </span>
                <span className="text-slate-500 text-[11px] truncate max-w-[180px]">
                  {h.description || 'Institutional Holiday'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-indigo-100 relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Add School Holiday
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter holiday details to exclude from working days
            </p>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveHoliday} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Diwali Vacation"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none"
                >
                  <option value="national">National Holiday</option>
                  <option value="festival">Festival Holiday</option>
                  <option value="vacation">Vacation / Term Break</option>
                  <option value="school">School Specific Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Official gazetted school break"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant="danger"
      />
    </div>
  );
};
