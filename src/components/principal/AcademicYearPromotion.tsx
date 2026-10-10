import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { AcademicYear, Student, SchoolClass } from '../../types';
import {
  CalendarRange,
  GraduationCap,
  Plus,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  History,
  ShieldCheck,
  Search,
  Check,
  X,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface AcademicYearPromotionProps {
  onNavigateToClasses?: () => void;
  onNavigateToStudents?: () => void;
}

interface StudentPromotionDraft {
  studentId: string;
  studentName: string;
  currentClassId: string;
  currentClassName: string;
  currentSection: string;
  currentRollNo: string;
  decision: 'promoted' | 'repeated' | 'transferred';
  targetClassId: string;
  targetClassName: string;
  targetSection: string;
  targetRollNo: string;
  remarks: string;
}

export const AcademicYearPromotion: React.FC<AcademicYearPromotionProps> = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'promotions' | 'sessions' | 'history'>('promotions');

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => storage.getAcademicYears());
  const activeYear = storage.getActiveAcademicYear();
  const classes = storage.getClasses().filter(c => c.status === 'active');

  const [sourceYearId, setSourceYearId] = useState<string>(activeYear.id);
  const [targetYearId, setTargetYearId] = useState<string>(() => {
    const nonActive = academicYears.find(y => y.id !== activeYear.id && y.status !== 'closed');
    return nonActive ? nonActive.id : '';
  });
  const [selectedSourceClassId, setSelectedSourceClassId] = useState<string>('all');
  const [promotionDrafts, setPromotionDrafts] = useState<{ [studentId: string]: StudentPromotionDraft }>({});
  const [searchFilter, setSearchFilter] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isNewYearModalOpen, setIsNewYearModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newYearName, setNewYearName] = useState('');
  const [newYearStartDate, setNewYearStartDate] = useState('');
  const [newYearEndDate, setNewYearEndDate] = useState('');
  const [newYearStatus, setNewYearStatus] = useState<'upcoming' | 'active'>('upcoming');
  const [newYearNotes, setNewYearNotes] = useState('');
  const [newYearError, setNewYearError] = useState('');

  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Subscribe to storage changes
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setAcademicYears(storage.getAcademicYears());
    });
    return unsub;
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(curr => curr?.message === message ? null : curr);
    }, 4500);
  };

  const refreshAcademicYears = () => {
    const list = storage.getAcademicYears();
    setAcademicYears(list);
  };

  const getNextClassSuggestion = (currentClsName: string): SchoolClass | undefined => {
    const match = currentClsName.match(/\d+/);
    if (!match) return undefined;
    const num = parseInt(match[0], 10);
    const nextNum = num + 1;
    return classes.find(c => c.name.toLowerCase().includes(`class ${nextNum}`) || c.name.toLowerCase().includes(`${nextNum}`));
  };

  const allSourceStudents = selectedSourceClassId === 'all'
    ? storage.getAcademicYears().length > 0
      ? storage.getEnrollmentsForAcademicYear(sourceYearId)
          .filter(e => e.status !== 'transferred')
          .map(e => {
            const base = storage.getStudents().find(s => s.id === e.studentId);
            return {
              id: e.studentId,
              fullName: e.studentName,
              rollNo: e.rollNo,
              classId: e.classId,
              className: e.className,
              section: e.section,
              gender: base?.gender || 'Male',
              guardianName: base?.guardianName || '',
              guardianMobile: base?.guardianMobile || '',
              status: 'active',
              admissionDate: base?.admissionDate || ''
            } as Student;
          })
      : []
    : storage.getStudentsByClassAndSection(selectedSourceClassId, undefined, sourceYearId);

  useEffect(() => {
    if (!targetYearId) return;
    const targetEnrollments = storage.getEnrollmentsForAcademicYear(targetYearId);
    const newDrafts: { [studentId: string]: StudentPromotionDraft } = {};

    allSourceStudents.forEach(st => {
      const existing = targetEnrollments.find(e => e.studentId === st.id);
      if (existing) {
        newDrafts[st.id] = {
          studentId: st.id,
          studentName: st.fullName,
          currentClassId: st.classId,
          currentClassName: st.className,
          currentSection: st.section || '',
          currentRollNo: st.rollNo,
          decision: existing.status === 'transferred' ? 'transferred' : (existing.promotionType === 'repeated' ? 'repeated' : 'promoted'),
          targetClassId: existing.classId,
          targetClassName: existing.className,
          targetSection: existing.section,
          targetRollNo: existing.rollNo,
          remarks: existing.remarks || ''
        };
      } else {
        const nextCls = getNextClassSuggestion(st.className);
        newDrafts[st.id] = {
          studentId: st.id,
          studentName: st.fullName,
          currentClassId: st.classId,
          currentClassName: st.className,
          currentSection: st.section || '',
          currentRollNo: st.rollNo,
          decision: 'promoted',
          targetClassId: nextCls ? nextCls.id : st.classId,
          targetClassName: nextCls ? nextCls.name : st.className,
          targetSection: st.section || '',
          targetRollNo: st.rollNo,
          remarks: ''
        };
      }
    });
    setPromotionDrafts(newDrafts);
  }, [sourceYearId, targetYearId, selectedSourceClassId]);

  const updateDraft = (studentId: string, updates: Partial<StudentPromotionDraft>) => {
    setPromotionDrafts(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        ...updates
      }
    }));
  };

  const applyAutoPromoteNextClass = () => {
    const updated = { ...promotionDrafts };
    Object.keys(updated).forEach(sId => {
      const draft = updated[sId];
      const nextCls = getNextClassSuggestion(draft.currentClassName);
      updated[sId] = {
        ...draft,
        decision: 'promoted',
        targetClassId: nextCls ? nextCls.id : draft.currentClassId,
        targetClassName: nextCls ? nextCls.name : draft.currentClassName
      };
    });
    setPromotionDrafts(updated);
    showNotification('info', 'Next class suggested for eligible students. Please review and confirm assignments.');
  };

  const applyRepeatSameClass = () => {
    const updated = { ...promotionDrafts };
    Object.keys(updated).forEach(sId => {
      const draft = updated[sId];
      updated[sId] = {
        ...draft,
        decision: 'repeated',
        targetClassId: draft.currentClassId,
        targetClassName: draft.currentClassName
      };
    });
    setPromotionDrafts(updated);
    showNotification('info', 'Set all students to remain in the same class for the new academic year.');
  };

  const getDuplicateRollWarnings = (): { [studentId: string]: string } => {
    const warnings: { [studentId: string]: string } = {};
    const keyMap = new Map<string, string[]>();
    Object.values(promotionDrafts).forEach(d => {
      if (d.decision !== 'transferred' && d.targetClassId && d.targetRollNo.trim()) {
        const key = `${d.targetClassId}_${d.targetSection || ''}_${d.targetRollNo.trim().toLowerCase()}`;
        const existing = keyMap.get(key) || [];
        existing.push(d.studentId);
        keyMap.set(key, existing);
      }
    });
    keyMap.forEach((studentIds) => {
      if (studentIds.length > 1) {
        studentIds.forEach(id => {
          warnings[id] = `Duplicate Roll No conflict in target class/section!`;
        });
      }
    });
    return warnings;
  };

  const duplicateWarnings = getDuplicateRollWarnings();
  const hasDuplicateErrors = Object.keys(duplicateWarnings).length > 0;

  const displayedDrafts = Object.values(promotionDrafts).filter(d => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return d.studentName.toLowerCase().includes(q) ||
           d.currentRollNo.toLowerCase().includes(q) ||
           d.targetRollNo.toLowerCase().includes(q);
  });

  const totalStudentsCount = Object.keys(promotionDrafts).length;
  const promotedCount = Object.values(promotionDrafts).filter(d => d.decision === 'promoted').length;
  const repeatedCount = Object.values(promotionDrafts).filter(d => d.decision === 'repeated').length;
  const transferredCount = Object.values(promotionDrafts).filter(d => d.decision === 'transferred').length;

  const handleCommitPromotions = async () => {
    if (!currentUser || !targetYearId) return;
    if (hasDuplicateErrors) {
      showNotification('error', 'Cannot commit promotions: Duplicate roll numbers detected within target class/section.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payloadPromotions = Object.values(promotionDrafts).map(d => ({
        studentId: d.studentId,
        decision: d.decision,
        targetClassId: d.targetClassId,
        targetClassName: d.targetClassName,
        targetSection: d.targetSection,
        targetRollNo: d.targetRollNo,
        remarks: d.remarks
      }));

      const res = await fetch('/api/promotions/validate-and-promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAcademicYearId: sourceYearId,
          targetAcademicYearId: targetYearId,
          promotions: payloadPromotions,
          confirmed: true
        })
      });
      const serverData = await res.json();
      if (!res.ok || !serverData.success) {
        showNotification('error', serverData.error || 'Server rejected promotion verification.');
        setIsSubmitting(false);
        setIsConfirmModalOpen(false);
        return;
      }

      const result = storage.executePromotionBatch({
        sourceAcademicYearId: sourceYearId,
        targetAcademicYearId: targetYearId,
        promotions: payloadPromotions
      }, currentUser);

      if (result.success) {
        showNotification('success', `Successfully processed ${result.count} student promotions into session ${academicYears.find(y => y.id === targetYearId)?.name}.`);
        setIsConfirmModalOpen(false);
      } else {
        showNotification('error', result.error || 'Failed to finalize promotion batch.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Error processing promotions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setNewYearError('');
    if (!newYearName.trim()) {
      setNewYearError('Academic session name (e.g. 2027-28) is required.');
      return;
    }
    if (!newYearStartDate || !newYearEndDate) {
      setNewYearError('Start and End dates are required.');
      return;
    }
    if (newYearStartDate >= newYearEndDate) {
      setNewYearError('Start date must be earlier than End date.');
      return;
    }

    try {
      const res = await fetch('/api/academic-years/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newYearName.trim(),
          startDate: newYearStartDate,
          endDate: newYearEndDate,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNewYearError(data.error || 'Backend failed to authorize academic year.');
        return;
      }

      const saveRes = storage.addAcademicYear({
        name: newYearName.trim(),
        startDate: newYearStartDate,
        endDate: newYearEndDate,
        status: newYearStatus,
        notes: newYearNotes.trim()
      }, currentUser);

      if (!saveRes.success) {
        setNewYearError(saveRes.error || 'Failed to create academic year.');
        return;
      }

      showNotification('success', `Created academic session "${saveRes.academicYear?.name}".`);
      refreshAcademicYears();
      if (saveRes.academicYear) {
        setTargetYearId(saveRes.academicYear.id);
      }
      setIsNewYearModalOpen(false);
      setNewYearName('');
      setNewYearStartDate('');
      setNewYearEndDate('');
      setNewYearNotes('');
    } catch (err: any) {
      setNewYearError(err?.message || 'Failed to create academic year.');
    }
  };

  const handleActivateYear = async (ay: AcademicYear) => {
    if (!currentUser) return;
    const confirmPrompt = window.confirm(
      `Activate Academic Year "${ay.name}"?\n\nThis will set "${ay.name}" as the active default session for all daily attendance marking, rosters, and dashboard overviews. Previous session attendance and enrollments remain preserved.`
    );
    if (!confirmPrompt) return;
    try {
      await fetch('/api/academic-years/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId: ay.id, name: ay.name })
      });
      const res = storage.activateAcademicYear(ay.id, currentUser);
      if (res.success) {
        showNotification('success', `Academic Year "${ay.name}" is now the active system session.`);
        refreshAcademicYears();
      } else {
        showNotification('error', res.error || 'Failed to activate academic year.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Error activating academic year.');
    }
  };

  const handleCloseYear = async (ay: AcademicYear) => {
    if (!currentUser) return;
    const confirmPrompt = window.confirm(
      `Close Academic Year "${ay.name}"?\n\nClosing an academic session marks it as archived/completed. Historical attendance and class records will remain permanently accessible in reports.`
    );
    if (!confirmPrompt) return;
    try {
      await fetch('/api/academic-years/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId: ay.id, name: ay.name })
      });
      const res = storage.closeAcademicYear(ay.id, currentUser);
      if (res.success) {
        showNotification('success', `Closed academic session "${ay.name}".`);
        refreshAcademicYears();
      } else {
        showNotification('error', res.error || 'Failed to close academic year.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Error closing academic year.');
    }
  };

  const allStudents = storage.getStudents();
  const allEnrollments = storage.getEnrollments();
  const filteredHistoryStudents = allStudents.filter(s => {
    if (!historySearchQuery) return true;
    const q = historySearchQuery.toLowerCase();
    return s.fullName.toLowerCase().includes(q) ||
           s.rollNo.toLowerCase().includes(q) ||
           s.id.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm shadow-md transition-all animate-fadeIn ${
          notification.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : notification.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CalendarRange className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Academic Years & Class Promotion
            </h2>
            <span className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active: {activeYear.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manual class promotion, enrollment history tracking, and multi-session attendance management.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewYearModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Session</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('promotions')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'promotions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Class Promotion</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'sessions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>Academic Sessions List</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
            {academicYears.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Student Enrollment History</span>
        </button>
      </div>

      {/* TAB 1: PROMOTIONS */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Source Academic Session
              </label>
              <select
                value={sourceYearId}
                onChange={e => setSourceYearId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none bg-slate-50/50"
              >
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.status === 'active' ? '(Current Active)' : `(${ay.status})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Target Academic Session (Enrollment)
              </label>
              <select
                value={targetYearId}
                onChange={e => setTargetYearId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-semibold text-indigo-900 bg-indigo-50/30"
              >
                <option value="">-- Select Target Academic Session --</option>
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id} disabled={ay.id === sourceYearId}>
                    {ay.name} {ay.id === sourceYearId ? '(Source Session)' : `(${ay.status})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Filter Source Class
              </label>
              <select
                value={selectedSourceClassId}
                onChange={e => setSelectedSourceClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="all">All Enrolled Classes ({allSourceStudents.length} students)</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!targetYearId ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <CalendarRange className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">Target Session Not Selected</p>
              <p className="text-xs text-slate-500 mt-1">
                Please select the target academic session above to begin manual student promotion. If you need a new session like 2027-28, click &quot;Create New Session&quot; first.
              </p>
            </div>
          ) : allSourceStudents.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No Students Found in Source Session</p>
              <p className="text-xs text-slate-500 mt-1">
                No active student enrollment records exist for {academicYears.find(y => y.id === sourceYearId)?.name} in this class.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                    Total: <span className="text-slate-900 font-bold">{totalStudentsCount}</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                    Promote: <span className="font-bold">{promotedCount}</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                    Repeat: <span className="font-bold">{repeatedCount}</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                    Transferred / Left: <span className="font-bold">{transferredCount}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={applyAutoPromoteNextClass}
                    className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Auto-Suggest Next Class</span>
                  </button>
                  <button
                    type="button"
                    onClick={applyRepeatSameClass}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Set All Repeat</span>
                  </button>
                  <button
                    type="button"
                    disabled={hasDuplicateErrors}
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Review & Commit Promotions &rarr;</span>
                  </button>
                </div>
              </div>

              {hasDuplicateErrors && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold">Duplicate Roll Numbers Conflict:</span>
                    <p className="mt-0.5">
                      Two or more students share the same roll number in the same target class and section. Please assign unique roll numbers before finalizing promotion.
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Search students in current promotion batch by name or roll number..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none bg-white"
                />
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Student & Permanent ID</th>
                        <th className="py-3 px-4">Current Class & Roll</th>
                        <th className="py-3 px-4">Promotion Decision</th>
                        <th className="py-3 px-4">Target Class & Section</th>
                        <th className="py-3 px-4">Target Roll No</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedDrafts.map(draft => {
                        const hasWarning = !!duplicateWarnings[draft.studentId];
                        return (
                          <tr key={draft.studentId} className={`hover:bg-slate-50/70 transition-colors ${hasWarning ? 'bg-rose-50/40' : ''}`}>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900">{draft.studentName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {draft.studentId}</p>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              <span className="font-medium">{draft.currentClassName}</span>
                              {draft.currentSection && <span className="text-slate-500"> ({draft.currentSection})</span>}
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                                Roll {draft.currentRollNo}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200/80 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => updateDraft(draft.studentId, { decision: 'promoted' })}
                                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                                    draft.decision === 'promoted'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Promote
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateDraft(draft.studentId, {
                                    decision: 'repeated',
                                    targetClassId: draft.currentClassId,
                                    targetClassName: draft.currentClassName,
                                    targetSection: draft.currentSection
                                  })}
                                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                                    draft.decision === 'repeated'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Repeat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateDraft(draft.studentId, { decision: 'transferred' })}
                                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                                    draft.decision === 'transferred'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Transferred
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {draft.decision === 'transferred' ? (
                                <span className="text-xs text-rose-600 font-medium italic">
                                  Marked Transferred / Left School
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={draft.targetClassId}
                                    onChange={e => {
                                      const foundCls = classes.find(c => c.id === e.target.value);
                                      const secs = foundCls?.sections && foundCls.sections.length > 0
                                        ? foundCls.sections
                                        : (foundCls?.section ? [foundCls.section] : []);
                                      updateDraft(draft.studentId, {
                                        targetClassId: e.target.value,
                                        targetClassName: foundCls?.name || draft.targetClassName,
                                        targetSection: secs[0] || ''
                                      });
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-600 outline-none bg-white font-medium text-slate-800"
                                  >
                                    {classes.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                  {(() => {
                                    const targetCls = classes.find(c => c.id === draft.targetClassId);
                                    const secs = targetCls?.sections && targetCls.sections.length > 0
                                      ? targetCls.sections
                                      : (targetCls?.section ? [targetCls.section] : []);
                                    if (secs.length === 0) return null;
                                    return (
                                      <select
                                        value={draft.targetSection}
                                        onChange={e => updateDraft(draft.studentId, { targetSection: e.target.value })}
                                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-600 outline-none bg-white"
                                      >
                                        {secs.map(s => (
                                          <option key={s} value={s}>Sec {s}</option>
                                        ))}
                                      </select>
                                    );
                                  })()}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {draft.decision === 'transferred' ? (
                                <span className="text-slate-400 text-xs">-</span>
                              ) : (
                                <div>
                                  <input
                                    type="text"
                                    value={draft.targetRollNo}
                                    onChange={e => updateDraft(draft.studentId, { targetRollNo: e.target.value })}
                                    className={`w-20 px-2.5 py-1.5 rounded-lg border text-center font-mono text-xs outline-none font-bold ${
                                      hasWarning
                                        ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-1 focus:ring-rose-400'
                                        : 'border-slate-200 focus:border-indigo-600 text-slate-800'
                                    }`}
                                  />
                                  {hasWarning && (
                                    <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Duplicate!</p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                value={draft.remarks}
                                onChange={e => updateDraft(draft.studentId, { remarks: e.target.value })}
                                placeholder="Optional note"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-600 outline-none placeholder-slate-300"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: SESSIONS LIST */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {academicYears.map(ay => {
              const enrolledInYear = storage.getEnrollmentsForAcademicYear(ay.id);
              const attendanceInYear = storage.getStudentAttendanceForAcademicYear(ay.id);
              const isActive = ay.status === 'active';
              const isClosed = ay.status === 'closed';
              return (
                <div
                  key={ay.id}
                  className={`bg-white rounded-3xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-emerald-300 ring-2 ring-emerald-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{ay.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ay.startDate} &bull; {ay.endDate}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isClosed
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {isActive ? 'Active Session' : isClosed ? 'Closed' : 'Upcoming'}
                      </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[11px] text-slate-500 block">Enrolled Students</span>
                        <span className="font-bold text-slate-800 text-sm">{enrolledInYear.length}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[11px] text-slate-500 block">Attendance Registers</span>
                        <span className="font-bold text-slate-800 text-sm">{attendanceInYear.length}</span>
                      </div>
                    </div>
                    {ay.notes && (
                      <p className="text-xs text-slate-400 mt-3 italic">&quot;{ay.notes}&quot;</p>
                    )}
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    {!isActive && !isClosed && (
                      <button
                        type="button"
                        onClick={() => handleActivateYear(ay)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Activate Session
                      </button>
                    )}
                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => handleCloseYear(ay)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Close Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ENROLLMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                placeholder="Search student history by name, permanent ID, or roll number..."
                className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredHistoryStudents.map(student => {
              const studentEnrollments = allEnrollments.filter(e => e.studentId === student.id);
              studentEnrollments.sort((a, b) => (a.academicYearName > b.academicYearName ? 1 : -1));
              return (
                <div key={student.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">{student.fullName}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Permanent ID: {student.id} &bull; Admitted: {student.admissionDate || 'N/A'}
                      </p>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                      {student.className} ({student.rollNo})
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Academic Year Class Roster History:
                    </p>
                    <div className="space-y-2">
                      {studentEnrollments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No enrollment history logged yet.</p>
                      ) : (
                        studentEnrollments.map((enr) => (
                          <div key={enr.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{enr.academicYearName}</span>
                              <span className="text-slate-400">&rarr;</span>
                              <span className="text-indigo-900 font-semibold">{enr.className}</span>
                              {enr.section && <span className="text-slate-500">Sec {enr.section}</span>}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                                Roll {enr.rollNo}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              enr.promotionType === 'promoted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : enr.promotionType === 'repeated'
                                ? 'bg-amber-100 text-amber-800'
                                : enr.promotionType === 'transferred'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {enr.promotionType || 'Enrolled'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Confirm Student Class Promotions
                </h3>
                <p className="text-xs text-slate-500">
                  Review before applying changes to session {academicYears.find(y => y.id === targetYearId)?.name}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Students Processed:</span>
                <span className="font-bold text-slate-900">{totalStudentsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 font-semibold">Moving to Next Class:</span>
                <span className="font-bold text-emerald-700">{promotedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700 font-semibold">Remaining in Same Class (Repeat):</span>
                <span className="font-bold text-amber-700">{repeatedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700 font-semibold">Marked Transferred / Left:</span>
                <span className="font-bold text-rose-700">{transferredCount}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
              &bull; Permanent student IDs and previous academic year attendance remain preserved.<br />
              &bull; Separate class/section enrollment history is created for the new session.<br />
              &bull; All previous attendance reports continue to reflect historical classes accurately.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCommitPromotions}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer min-h-[40px] touch-manipulation"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Authorize & Commit Batch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW ACADEMIC YEAR MODAL */}
      {isNewYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Create Academic Session</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewYearModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newYearError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{newYearError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewYear} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  required
                  value={newYearName}
                  onChange={e => setNewYearName(e.target.value)}
                  placeholder="e.g. 2027-28 or 2027-2028"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newYearStartDate}
                    onChange={e => setNewYearStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newYearEndDate}
                    onChange={e => setNewYearEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Status
                </label>
                <select
                  value={newYearStatus}
                  onChange={e => setNewYearStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
                >
                  <option value="upcoming">Upcoming (Configure promotions first)</option>
                  <option value="active">Active (Switch live system default immediately)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  value={newYearNotes}
                  onChange={e => setNewYearNotes(e.target.value)}
                  placeholder="e.g. Sanskar High School Session 2027-28"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewYearModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer min-h-[40px] touch-manipulation"
                >
                  Create Academic Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
