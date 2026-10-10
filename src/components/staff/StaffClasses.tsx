import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { BookOpen, CalendarCheck } from 'lucide-react';

interface StaffClassesProps {
  onNavigateToAttendance: (classId: string) => void;
}

export const StaffClasses: React.FC<StaffClassesProps> = ({ onNavigateToAttendance }) => {
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState(() =>
    currentUser ? storage.getAssignmentsForTeacher(currentUser.id) : []
  );
  const assignedClassIds = Array.from(new Set(assignments.map(a => a.classId)));
  const [classes, setClasses] = useState(() =>
    storage.getClasses().filter(c => assignedClassIds.includes(c.id))
  );

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      if (!currentUser) return;
      const asgs = storage.getAssignmentsForTeacher(currentUser.id);
      setAssignments(asgs);
      const cIds = Array.from(new Set(asgs.map(a => a.classId)));
      const cls = storage.getClasses().filter(c => cIds.includes(c.id));
      setClasses(cls);
      if (!cIds.includes(selectedClassId) && cls.length > 0) {
        setSelectedClassId(cls[0].id);
      }
    });
    return unsub;
  }, [currentUser, selectedClassId]);

  if (!currentUser) return null;

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const roster = selectedClass ? storage.getStudentsByClass(selectedClass.id) : [];
  roster.sort((a, b) => parseInt(a.rollNo, 10) - parseInt(b.rollNo, 10));

  const subjectsForThisClass = assignments
    .filter(a => a.classId === selectedClassId)
    .map(a => a.subjectName);

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            My Assigned Classes & Student Rosters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review your authorized classes, student rosters, and quick links to mark attendance
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            No Classes Assigned Yet
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            You have not been assigned to any classes by the Principal yet. Once assignments are configured, student rosters will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            My Assigned Classes & Student Rosters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review your authorized classes, student rosters, and quick links to mark attendance
          </p>
        </div>
        {selectedClass && (
          <button
            type="button"
            onClick={() => onNavigateToAttendance(selectedClass.id)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer touch-manipulation"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Mark {selectedClass.name} Attendance</span>
          </button>
        )}
      </div>

      {/* Class Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {classes.map(c => {
          const isSelected = c.id === selectedClassId;
          const classStudents = storage.getStudentsByClass(c.id);
          const subs = assignments.filter(a => a.classId === c.id).map(a => a.subjectName);
          const secBadge = c.sections && c.sections.length > 0
            ? c.sections.map(s => 'Sec ' + s).join(', ')
            : (c.section ? `Sec ${c.section}` : 'Single Batch');

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedClassId(c.id)}
              className={`p-4 rounded-3xl text-left transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-base text-slate-900">
                  {c.name}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {secBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {classStudents.length} Students Enrolled
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap gap-1">
                {subs.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-indigo-900">
                    {s}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Student Roster Table */}
      {selectedClass && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {selectedClass.name} Roster &bull; {roster.length} Students
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Teaching: {subjectsForThisClass.join(', ')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white">
                  <th className="py-3 px-4 w-20">Roll No.</th>
                  <th className="py-3 px-4">Student Full Name</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Guardian Contact</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-900">
                      {s.rollNo}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {s.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.gender}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {s.guardianName ? `${s.guardianName} (${s.guardianMobile})` : s.guardianMobile || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Enrolled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
