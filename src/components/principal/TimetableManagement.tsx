import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { PeriodConfig, TimetableEntry, SubstituteAssignment } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Coffee,
  X,
  Power,
  PowerOff,
  Filter
} from 'lucide-react';

export const TimetableManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'weekly' | 'periods' | 'substitute'>('weekly');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
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

  const currentKolkataDay = storage.getDayOfWeekInKolkata();
  const daysOfWeek: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  const validDay = daysOfWeek.includes(currentKolkataDay as any) ? (currentKolkataDay as any) : 'Monday';
  const [selectedDay, setSelectedDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'>(validDay);
  const [filterClassId, setFilterClassId] = useState<string>('all');

  const [periods, setPeriods] = useState<PeriodConfig[]>(() => storage.getPeriods());
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => storage.getTimetable());
  const [substitutes, setSubstitutes] = useState<SubstituteAssignment[]>(() => storage.getSubstitutes());

  const [teachers, setTeachers] = useState(() => storage.getStaffMembers().filter(s => s.status === 'active'));
  const [classes, setClasses] = useState(() => storage.getClasses().filter(c => c.status === 'active'));
  const [subjects, setSubjects] = useState(() => storage.getSubjects().filter(s => s.status === 'active'));

  // Modals
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PeriodConfig | null>(null);
  const [periodName, setPeriodName] = useState('');
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [periodType, setPeriodType] = useState<'regular' | 'break' | 'attendance'>('regular');
  const [periodError, setPeriodError] = useState('');
  const [periodSuccess, setPeriodSuccess] = useState('');

  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableEntry | null>(null);
  const [slotDay, setSlotDay] = useState(selectedDay);
  const [slotPeriodNumber, setSlotPeriodNumber] = useState<number>(periods[0]?.periodNumber || 1);
  const [slotClassId, setSlotClassId] = useState(classes[0]?.id || '');
  const [slotSection, setSlotSection] = useState('');
  const [slotSubjectId, setSlotSubjectId] = useState('');
  const [slotTeacherId, setSlotTeacherId] = useState(teachers[0]?.id || '');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotError, setSlotError] = useState('');
  const [slotSuccess, setSlotSuccess] = useState('');

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subDate, setSubDate] = useState(() => storage.getTodayInKolkata());
  const [subPeriod, setSubPeriod] = useState(periods[0]?.periodNumber || 1);
  const [subClassId, setSubClassId] = useState(classes[0]?.id || '');
  const [subOrigTeacherId, setSubOrigTeacherId] = useState(teachers[0]?.id || '');
  const [subNewTeacherId, setSubNewTeacherId] = useState(teachers[1]?.id || teachers[0]?.id || '');
  const [subReason, setSubReason] = useState('Temporary Duty / Leave Cover');
  const [subError, setSubError] = useState('');
  const [subSuccess, setSubSuccess] = useState('');

  const refreshData = () => {
    setPeriods(storage.getPeriods());
    setTimetable(storage.getTimetable());
    setSubstitutes(storage.getSubstitutes());
    setTeachers(storage.getStaffMembers().filter(s => s.status === 'active'));
    setClasses(storage.getClasses().filter(c => c.status === 'active'));
    setSubjects(storage.getSubjects().filter(s => s.status === 'active'));
  };

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      refreshData();
    });
    return unsub;
  }, []);

  const getSubjectsForClass = (targetClassId: string) => {
    return subjects.filter(s => s.classIds?.includes(targetClassId));
  };

  const getSectionsForClass = (targetClassId: string) => {
    const cls = classes.find(c => c.id === targetClassId);
    if (!cls) return [];
    return cls.sections && cls.sections.length > 0
      ? cls.sections
      : (cls.section ? [cls.section] : []);
  };

  const handleSlotClassChange = (newClassId: string) => {
    setSlotClassId(newClassId);
    const secs = getSectionsForClass(newClassId);
    setSlotSection(secs[0] || '');
    const applicableSubjects = getSubjectsForClass(newClassId);
    setSlotSubjectId(applicableSubjects[0]?.id || '');
    const cls = classes.find(c => c.id === newClassId);
    if (cls?.room) setSlotRoom(cls.room);
  };

  const handleOpenAddPeriod = () => {
    setEditingPeriod(null);
    const nextNum = periods.length > 0 ? Math.max(...periods.map(p => p.periodNumber)) + 1 : 1;
    setPeriodNumber(nextNum);
    setPeriodName('');
    setStartTime('');
    setEndTime('');
    setPeriodType('regular');
    setPeriodError('');
    setPeriodSuccess('');
    setIsPeriodModalOpen(true);
  };

  const handleOpenEditPeriod = (p: PeriodConfig) => {
    setEditingPeriod(p);
    setPeriodNumber(p.periodNumber);
    setPeriodName(p.name);
    setStartTime(p.startTime);
    setEndTime(p.endTime);
    setPeriodType(p.type);
    setPeriodError('');
    setPeriodSuccess('');
    setIsPeriodModalOpen(true);
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setPeriodError('');
    setPeriodSuccess('');

    if (!periodName.trim()) {
      setPeriodError('Period name is required.');
      return;
    }
    if (!startTime || !endTime) {
      setPeriodError('Start time and end time are required.');
      return;
    }
    if (startTime >= endTime) {
      setPeriodError('End time must be later than start time.');
      return;
    }

    if (editingPeriod) {
      const res = storage.updatePeriod(
        editingPeriod.id,
        {
          name: periodName.trim(),
          startTime,
          endTime,
          type: periodType,
        },
        currentUser
      );
      if (!res.success) {
        setPeriodError(res.error || 'Failed to update period.');
        return;
      }
      setPeriodSuccess('Period updated successfully.');
    } else {
      const res = storage.addPeriod(
        {
          periodNumber: Number(periodNumber),
          name: periodName.trim(),
          startTime,
          endTime,
          type: periodType,
          status: 'active',
        },
        currentUser
      );
      if (!res.success) {
        setPeriodError(res.error || 'Failed to add period.');
        return;
      }
      setPeriodSuccess(`Period "${periodName.trim()}" created successfully.`);
    }

    refreshData();
    setTimeout(() => {
      setIsPeriodModalOpen(false);
      setPeriodSuccess('');
    }, 1200);
  };

  const handleTogglePeriodStatus = (p: PeriodConfig) => {
    if (!currentUser) return;
    const res = storage.togglePeriodStatus(p.id, currentUser);
    if (!res.success) {
      showNotification('error', res.error || 'Failed to toggle period status.');
      return;
    }
    showNotification('success', `Period "${p.name}" status updated.`);
    refreshData();
  };

  const handleDeletePeriod = (p: PeriodConfig) => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete Period "${p.name}"?`,
      message: `Are you sure you want to delete period "${p.name}" (${p.startTime} - ${p.endTime})?`,
      confirmText: 'Delete Period',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => {
        const res = storage.deletePeriod(p.id, currentUser);
        if (!res.success) {
          showNotification('error', res.error || 'Could not delete period.');
          return;
        }
        showNotification('success', `Period "${p.name}" deleted.`);
        refreshData();
      },
    });
  };

  const handleOpenAddSlot = () => {
    if (periods.length === 0) {
      showNotification('info', 'Please configure periods first.');
      setActiveTab('periods');
      return;
    }
    setEditingSlot(null);
    setSlotDay(selectedDay);
    const activePers = periods.filter(p => p.status === 'active' && p.type !== 'break');
    setSlotPeriodNumber(activePers[0]?.periodNumber || periods[0]?.periodNumber || 1);
    const initialC = classes[0];
    if (initialC) {
      setSlotClassId(initialC.id);
      const secs = getSectionsForClass(initialC.id);
      setSlotSection(secs[0] || '');
      const subList = getSubjectsForClass(initialC.id);
      setSlotSubjectId(subList[0]?.id || '');
      if (initialC.room) setSlotRoom(initialC.room);
    }
    setSlotTeacherId(teachers[0]?.id || '');
    setSlotError('');
    setSlotSuccess('');
    setIsAddSlotOpen(true);
  };

  const handleOpenEditSlot = (slot: TimetableEntry) => {
    setEditingSlot(slot);
    setSlotDay(slot.dayOfWeek);
    setSlotPeriodNumber(slot.periodNumber);
    setSlotClassId(slot.classId);
    setSlotSection(slot.section || '');
    setSlotSubjectId(slot.subjectId);
    setSlotTeacherId(slot.teacherId);
    setSlotRoom(slot.room || '');
    setSlotError('');
    setSlotSuccess('');
    setIsAddSlotOpen(true);
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSlotError('');
    setSlotSuccess('');

    const cls = classes.find(c => c.id === slotClassId);
    const sub = subjects.find(s => s.id === slotSubjectId);
    const teacher = teachers.find(t => t.id === slotTeacherId);
    const periodObj = periods.find(p => p.periodNumber === Number(slotPeriodNumber));

    if (!cls || !sub || !teacher) {
      setSlotError('Please select valid class, subject, and teacher.');
      return;
    }

    if (editingSlot) {
      const res = storage.updateTimetableEntry(
        editingSlot.id,
        {
          dayOfWeek: slotDay,
          periodId: periodObj?.id,
          periodNumber: Number(slotPeriodNumber),
          periodName: periodObj?.name,
          startTime: periodObj?.startTime,
          endTime: periodObj?.endTime,
          classId: cls.id,
          className: cls.name,
          section: slotSection || undefined,
          subjectId: sub.id,
          subjectName: sub.name,
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          room: slotRoom.trim() || cls.room || undefined,
        },
        currentUser
      );
      if (!res.success) {
        setSlotError(res.error || 'Failed to update timetable slot.');
        return;
      }
      setSlotSuccess('Timetable slot updated successfully.');
    } else {
      const res = storage.addTimetableEntry(
        {
          dayOfWeek: slotDay,
          periodId: periodObj?.id,
          periodNumber: Number(slotPeriodNumber),
          periodName: periodObj?.name,
          startTime: periodObj?.startTime,
          endTime: periodObj?.endTime,
          classId: cls.id,
          className: cls.name,
          section: slotSection || undefined,
          subjectId: sub.id,
          subjectName: sub.name,
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          room: slotRoom.trim() || cls.room || undefined,
        },
        currentUser
      );
      if (!res.success) {
        setSlotError(res.error || 'Failed to schedule slot.');
        return;
      }
      setSlotSuccess('Timetable slot scheduled successfully.');
    }

    refreshData();
    setTimeout(() => {
      setIsAddSlotOpen(false);
      setSlotSuccess('');
    }, 1200);
  };

  const handleDeleteSlot = (id: string) => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Timetable Slot?',
      message: 'Are you sure you want to remove this scheduled period slot?',
      confirmText: 'Delete Slot',
      variant: 'danger',
      onConfirm: () => {
        storage.deleteTimetableEntry(id, currentUser);
        showNotification('success', 'Timetable slot deleted.');
        refreshData();
      },
    });
  };

  const handleOpenAddSubstitute = () => {
    setSubDate(storage.getTodayInKolkata());
    setSubPeriod(periods[0]?.periodNumber || 1);
    setSubClassId(classes[0]?.id || '');
    setSubOrigTeacherId(teachers[0]?.id || '');
    setSubNewTeacherId(teachers[1]?.id || teachers[0]?.id || '');
    setSubReason('Temporary Leave Cover');
    setSubError('');
    setSubSuccess('');
    setIsSubModalOpen(true);
  };

  const handleAddSubstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubError('');
    setSubSuccess('');

    if (subOrigTeacherId === subNewTeacherId) {
      setSubError('Substitute teacher must be different from the absent teacher.');
      return;
    }
    const origT = teachers.find(t => t.id === subOrigTeacherId);
    const newT = teachers.find(t => t.id === subNewTeacherId);
    const cls = classes.find(c => c.id === subClassId);

    if (!origT || !newT || !cls) {
      setSubError('Please select valid teachers and class.');
      return;
    }

    const res = storage.addSubstitute(
      {
        date: subDate,
        periodNumber: Number(subPeriod),
        classId: cls.id,
        className: cls.name,
        subjectId: subjects[0]?.id || 'sub-gen',
        subjectName: subjects[0]?.name || 'General',
        originalTeacherId: origT.id,
        originalTeacherName: origT.fullName,
        substituteTeacherId: newT.id,
        substituteTeacherName: newT.fullName,
        reason: subReason.trim() || 'Leave coverage',
      },
      currentUser
    );

    if (!res.success) {
      setSubError(res.error || 'Failed to record substitute.');
      return;
    }

    setSubSuccess('Substitute assignment recorded.');
    refreshData();
    setTimeout(() => {
      setIsSubModalOpen(false);
      setSubSuccess('');
    }, 1200);
  };

  const daySlots = timetable.filter(s => {
    if (s.dayOfWeek !== selectedDay) return false;
    if (filterClassId !== 'all' && s.classId !== filterClassId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Timetable, Periods & Bell Schedule
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure custom school period times, schedule lessons, and manage temporary substitutes
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'weekly'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Schedule ({timetable.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('periods')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'periods'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Periods & Timings ({periods.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('substitute')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'substitute'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Substitutes ({substitutes.length})
            </button>
          </div>

          {activeTab === 'weekly' && (
            <button
              type="button"
              onClick={handleOpenAddSlot}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Slot</span>
            </button>
          )}
          {activeTab === 'periods' && (
            <button
              type="button"
              onClick={handleOpenAddPeriod}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Period</span>
            </button>
          )}
          {activeTab === 'substitute' && (
            <button
              type="button"
              onClick={handleOpenAddSubstitute}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Substitute</span>
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
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Weekly Matrix */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedDay === day
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white outline-none focus:border-indigo-600"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Schedule for {selectedDay}</span>
              </span>
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/50">
                {daySlots.length} Slots Scheduled
              </span>
            </div>

            {periods.length === 0 ? (
              <div className="p-8 sm:p-12 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  No Periods Configured Yet
                </h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  Configure your daily period timings (e.g. Period 1: 08:00 to 08:45) in the &quot;Periods & Timings&quot; tab first.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('periods');
                    handleOpenAddPeriod();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure School Periods</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Cards View (Small screens) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {periods.map((p) => {
                    if (p.type === 'break') {
                      return (
                        <div key={p.id} className="p-3.5 bg-amber-50/60 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-amber-900">{p.name}</p>
                              <p className="text-[11px] font-mono text-amber-700">{p.startTime} - {p.endTime}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider bg-amber-100/80 px-2 py-0.5 rounded-full">
                            Recess / Break
                          </span>
                        </div>
                      );
                    }
                    const slotsInPeriod = daySlots.filter(s => s.periodNumber === p.periodNumber);
                    if (slotsInPeriod.length === 0) {
                      return (
                        <div key={p.id} className="p-3.5 bg-slate-50/50 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-700">{p.name}</span>
                            <span className="text-[11px] font-mono text-slate-400 ml-2">{p.startTime} - {p.endTime}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 italic">No slot scheduled</span>
                        </div>
                      );
                    }
                    return (
                      <div key={p.id} className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                              #{p.periodNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{p.name}</span>
                            <span className="text-[11px] font-mono text-slate-500">({p.startTime} - {p.endTime})</span>
                          </div>
                        </div>
                        {slotsInPeriod.map(slot => (
                          <div key={slot.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{slot.className}</span>
                                {slot.section && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                    Sec {slot.section}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-800">
                                  {slot.subjectName}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 truncate">
                                Teacher: <span className="font-semibold text-slate-800">{slot.teacherName}</span>
                                {slot.room && <span className="text-slate-400 text-[11px]"> • {slot.room}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditSlot(slot)}
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop / Tablet Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white">
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Timing</th>
                        <th className="py-3 px-4">Class & Section</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Assigned Teacher</th>
                        <th className="py-3 px-4">Classroom</th>
                        <th className="py-3 px-4 text-right">Actions</th>
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
                              <td colSpan={5} className="py-3 px-4 text-amber-700 italic font-medium">
                                School Recess / Lunch Break
                              </td>
                            </tr>
                          );
                        }
                        const slotsInPeriod = daySlots.filter(s => s.periodNumber === p.periodNumber);
                        if (slotsInPeriod.length === 0) {
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-bold text-slate-700">
                                {p.name}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-500">
                                {p.startTime} - {p.endTime}
                              </td>
                              <td colSpan={5} className="py-3 px-4 text-slate-400 italic">
                                No classes scheduled for this slot
                              </td>
                            </tr>
                          );
                        }
                        return slotsInPeriod.map((slot) => (
                          <tr key={slot.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-bold text-indigo-900">
                              {p.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                              {p.startTime} - {p.endTime}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {slot.className}
                              {slot.section && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                                  Sec {slot.section}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                {slot.subjectName}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {slot.teacherName}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {slot.room || 'Room 101'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSlot(slot)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Slot"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove Slot"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Periods & Bell Timings */}
      {activeTab === 'periods' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Configured Daily Bell Schedule</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Each school sets its own custom period durations and break timings
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddPeriod}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Period</span>
            </button>
          </div>
          {/* Mobile Cards View for Periods */}
          <div className="block md:hidden divide-y divide-slate-100">
            {periods.map((p) => (
              <div key={p.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                      #{p.periodNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{p.name}</span>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    p.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {p.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {p.startTime} - {p.endTime}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      p.type === 'break'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : p.type === 'attendance'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    }`}>
                      {p.type === 'break' ? 'Break / Lunch' : p.type === 'attendance' ? 'Assembly' : 'Lesson'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPeriod(p)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Timings"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePeriodStatus(p)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                      title="Toggle Status"
                    >
                      {p.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePeriod(p)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Delete Period"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View for Periods */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Period Name</th>
                  <th className="py-3 px-4">Start Time</th>
                  <th className="py-3 px-4">End Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      #{p.periodNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {p.startTime}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {p.endTime}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        p.type === 'break'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : p.type === 'attendance'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                      }`}>
                        {p.type === 'break' ? 'Break / Lunch' : p.type === 'attendance' ? 'Assembly' : 'Lesson'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {p.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPeriod(p)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Timings"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePeriodStatus(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                          title="Toggle Status"
                        >
                          {p.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePeriod(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Period"
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
        </div>
      )}

      {/* Tab 3: Substitutes */}
      {activeTab === 'substitute' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Temporary Substitute Assignments
            </span>
            <button
              type="button"
              onClick={handleOpenAddSubstitute}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Substitute</span>
            </button>
          </div>
          {substitutes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No temporary substitute assignments recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Absent Teacher</th>
                    <th className="py-3 px-4">Substitute Teacher</th>
                    <th className="py-3 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {substitutes.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{s.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">Period #{s.periodNumber}</td>
                      <td className="py-3.5 px-4 font-semibold text-indigo-900">{s.className}</td>
                      <td className="py-3.5 px-4 text-rose-700 line-through">{s.originalTeacherName}</td>
                      <td className="py-3.5 px-4 text-emerald-700 font-bold">{s.substituteTeacherName}</td>
                      <td className="py-3.5 px-4 text-slate-500">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Period Modal */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-indigo-100 relative max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
              <div className="pr-3">
                <h3 className="text-base font-bold text-slate-800">
                  {editingPeriod ? 'Edit Period Timings' : 'Add School Period'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set period title, numerical order, start time, and end time
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer touch-manipulation shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain touch-pan-y">
                {periodError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{periodError}</span>
                  </div>
                )}
                {periodSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>{periodSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Order #
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={periodNumber}
                      onChange={(e) => setPeriodNumber(parseInt(e.target.value, 10) || 1)}
                      required
                      disabled={!!editingPeriod}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Period Name
                    </label>
                    <input
                      type="text"
                      value={periodName}
                      onChange={(e) => setPeriodName(e.target.value)}
                      placeholder="e.g. Period 1, Recess, Assembly"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Type
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value="regular">Teaching Period (Regular)</option>
                    <option value="break">School Break / Recess / Lunch</option>
                    <option value="attendance">Assembly / Morning Attendance</option>
                  </select>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0 sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer min-h-[40px] touch-manipulation"
                >
                  {editingPeriod ? 'Update Period' : 'Save Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Slot Modal */}
      {isAddSlotOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-indigo-100 relative max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
              <div className="pr-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  {editingSlot ? 'Edit Timetable Slot' : 'Schedule Timetable Slot'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign teacher, subject, class, and section to a configured period
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSlotOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer touch-manipulation shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain touch-pan-y">
                {slotError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{slotError}</span>
                  </div>
                )}
                {slotSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>{slotSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Day of Week
                  </label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                  >
                    {daysOfWeek.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Period & Timing Selection with Responsive Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Period & Timing
                    </label>
                    {(() => {
                      const selP = periods.find(p => p.periodNumber === Number(slotPeriodNumber));
                      return selP ? (
                        <span className="text-[11px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/50">
                          {selP.name} ({selP.startTime} - {selP.endTime})
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Quick-tap period pills for small screens */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none touch-pan-x mb-2">
                    {periods.filter(p => p.status === 'active' && p.type !== 'break').map(p => {
                      const isSel = Number(slotPeriodNumber) === p.periodNumber;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSlotPeriodNumber(p.periodNumber)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                            isSel
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                          }`}
                        >
                          P#{p.periodNumber} ({p.startTime})
                        </button>
                      );
                    })}
                  </div>

                  <select
                    value={slotPeriodNumber}
                    onChange={(e) => setSlotPeriodNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold truncate"
                  >
                    {periods.filter(p => p.status === 'active' && p.type !== 'break').map(p => (
                      <option key={p.id} value={p.periodNumber}>
                        Period #{p.periodNumber}: {p.name} ({p.startTime} - {p.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Class
                    </label>
                    <select
                      value={slotClassId}
                      onChange={(e) => handleSlotClassChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Section
                    </label>
                    {getSectionsForClass(slotClassId).length > 0 ? (
                      <select
                        value={slotSection}
                        onChange={(e) => setSlotSection(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                      >
                        {getSectionsForClass(slotClassId).map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value="Single batch (No sections)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-400 bg-slate-50 italic outline-none"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subject
                  </label>
                  {getSubjectsForClass(slotClassId).length > 0 ? (
                    <select
                      value={slotSubjectId}
                      onChange={(e) => setSlotSubjectId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                    >
                      {getSubjectsForClass(slotClassId).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600 italic p-2 bg-amber-50 rounded-xl">
                      No subjects associated with this class.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assigned Teacher
                  </label>
                  <select
                    value={slotTeacherId}
                    onChange={(e) => setSlotTeacherId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} (UID: {t.uid})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Classroom / Lab
                  </label>
                  <input
                    type="text"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    placeholder="e.g. Room 101, Science Lab"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0 sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsAddSlotOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={getSubjectsForClass(slotClassId).length === 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50 min-h-[40px] touch-manipulation"
                >
                  {editingSlot ? 'Update Slot' : 'Schedule Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Substitute Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-indigo-100 relative max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
              <div className="pr-3">
                <h3 className="text-base font-bold text-slate-800">
                  Record Temporary Substitute
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cover a period for an absent teacher on a specific date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer touch-manipulation shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubstitute} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain touch-pan-y">
                {subError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{subError}</span>
                  </div>
                )}
                {subSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>{subSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={subDate}
                      onChange={(e) => setSubDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Period
                    </label>
                    <select
                      value={subPeriod}
                      onChange={(e) => setSubPeriod(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                    >
                      {periods.filter(p => p.type !== 'break').map(p => (
                        <option key={p.id} value={p.periodNumber}>
                          Period #{p.periodNumber}: {p.name} ({p.startTime} - {p.endTime})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Class
                  </label>
                  <select
                    value={subClassId}
                    onChange={(e) => setSubClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Absent Teacher
                    </label>
                    <select
                      value={subOrigTeacherId}
                      onChange={(e) => setSubOrigTeacherId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Substitute Teacher
                    </label>
                    <select
                      value={subNewTeacherId}
                      onChange={(e) => setSubNewTeacherId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-600 outline-none font-semibold"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reason for Substitution
                  </label>
                  <input
                    type="text"
                    value={subReason}
                    onChange={(e) => setSubReason(e.target.value)}
                    placeholder="e.g. Medical Leave, Training"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0 sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer min-h-[40px] touch-manipulation"
                >
                  Record Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
      />
    </div>
  );
};
