import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { AttendanceStatus, DailyClassAttendance, Student } from '../../types';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Save,
  Radio
} from 'lucide-react';

interface MarkStudentAttendanceProps {
  initialClassId?: string;
  initialDate?: string;
}

export const MarkStudentAttendance: React.FC<MarkStudentAttendanceProps> = ({
  initialClassId,
  initialDate,
}) => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const assignments = storage.getAssignmentsForTeacher(currentUser.id);
  const assignedClassIds = Array.from(new Set(assignments.map(a => a.classId)));
  const authorizedClasses = storage.getClasses().filter(c => assignedClassIds.includes(c.id));

  const todayDate = storage.getTodayInKolkata();
  const [selectedDate, setSelectedDate] = useState(
    initialDate || todayDate
  );
  const [selectedClassId, setSelectedClassId] = useState(
    initialClassId && assignedClassIds.includes(initialClassId)
      ? initialClassId
      : authorizedClasses[0]?.id || ''
  );

  const getSectionsForClass = (clsId: string) => {
    const cls = authorizedClasses.find(c => c.id === clsId);
    if (!cls) return [];
    return cls.sections && cls.sections.length > 0
      ? cls.sections
      : (cls.section ? [cls.section] : []);
  };

  const initialSections = getSectionsForClass(selectedClassId);
  const assignedSectionForClass = assignments.find(a => a.classId === selectedClassId && a.section)?.section || '';
  const [selectedSection, setSelectedSection] = useState<string>(
    assignedSectionForClass || (initialSections.length > 0 ? initialSections[0] : '')
  );

  const [roster, setRoster] = useState<Student[]>([]);
  const [attendanceDraft, setAttendanceDraft] = useState<{
    [studentId: string]: { status: AttendanceStatus; earlyDepartureNote: string };
  }>({});
  const [existingRecord, setExistingRecord] = useState<DailyClassAttendance | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmOverwriteModal, setConfirmOverwriteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const secs = getSectionsForClass(newClassId);
    const teacherSec = assignments.find(a => a.classId === newClassId && a.section)?.section;
    setSelectedSection(teacherSec || (secs.length > 0 ? secs[0] : ''));
  };

  const loadRosterAndAttendance = () => {
    if (!selectedClassId) return;
    const currentSecs = getSectionsForClass(selectedClassId);
    const students = currentSecs.length > 0 && selectedSection
      ? storage.getStudentsByClassAndSection(selectedClassId, selectedSection)
      : storage.getStudentsByClass(selectedClassId);
    students.sort((a, b) => parseInt(a.rollNo, 10) - parseInt(b.rollNo, 10));
    setRoster(students);

    const existing = storage.getAttendanceForClassAndDate(
      selectedDate,
      selectedClassId,
      currentSecs.length > 0 && selectedSection ? selectedSection : undefined
    );
    setExistingRecord(existing || null);
    setIsLocked(existing?.isLocked || false);

    const draft: { [studentId: string]: { status: AttendanceStatus; earlyDepartureNote: string } } = {};
    students.forEach((s) => {
      if (existing) {
        const found = existing.records.find(r => r.studentId === s.id);
        if (found) {
          draft[s.id] = {
            status: found.status,
            earlyDepartureNote: found.earlyDepartureNote || '',
          };
          return;
        }
      }
      draft[s.id] = { status: 'present', earlyDepartureNote: '' };
    });
    setAttendanceDraft(draft);
  };

  useEffect(() => {
    loadRosterAndAttendance();
  }, [selectedClassId, selectedSection, selectedDate]);

  // Real-time Firestore sync listener
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      loadRosterAndAttendance();
    });
    return unsub;
  }, [selectedClassId, selectedSection, selectedDate]);

  const handleToggleStatus = (studentId: string, status: AttendanceStatus) => {
    if (isLocked) return;
    setAttendanceDraft(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    if (isLocked) return;
    setAttendanceDraft(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        earlyDepartureNote: note,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    if (isLocked) return;
    setAttendanceDraft(prev => {
      const updated: any = {};
      roster.forEach(s => {
        updated[s.id] = {
          status: 'present',
          earlyDepartureNote: prev[s.id]?.earlyDepartureNote || '',
        };
      });
      return updated;
    });
  };

  const handleClearStatus = () => {
    if (isLocked) return;
    setAttendanceDraft(prev => {
      const updated: any = {};
      roster.forEach(s => {
        updated[s.id] = {
          status: 'absent',
          earlyDepartureNote: prev[s.id]?.earlyDepartureNote || '',
        };
      });
      return updated;
    });
  };

  const executeSave = () => {
    if (!currentUser || isLocked || isSubmitting) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const targetClass = authorizedClasses.find(c => c.id === selectedClassId);
    if (!targetClass) {
      setErrorMsg('Unauthorized class selection.');
      setIsSubmitting(false);
      return;
    }

    const records = roster.map(s => ({
      studentId: s.id,
      rollNo: s.rollNo,
      studentName: s.fullName,
      status: attendanceDraft[s.id]?.status || 'present',
      earlyDepartureNote: attendanceDraft[s.id]?.earlyDepartureNote?.trim() || undefined,
    }));

    const currentSecs = getSectionsForClass(targetClass.id);
    const res = storage.saveStudentAttendance(
      {
        date: selectedDate,
        classId: targetClass.id,
        className: targetClass.name,
        section: currentSecs.length > 0 && selectedSection ? selectedSection : undefined,
        records,
      },
      currentUser
    );

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to submit attendance.');
      setIsSubmitting(false);
      return;
    }

    setSuccessMsg(`Attendance for ${targetClass.name} on ${selectedDate} logged and synced to Cloud Firestore in real time.`);
    loadRosterAndAttendance();
    setConfirmOverwriteModal(false);
    setIsSubmitting(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (existingRecord) {
      setConfirmOverwriteModal(true);
    } else {
      executeSave();
    }
  };

  const targetClass = authorizedClasses.find(c => c.id === selectedClassId);
  const presentCount = Object.values(attendanceDraft).filter(v => v.status === 'present').length;
  const absentCount = Object.values(attendanceDraft).filter(v => v.status === 'absent').length;

  if (authorizedClasses.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center text-xs text-amber-900">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <h3 className="font-bold text-sm">No Class Assignments Configured</h3>
        <p className="mt-1 text-slate-600">
          You have not been assigned to any classes yet. Please contact the Principal to assign your teaching classes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Mark Student Attendance
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
              <span>Cloud Realtime Live</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Single official daily roll call per student. Submissions sync directly to Cloud Firestore in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={isLocked}
            onClick={handleMarkAllPresent}
            className="flex-1 sm:flex-initial text-center px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Mark All Present
          </button>
          <button
            type="button"
            disabled={isLocked}
            onClick={handleClearStatus}
            className="flex-1 sm:flex-initial text-center px-3 sm:px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Set All Absent
          </button>
        </div>
      </div>

      {/* Date & Class Selector Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Date:</span>
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
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono bg-white focus:border-indigo-600 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-bold text-indigo-900"
            >
              {authorizedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Section:</span>
            {getSectionsForClass(selectedClassId).length > 0 ? (
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-bold text-indigo-900"
              >
                {getSectionsForClass(selectedClassId).map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-400 bg-slate-50 italic">
                Single Batch
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={loadRosterAndAttendance}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm cursor-pointer"
          >
            View Students
          </button>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            {presentCount} Present
          </span>
          <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
            {absentCount} Absent
          </span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/80 flex items-center justify-between text-xs font-medium text-indigo-950">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-indigo-700">
            {targetClass?.name} {selectedSection ? `(Sec ${selectedSection})` : ''}
          </span>
          <span>&bull;</span>
          <span>{roster.length} Students Enrolled</span>
          <span>&bull;</span>
          <span className="text-indigo-600 font-normal">Official attendance for whole day</span>
        </div>
        {isLocked && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Locked by Principal</span>
          </span>
        )}
      </div>

      {isLocked && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-purple-700 flex-shrink-0" />
          <p>
            This attendance record is <strong>locked by the Principal</strong> and is read-only. Contact the Principal to request unlocked correction authorization.
          </p>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Roster & Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-20">Roll No.</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center w-64">Attendance Status</th>
                  <th className="py-3 px-4">Remarks / Early Departure Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((student) => {
                  const status = attendanceDraft[student.id]?.status || 'present';
                  const note = attendanceDraft[student.id]?.earlyDepartureNote || '';
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-900">
                        {student.rollNo}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {student.fullName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleToggleStatus(student.id, 'present')}
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleToggleStatus(student.id, 'absent')}
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              status === 'absent'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={note}
                          onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          placeholder="Optional early departure note..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 disabled:bg-slate-100"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {roster.map((student) => {
            const status = attendanceDraft[student.id]?.status || 'present';
            const note = attendanceDraft[student.id]?.earlyDepartureNote || '';
            return (
              <div
                key={student.id}
                className={`p-4 rounded-3xl border transition-all ${
                  status === 'present'
                    ? 'bg-white border-emerald-200 shadow-sm'
                    : 'bg-white border-rose-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
                      Roll {student.rollNo}
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      {student.fullName}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      status === 'present'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {status === 'present' ? 'Present' : 'Absent'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleToggleStatus(student.id, 'present')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === 'present'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-600/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Present</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleToggleStatus(student.id, 'absent')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === 'absent'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-2 ring-rose-600/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Absent</span>
                  </button>
                </div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={note}
                  onChange={(e) => handleNoteChange(student.id, e.target.value)}
                  placeholder="Departure note or reason..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>
            );
          })}
        </div>

        {/* Bottom Bar: Sticky */}
        <div className="sticky bottom-3 z-20 p-4 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-lg flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-emerald-700">{presentCount} P</span>
            <span className="mx-1.5 text-slate-300">|</span>
            <span className="font-bold text-rose-700">{absentCount} A</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadRosterAndAttendance}
              className="px-3.5 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isLocked || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer touch-manipulation"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save & Sync to Firebase</span>
            </button>
          </div>
        </div>
      </form>

      {/* Overwrite Confirmation Dialog */}
      {confirmOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-indigo-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Overwrite Existing Attendance?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              An attendance record for <strong>{targetClass?.name}</strong> on <strong>{selectedDate}</strong> has already been submitted. Saving will update the official record in Firebase Firestore.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOverwriteModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeSave}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                Confirm Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
