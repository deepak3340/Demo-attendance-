import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Eye, Lock } from 'lucide-react';

interface StaffAttendanceHistoryProps {
  onViewRecord: (date: string, classId: string) => void;
}

export const StaffAttendanceHistory: React.FC<StaffAttendanceHistoryProps> = ({ onViewRecord }) => {
  const { currentUser } = useAuth();
  const [filterClassId, setFilterClassId] = useState('all');
  const [, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setRefreshKey(prev => prev + 1);
    });
    return unsub;
  }, []);

  if (!currentUser) return null;

  const assignments = storage.getAssignmentsForTeacher(currentUser.id);
  const assignedClassIds = Array.from(new Set(assignments.map(a => a.classId)));
  const allAttendance = storage.getAllStudentAttendance().filter(a =>
    assignedClassIds.includes(a.classId)
  );

  const classes = storage.getClasses().filter(c => assignedClassIds.includes(c.id));
  const filtered = allAttendance.filter(a =>
    filterClassId === 'all' ? true : a.classId === filterClassId
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Class Attendance Submission History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log of previously recorded student attendance for your assigned classes (Cloud Synced)
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Filter Class:</span>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600 font-semibold"
          >
            <option value="all">All My Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* History Table & Mobile Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4 text-center">Present</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4 text-center">Lock Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No historical attendance submissions found.
                  </td>
                </tr>
              ) : (
                filtered.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {rec.date}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {rec.className} {rec.section ? `(Sec ${rec.section})` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs">
                        {rec.presentCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-rose-700 bg-rose-50 border border-rose-200 text-xs">
                        {rec.absentCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {rec.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          Editable
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onViewRecord(rec.date, rec.classId)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No historical attendance submissions found.
            </div>
          ) : (
            filtered.map(rec => (
              <div key={rec.id} className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{rec.className}</p>
                    <p className="text-xs font-mono text-slate-500">{rec.date}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewRecord(rec.date, rec.classId)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer touch-manipulation"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rec.presentCount} Present
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {rec.absentCount} Absent
                    </span>
                  </div>
                  {rec.isLocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Editable
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
