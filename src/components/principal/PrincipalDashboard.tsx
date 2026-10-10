import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import {
  Users,
  BookOpen,
  CalendarCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  FileSpreadsheet,
  UserPlus,
  ShieldCheck,
  Eye,
  Briefcase,
  Archive,
  CalendarRange
} from 'lucide-react';

interface PrincipalDashboardProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenArchivedModal?: () => void;
}

export const PrincipalDashboard: React.FC<PrincipalDashboardProps> = ({
  onNavigate,
  onOpenArchivedModal,
}) => {
  const [todayStr, setTodayStr] = useState(() => storage.getTodayInKolkata());
  const [stats, setStats] = useState(() => storage.getPrincipalDashboardStats(todayStr));

  // Subscribe to real-time storage & Firestore snapshot updates
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      const today = storage.getTodayInKolkata();
      setTodayStr(today);
      setStats(storage.getPrincipalDashboardStats(today));
    });
    return unsub;
  }, []);

  const archivedClassesCount = storage.getArchivedClasses().length;
  const archivedStudentsCount = storage.getArchivedStudents().length;
  const archivedStaffCount = storage.getArchivedStaff().length;
  const totalArchived = archivedClassesCount + archivedStudentsCount + archivedStaffCount;

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 sm:p-7 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Principal Console • Live Cloud Connected</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome, Principal
          </h2>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1">
            Real-time school attendance operations, verification controls, and database updates
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white font-medium">
            <Calendar className="w-4 h-4 text-indigo-300" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Staff */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Active Staff
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800">
              {stats.totalStaff}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Teachers</span>
          </div>
        </div>

        {/* Total Classes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Active Classes
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800">
              {stats.totalClasses}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Standards</span>
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Today Attendance
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800">
              {stats.studentAttendanceRate}%
            </span>
            <span className="text-[11px] sm:text-xs text-emerald-600 font-medium truncate">
              {stats.todayPresent} Present
            </span>
          </div>
        </div>

        {/* Pending Submissions */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Pending Classes
            </span>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
              stats.pendingClassesCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className={`text-xl sm:text-2xl md:text-3xl font-extrabold ${
              stats.pendingClassesCount > 0 ? 'text-amber-600' : 'text-slate-800'
            }`}>
              {stats.pendingClassesCount}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
              To be marked
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Attendance & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Attendance */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Recent Attendance Submissions (Live)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Class-wise daily logs syncing across devices in real time
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('student-attendance')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.recentActivity.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No recent attendance submissions found. Click below to mark student attendance.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3 text-center">Present</th>
                      <th className="py-2.5 px-3 text-center">Absent</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {stats.recentActivity.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="py-3 px-3 font-bold text-indigo-900">
                          {rec.className} {rec.section ? `(Sec ${rec.section})` : ''}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {rec.presentCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {rec.absentCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {rec.isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Open
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate('student-attendance', { date: rec.date, classId: rec.classId })}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="sm:hidden divide-y divide-slate-100 -mx-1">
                {stats.recentActivity.map((rec) => (
                  <div key={rec.id} className="py-3 px-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-indigo-950">{rec.className}</span>
                        {rec.isLocked ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Locked
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            Open
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        {rec.date} &bull; <strong className="text-emerald-700">{rec.presentCount} P</strong>, <strong className="text-rose-700">{rec.absentCount} A</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('student-attendance', { date: rec.date, classId: rec.classId })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 shrink-0 flex items-center gap-1 touch-manipulation cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Quick Actions & Today's Staff Attendance */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-800 mb-3">
              Quick Operations
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigate('student-attendance')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs border border-indigo-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-4 h-4 text-indigo-600" />
                  <span>Student Attendance Review</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('staff-attendance')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold text-xs border border-purple-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  <span>Mark Faculty Attendance</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('academic-years')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs border border-emerald-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarRange className="w-4 h-4 text-emerald-600" />
                  <span>Academic Sessions & Promotion</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Monthly Registers / Excel</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('timetable')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Timetable & Periods</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('staff')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <span>Manage Staff Accounts</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Today's Staff Attendance Snapshot */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Today Faculty Attendance
              </h4>
              <button
                type="button"
                onClick={() => onNavigate('staff-attendance')}
                className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Update
              </button>
            </div>
            {stats.staffAttendanceSummary ? (
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-lg font-extrabold text-emerald-700">
                    {stats.staffAttendanceSummary.present}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase">Present</p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                  <p className="text-lg font-extrabold text-rose-700">
                    {stats.staffAttendanceSummary.absent}
                  </p>
                  <p className="text-[10px] font-semibold text-rose-600 uppercase">Absent</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-lg font-extrabold text-amber-700">
                    {stats.staffAttendanceSummary.onLeave}
                  </p>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase">On Leave</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between mt-2">
                <span>Teacher attendance not yet marked for today.</span>
                <button
                  type="button"
                  onClick={() => onNavigate('staff-attendance')}
                  className="font-bold text-amber-900 underline cursor-pointer"
                >
                  Mark Now
                </button>
              </div>
            )}
          </div>

          {/* Archived Records Access Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Archived Records Trash
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {totalArchived} soft-deleted items preserved
                  </p>
                </div>
              </div>
              {onOpenArchivedModal && (
                <button
                  type="button"
                  onClick={onOpenArchivedModal}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  View Trash
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
