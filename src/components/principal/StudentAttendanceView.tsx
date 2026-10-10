import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { DailyClassAttendance, AttendanceStatus, Student } from '../../types';
import {
  CalendarCheck,
  Calendar,
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  Edit,
  Save,
  X,
  FileSpreadsheet,
  Clock,
  Layers,
  AlertCircle
} from 'lucide-react';

interface StudentAttendanceViewProps {
  initialDate?: string;
  initialClassId?: string;
  onNavigateToReports?: () => void;
  onNavigateToClasses?: () => void;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  initialDate,
  initialClassId,
  onNavigateToReports,
  onNavigateToClasses,
}) => {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState(() => storage.getClasses().filter(c => c.status === 'active'));
  const todayDate = storage.getTodayInKolkata();

  const [selectedDate, setSelectedDate] = useState(
    initialDate || todayDate
  );
  const [selectedClassId, setSelectedClassId] = useState(
    initialClassId || classes[0]?.id || ''
  );
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [attendanceRecord, setAttendanceRecord] = useState<DailyClassAttendance | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecords, setEditedRecords] = useState<{ [studentId: string]: { status: AttendanceStatus; earlyDepartureNote?: string } }>({});

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const currentClassObj = classes.find(c => c.id === selectedClassId);
  const currentSections = currentClassObj?.sections && currentClassObj.sections.length > 0
    ? currentClassObj.sections
    : (currentClassObj?.section ? [currentClassObj.section] : []);

  const [roster, setRoster] = useState<Student[]>([]);

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    setSelectedSection('all');
  };

  const loadAttendance = () => {
    setClasses(storage.getClasses().filter(c => c.status === 'active'));
    if (!selectedClassId) {
      setAttendanceRecord(null);
      setEditedRecords({});
      setRoster([]);
      return;
    }
    const currentRoster = storage.getStudentsByClassAndSection(selectedClassId, selectedSection !== 'all' ? selectedSection : undefined);
    currentRoster.sort((a, b) => parseInt(a.rollNo, 10) - parseInt(b.rollNo, 10));
    setRoster(currentRoster);

    const secParam = selectedSection !== 'all' ? selectedSection : undefined;
    const record = storage.getAttendanceForClassAndDate(selectedDate, selectedClassId, secParam);
    setAttendanceRecord(record || null);
    setIsEditing(false);

    if (record) {
      const draft: { [studentId: string]: { status: AttendanceStatus; earlyDepartureNote?: string } } = {};
      record.records.forEach((r) => {
        draft[r.studentId] = {
          status: r.status,
          earlyDepartureNote: r.earlyDepartureNote,
        };
      });
      setEditedRecords(draft);
    } else {
      setEditedRecords({});
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedDate, selectedClassId, selectedSection]);

  // Subscribe to storage changes for real-time Firestore sync
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      loadAttendance();
    });
    return unsub;
  }, [selectedDate, selectedClassId, selectedSection]);

  const handleLock = () => {
    if (!currentUser || !attendanceRecord) return;
    const res = storage.lockAttendance(selectedDate, selectedClassId, currentUser);
    if (!res.success) {
      alert(res.error);
      return;
    }
    loadAttendance();
  };

  const handleOpenUnlock = () => {
    setUnlockReason('');
    setUnlockError('');
    setShowUnlockModal(true);
  };

  const handleConfirmUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (unlockReason.trim().length < 5) {
      setUnlockError('Please provide a meaningful reason (minimum 5 characters).');
      return;
    }
    const res = storage.unlockAttendance(selectedDate, selectedClassId, unlockReason, currentUser);
    if (!res.success) {
      setUnlockError(res.error || 'Failed to unlock.');
      return;
    }
    setShowUnlockModal(false);
    loadAttendance();
  };

  const handleToggleStatus = (studentId: string) => {
    if (!isEditing) return;
    setEditedRecords((prev) => {
      const cur = prev[studentId]?.status || 'present';
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          status: cur === 'present' ? 'absent' : 'present',
        },
      };
    });
  };

  const handleNoteChange = (studentId: string, note: string) => {
    if (!isEditing) return;
    setEditedRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        earlyDepartureNote: note,
      },
    }));
  };

  const handleSaveCorrection = () => {
    if (!currentUser || !attendanceRecord || !currentClassObj) return;
    const updatedRecords = attendanceRecord.records.map((r) => ({
      ...r,
      status: editedRecords[r.studentId]?.status || r.status,
      earlyDepartureNote: editedRecords[r.studentId]?.earlyDepartureNote,
    }));
    const res = storage.saveStudentAttendance(
      {
        date: selectedDate,
        classId: currentClassObj.id,
        className: currentClassObj.name,
        section: selectedSection !== 'all' ? selectedSection : (attendanceRecord.section || ''),
        records: updatedRecords,
      },
      currentUser
    );
    if (!res.success) {
      alert(res.error || 'Failed to save corrected attendance.');
      return;
    }
    setIsEditing(false);
    loadAttendance();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Student Daily Attendance Review
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Class-wise official daily attendance, verification controls, and lock authorization
          </p>
        </div>
        {onNavigateToReports && (
          <button
            type="button"
            onClick={onNavigateToReports}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Attendance Reports</span>
          </button>
        )}
      </div>

      {classes.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No Classes Configured</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Please configure academic classes and sections in &quot;Classes & Subjects&quot; first before reviewing attendance.
          </p>
          {onNavigateToClasses && (
            <button
              type="button"
              onClick={onNavigateToClasses}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <span>Configure Classes</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Attendance Date</span>
                </label>
                <input
                  type="date"
                  max={todayDate}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-semibold focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Academic Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white font-semibold focus:border-indigo-600 outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Section
                </label>
                {currentSections.length > 0 ? (
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white font-semibold focus:border-indigo-600 outline-none"
                  >
                    <option value="all">All Sections ({currentSections.join(', ')})</option>
                    {currentSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value="Single Batch (No Section)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-400 bg-slate-50 italic outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Status Banner */}
          {attendanceRecord ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  attendanceRecord.isLocked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {attendanceRecord.isLocked ? <Lock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Attendance Submitted & Official
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      attendanceRecord.isLocked
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {attendanceRecord.isLocked ? 'Locked' : 'Open / Editable'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Marked by {attendanceRecord.markedBy.userName} ({attendanceRecord.markedBy.role.toUpperCase()}) &bull; {new Date(attendanceRecord.updatedAt).toLocaleTimeString('en-GB')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {attendanceRecord.isLocked ? (
                  <button
                    type="button"
                    onClick={handleOpenUnlock}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Authorize Correction (Unlock)</span>
                  </button>
                ) : (
                  <>
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={handleSaveCorrection}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Corrections</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Records</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLock}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Attendance</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">Attendance Not Marked</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    No official attendance submission exists for {currentClassObj?.name} on {selectedDate}. Students are not automatically marked absent.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Roster / Attendance Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>
                  {currentClassObj?.name} {selectedSection !== 'all' ? `(Sec ${selectedSection})` : ''} Roster &bull; {roster.length} Students Enrolled
                </span>
              </span>
              {attendanceRecord && (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {attendanceRecord.presentCount} Present
                  </span>
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    {attendanceRecord.absentCount} Absent
                  </span>
                </div>
              )}
            </div>

            {roster.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-slate-400 text-xs">
                No active students enrolled in this class/section.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white">
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Notes / Early Departure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.map((student) => {
                      const rec = attendanceRecord?.records.find(r => r.studentId === student.id);
                      const currentStatus = isEditing
                        ? editedRecords[student.id]?.status || rec?.status || 'present'
                        : rec?.status;

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            #{student.rollNo}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800 text-sm">
                            {student.fullName}
                          </td>
                          <td className="py-3.5 px-4">
                            {student.section ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                                Sec {student.section}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {rec ? (
                              isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(student.id)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-rose-600 text-white shadow-xs'
                                  }`}
                                >
                                  {currentStatus === 'present' ? 'PRESENT' : 'ABSENT'}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    rec.status === 'present'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {rec.status.toUpperCase()}
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Not Marked</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editedRecords[student.id]?.earlyDepartureNote || ''}
                                onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                placeholder="Early departure note..."
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-600"
                              />
                            ) : (
                              <span>{rec?.earlyDepartureNote || '-'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Unlock Authorization Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-indigo-100 relative">
            <button
              type="button"
              onClick={() => setShowUnlockModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-800 mb-1 pr-6 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-amber-600" />
              <span>Authorize Attendance Correction</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter official justification to unlock this record. This action will be permanently recorded in the Audit Trail.
            </p>

            {unlockError && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Unlocking Record
                </label>
                <textarea
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="e.g. Medical certificate approved for Roll #04..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  Confirm & Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
