import React, { useState } from 'react';
import { Archive, RotateCcw, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { SafeDeleteModal } from './SafeDeleteModal';

interface ArchivedRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const ArchivedRecordsModal: React.FC<ArchivedRecordsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'staff' | 'students'>('classes');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [safeDeleteTarget, setSafeDeleteTarget] = useState<{
    isOpen: boolean;
    itemType: 'Class' | 'Subject' | 'Staff' | 'Student';
    itemId: string;
    itemName: string;
    dependencySummary: any[];
  }>({
    isOpen: false,
    itemType: 'Class',
    itemId: '',
    itemName: '',
    dependencySummary: []
  });

  if (!isOpen || !currentUser) return null;

  const archivedClasses = storage.getArchivedClasses();
  const archivedSubjects = storage.getArchivedSubjects();
  const archivedStaff = storage.getArchivedStaff();
  const archivedStudents = storage.getArchivedStudents();

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRestore = (type: 'class' | 'subject' | 'staff' | 'student', id: string, name: string) => {
    let res: { success: boolean; error?: string } = { success: false };
    if (type === 'class') res = storage.restoreClass(id, currentUser);
    else if (type === 'subject') res = storage.restoreSubject(id, currentUser);
    else if (type === 'staff') res = storage.restoreStaff(id, currentUser);
    else if (type === 'student') res = storage.restoreStudent(id, currentUser);

    if (res.success) {
      showNotification('success', `Restored ${type} "${name}" to active status.`);
      onDataChanged();
    } else {
      showNotification('error', res.error || 'Failed to restore record.');
    }
  };

  const handleOpenPermanentDelete = (type: 'Class' | 'Subject' | 'Staff' | 'Student', id: string, name: string) => {
    let deps: any[] = [];
    if (type === 'Class') {
      const cDeps = storage.getClassDependencies(id);
      if (cDeps.studentCount > 0) deps.push({ label: 'Enrolled Students', count: cDeps.studentCount, description: '' });
      if (cDeps.attendanceCount > 0) deps.push({ label: 'Attendance Records', count: cDeps.attendanceCount, description: '' });
    } else if (type === 'Subject') {
      const sDeps = storage.getSubjectDependencies(id);
      if (sDeps.timetableCount > 0) deps.push({ label: 'Timetable Slots', count: sDeps.timetableCount, description: '' });
      if (sDeps.assignmentCount > 0) deps.push({ label: 'Teacher Assignments', count: sDeps.assignmentCount, description: '' });
    }
    setSafeDeleteTarget({
      isOpen: true,
      itemType: type,
      itemId: id,
      itemName: name,
      dependencySummary: deps
    });
  };

  const executePermanentDelete = (forceCascade: boolean) => {
    const { itemType, itemId, itemName } = safeDeleteTarget;
    let res: { success: boolean; error?: string } = { success: false };
    if (itemType === 'Class') res = storage.permanentDeleteClass(itemId, currentUser, forceCascade);
    else if (itemType === 'Subject') res = storage.permanentDeleteSubject(itemId, currentUser, forceCascade);
    else if (itemType === 'Staff') res = storage.permanentDeleteStaff(itemId, currentUser);
    else if (itemType === 'Student') res = storage.permanentDeleteStudent(itemId, currentUser);

    if (res.success) {
      showNotification('success', `Permanently deleted ${itemType} "${itemName}".`);
      onDataChanged();
    } else {
      showNotification('error', res.error || 'Failed to delete permanently.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Archived Records & Trash
            </h3>
            <p className="text-xs text-slate-500">
              Safely restore archived items or authorize permanent destruction
            </p>
          </div>
        </div>

        {notification && (
          <div className={`mb-3 p-3 rounded-xl border text-xs flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{notification.message}</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl text-xs mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`py-2 px-1 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'classes' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Classes ({archivedClasses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`py-2 px-1 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'subjects' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Subjects ({archivedSubjects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`py-2 px-1 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'staff' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff ({archivedStaff.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`py-2 px-1 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'students' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Students ({archivedStudents.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[220px]">
          {activeTab === 'classes' && (
            archivedClasses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No archived classes found.</div>
            ) : (
              archivedClasses.map(c => (
                <div key={c.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{c.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Archived on {c.archivedAt ? new Date(c.archivedAt).toLocaleDateString('en-GB') : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore('class', c.id, c.name)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPermanentDelete('Class', c.id, c.name)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-100 cursor-pointer"
                      title="Permanent Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'subjects' && (
            archivedSubjects.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No archived subjects found.</div>
            ) : (
              archivedSubjects.map(s => (
                <div key={s.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{s.name} ({s.code})</p>
                    <p className="text-[11px] text-slate-500">
                      Archived on {s.archivedAt ? new Date(s.archivedAt).toLocaleDateString('en-GB') : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore('subject', s.id, s.name)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPermanentDelete('Subject', s.id, s.name)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-100 cursor-pointer"
                      title="Permanent Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'staff' && (
            archivedStaff.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No archived faculty accounts found.</div>
            ) : (
              archivedStaff.map(st => (
                <div key={st.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{st.fullName} (UID: {st.uid})</p>
                    <p className="text-[11px] text-slate-500 font-mono">Mobile: {st.mobile}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore('staff', st.id, st.fullName)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPermanentDelete('Staff', st.id, st.fullName)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-100 cursor-pointer"
                      title="Permanent Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'students' && (
            archivedStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No archived student records found.</div>
            ) : (
              archivedStudents.map(stu => (
                <div key={stu.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{stu.fullName} (Roll: {stu.rollNo})</p>
                    <p className="text-[11px] text-slate-500">{stu.className} {stu.section ? `(Sec ${stu.section})` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore('student', stu.id, stu.fullName)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPermanentDelete('Student', stu.id, stu.fullName)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-100 cursor-pointer"
                      title="Permanent Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>
        </div>

        <SafeDeleteModal
          isOpen={safeDeleteTarget.isOpen}
          onClose={() => setSafeDeleteTarget(prev => ({ ...prev, isOpen: false }))}
          itemType={safeDeleteTarget.itemType}
          itemId={safeDeleteTarget.itemId}
          itemName={safeDeleteTarget.itemName}
          dependencySummary={safeDeleteTarget.dependencySummary}
          onArchive={() => {}}
          onPermanentDelete={executePermanentDelete}
        />
      </div>
    </div>
  );
};
