import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Student } from '../../types';
import { SafeDeleteModal } from '../common/SafeDeleteModal';
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit,
  Power,
  PowerOff,
  Trash2,
  X
} from 'lucide-react';

interface StudentManagementProps {
  onNavigateToClasses?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ onNavigateToClasses }) => {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState(() => storage.getClasses().filter(c => c.status === 'active'));
  const [students, setStudents] = useState<Student[]>(() => storage.getStudents());
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedFilterSection, setSelectedFilterSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [safeDeleteModal, setSafeDeleteModal] = useState<{
    isOpen: boolean;
    itemType: 'Class' | 'Subject' | 'Staff' | 'Student';
    itemId: string;
    itemName: string;
    dependencySummary: any[];
  }>({
    isOpen: false,
    itemType: 'Student',
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [rollNo, setRollNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [section, setSection] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [guardianName, setGuardianName] = useState('');
  const [guardianMobile, setGuardianMobile] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const refreshStudents = () => {
    setStudents(storage.getStudents());
    setClasses(storage.getClasses().filter(c => c.status === 'active'));
  };

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      refreshStudents();
    });
    return unsub;
  }, []);

  const getSectionsForClass = (targetClassId: string) => {
    const cls = classes.find(c => c.id === targetClassId);
    if (!cls) return [];
    return cls.sections && cls.sections.length > 0
      ? cls.sections
      : (cls.section ? [cls.section] : []);
  };

  const handleFilterClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    setSelectedFilterSection('all');
  };

  const filterSections = selectedClassId !== 'all' ? getSectionsForClass(selectedClassId) : [];
  const modalSections = getSectionsForClass(classId);

  const handleModalClassChange = (newClassId: string) => {
    setClassId(newClassId);
    const secs = getSectionsForClass(newClassId);
    setSection(secs[0] || '');
  };

  const handleOpenAdd = () => {
    if (classes.length === 0) {
      showNotification('info', 'Please configure at least one academic class in "Classes & Subjects" first.');
      if (onNavigateToClasses) onNavigateToClasses();
      return;
    }
    setEditingStudent(null);
    setRollNo('');
    setFullName('');
    const initialClassId = selectedClassId !== 'all' ? selectedClassId : classes[0]?.id || '';
    setClassId(initialClassId);
    const secs = getSectionsForClass(initialClassId);
    setSection(secs[0] || '');
    setGender('Male');
    setGuardianName('');
    setGuardianMobile('');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setRollNo(s.rollNo);
    setFullName(s.fullName);
    setClassId(s.classId);
    setSection(s.section || '');
    setGender(s.gender);
    setGuardianName(s.guardianName);
    setGuardianMobile(s.guardianMobile);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError('');
    setFormSuccess('');

    if (!rollNo.trim() || !fullName.trim()) {
      setFormError('Roll number and Student Name are required.');
      return;
    }
    const cls = classes.find(c => c.id === classId);
    if (!cls) {
      setFormError('Invalid class selected.');
      return;
    }
    const cleanSection = section.trim();

    if (editingStudent) {
      const res = storage.updateStudent(
        editingStudent.id,
        {
          rollNo: rollNo.trim(),
          fullName: fullName.trim(),
          classId: cls.id,
          className: cls.name,
          section: cleanSection,
          gender,
          guardianName: guardianName.trim(),
          guardianMobile: guardianMobile.trim(),
        },
        currentUser
      );
      if (!res.success) {
        setFormError(res.error || 'Failed to update student.');
        return;
      }
      setFormSuccess('Student updated successfully.');
    } else {
      const res = storage.addStudent(
        {
          rollNo: rollNo.trim(),
          fullName: fullName.trim(),
          classId: cls.id,
          className: cls.name,
          section: cleanSection,
          gender,
          guardianName: guardianName.trim(),
          guardianMobile: guardianMobile.trim(),
          status: 'active',
        },
        currentUser
      );
      if (!res.success) {
        setFormError(res.error || 'Failed to add student.');
        return;
      }
      setFormSuccess('Student enrolled successfully.');
    }
    refreshStudents();
    setTimeout(() => {
      setIsModalOpen(false);
      setFormSuccess('');
    }, 1200);
  };

  const handleToggleStatus = (s: Student) => {
    if (!currentUser) return;
    const res = storage.toggleStudentStatus(s.id, currentUser);
    if (res.success) {
      showNotification('success', `Student "${s.fullName}" status updated.`);
      refreshStudents();
    } else {
      showNotification('error', res.error || 'Failed to update status.');
    }
  };

  const handleOpenSafeDelete = (s: Student) => {
    const allAttendance = storage.getAllStudentAttendance();
    const attendanceOccurrences = allAttendance.filter(a =>
      a.records.some(r => r.studentId === s.id)
    ).length;
    const summary: any[] = [];
    if (attendanceOccurrences > 0) {
      summary.push({
        label: 'Historical Daily Attendance Logs',
        count: attendanceOccurrences,
        description: 'Days where this student was marked present or absent'
      });
    }
    setSafeDeleteModal({
      isOpen: true,
      itemType: 'Student',
      itemId: s.id,
      itemName: `${s.fullName} (Roll: ${s.rollNo})`,
      dependencySummary: summary
    });
  };

  const filteredStudents = students.filter((s) => {
    if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;
    if (selectedFilterSection !== 'all' && (s.section || '') !== selectedFilterSection) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.fullName.toLowerCase().includes(q);
      const matchRoll = s.rollNo.toLowerCase().includes(q);
      const matchParent = s.guardianName?.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchParent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Student Enrollment & Rosters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student records and class-section enrollment. Students are records only with no login accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
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

      {classes.length === 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">No academic classes configured yet.</p>
              <p className="text-amber-800 text-[11px] mt-0.5">Please add classes in &quot;Classes & Subjects&quot; first before enrolling students.</p>
            </div>
          </div>
          {onNavigateToClasses && (
            <button
              type="button"
              onClick={onNavigateToClasses}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 cursor-pointer"
            >
              Configure Classes
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name, roll no, or parent..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
          <div className="sm:col-span-4 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => handleFilterClassChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:border-indigo-600 outline-none"
            >
              <option value="all">All Classes ({students.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Section:</span>
            <select
              value={selectedFilterSection}
              onChange={(e) => setSelectedFilterSection(e.target.value)}
              disabled={selectedClassId === 'all' || filterSections.length === 0}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:border-indigo-600 outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="all">All Sections</option>
              {filterSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-400 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center mb-2">
              <GraduationCap className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-600">No students found matching current filters.</p>
            <p className="mt-1">Add new students or adjust your search and class filter above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Parent / Guardian</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.rollNo}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 text-sm">
                      {s.fullName}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-950">
                      {s.className}
                      {s.section && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                          Sec {s.section}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {s.gender}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {s.guardianName || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {s.guardianMobile || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          s.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            s.status === 'active'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={s.status === 'active' ? 'Deactivate Student' : 'Reactivate Student'}
                        >
                          {s.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSafeDelete(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Safe Removal (Archive / Permanent)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-indigo-100 relative max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
              <div className="pr-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  {editingStudent ? 'Edit Student Record' : 'Enroll New Student'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter academic roll number, class assignment, and parent details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer touch-manipulation shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain touch-pan-y">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Roll No
                    </label>
                    <input
                      type="text"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="e.g. 1, 02"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-mono font-bold focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-semibold focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Class
                    </label>
                    <select
                      value={classId}
                      onChange={(e) => handleModalClassChange(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
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
                    {modalSections.length > 0 ? (
                      <select
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                      >
                        {modalSections.map((sec) => (
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-400 bg-slate-50 italic outline-none"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <div className="flex gap-4 pt-1">
                    {(['Male', 'Female'] as const).map((g) => (
                      <label key={g} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="student-gender"
                          checked={gender === g}
                          onChange={() => setGender(g)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{g}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Parent / Guardian Name
                    </label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Parent Mobile
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={guardianMobile}
                      onChange={(e) => setGuardianMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-mono focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0 sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer min-h-[40px] touch-manipulation"
                >
                  {editingStudent ? 'Update Student' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Two-step Safe Deletion & Archive Modal */}
      <SafeDeleteModal
        isOpen={safeDeleteModal.isOpen}
        onClose={() => setSafeDeleteModal(prev => ({ ...prev, isOpen: false }))}
        itemType="Student"
        itemId={safeDeleteModal.itemId}
        itemName={safeDeleteModal.itemName}
        dependencySummary={safeDeleteModal.dependencySummary}
        onArchive={async () => {
          const res = storage.archiveStudent(safeDeleteModal.itemId, currentUser!);
          if (res.success) {
            showNotification('success', `Student "${safeDeleteModal.itemName}" archived safely.`);
            refreshStudents();
          } else {
            showNotification('error', res.error || 'Failed to archive student.');
          }
        }}
        onPermanentDelete={async () => {
          const res = storage.permanentDeleteStudent(safeDeleteModal.itemId, currentUser!);
          if (res.success) {
            showNotification('success', `Student record "${safeDeleteModal.itemName}" permanently purged.`);
            refreshStudents();
          } else {
            showNotification('error', res.error || 'Failed to permanently delete student.');
          }
        }}
      />
    </div>
  );
};
