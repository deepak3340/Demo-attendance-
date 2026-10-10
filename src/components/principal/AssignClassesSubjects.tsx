import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { TeacherAssignment } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AssignClassesSubjects: React.FC = () => {
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>(() => storage.getAssignments());
  const [teachers, setTeachers] = useState(() => storage.getStaffMembers().filter(s => s.status === 'active'));
  const [classes, setClasses] = useState(() => storage.getClasses().filter(c => c.status === 'active'));
  const [subjects, setSubjects] = useState(() => storage.getSubjects().filter(s => s.status === 'active'));

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const refreshState = () => {
    setAssignments(storage.getAssignments());
    setTeachers(storage.getStaffMembers().filter(s => s.status === 'active'));
    setClasses(storage.getClasses().filter(c => c.status === 'active'));
    setSubjects(storage.getSubjects().filter(s => s.status === 'active'));
  };

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      refreshState();
    });
    return unsub;
  }, []);

  const currentClassObj = classes.find(c => c.id === selectedClassId);
  const currentSections = currentClassObj?.sections && currentClassObj.sections.length > 0
    ? currentClassObj.sections
    : (currentClassObj?.section ? [currentClassObj.section] : []);

  const availableSubjectsForClass = subjects.filter(s =>
    s.classIds?.includes(selectedClassId)
  );

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find(c => c.id === newClassId);
    const secs = cls?.sections && cls.sections.length > 0 ? cls.sections : (cls?.section ? [cls.section] : []);
    setSelectedSection(secs[0] || '');
    const applicable = subjects.filter(s => s.classIds?.includes(newClassId));
    setSelectedSubjectId(applicable[0]?.id || '');
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedTeacherId || !selectedClassId || !selectedSubjectId) {
      setErrorMsg('Please select a teacher, class, and subject.');
      return;
    }
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    const cls = classes.find(c => c.id === selectedClassId);
    const sub = subjects.find(s => s.id === selectedSubjectId);

    if (!teacher || !cls || !sub) {
      setErrorMsg('Invalid selection.');
      return;
    }

    if (!sub.classIds?.includes(cls.id)) {
      setErrorMsg(`Subject "${sub.name}" is not offered in class "${cls.name}".`);
      return;
    }

    const res = storage.addAssignment(
      {
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        teacherUid: teacher.uid,
        classId: cls.id,
        className: cls.name,
        section: selectedSection || undefined,
        subjectId: sub.id,
        subjectName: sub.name,
      },
      currentUser
    );

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to assign.');
      return;
    }

    const secLabel = selectedSection ? ` (Sec ${selectedSection})` : '';
    setSuccessMsg(`Successfully assigned ${teacher.fullName} to ${cls.name}${secLabel} (${sub.name}).`);
    setAssignments(storage.getAssignments());
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleRemove = (id: string) => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Remove Faculty Assignment?',
      message: 'Are you sure you want to remove this faculty class-subject assignment?',
      onConfirm: () => {
        storage.deleteAssignment(id, currentUser);
        setAssignments(storage.getAssignments());
        setSuccessMsg('Assignment removed successfully.');
        setTimeout(() => setSuccessMsg(''), 2500);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Assign Faculty to Classes & Subjects
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Authorize teachers for specific classes and subjects. Faculty members can only mark student attendance for their authorized classes.
        </p>
      </div>

      {/* Assignment Card Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-600" />
          <span>New Faculty Assignment</span>
        </h3>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {classes.length === 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>No academic classes configured. Please add classes first in the <strong>Classes & Subjects</strong> menu.</span>
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>No staff members registered. Please add teachers first in the <strong>Staff Management</strong> menu.</span>
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>No subjects configured. Please add subjects first in the <strong>Classes & Subjects</strong> menu.</span>
          </div>
        ) : (
          <form onSubmit={handleAssign} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Teacher
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} (UID: {t.uid})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Section
              </label>
              {currentSections.length > 0 ? (
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                >
                  <option value="">All Sections (Whole Class)</option>
                  {currentSections.map(sec => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value="Single Batch (No Sec)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-400 bg-slate-50 italic outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
              >
                <option value="">-- Choose Subject --</option>
                {availableSubjectsForClass.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={availableSubjectsForClass.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Assign Subject</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Current Assignments */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Current Faculty Assignments ({assignments.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Authorized Roles</span>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-400 text-xs">
            No faculty assignments registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">Assigned Class & Section</th>
                  <th className="py-3 px-4">Assigned Subject</th>
                  <th className="py-3 px-4">Assigned Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {asg.teacherName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {asg.teacherUid}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-900">
                      {asg.className}
                      {asg.section && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                          Sec {asg.section}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        {asg.subjectName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {asg.assignedAt ? asg.assignedAt.split('T')[0] : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(asg.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Remove Assignment"
        variant="danger"
      />
    </div>
  );
};
