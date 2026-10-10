import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Clock, Coffee, Calendar } from 'lucide-react';

export const StaffTimetable: React.FC = () => {
  const { currentUser } = useAuth();
  const daysOfWeek: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  const currentKolkataDay = storage.getDayOfWeekInKolkata();
  const initialDay = daysOfWeek.includes(currentKolkataDay as any) ? (currentKolkataDay as any) : 'Monday';
  const [selectedDay, setSelectedDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'>(initialDay);

  const [timetable, setTimetable] = useState(() =>
    storage.getTimetable().filter(t => t.teacherId === currentUser?.id)
  );
  const [periods, setPeriods] = useState(() => storage.getPeriods());

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setTimetable(storage.getTimetable().filter(t => t.teacherId === currentUser?.id));
      setPeriods(storage.getPeriods());
    });
    return unsub;
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const daySlots = timetable.filter(t => t.dayOfWeek === selectedDay);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          My Weekly Timetable
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your personal academic schedule assigned by the Principal. Read-only view.
        </p>
      </div>

      {/* Day Selector Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {daysOfWeek.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedDay === day
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Timetable Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Schedule for {selectedDay}</span>
          </span>
          <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/50">
            {daySlots.length} Classes Assigned
          </span>
        </div>

        {periods.length === 0 ? (
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              No School Periods Configured
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Timetable bell timings have not been configured by the Principal yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Timing</th>
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Classroom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((p) => {
                  if (p.type === 'break') {
                    return (
                      <tr key={p.id} className="bg-amber-50/50">
                        <td className="py-3 px-4 font-bold text-amber-800 flex items-center gap-2">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>{p.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-700 font-semibold">
                          {p.startTime} - {p.endTime}
                        </td>
                        <td colSpan={3} className="py-3 px-4 text-amber-700 italic font-medium">
                          School Recess / Lunch Break
                        </td>
                      </tr>
                    );
                  }
                  const slot = daySlots.find(s => s.periodNumber === p.periodNumber);
                  if (!slot) {
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-600">
                          {p.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {p.startTime} - {p.endTime}
                        </td>
                        <td colSpan={3} className="py-3 px-4 text-slate-400 italic">
                          Free Period / Preparation Time
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/70 transition-colors bg-indigo-50/10">
                      <td className="py-3.5 px-4 font-bold text-indigo-900">
                        {slot.periodName || p.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {p.startTime} - {p.endTime}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {slot.className}
                        {slot.section && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                            Sec {slot.section}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 text-[11px]">
                          {slot.subjectName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {slot.room || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
