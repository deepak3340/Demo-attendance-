import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { StaffAttendanceStatus, DailyStaffAttendance } from '../../types';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  AlertCircle
} from 'lucide-react';

export const TeacherAttendance: React.FC = () => {
  const { currentUser } = useAuth();
  const todayDate = storage.getTodayInKolkata();
  const [selectedDate, setSelectedDate] = useState(() => todayDate);
  const [staffMembers, setStaffMembers] = useState(() => storage.getStaffMembers().filter(s => s.status === 'active'));

  const [attendanceDraft, setAttendanceDraft] = useState<{
    [staffId: string]: { status: StaffAttendanceStatus; remarks: string };
  }>({});
  const [existingRecord, setExistingRecord] = useState<DailyStaffAttendance | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadDateAttendance = () => {
    const currentStaff = storage.getStaffMembers().filter(s => s.status === 'active');
    setStaffMembers(currentStaff);
    const existing = storage.getStaffAttendanceByDate(selectedDate);
    setExistingRecord(existing || null);

    const draft: { [staffId: string]: { status: StaffAttendanceStatus; remarks: string } } = {};
    currentStaff.forEach((s) => {
      if (existing) {
        const found = existing.records.find(r => r.staffId === s.id);
        if (found) {
          draft[s.id] = { status: found.status, remarks: found.remarks || '' };
          return;
        }
      }
      draft[s.id] = { status: 'present', remarks: '' };
    });
    setAttendanceDraft(draft);
  };

  useEffect(() => {
    loadDateAttendance();
  }, [selectedDate]);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      loadDateAttendance();
    });
    return unsub;
  }, [selectedDate]);

  const handleStatusChange = (staffId: string, status: StaffAttendanceStatus) => {
    setAttendanceDraft(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        status,
      },
    }));
  };

  const handleRemarksChange = (staffId: string, remarks: string) => {
    setAttendanceDraft(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        remarks,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');
    setSuccessMsg('');

    const records = staffMembers.map((s) => ({
      staffId: s.id,
      staffUid: s.uid,
      staffName: s.fullName,
      status: attendanceDraft[s.id]?.status || 'present',
      remarks: attendanceDraft[s.id]?.remarks || '',
    }));

    const res = storage.saveStaffAttendance(selectedDate, records, currentUser);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to save staff attendance.');
      return;
    }
    setSuccessMsg(`Faculty attendance for ${selectedDate} saved successfully.`);
    loadDateAttendance();
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleMarkAllPresent = () => {
    setAttendanceDraft(prev => {
      const updated: any = {};
      staffMembers.forEach(s => {
        updated[s.id] = { status: 'present', remarks: prev[s.id]?.remarks || '' };
      });
      return updated;
    });
  };

  const presentCount = Object.values(attendanceDraft).filter(v => v.status === 'present').length;
  const absentCount = Object.values(attendanceDraft).filter(v => v.status === 'absent').length;
  const leaveCount = Object.values(attendanceDraft).filter(v => v.status === 'on_leave').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Teacher Attendance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Solely managed by the Principal. Record daily teacher presence, leave, and absences with real-time cloud sync.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
          >
            Mark All Present
          </button>
        </div>
      </div>

      {/* Date Selector & Summary Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="text-xs font-semibold text-slate-600">Select Date:</span>
          <input
            type="date"
            max={todayDate}
            value={selectedDate}
            onChange={(e) => {
              const val = e.target.value;
              if (val > todayDate) {
                setErrorMsg(`Future attendance is prohibited. Cannot select ${val}.`);
                return;
              }
              setSelectedDate(val);
            }}
            className="px-2.5 sm:px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono bg-white focus:border-indigo-600 outline-none"
          />
          <button
            type="button"
            onClick={loadDateAttendance}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm cursor-pointer touch-manipulation"
          >
            View
          </button>
        </div>

        {/* Real-time counters */}
        <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 text-center sm:text-left">
          <span className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] sm:text-xs font-bold">
            <CheckCircle2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>{presentCount} Present</span>
          </span>
          <span className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[11px] sm:text-xs font-bold">
            <XCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>{absentCount} Absent</span>
          </span>
          <span className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[11px] sm:text-xs font-bold">
            <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>{leaveCount} Leave</span>
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Staff Roster */}
      {staffMembers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">No Active Faculty Members</h3>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">
            You currently have no registered teachers in the system. Add your staff members in the &quot;Staff Directory&quot; first before recording daily staff attendance.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffMembers.map((staff) => {
                  const currentStatus = attendanceDraft[staff.id]?.status || 'present';
                  const currentRemarks = attendanceDraft[staff.id]?.remarks || '';
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {staff.fullName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-900">
                        {staff.uid}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {staff.designation || 'Teacher'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(staff.id, e.target.value as StaffAttendanceStatus)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                            currentStatus === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : currentStatus === 'absent'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="on_leave">On Leave</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={currentRemarks}
                          onChange={(e) => handleRemarksChange(staff.id, e.target.value)}
                          placeholder="Optional notes..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-3">
          {staffMembers.map((staff) => {
            const currentStatus = attendanceDraft[staff.id]?.status || 'present';
            const currentRemarks = attendanceDraft[staff.id]?.remarks || '';
            return (
              <div
                key={staff.id}
                className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{staff.fullName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">UID: {staff.uid} &bull; {staff.designation || 'Teacher'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(staff.id, 'present')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(staff.id, 'absent')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Absent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(staff.id, 'on_leave')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      currentStatus === 'on_leave'
                        ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Leave
                  </button>
                </div>
                <input
                  type="text"
                  value={currentRemarks}
                  onChange={(e) => handleRemarksChange(staff.id, e.target.value)}
                  placeholder="Optional remarks..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-end gap-3 sticky bottom-3 z-10">
          <button
            type="button"
            onClick={loadDateAttendance}
            className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Faculty Attendance</span>
          </button>
        </div>
      </form>
      )}
    </div>
  );
};
