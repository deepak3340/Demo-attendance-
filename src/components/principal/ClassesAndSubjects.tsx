import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { SchoolClass, Subject } from '../../types';
import { SafeDeleteModal } from '../common/SafeDeleteModal';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Power,
  PowerOff,
  Tag,
  DoorOpen,
} from 'lucide-react';

export const ClassesAndSubjects: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects'>('classes');
  const [classesList, setClassesList] = useState<SchoolClass[]>(() => storage.getClasses());
  const [subjectsList, setSubjectsList] = useState<Subject[]>(() => storage.getSubjects());

  const [safeDeleteModal, setSafeDeleteModal] = useState<{
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

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [className, setClassName] = useState('');
  const [sections, setSections] = useState<string[]>([]);
  const [sectionInput, setSectionInput] = useState('');
  const [noSections, setNoSections] = useState(false);
  const [room, setRoom] = useState('');
  const [classError, setClassError] = useState('');
  const [classSuccess, setClassSuccess] = useState('');

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [subjectError, setSubjectError] = useState('');
  const [subjectSuccess, setSubjectSuccess] = useState('');

  const refreshData = () => {
    setClassesList(storage.getClasses());
    setSubjectsList(storage.getSubjects());
  };

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      refreshData();
    });
    return unsub;
  }, []);

  const handleOpenAddClass = (prefillName?: string) => {
    setEditingClass(null);
    setClassName(prefillName || '');
    setSections([]);
    setSectionInput('');
    setNoSections(false);
    setRoom('');
    setClassError('');
    setClassSuccess('');
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (c: SchoolClass) => {
    setEditingClass(c);
    setClassName(c.name);
    const existingSecs = c.sections && c.sections.length > 0
      ? c.sections
      : (c.section ? [c.section] : []);
    setSections(existingSecs);
    setNoSections(existingSecs.length === 0);
    setSectionInput('');
    setRoom(c.room || '');
    setClassError('');
    setClassSuccess('');
    setIsClassModalOpen(true);
  };

  const handleAddSectionTag = () => {
    const trimmed = sectionInput.trim().toUpperCase();
    if (!trimmed) return;
    if (sections.includes(trimmed)) {
      setClassError(`Section "${trimmed}" already added to this class.`);
      return;
    }
    setSections(prev => [...prev, trimmed]);
    setSectionInput('');
    setClassError('');
  };

  const handleRemoveSectionTag = (secToRemove: string) => {
    setSections(prev => prev.filter(s => s !== secToRemove));
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setClassError('');
    setClassSuccess('');

    const cleanName = className.trim();
    if (!cleanName) {
      setClassError('Class name is required.');
      return;
    }
    const cleanSections = noSections
      ? []
      : Array.from(new Set(sections.map(s => s.trim().toUpperCase()).filter(Boolean)));

    if (!noSections && cleanSections.length === 0) {
      setClassError('Please add at least one section (e.g. A, B) or check "Single batch (No sections)".');
      return;
    }

    if (editingClass) {
      const res = storage.updateClass(
        editingClass.id,
        {
          name: cleanName,
          sections: cleanSections,
          section: cleanSections[0] || '',
          room: room.trim(),
        },
        currentUser
      );
      if (!res.success) {
        setClassError(res.error || 'Failed to update class.');
        return;
      }
      setClassSuccess('Class updated successfully.');
    } else {
      const res = storage.addClass(
        {
          name: cleanName,
          sections: cleanSections,
          section: cleanSections[0] || '',
          room: room.trim(),
          status: 'active',
        },
        currentUser
      );
      if (!res.success) {
        setClassError(res.error || 'Failed to add class.');
        return;
      }
      setClassSuccess(`Class "${cleanName}" created successfully.`);
    }

    refreshData();
    setTimeout(() => {
      setIsClassModalOpen(false);
      setClassSuccess('');
    }, 1200);
  };

  const handleToggleClassStatus = (c: SchoolClass) => {
    if (!currentUser) return;
    const res = storage.toggleClassStatus(c.id, currentUser);
    if (!res.success) {
      showNotification('error', res.error || 'Failed to update class status.');
      return;
    }
    showNotification(
      'success',
      `Class "${c.name}" is now ${c.status === 'active' ? 'inactive' : 'active'}.`
    );
    refreshData();
  };

  const handleOpenSafeDeleteClass = (c: SchoolClass) => {
    const deps = storage.getClassDependencies(c.id);
    const summary: any[] = [];
    if (deps.studentCount > 0) {
      summary.push({ label: 'Enrolled Students', count: deps.studentCount, description: 'Active student profiles' });
    }
    if (deps.attendanceCount > 0) {
      summary.push({ label: 'Attendance Days', count: deps.attendanceCount, description: 'Submitted daily class attendance logs' });
    }
    if (deps.timetableCount > 0) {
      summary.push({ label: 'Timetable Periods', count: deps.timetableCount, description: 'Weekly schedule slots' });
    }
    if (deps.assignmentCount > 0) {
      summary.push({ label: 'Faculty Assignments', count: deps.assignmentCount, description: 'Teachers assigned to this class' });
    }
    setSafeDeleteModal({
      isOpen: true,
      itemType: 'Class',
      itemId: c.id,
      itemName: c.name,
      dependencySummary: summary
    });
  };

  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectCode('');
    setSelectedClassIds(classesList.filter(c => c.status === 'active').map(c => c.id));
    setSubjectError('');
    setSubjectSuccess('');
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (sub: Subject) => {
    setEditingSubject(sub);
    setSubjectName(sub.name);
    setSubjectCode(sub.code);
    setSelectedClassIds(sub.classIds || []);
    setSubjectError('');
    setSubjectSuccess('');
    setIsSubjectModalOpen(true);
  };

  const handleToggleClassForSubject = (cId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]
    );
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubjectError('');
    setSubjectSuccess('');

    const cleanName = subjectName.trim();
    const cleanCode = subjectCode.trim().toUpperCase();
    if (!cleanName || !cleanCode) {
      setSubjectError('Subject name and subject code are required.');
      return;
    }

    if (editingSubject) {
      const res = storage.updateSubject(
        editingSubject.id,
        {
          name: cleanName,
          code: cleanCode,
          classIds: selectedClassIds,
        },
        currentUser
      );
      if (!res.success) {
        setSubjectError(res.error || 'Failed to update subject.');
        return;
      }
      setSubjectSuccess('Subject updated successfully.');
    } else {
      const res = storage.addSubject(
        {
          name: cleanName,
          code: cleanCode,
          classIds: selectedClassIds,
          status: 'active',
        },
        currentUser
      );
      if (!res.success) {
        setSubjectError(res.error || 'Failed to add subject.');
        return;
      }
      setSubjectSuccess(`Subject "${cleanName}" created successfully.`);
    }

    refreshData();
    setTimeout(() => {
      setIsSubjectModalOpen(false);
      setSubjectSuccess('');
    }, 1200);
  };

  const handleToggleSubjectStatus = (sub: Subject) => {
    if (!currentUser) return;
    const res = storage.toggleSubjectStatus(sub.id, currentUser);
    if (!res.success) {
      showNotification('error', res.error || 'Failed to update subject status.');
      return;
    }
    showNotification(
      'success',
      `Subject "${sub.name}" is now ${sub.status === 'active' ? 'inactive' : 'active'}.`
    );
    refreshData();
  };

  const handleOpenSafeDeleteSubject = (sub: Subject) => {
    const deps = storage.getSubjectDependencies(sub.id);
    const summary: any[] = [];
    if (deps.assignmentCount > 0) {
      summary.push({ label: 'Teacher Assignments', count: deps.assignmentCount, description: 'Faculty teaching this subject' });
    }
    if (deps.timetableCount > 0) {
      summary.push({ label: 'Timetable Periods', count: deps.timetableCount, description: 'Scheduled timetable slots' });
    }
    setSafeDeleteModal({
      isOpen: true,
      itemType: 'Subject',
      itemId: sub.id,
      itemName: `${sub.name} (${sub.code})`,
      dependencySummary: summary
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Academic Classes, Sections & Subjects
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your school&apos;s actual standards, custom sections, and academic curriculum
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Classes & Sections ({classesList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subjects')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subjects ({subjectsList.length})
            </button>
          </div>

          {activeTab === 'classes' ? (
            <button
              type="button"
              onClick={() => handleOpenAddClass()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddSubject}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {classesList.length === 0 ? (
            <div className="p-8 sm:p-12 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-4">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                No Classes Configured Yet
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Add your school&apos;s actual classes (e.g. Nursery, UKG, Class 1 to 12) with custom sections.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddClass()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Class</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Class Level</th>
                    <th className="py-3 px-4">Configured Sections</th>
                    <th className="py-3 px-4">Classroom</th>
                    <th className="py-3 px-4">Associated Subjects</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {classesList.map((c) => {
                    const associatedSubjects = subjectsList.filter((s) =>
                      s.classIds?.includes(c.id)
                    );
                    const classSections = c.sections && c.sections.length > 0
                      ? c.sections
                      : (c.section ? [c.section] : []);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-indigo-950 text-sm">
                          {c.name}
                        </td>
                        <td className="py-3.5 px-4">
                          {classSections.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {classSections.map(sec => (
                                <span
                                  key={sec}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold text-[11px]"
                                >
                                  Section {sec}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Single batch (No sections)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {c.room ? (
                            <span className="flex items-center gap-1.5">
                              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                              {c.room}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not set</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {associatedSubjects.length} Subjects
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              c.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {c.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditClass(c)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Class"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleClassStatus(c)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                c.status === 'active'
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={c.status === 'active' ? 'Deactivate Class' : 'Activate Class'}
                            >
                              {c.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenSafeDeleteClass(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Safe Removal (Archive / Permanent Delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {subjectsList.length === 0 ? (
            <div className="p-8 sm:p-12 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                No Subjects Configured Yet
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Add your curriculum subjects and link them to applicable classes.
              </p>
              <button
                type="button"
                onClick={handleOpenAddSubject}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Subject</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Offered Classes</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectsList.map((sub) => {
                    const offeredClasses = classesList.filter((c) =>
                      sub.classIds?.includes(c.id)
                    );
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                          {sub.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            {sub.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {offeredClasses.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">No classes assigned</span>
                            ) : (
                              offeredClasses.map((c) => (
                                <span
                                  key={c.id}
                                  className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium"
                                >
                                  {c.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              sub.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {sub.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubject(sub)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Subject"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSubjectStatus(sub)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                sub.status === 'active'
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={sub.status === 'active' ? 'Deactivate Subject' : 'Activate Subject'}
                            >
                              {sub.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenSafeDeleteSubject(sub)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Safe Removal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-indigo-100 relative max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsClassModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-800 mb-1 pr-6">
              {editingClass ? 'Edit Academic Class' : 'Add New Academic Class'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure class title, custom sections, and standard classroom
            </p>

            {classError && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{classError}</span>
              </div>
            )}
            {classSuccess && (
              <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{classSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Class Name / Standard
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Nursery, LKG, UKG, Class 1, Class 10"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-medium"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sections for this Class</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noSections}
                      onChange={(e) => setNoSections(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Single batch (No sections)</span>
                  </label>
                </div>
                {!noSections && (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sectionInput}
                        onChange={(e) => setSectionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSectionTag();
                          }
                        }}
                        placeholder="Type section (e.g. A, B, C)"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none uppercase font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleAddSectionTag}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 min-h-[32px]">
                      {sections.length === 0 ? (
                        <p className="text-[11px] text-amber-600 italic">
                          No sections added yet. Type a section above and click &quot;+ Add&quot;.
                        </p>
                      ) : (
                        sections.map((sec) => (
                          <span
                            key={sec}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-bold text-xs shadow-2xs"
                          >
                            <span>Section {sec}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSectionTag(sec)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Classroom / Room (Optional)
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Room 101, Ground Floor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {editingClass ? 'Update Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-indigo-100 relative max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsSubjectModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-800 mb-1 pr-6">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure subject title, code, and assign to specific classes
            </p>

            {subjectError && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{subjectError}</span>
              </div>
            )}
            {subjectSuccess && (
              <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{subjectSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Mathematics, English Literature"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MATH101, ENG, SCI"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono uppercase focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Applicable Classes
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedClassIds.length === classesList.length) {
                        setSelectedClassIds([]);
                      } else {
                        setSelectedClassIds(classesList.map(c => c.id));
                      }
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {selectedClassIds.length === classesList.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  {classesList.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        selectedClassIds.includes(c.id)
                          ? 'bg-indigo-100/70 text-indigo-900 font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClassIds.includes(c.id)}
                        onChange={() => handleToggleClassForSubject(c.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {editingSubject ? 'Update Subject' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Two-Step Safe Deletion & Archive Modal */}
      <SafeDeleteModal
        isOpen={safeDeleteModal.isOpen}
        onClose={() => setSafeDeleteModal(prev => ({ ...prev, isOpen: false }))}
        itemType={safeDeleteModal.itemType}
        itemId={safeDeleteModal.itemId}
        itemName={safeDeleteModal.itemName}
        dependencySummary={safeDeleteModal.dependencySummary}
        onArchive={async () => {
          if (safeDeleteModal.itemType === 'Class') {
            const res = storage.archiveClass(safeDeleteModal.itemId, currentUser!);
            if (res.success) {
              showNotification('success', `Class "${safeDeleteModal.itemName}" archived safely.`);
              refreshData();
            } else {
              showNotification('error', res.error || 'Failed to archive class.');
            }
          } else if (safeDeleteModal.itemType === 'Subject') {
            const res = storage.archiveSubject(safeDeleteModal.itemId, currentUser!);
            if (res.success) {
              showNotification('success', `Subject "${safeDeleteModal.itemName}" archived safely.`);
              refreshData();
            } else {
              showNotification('error', res.error || 'Failed to archive subject.');
            }
          }
        }}
        onPermanentDelete={async (forceCascade) => {
          if (safeDeleteModal.itemType === 'Class') {
            const res = storage.permanentDeleteClass(safeDeleteModal.itemId, currentUser!, forceCascade);
            if (res.success) {
              showNotification('success', `Class "${safeDeleteModal.itemName}" permanently deleted.`);
              refreshData();
            } else {
              showNotification('error', res.error || 'Permanent deletion blocked.');
            }
          } else if (safeDeleteModal.itemType === 'Subject') {
            const res = storage.permanentDeleteSubject(safeDeleteModal.itemId, currentUser!, forceCascade);
            if (res.success) {
              showNotification('success', `Subject "${safeDeleteModal.itemName}" permanently deleted.`);
              refreshData();
            } else {
              showNotification('error', res.error || 'Permanent deletion blocked.');
            }
          }
        }}
      />
    </div>
  );
};
