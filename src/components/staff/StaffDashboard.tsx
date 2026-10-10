import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import {
  Calendar,
  Clock,
  CalendarCheck,
  BookOpen,
  ArrowRight,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface StaffDashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setRefreshKey(prev => prev + 1);
    });
    return unsub;
  }, []);

  if (!currentUser) return null;

  const todayStr = storage.getTodayInKolkata();
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  const todayDayName = storage.getDayOfWeekInKolkata();
  const assignments = storage.getAssignmentsForTeacher(currentUser.id);
  const assignedClassIds = Array.from(new Set(assignments.map(a => a.classId)));
  const classes = storage.getClasses().filter(c => assignedClassIds.includes(c.id));
  const allTimetable = storage.getTimetable();
  const periods = storage.getPeriods();

  const todaySlots = allTimetable.filter(
    t => t.teacherId === currentUser.id && t.dayOfWeek === todayDayName
  );
  todaySlots.sort((a, b) => a.periodNumber - b.periodNumber);

  const allAttendance = storage.getAllStudentAttendance().filter(a => a.date === todayStr);
  const pendingClasses = classes.filter(c => !allAttendance.some(a => a.classId === c.id));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 sm:p-7 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Faculty Console • Live Real-time Sync Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome, {currentUser.fullName}
          </h2>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1">
            UID: <span className="font-mono font-bold text-white">{currentUser.uid}</span> &bull; {currentUser.designation || 'Faculty'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white font-medium self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-indigo-300" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Attendance Pending Alert */}
      {pendingClasses.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Today&apos;s Class Attendance Pending</p>
              <p className="text-amber-800 text-xs">
                Attendance has not been submitted for:{' '}
                <span className="font-semibold">{pendingClasses.map(c => c.name).join(', ')}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('mark-attendance', { classId: pendingClasses[0].id })}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            Mark Now
          </button>
        </div>
      )}

      {/* Today's Schedule & Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Today's Classes */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Today&apos;s Schedule ({todayDayName})
              </h3>
              <p className="text-xs text-slate-500">
                Your periods and assigned classes for today
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('my-timetable')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySlots.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-medium">No scheduled periods for you today.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Enjoy your preparation periods or school activities.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySlots.map((slot) => {
                const periodConfig = periods.find(p => p.periodNumber === slot.periodNumber);
                const timeString = periodConfig ? `${periodConfig.startTime} - ${periodConfig.endTime}` : 'Scheduled';
                return (
                  <div
                    key={slot.id}
                    className="p-3.5 sm:p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm shadow-indigo-600/20">
                        P{slot.periodNumber}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-900">
                            {timeString}
                          </span>
                          <span className="font-bold text-sm text-slate-800">
                            {slot.className}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          Subject: <span className="text-indigo-700 font-semibold">{slot.subjectName}</span> &bull; {slot.room || 'Main Block'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('mark-attendance', { classId: slot.classId })}
                      className="w-full sm:w-auto justify-center px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer touch-manipulation"
                    >
                      <span>Take Attendance</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick Access Cards */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Quick Access
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('mark-attendance')}
                className="w-full p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 border border-indigo-200/80 text-left transition-all flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-indigo-600/20">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-indigo-950">
                    Mark Attendance
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Class-wise daily roll call
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('my-timetable')}
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-slate-800/10">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">
                    My Timetable
                  </p>
                  <p className="text-[11px] text-slate-500">
                    View weekly period schedule
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('my-classes')}
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-emerald-600/10">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">
                    My Classes
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {classes.length} Authorized Classes
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Assigned Subjects Summary */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Teaching Assignments
            </h4>
            <div className="space-y-2 mt-3">
              {assignments.map(asg => (
                <div key={asg.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className="font-bold text-slate-800">{asg.className}</span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                    {asg.subjectName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
