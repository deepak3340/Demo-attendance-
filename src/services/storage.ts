import {
  SchoolProfile,
  User,
  SchoolClass,
  Subject,
  TeacherAssignment,
  PeriodConfig,
  TimetableEntry,
  SubstituteAssignment,
  Student,
  DailyClassAttendance,
  DailyStaffAttendance,
  SchoolCalendarConfig,
  Holiday,
  AuditLog,
  AttendanceStatus,
  StaffAttendanceStatus,
  AcademicYear,
  StudentEnrollment,
  PromotionDecision
} from '../types';
import {
  INITIAL_SCHOOL,
  INITIAL_USERS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_PERIODS,
  INITIAL_TIMETABLE,
  INITIAL_STUDENTS,
  INITIAL_STUDENT_ATTENDANCE,
  INITIAL_STAFF_ATTENDANCE,
  INITIAL_CALENDAR,
  INITIAL_AUDIT_LOGS,
  INITIAL_ACADEMIC_YEARS,
  INITIAL_ENROLLMENTS
} from '../data/initialData';
import {
  saveDocumentToFirestore,
  deleteDocumentFromFirestore,
  setupRealtimeListeners,
  validateFirestoreConnection,
  isFirebaseInitialized,
  clearAllCloudCollectionsExceptPrincipal
} from './firebase';

export const STORAGE_KEYS = {
  SCHOOL: 'ams_school',
  USERS: 'ams_users',
  CLASSES: 'ams_classes',
  SUBJECTS: 'ams_subjects',
  ASSIGNMENTS: 'ams_assignments',
  PERIODS: 'ams_periods',
  TIMETABLE: 'ams_timetable',
  SUBSTITUTES: 'ams_substitutes',
  STUDENTS: 'ams_students',
  STUDENT_ATTENDANCE: 'ams_student_attendance',
  STAFF_ATTENDANCE: 'ams_staff_attendance',
  CALENDAR: 'ams_calendar',
  AUDIT_LOGS: 'ams_audit_logs',
  AUTH_SESSION: 'ams_auth_session',
  SECURITY_SETTINGS: 'ams_security_settings',
  ACADEMIC_YEARS: 'ams_academic_years',
  ENROLLMENTS: 'ams_enrollments',
};

type ChangeListener = () => void;

class StorageService {
  private listeners: Set<ChangeListener> = new Set();
  private hasInitializedRealtime = false;

  public subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn(`Error reading ${key} from storage, using default`, e);
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notifyListeners();
      // Background automated sync to Firebase Firestore
      this.syncKeyToFirestore(key, value).catch(() => {});
    } catch (e) {
      console.error(`Error saving ${key} to storage`, e);
    }
  }

  // Automatic Background Firestore Synchronizer
  public async syncKeyToFirestore(key: string, value: any): Promise<void> {
    if (!isFirebaseInitialized) return;
    try {
      if (key === STORAGE_KEYS.SCHOOL && value) {
        await saveDocumentToFirestore('school_profile', 'school_info', value);
      } else if (key === STORAGE_KEYS.USERS && Array.isArray(value)) {
        for (const user of value) {
          if (user && user.id) {
            const { password, ...safeUser } = user;
            await saveDocumentToFirestore('users', user.id, safeUser);
          }
        }
      } else if (key === STORAGE_KEYS.CLASSES && Array.isArray(value)) {
        for (const cls of value) {
          if (cls && cls.id) {
            await saveDocumentToFirestore('classes', cls.id, cls);
          }
        }
      } else if (key === STORAGE_KEYS.SUBJECTS && Array.isArray(value)) {
        for (const sub of value) {
          if (sub && sub.id) {
            await saveDocumentToFirestore('subjects', sub.id, sub);
          }
        }
      } else if (key === STORAGE_KEYS.PERIODS && Array.isArray(value)) {
        for (const period of value) {
          if (period && period.id) {
            await saveDocumentToFirestore('periods', period.id, period);
          }
        }
      } else if (key === STORAGE_KEYS.ASSIGNMENTS && Array.isArray(value)) {
        for (const asg of value) {
          if (asg && asg.id) {
            await saveDocumentToFirestore('teacher_assignments', asg.id, asg);
          }
        }
      } else if (key === STORAGE_KEYS.TIMETABLE && Array.isArray(value)) {
        for (const entry of value) {
          if (entry && entry.id) {
            await saveDocumentToFirestore('timetable', entry.id, entry);
          }
        }
      } else if (key === STORAGE_KEYS.STUDENTS && Array.isArray(value)) {
        for (const student of value) {
          if (student && student.id) {
            await saveDocumentToFirestore('students', student.id, student);
          }
        }
      } else if (key === STORAGE_KEYS.STUDENT_ATTENDANCE && Array.isArray(value)) {
        for (const record of value) {
          if (record && record.date && record.classId) {
            const docId = record.id || `${record.date}_${record.classId}${record.section ? '_' + record.section : ''}`;
            await saveDocumentToFirestore('student_attendance', docId, record);
          }
        }
      } else if (key === STORAGE_KEYS.STAFF_ATTENDANCE && Array.isArray(value)) {
        for (const record of value) {
          if (record && record.date) {
            const docId = record.id || `staff_${record.date}`;
            await saveDocumentToFirestore('staff_attendance', docId, record);
          }
        }
      } else if (key === STORAGE_KEYS.CALENDAR && value) {
        await saveDocumentToFirestore('calendar_config', 'calendar_settings', value);
      } else if (key === STORAGE_KEYS.ACADEMIC_YEARS && Array.isArray(value)) {
        for (const ay of value) {
          if (ay && ay.id) {
            await saveDocumentToFirestore('academic_years', ay.id, ay);
          }
        }
      } else if (key === STORAGE_KEYS.ENROLLMENTS && Array.isArray(value)) {
        for (const enr of value) {
          if (enr && enr.id) {
            await saveDocumentToFirestore('student_enrollments', enr.id, enr);
          }
        }
      } else if (key === STORAGE_KEYS.AUDIT_LOGS && Array.isArray(value)) {
        for (const log of value.slice(0, 30)) {
          if (log && log.id) {
            await saveDocumentToFirestore('audit_logs', log.id, log);
          }
        }
      }
    } catch (e) {
      console.warn('Background sync warning:', e);
    }
  }

  // Initializer
  public initialize(): void {
    const hasCleanedToPrincipalOnly = localStorage.getItem('ams_principal_only_clean_v1');
    if (!hasCleanedToPrincipalOnly) {
      this.resetAllToCleanSlate();
      localStorage.setItem('ams_principal_only_clean_v1', 'true');
    }

    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    const rawSchool = localStorage.getItem(STORAGE_KEYS.SCHOOL);
    if (!rawUsers || !rawSchool) {
      this.resetAllToCleanSlate();
    }

    const rawAcademicYears = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS);
    if (!rawAcademicYears) {
      this.setItem(STORAGE_KEYS.ACADEMIC_YEARS, INITIAL_ACADEMIC_YEARS);
    }

    const rawEnrollments = localStorage.getItem(STORAGE_KEYS.ENROLLMENTS);
    if (!rawEnrollments) {
      this.setItem(STORAGE_KEYS.ENROLLMENTS, INITIAL_ENROLLMENTS);
    }

    // Auto-bootstrap enrollment for any legacy students without an active enrollment
    try {
      const activeYear = this.getActiveAcademicYear();
      const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
      const enrollments = this.getItem<StudentEnrollment[]>(STORAGE_KEYS.ENROLLMENTS, INITIAL_ENROLLMENTS);
      let updatedEnrollments = false;
      students.forEach(st => {
        if (!st || st.status === 'archived') return;
        const hasEnrollment = enrollments.some(
          e => e.studentId === st.id && e.academicYearId === activeYear.id
        );
        if (!hasEnrollment) {
          enrollments.push({
            id: `enr-${st.id}-${activeYear.id}`,
            studentId: st.id,
            studentName: st.fullName,
            academicYearId: activeYear.id,
            academicYearName: activeYear.name,
            classId: st.classId,
            className: st.className,
            section: st.section || '',
            rollNo: st.rollNo,
            status: st.status === 'transferred' ? 'transferred' : 'active',
            promotionType: 'admitted',
            enrolledAt: st.admissionDate ? `${st.admissionDate}T00:00:00.000Z` : new Date().toISOString(),
            enrolledBy: 'System Bootstrap'
          });
          updatedEnrollments = true;
        }
      });
      if (updatedEnrollments) {
        this.setItem(STORAGE_KEYS.ENROLLMENTS, enrollments);
      }
    } catch (e) {
      console.warn('Enrollment auto-bootstrap notice:', e);
    }

    // Start Live Realtime Firestore Synchronization
    if (!this.hasInitializedRealtime) {
      this.hasInitializedRealtime = true;
      this.initRealtimeSync();
    }
  }

  /**
   * Initializes Live Real-Time Firestore listeners.
   * Merges incoming Cloud changes seamlessly into Local Storage and alerts React views.
   */
  public initRealtimeSync(): void {
    if (!isFirebaseInitialized) return;

    validateFirestoreConnection().catch(() => {});

    setupRealtimeListeners((collectionName, items) => {
      try {
        if (collectionName === 'student_attendance') {
          localStorage.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'staff_attendance') {
          localStorage.setItem(STORAGE_KEYS.STAFF_ATTENDANCE, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'classes') {
          localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'subjects') {
          localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'students') {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'academic_years') {
          const finalYears = items.length > 0 ? items : INITIAL_ACADEMIC_YEARS;
          localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(finalYears));
          this.notifyListeners();
        } else if (collectionName === 'student_enrollments') {
          localStorage.setItem(STORAGE_KEYS.ENROLLMENTS, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'teacher_assignments') {
          localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'periods') {
          localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'timetable') {
          localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(items));
          this.notifyListeners();
        } else if (collectionName === 'school_profile' && items.length > 0) {
          const info = items.find(i => i.id === 'school_info') || items[0];
          if (info) {
            localStorage.setItem(STORAGE_KEYS.SCHOOL, JSON.stringify(info));
            this.notifyListeners();
          }
        } else if (collectionName === 'users') {
          const current = this.getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
          // Preserve local password if cloud document stripped it
          const passwordMap = new Map<string, string>();
          current.forEach(u => {
            if (u.password) passwordMap.set(u.id, u.password);
          });
          const principalAccount = current.find(u => u.id === 'usr_prin_deepak') || INITIAL_USERS[0];
          const enriched = items.map((u: any) => ({
            ...u,
            password: passwordMap.get(u.id) || u.password || 'Deepak@123@'
          }));
          const hasPrincipal = enriched.some((u: any) => u.id === 'usr_prin_deepak');
          const finalUsers = hasPrincipal ? enriched : [principalAccount, ...enriched];
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(finalUsers));
          this.notifyListeners();
        }
      } catch (err) {
        console.warn('Error handling realtime update for', collectionName, err);
      }
    });
  }

  public resetAllToCleanSlate(realPrincipal?: User, realSchool?: SchoolProfile): void {
    const schoolToSave = realSchool || INITIAL_SCHOOL;
    const usersToSave = realPrincipal
      ? [realPrincipal]
      : INITIAL_USERS;
    this.setItem(STORAGE_KEYS.SCHOOL, schoolToSave);
    this.setItem(STORAGE_KEYS.USERS, usersToSave);
    this.setItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    this.setItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    this.setItem(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
    this.setItem(STORAGE_KEYS.TIMETABLE, INITIAL_TIMETABLE);
    this.setItem(STORAGE_KEYS.SUBSTITUTES, []);
    this.setItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    this.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, INITIAL_STUDENT_ATTENDANCE);
    this.setItem(STORAGE_KEYS.STAFF_ATTENDANCE, INITIAL_STAFF_ATTENDANCE);
    this.setItem(STORAGE_KEYS.CALENDAR, INITIAL_CALENDAR);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    this.setItem(STORAGE_KEYS.ACADEMIC_YEARS, INITIAL_ACADEMIC_YEARS);
    this.setItem(STORAGE_KEYS.ENROLLMENTS, INITIAL_ENROLLMENTS);

    // Synchronize clean slate to Firebase Cloud Firestore as well
    clearAllCloudCollectionsExceptPrincipal().catch(() => {});
  }

  // Consistent School Timezone ("Asia/Kolkata") System
  public getTodayInKolkata(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // YYYY-MM-DD
  }

  public getDayOfWeekInKolkata(): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
    });
    return formatter.format(new Date()) as any;
  }

  // Audit Log helper
  public logAction(
    user: { id: string; fullName: string; role: 'principal' | 'staff' },
    action: string,
    details: string
  ): void {
    const logs = this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action,
      details,
    };
    logs.unshift(newLog);
    if (logs.length > 500) logs.pop();
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  // School Profile
  public getSchool(): SchoolProfile {
    return this.getItem<SchoolProfile>(STORAGE_KEYS.SCHOOL, INITIAL_SCHOOL);
  }

  public updateSchool(school: Partial<SchoolProfile>, actor: User): SchoolProfile {
    const current = this.getSchool();
    const updated = { ...current, ...school };
    this.setItem(STORAGE_KEYS.SCHOOL, updated);
    this.logAction(actor, 'UPDATE_SCHOOL_PROFILE', `Updated school details: ${updated.name}`);
    return updated;
  }

  // Users & Staff
  public getUsers(): User[] {
    return this.getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public getStaffMembers(): User[] {
    return this.getUsers().filter(u => u.role === 'staff' && u.status !== 'archived');
  }

  public getArchivedStaff(): User[] {
    return this.getUsers().filter(u => u.role === 'staff' && u.status === 'archived');
  }

  public getStaffById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id && u.role === 'staff');
  }

  public generateStaffUID(): string {
    const users = this.getUsers();
    const existingUids = new Set(users.map(u => u.uid));
    let uid = '';
    do {
      uid = Math.floor(100000 + Math.random() * 900000).toString();
    } while (existingUids.has(uid));
    return uid;
  }

  public addStaff(
    data: Omit<User, 'id' | 'role' | 'uid' | 'createdAt'> & { uid?: string },
    actor: User
  ): { success: boolean; staff?: User; error?: string } {
    const users = this.getUsers();
    const mobileExists = users.some(u => u.mobile === data.mobile && u.status !== 'archived');
    if (mobileExists) {
      return { success: false, error: 'A staff account with this mobile number already exists.' };
    }
    const uid = data.uid || this.generateStaffUID();
    const newStaff: User = {
      ...data,
      id: `user-staff-${Date.now()}`,
      uid,
      role: 'staff',
      password: data.password || 'staff123',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
    };
    users.push(newStaff);
    this.setItem(STORAGE_KEYS.USERS, users);
    this.logAction(actor, 'STAFF_CREATED', `Created staff member ${newStaff.fullName} (UID: ${newStaff.uid})`);
    return { success: true, staff: newStaff };
  }

  public updateStaff(id: string, updates: Partial<User>, actor: User): { success: boolean; staff?: User; error?: string } {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return { success: false, error: 'Staff member not found.' };

    if (updates.mobile && updates.mobile !== users[index].mobile) {
      const mobileExists = users.some(u => u.id !== id && u.mobile === updates.mobile && u.status !== 'archived');
      if (mobileExists) {
        return { success: false, error: 'Mobile number is already registered to another staff account.' };
      }
    }
    delete updates.role;
    delete updates.id;
    users[index] = { ...users[index], ...updates };
    this.setItem(STORAGE_KEYS.USERS, users);
    this.logAction(actor, 'STAFF_UPDATED', `Updated staff ${users[index].fullName} (UID: ${users[index].uid})`);
    return { success: true, staff: users[index] };
  }

  public toggleStaffStatus(id: string, actor: User): { success: boolean; status?: 'active' | 'inactive'; error?: string } {
    const users = this.getUsers();
    const staff = users.find(u => u.id === id);
    if (!staff) return { success: false, error: 'Staff not found.' };
    staff.status = staff.status === 'active' ? 'inactive' : 'active';
    this.setItem(STORAGE_KEYS.USERS, users);
    this.logAction(actor, 'STAFF_STATUS_TOGGLED', `Changed ${staff.fullName} (UID: ${staff.uid}) status to ${staff.status}`);
    return { success: true, status: staff.status };
  }

  public archiveStaff(id: string, actor: User): { success: boolean; error?: string } {
    const users = this.getUsers();
    const staff = users.find(u => u.id === id);
    if (!staff) return { success: false, error: 'Staff not found.' };
    staff.status = 'archived';
    staff.archivedAt = new Date().toISOString();
    staff.archivedBy = actor.fullName;
    this.setItem(STORAGE_KEYS.USERS, users);
    this.logAction(actor, 'STAFF_ARCHIVED', `Archived staff account ${staff.fullName} (UID: ${staff.uid}). Historical records preserved.`);
    return { success: true };
  }

  public restoreStaff(id: string, actor: User): { success: boolean; error?: string } {
    const users = this.getUsers();
    const staff = users.find(u => u.id === id);
    if (!staff) return { success: false, error: 'Staff not found.' };
    staff.status = 'active';
    delete staff.archivedAt;
    delete staff.archivedBy;
    this.setItem(STORAGE_KEYS.USERS, users);
    this.logAction(actor, 'STAFF_RESTORED', `Restored staff account ${staff.fullName} (UID: ${staff.uid}).`);
    return { success: true };
  }

  public permanentDeleteStaff(id: string, actor: User): { success: boolean; error?: string } {
    const users = this.getUsers();
    const staff = users.find(u => u.id === id);
    if (!staff) return { success: false, error: 'Staff not found.' };
    const remaining = users.filter(u => u.id !== id);
    this.setItem(STORAGE_KEYS.USERS, remaining);
    deleteDocumentFromFirestore('users', id).catch(() => {});
    this.logAction(actor, 'STAFF_PERMANENTLY_DELETED', `Permanently purged staff record ${staff.fullName} (UID: ${staff.uid}).`);
    return { success: true };
  }

  public resetStaffPassword(id: string, newPass: string, actor: User): { success: boolean; error?: string } {
    const users = this.getUsers();
    const staff = users.find(u => u.id === id);
    if (!staff) return { success: false, error: 'Staff not found.' };
    staff.password = newPass;
    this.setItem(STORAGE_KEYS.USERS, users);
    this.logAction(actor, 'STAFF_PASSWORD_RESET', `Password reset for ${staff.fullName} (UID: ${staff.uid}) by ${actor.fullName}`);
    return { success: true };
  }

  // --- Classes & Sections ---
  public getClasses(): SchoolClass[] {
    const list = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    return list
      .filter(c => c.status !== 'archived')
      .map(c => {
        const rawSections = c.sections || (c.section ? [c.section] : []);
        const cleanSections = Array.from(new Set(rawSections.map(s => (s || '').trim()).filter(Boolean)));
        return {
          ...c,
          sections: cleanSections,
          section: cleanSections[0] || '',
          status: c.status || 'active',
        };
      });
  }

  public getArchivedClasses(): SchoolClass[] {
    const list = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    return list.filter(c => c.status === 'archived');
  }

  public addClass(
    classData: {
      name: string;
      sections?: string[];
      section?: string;
      room?: string;
      status?: 'active' | 'inactive';
    },
    actor: User
  ): { success: boolean; class?: SchoolClass; error?: string } {
    const cleanName = (classData.name || '').trim();
    if (!cleanName) return { success: false, error: 'Class name is required.' };
    const classes = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    const duplicate = classes.some(c => c.status !== 'archived' && c.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) return { success: false, error: `Class "${cleanName}" already exists.` };
    const rawSections = classData.sections || (classData.section ? [classData.section] : []);
    const cleanSections = Array.from(new Set(rawSections.map(s => (s || '').trim()).filter(Boolean)));
    const newClass: SchoolClass = {
      id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      sections: cleanSections,
      section: cleanSections[0] || '',
      room: (classData.room || '').trim(),
      status: classData.status || 'active',
    };
    classes.push(newClass);
    this.setItem(STORAGE_KEYS.CLASSES, classes);
    this.logAction(
      actor,
      'CLASS_CREATED',
      `Added class "${newClass.name}"${cleanSections.length ? ' with sections: ' + cleanSections.join(', ') : ' (No sections)'}`
    );
    return { success: true, class: newClass };
  }

  public updateClass(
    id: string,
    updates: {
      name?: string;
      sections?: string[];
      section?: string;
      room?: string;
      status?: 'active' | 'inactive';
    },
    actor: User
  ): { success: boolean; error?: string } {
    const classes = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    const index = classes.findIndex(c => c.id === id);
    if (index === -1) return { success: false, error: 'Class not found.' };
    const oldName = classes[index].name;
    const newName = updates.name ? updates.name.trim() : oldName;
    if (!newName) return { success: false, error: 'Class name cannot be empty.' };
    const rawSections = updates.sections !== undefined
      ? updates.sections
      : (classes[index].sections || (classes[index].section ? [classes[index].section!] : []));
    const cleanSections = Array.from(new Set(rawSections.map(s => (s || '').trim()).filter(Boolean)));
    classes[index] = {
      ...classes[index],
      ...updates,
      name: newName,
      sections: cleanSections,
      section: cleanSections[0] || '',
      room: updates.room !== undefined ? updates.room.trim() : classes[index].room,
      status: updates.status || classes[index].status || 'active',
    };
    if (oldName !== newName) {
      const students = this.getStudents();
      students.forEach(s => {
        if (s.classId === id) s.className = newName;
      });
      this.setItem(STORAGE_KEYS.STUDENTS, students);
      const assignments = this.getAssignments();
      assignments.forEach(a => {
        if (a.classId === id) a.className = newName;
      });
      this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    }
    this.setItem(STORAGE_KEYS.CLASSES, classes);
    this.logAction(actor, 'CLASS_UPDATED', `Updated class details for "${newName}"`);
    return { success: true };
  }

  public toggleClassStatus(id: string, actor: User): { success: boolean; status?: 'active' | 'inactive'; error?: string } {
    const classes = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    const cls = classes.find(c => c.id === id);
    if (!cls) return { success: false, error: 'Class not found.' };
    cls.status = cls.status === 'active' ? 'inactive' : 'active';
    this.setItem(STORAGE_KEYS.CLASSES, classes);
    this.logAction(actor, 'CLASS_STATUS_TOGGLED', `Changed status of class "${cls.name}" to ${cls.status}`);
    return { success: true, status: cls.status };
  }

  public getClassDependencies(id: string): {
    studentCount: number;
    attendanceCount: number;
    timetableCount: number;
    assignmentCount: number;
  } {
    const cls = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES).find(c => c && c.id === id);
    const clsName = cls?.name?.trim().toLowerCase();
    const studentCount = this.getStudents().filter(
      s => s && (s.classId === id || (clsName && s.className && s.className.trim().toLowerCase() === clsName))
    ).length;
    const attendanceCount = this.getAllStudentAttendance().filter(
      a => a && (a.classId === id || (clsName && a.className && a.className.trim().toLowerCase() === clsName))
    ).length;
    const timetableCount = this.getTimetable().filter(
      t => t && (t.classId === id || (clsName && t.className && t.className.trim().toLowerCase() === clsName))
    ).length;
    const assignmentCount = this.getAssignments().filter(
      a => a && (a.classId === id || (clsName && a.className && a.className.trim().toLowerCase() === clsName))
    ).length;
    return { studentCount, attendanceCount, timetableCount, assignmentCount };
  }

  public archiveClass(id: string, actor: User): { success: boolean; error?: string } {
    const classes = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    const cls = classes.find(c => c.id === id);
    if (!cls) return { success: false, error: 'Class not found.' };
    cls.status = 'archived';
    cls.archivedAt = new Date().toISOString();
    cls.archivedBy = actor.fullName;
    this.setItem(STORAGE_KEYS.CLASSES, classes);
    this.logAction(actor, 'CLASS_ARCHIVED', `Archived class "${cls.name}". All enrolled student and attendance records remain preserved.`);
    return { success: true };
  }

  public restoreClass(id: string, actor: User): { success: boolean; error?: string } {
    const classes = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    const cls = classes.find(c => c.id === id);
    if (!cls) return { success: false, error: 'Class not found.' };
    cls.status = 'active';
    delete cls.archivedAt;
    delete cls.archivedBy;
    this.setItem(STORAGE_KEYS.CLASSES, classes);
    this.logAction(actor, 'CLASS_RESTORED', `Restored class "${cls.name}" to active status.`);
    return { success: true };
  }

  public permanentDeleteClass(id: string, actor: User, force: boolean = false): { success: boolean; error?: string } {
    const classes = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    const cls = classes.find(c => c.id === id);
    if (!cls) return { success: false, error: 'Class not found.' };
    const deps = this.getClassDependencies(id);
    if (!force && (deps.studentCount > 0 || deps.attendanceCount > 0)) {
      return {
        success: false,
        error: `Cannot permanently delete class "${cls.name}" because it contains ${deps.studentCount} students and ${deps.attendanceCount} attendance records. Archive this class instead to preserve records.`
      };
    }
    if (force) {
      const remainingStudents = this.getStudents().filter(s => s.classId !== id);
      this.setItem(STORAGE_KEYS.STUDENTS, remainingStudents);
      const remainingAttendance = this.getAllStudentAttendance().filter(a => a.classId !== id);
      this.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, remainingAttendance);
      const remainingTimetable = this.getTimetable().filter(t => t.classId !== id);
      this.setItem(STORAGE_KEYS.TIMETABLE, remainingTimetable);
      const remainingAssignments = this.getAssignments().filter(a => a.classId !== id);
      this.setItem(STORAGE_KEYS.ASSIGNMENTS, remainingAssignments);
    }
    const remainingClasses = classes.filter(c => c.id !== id);
    this.setItem(STORAGE_KEYS.CLASSES, remainingClasses);
    deleteDocumentFromFirestore('classes', id).catch(() => {});
    this.logAction(actor, 'CLASS_PERMANENTLY_DELETED', `Permanently deleted class "${cls.name}". Cascade: ${force}`);
    return { success: true };
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    const list = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    return list.filter(s => s.status !== 'archived');
  }

  public getArchivedSubjects(): Subject[] {
    const list = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    return list.filter(s => s.status === 'archived');
  }

  public addSubject(subjectData: Omit<Subject, 'id'>, actor: User): { success: boolean; subject?: Subject; error?: string } {
    const subjects = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const cleanName = (subjectData.name || '').trim();
    const cleanCode = (subjectData.code || '').trim().toUpperCase();
    if (!cleanName || !cleanCode) {
      return { success: false, error: 'Subject name and subject code are required.' };
    }
    if (subjects.some(s => s.status !== 'archived' && s.code.toLowerCase() === cleanCode.toLowerCase())) {
      return { success: false, error: `Subject code "${cleanCode}" already exists.` };
    }
    const newSub: Subject = {
      ...subjectData,
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      code: cleanCode,
      classIds: subjectData.classIds || [],
      status: subjectData.status || 'active',
    };
    subjects.push(newSub);
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects);
    this.logAction(actor, 'SUBJECT_CREATED', `Added subject: ${newSub.name} (${newSub.code})`);
    return { success: true, subject: newSub };
  }

  public updateSubject(id: string, updates: Partial<Subject>, actor: User): { success: boolean; error?: string } {
    const subjects = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const index = subjects.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Subject not found.' };
    const oldName = subjects[index].name;
    const newName = updates.name ? updates.name.trim() : oldName;
    subjects[index] = {
      ...subjects[index],
      ...updates,
      name: newName,
      code: updates.code ? updates.code.trim().toUpperCase() : subjects[index].code,
    };
    if (oldName !== newName) {
      const timetable = this.getTimetable();
      timetable.forEach(t => {
        if (t.subjectId === id) t.subjectName = newName;
      });
      this.setItem(STORAGE_KEYS.TIMETABLE, timetable);
    }
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects);
    this.logAction(actor, 'SUBJECT_UPDATED', `Updated subject: ${newName}`);
    return { success: true };
  }

  public toggleSubjectStatus(id: string, actor: User): { success: boolean; status?: 'active' | 'inactive'; error?: string } {
    const subjects = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const sub = subjects.find(s => s.id === id);
    if (!sub) return { success: false, error: 'Subject not found.' };
    sub.status = sub.status === 'active' ? 'inactive' : 'active';
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects);
    this.logAction(actor, 'SUBJECT_STATUS_TOGGLED', `Changed status of subject "${sub.name}" to ${sub.status}`);
    return { success: true, status: sub.status };
  }

  public getSubjectDependencies(id: string): { timetableCount: number; assignmentCount: number } {
    const timetableCount = this.getTimetable().filter(t => t.subjectId === id).length;
    const assignmentCount = this.getAssignments().filter(a => a.subjectId === id).length;
    return { timetableCount, assignmentCount };
  }

  public archiveSubject(id: string, actor: User): { success: boolean; error?: string } {
    const subjects = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const sub = subjects.find(s => s.id === id);
    if (!sub) return { success: false, error: 'Subject not found.' };
    sub.status = 'archived';
    sub.archivedAt = new Date().toISOString();
    sub.archivedBy = actor.fullName;
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects);
    this.logAction(actor, 'SUBJECT_ARCHIVED', `Archived subject "${sub.name}". Past schedule records preserved.`);
    return { success: true };
  }

  public restoreSubject(id: string, actor: User): { success: boolean; error?: string } {
    const subjects = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const sub = subjects.find(s => s.id === id);
    if (!sub) return { success: false, error: 'Subject not found.' };
    sub.status = 'active';
    delete sub.archivedAt;
    delete sub.archivedBy;
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects);
    this.logAction(actor, 'SUBJECT_RESTORED', `Restored subject "${sub.name}".`);
    return { success: true };
  }

  public permanentDeleteSubject(id: string, actor: User, force: boolean = false): { success: boolean; error?: string } {
    const subjects = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const sub = subjects.find(s => s.id === id);
    if (!sub) return { success: false, error: 'Subject not found.' };
    const deps = this.getSubjectDependencies(id);
    if (!force && (deps.timetableCount > 0 || deps.assignmentCount > 0)) {
      return {
        success: false,
        error: `Cannot delete subject "${sub.name}" because it is linked to ${deps.assignmentCount} teacher assignments and ${deps.timetableCount} timetable slots. Archive it instead.`
      };
    }
    if (force) {
      const remainingTimetable = this.getTimetable().filter(t => t.subjectId !== id);
      this.setItem(STORAGE_KEYS.TIMETABLE, remainingTimetable);
      const remainingAssignments = this.getAssignments().filter(a => a.subjectId !== id);
      this.setItem(STORAGE_KEYS.ASSIGNMENTS, remainingAssignments);
    }
    const remaining = subjects.filter(s => s.id !== id);
    this.setItem(STORAGE_KEYS.SUBJECTS, remaining);
    deleteDocumentFromFirestore('subjects', id).catch(() => {});
    this.logAction(actor, 'SUBJECT_PERMANENTLY_DELETED', `Permanently deleted subject "${sub.name}" (${sub.code}).`);
    return { success: true };
  }

  // --- Assignments ---
  public getAssignments(): TeacherAssignment[] {
    return this.getItem<TeacherAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
  }

  public getAssignmentsForTeacher(teacherId: string): TeacherAssignment[] {
    return this.getAssignments().filter(a => a.teacherId === teacherId);
  }

  public addAssignment(
    assignment: Omit<TeacherAssignment, 'id' | 'assignedAt'>,
    actor: User
  ): { success: boolean; error?: string } {
    const teacher = this.getStaffById(assignment.teacherId);
    if (!teacher || teacher.status !== 'active') {
      return { success: false, error: 'Cannot assign deactivated teacher.' };
    }
    const assignments = this.getAssignments();
    const exists = assignments.some(
      a => a.teacherId === assignment.teacherId &&
           a.classId === assignment.classId &&
           (!assignment.section || a.section === assignment.section) &&
           a.subjectId === assignment.subjectId
    );
    if (exists) {
      return { success: false, error: 'This teacher is already assigned to this class and subject.' };
    }
    const newAsg: TeacherAssignment = {
      ...assignment,
      id: `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      assignedAt: new Date().toISOString()
    };
    assignments.push(newAsg);
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    this.logAction(actor, 'ASSIGNMENT_CREATED', `Assigned ${assignment.teacherName} to ${assignment.className}${assignment.section ? ' (Sec ' + assignment.section + ')' : ''} - ${assignment.subjectName}`);
    return { success: true };
  }

  public deleteAssignment(id: string, actor: User): { success: boolean } {
    const assignments = this.getAssignments().filter(a => a.id !== id);
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    deleteDocumentFromFirestore('teacher_assignments', id).catch(() => {});
    this.logAction(actor, 'ASSIGNMENT_REMOVED', `Removed assignment ID: ${id}`);
    return { success: true };
  }

  // --- Periods & Timetable ---
  public getPeriods(): PeriodConfig[] {
    const list = this.getItem<PeriodConfig[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
    return list.sort((a, b) => a.periodNumber - b.periodNumber);
  }

  public addPeriod(
    data: Omit<PeriodConfig, 'id'>,
    actor: User
  ): { success: boolean; period?: PeriodConfig; error?: string } {
    const cleanName = (data.name || '').trim();
    if (!cleanName) return { success: false, error: 'Period name is required.' };
    if (!data.startTime || !data.endTime) return { success: false, error: 'Start time and end time are required.' };
    if (data.startTime >= data.endTime) {
      return { success: false, error: 'End time must be later than start time.' };
    }
    const periods = this.getPeriods();
    const duplicate = periods.some(
      p => p.periodNumber === data.periodNumber || p.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: `Period #${data.periodNumber} or name "${cleanName}" already exists.` };
    }
    const overlapping = periods.find(p => p.status === 'active' && data.startTime < p.endTime && data.endTime > p.startTime);
    if (overlapping) {
      return {
        success: false,
        error: `Time overlap detected: This period overlaps with "${overlapping.name}" (${overlapping.startTime} - ${overlapping.endTime}).`
      };
    }
    const newPeriod: PeriodConfig = {
      ...data,
      id: `per-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      status: data.status || 'active',
    };
    periods.push(newPeriod);
    periods.sort((a, b) => a.periodNumber - b.periodNumber);
    this.setItem(STORAGE_KEYS.PERIODS, periods);
    this.logAction(actor, 'PERIOD_CREATED', `Added period "${newPeriod.name}" (${newPeriod.startTime} - ${newPeriod.endTime})`);
    return { success: true, period: newPeriod };
  }

  public updatePeriod(
    id: string,
    updates: Partial<PeriodConfig>,
    actor: User
  ): { success: boolean; error?: string } {
    const periods = this.getPeriods();
    const index = periods.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Period not found.' };
    const startTime = updates.startTime || periods[index].startTime;
    const endTime = updates.endTime || periods[index].endTime;
    if (startTime >= endTime) {
      return { success: false, error: 'End time must be later than start time.' };
    }
    const overlapping = periods.find(p => p.id !== id && p.status === 'active' && startTime < p.endTime && endTime > p.startTime);
    if (overlapping) {
      return {
        success: false,
        error: `Time overlap detected: This period overlaps with "${overlapping.name}" (${overlapping.startTime} - ${overlapping.endTime}).`
      };
    }
    const oldName = periods[index].name;
    const newName = updates.name ? updates.name.trim() : oldName;
    periods[index] = {
      ...periods[index],
      ...updates,
      name: newName,
      startTime,
      endTime,
    };
    periods.sort((a, b) => a.periodNumber - b.periodNumber);
    this.setItem(STORAGE_KEYS.PERIODS, periods);

    // Keep timetable entries in sync with updated period timings and name
    const timetable = this.getTimetable();
    let timetableChanged = false;
    timetable.forEach(t => {
      if (t.periodId === id || t.periodNumber === periods[index].periodNumber) {
        t.periodName = newName;
        t.startTime = startTime;
        t.endTime = endTime;
        timetableChanged = true;
      }
    });
    if (timetableChanged) {
      this.setItem(STORAGE_KEYS.TIMETABLE, timetable);
    }

    this.logAction(actor, 'PERIOD_UPDATED', `Updated period "${newName}" timings.`);
    return { success: true };
  }

  public togglePeriodStatus(id: string, actor: User): { success: boolean; status?: 'active' | 'inactive'; error?: string } {
    const periods = this.getPeriods();
    const p = periods.find(item => item.id === id);
    if (!p) return { success: false, error: 'Period not found.' };
    p.status = p.status === 'active' ? 'inactive' : 'active';
    this.setItem(STORAGE_KEYS.PERIODS, periods);
    this.logAction(actor, 'PERIOD_STATUS_TOGGLED', `Changed status of period "${p.name}" to ${p.status}`);
    return { success: true, status: p.status };
  }

  public deletePeriod(id: string, actor: User): { success: boolean; error?: string } {
    const timetable = this.getTimetable();
    const period = this.getPeriods().find(p => p.id === id);
    if (!period) return { success: false, error: 'Period not found.' };
    const inUse = timetable.some(t => t.periodNumber === period.periodNumber || t.periodId === id);
    if (inUse) {
      return {
        success: false,
        error: `Cannot delete period "${period.name}" because it is currently assigned to timetable slots. Please delete those slots first.`
      };
    }
    const periods = this.getPeriods().filter(p => p.id !== id);
    this.setItem(STORAGE_KEYS.PERIODS, periods);
    deleteDocumentFromFirestore('periods', id).catch(() => {});
    this.logAction(actor, 'PERIOD_DELETED', `Deleted period: ${period.name}`);
    return { success: true };
  }

  public getTimetable(): TimetableEntry[] {
    return this.getItem<TimetableEntry[]>(STORAGE_KEYS.TIMETABLE, INITIAL_TIMETABLE);
  }

  public getSubstitutes(): SubstituteAssignment[] {
    return this.getItem<SubstituteAssignment[]>(STORAGE_KEYS.SUBSTITUTES, []);
  }

  public addSubstitute(sub: Omit<SubstituteAssignment, 'id'>, actor: User): { success: boolean; error?: string } {
    const list = this.getSubstitutes();
    const newSub: SubstituteAssignment = {
      ...sub,
      id: `sub-${Date.now()}`
    };
    list.push(newSub);
    this.setItem(STORAGE_KEYS.SUBSTITUTES, list);
    this.logAction(actor, 'SUBSTITUTE_ASSIGNED', `Assigned ${sub.substituteTeacherName} as substitute for ${sub.originalTeacherName} in ${sub.className} on ${sub.date}`);
    return { success: true };
  }

  public addTimetableEntry(
    entry: Omit<TimetableEntry, 'id'>,
    actor: User
  ): { success: boolean; error?: string } {
    const timetable = this.getTimetable();
    if (entry.startTime && entry.endTime && entry.startTime >= entry.endTime) {
      return { success: false, error: 'Period end time must be later than start time.' };
    }
    const teacherClash = timetable.find(
      t => t.dayOfWeek === entry.dayOfWeek &&
           (t.periodNumber === entry.periodNumber || (entry.periodId && t.periodId === entry.periodId)) &&
           t.teacherId === entry.teacherId
    );
    if (teacherClash) {
      return {
        success: false,
        error: `Teacher Clash: ${entry.teacherName} is already assigned to ${teacherClash.className} in Period ${entry.periodNumber} on ${entry.dayOfWeek}.`
      };
    }
    const classClash = timetable.find(
      t => t.dayOfWeek === entry.dayOfWeek &&
           (t.periodNumber === entry.periodNumber || (entry.periodId && t.periodId === entry.periodId)) &&
           t.classId === entry.classId &&
           (!entry.section || !t.section || t.section === entry.section)
    );
    if (classClash) {
      return {
        success: false,
        error: `Class Clash: ${entry.className}${entry.section ? ' (Sec ' + entry.section + ')' : ''} already has ${classClash.subjectName} in Period ${entry.periodNumber} on ${entry.dayOfWeek}.`
      };
    }
    const newEntry: TimetableEntry = {
      ...entry,
      id: `tt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    timetable.push(newEntry);
    this.setItem(STORAGE_KEYS.TIMETABLE, timetable);
    this.logAction(actor, 'TIMETABLE_ENTRY_ADDED', `Scheduled slot: ${entry.dayOfWeek} P${entry.periodNumber} ${entry.className} (${entry.subjectName})`);
    return { success: true };
  }

  public updateTimetableEntry(
    id: string,
    updates: Partial<TimetableEntry>,
    actor: User
  ): { success: boolean; error?: string } {
    const timetable = this.getTimetable();
    const index = timetable.findIndex(t => t.id === id);
    if (index === -1) return { success: false, error: 'Timetable entry not found.' };
    const current = timetable[index];
    const merged: TimetableEntry = { ...current, ...updates };
    const otherSlots = timetable.filter(t => t.id !== id);
    const teacherClash = otherSlots.find(
      t => t.dayOfWeek === merged.dayOfWeek &&
           (t.periodNumber === merged.periodNumber || (merged.periodId && t.periodId === merged.periodId)) &&
           t.teacherId === merged.teacherId
    );
    if (teacherClash) {
      return {
        success: false,
        error: `Teacher Clash: ${merged.teacherName} is already assigned to ${teacherClash.className} in Period ${merged.periodNumber} on ${merged.dayOfWeek}.`
      };
    }
    timetable[index] = merged;
    this.setItem(STORAGE_KEYS.TIMETABLE, timetable);
    this.logAction(actor, 'TIMETABLE_ENTRY_UPDATED', `Updated timetable slot ${merged.dayOfWeek} P${merged.periodNumber}`);
    return { success: true };
  }

  public deleteTimetableEntry(id: string, actor: User): { success: boolean } {
    const timetable = this.getTimetable().filter(t => t.id !== id);
    this.setItem(STORAGE_KEYS.TIMETABLE, timetable);
    deleteDocumentFromFirestore('timetable', id).catch(() => {});
    this.logAction(actor, 'TIMETABLE_ENTRY_DELETED', `Deleted timetable slot ID: ${id}`);
    return { success: true };
  }

  // --- Students ---
  public getStudents(): Student[] {
    const list = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    return list.filter(s => s.status !== 'archived');
  }

  public getArchivedStudents(): Student[] {
    const list = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    return list.filter(s => s.status === 'archived');
  }

  public getStudentsByClass(classId: string): Student[] {
    return this.getStudents().filter(s => s.classId === classId && s.status === 'active');
  }

  public getStudentsByClassAndSection(classId: string, section?: string, academicYearId?: string): Student[] {
    const activeYear = this.getActiveAcademicYear();
    if (academicYearId && academicYearId !== activeYear.id) {
      const enrollments = this.getEnrollmentsForClass(academicYearId, classId, section);
      const allStudents = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
      return enrollments
        .filter(e => e.status !== 'transferred')
        .map(e => {
          const found = allStudents.find(s => s.id === e.studentId);
          return {
            id: e.studentId,
            rollNo: e.rollNo,
            fullName: e.studentName,
            classId: e.classId,
            className: e.className,
            section: e.section,
            gender: found?.gender || 'Male',
            guardianName: found?.guardianName || '',
            guardianMobile: found?.guardianMobile || '',
            status: 'active',
            admissionDate: found?.admissionDate || '',
            currentAcademicYearId: e.academicYearId
          } as Student;
        });
    }
    const list = this.getStudents().filter(s => s.classId === classId && s.status === 'active');
    if (section && section !== 'all') {
      return list.filter(s => s.section === section);
    }
    return list;
  }

  public addStudent(
    studentData: Omit<Student, 'id' | 'admissionDate'>,
    actor: User
  ): { success: boolean; student?: Student; error?: string } {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const targetSection = studentData.section || '';
    const duplicateRoll = students.some(
      s => s.status !== 'archived' &&
           s.classId === studentData.classId &&
           (s.section || '') === targetSection &&
           s.rollNo.trim().toLowerCase() === studentData.rollNo.trim().toLowerCase() &&
           s.status === 'active'
    );
    if (duplicateRoll) {
      return {
        success: false,
        error: `Roll number ${studentData.rollNo} already exists in ${studentData.className}${targetSection ? ' Section ' + targetSection : ''}.`
      };
    }
    const activeYear = this.getActiveAcademicYear();
    const newStudent: Student = {
      ...studentData,
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      admissionDate: new Date().toISOString().split('T')[0],
      admissionAcademicYearId: activeYear.id,
      currentAcademicYearId: activeYear.id
    };
    students.push(newStudent);
    this.setItem(STORAGE_KEYS.STUDENTS, students);

    const enrollments = this.getItem<StudentEnrollment[]>(STORAGE_KEYS.ENROLLMENTS, INITIAL_ENROLLMENTS);
    enrollments.push({
      id: `enr-${newStudent.id}-${activeYear.id}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      academicYearId: activeYear.id,
      academicYearName: activeYear.name,
      classId: newStudent.classId,
      className: newStudent.className,
      section: newStudent.section || '',
      rollNo: newStudent.rollNo,
      status: 'active',
      promotionType: 'admitted',
      enrolledAt: new Date().toISOString(),
      enrolledBy: `${actor.fullName}`
    });
    this.setItem(STORAGE_KEYS.ENROLLMENTS, enrollments);
    this.logAction(actor, 'STUDENT_ADDED', `Admitted new student ${newStudent.fullName} (Roll: ${newStudent.rollNo}) to ${newStudent.className} for session ${activeYear.name}`);
    return { success: true, student: newStudent };
  }

  public updateStudent(
    id: string,
    updates: Partial<Student>,
    actor: User
  ): { success: boolean; error?: string } {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Student not found.' };
    if (updates.rollNo && updates.rollNo !== students[index].rollNo) {
      const targetClass = updates.classId || students[index].classId;
      const targetSec = updates.section !== undefined ? updates.section : students[index].section;
      const duplicateRoll = students.some(
        s => s.id !== id &&
             s.status !== 'archived' &&
             s.classId === targetClass &&
             (s.section || '') === (targetSec || '') &&
             s.rollNo.trim().toLowerCase() === updates.rollNo!.trim().toLowerCase() &&
             s.status === 'active'
      );
      if (duplicateRoll) {
        return { success: false, error: `Roll number ${updates.rollNo} is already assigned in that class/section.` };
      }
    }
    students[index] = { ...students[index], ...updates };
    this.setItem(STORAGE_KEYS.STUDENTS, students);

    // Sync active year enrollment record if details change
    const activeYear = this.getActiveAcademicYear();
    const enrollments = this.getItem<StudentEnrollment[]>(STORAGE_KEYS.ENROLLMENTS, INITIAL_ENROLLMENTS);
    const enrIndex = enrollments.findIndex(e => e.studentId === id && e.academicYearId === activeYear.id);
    if (enrIndex !== -1) {
      enrollments[enrIndex] = {
        ...enrollments[enrIndex],
        studentName: students[index].fullName,
        rollNo: students[index].rollNo,
        classId: students[index].classId,
        className: students[index].className,
        section: students[index].section || ''
      };
      this.setItem(STORAGE_KEYS.ENROLLMENTS, enrollments);
    }

    this.logAction(actor, 'STUDENT_UPDATED', `Updated student ${students[index].fullName} (Roll: ${students[index].rollNo})`);
    return { success: true };
  }

  public toggleStudentStatus(id: string, actor: User): { success: boolean; status?: 'active' | 'inactive'; error?: string } {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const student = students.find(s => s.id === id);
    if (!student) return { success: false, error: 'Student not found.' };
    student.status = student.status === 'active' ? 'inactive' : 'active';
    this.setItem(STORAGE_KEYS.STUDENTS, students);
    this.logAction(actor, 'STUDENT_STATUS_TOGGLED', `Changed ${student.fullName} status to ${student.status}`);
    return { success: true, status: student.status };
  }

  public archiveStudent(id: string, actor: User): { success: boolean; error?: string } {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const student = students.find(s => s.id === id);
    if (!student) return { success: false, error: 'Student not found.' };
    student.status = 'archived';
    student.archivedAt = new Date().toISOString();
    student.archivedBy = actor.fullName;
    this.setItem(STORAGE_KEYS.STUDENTS, students);
    this.logAction(actor, 'STUDENT_ARCHIVED', `Archived student ${student.fullName} (Roll: ${student.rollNo}). Historical attendance remains safely preserved.`);
    return { success: true };
  }

  public restoreStudent(id: string, actor: User): { success: boolean; error?: string } {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const student = students.find(s => s.id === id);
    if (!student) return { success: false, error: 'Student not found.' };
    student.status = 'active';
    delete student.archivedAt;
    delete student.archivedBy;
    this.setItem(STORAGE_KEYS.STUDENTS, students);
    this.logAction(actor, 'STUDENT_RESTORED', `Restored student ${student.fullName} (Roll: ${student.rollNo}).`);
    return { success: true };
  }

  public permanentDeleteStudent(id: string, actor: User): { success: boolean; error?: string } {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const student = students.find(s => s.id === id);
    if (!student) return { success: false, error: 'Student not found.' };
    const remaining = students.filter(s => s.id !== id);
    this.setItem(STORAGE_KEYS.STUDENTS, remaining);
    deleteDocumentFromFirestore('students', id).catch(() => {});
    this.logAction(actor, 'STUDENT_PERMANENTLY_DELETED', `Permanently purged student record ${student.fullName} (Roll: ${student.rollNo}).`);
    return { success: true };
  }

  // --- Student Attendance ---
  public getAllStudentAttendance(): DailyClassAttendance[] {
    return this.getItem<DailyClassAttendance[]>(STORAGE_KEYS.STUDENT_ATTENDANCE, INITIAL_STUDENT_ATTENDANCE);
  }

  public getAttendanceForClassAndDate(date: string, classId: string, section?: string): DailyClassAttendance | undefined {
    const all = this.getAllStudentAttendance();
    return all.find(a => {
      const dateMatch = a.date === date;
      const classMatch = a.classId === classId;
      if (!dateMatch || !classMatch) return false;
      if (section && section !== 'all') {
        return (a.section || '') === section;
      }
      return true;
    });
  }

  public saveStudentAttendance(
    data: {
      date: string;
      classId: string;
      className: string;
      section?: string;
      records: { studentId: string; rollNo: string; studentName: string; status: AttendanceStatus; earlyDepartureNote?: string }[];
    },
    actor: User
  ): { success: boolean; attendance?: DailyClassAttendance; error?: string } {
    const today = this.getTodayInKolkata();
    if (data.date > today) {
      return {
        success: false,
        error: `Strict Date Policy: Attendance cannot be marked in advance for future date ${data.date}. Today is ${today} in Asia/Kolkata.`
      };
    }
    if (actor.role === 'staff') {
      const assignments = this.getAssignmentsForTeacher(actor.id);
      const isAssigned = assignments.some(a => a.classId === data.classId);
      if (!isAssigned) {
        return { success: false, error: 'Unauthorized: You are not assigned to mark attendance for this class.' };
      }
    }
    const all = this.getAllStudentAttendance();
    const targetSection = data.section || '';
    const existingIndex = all.findIndex(
      a => a.date === data.date && a.classId === data.classId && (a.section || '') === targetSection
    );
    if (existingIndex !== -1 && all[existingIndex].isLocked && actor.role !== 'principal') {
      return { success: false, error: 'This attendance record is locked by the Principal and cannot be modified.' };
    }
    const presentCount = data.records.filter(r => r.status === 'present').length;
    const absentCount = data.records.filter(r => r.status === 'absent').length;
    const docId = targetSection
      ? `${data.date}_${data.classId}_${targetSection}`
      : `${data.date}_${data.classId}`;
    const activeYear = this.getActiveAcademicYear();
    const record: DailyClassAttendance = {
      id: docId,
      academicYearId: existingIndex !== -1 && all[existingIndex].academicYearId ? all[existingIndex].academicYearId : activeYear.id,
      academicYearName: existingIndex !== -1 && all[existingIndex].academicYearName ? all[existingIndex].academicYearName : activeYear.name,
      date: data.date,
      classId: data.classId,
      className: data.className,
      section: targetSection,
      records: data.records,
      totalStudents: data.records.length,
      presentCount,
      absentCount,
      markedBy: {
        userId: actor.id,
        userName: actor.fullName,
        role: actor.role,
      },
      markedAt: existingIndex !== -1 ? all[existingIndex].markedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocked: existingIndex !== -1 ? all[existingIndex].isLocked : false,
      lockedBy: existingIndex !== -1 ? all[existingIndex].lockedBy : undefined,
      lockedAt: existingIndex !== -1 ? all[existingIndex].lockedAt : undefined,
      unlockHistory: existingIndex !== -1 ? all[existingIndex].unlockHistory || [] : [],
    };
    if (existingIndex !== -1) {
      all[existingIndex] = record;
    } else {
      all.unshift(record);
    }
    this.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, all);
    // Explicit realtime write to Firestore
    saveDocumentToFirestore('student_attendance', docId, record).catch(() => {});

    this.logAction(
      actor,
      'STUDENT_ATTENDANCE_MARKED',
      `Marked attendance for ${data.className}${targetSection ? ' (Sec ' + targetSection + ')' : ''} on ${data.date}: ${presentCount} Present, ${absentCount} Absent.`
    );
    return { success: true, attendance: record };
  }

  public lockAttendance(date: string, classId: string, actor: User): { success: boolean; error?: string } {
    if (actor.role !== 'principal') {
      return { success: false, error: 'Only the Principal can lock attendance.' };
    }
    const all = this.getAllStudentAttendance();
    const record = all.find(a => a.date === date && a.classId === classId);
    if (!record) return { success: false, error: 'No attendance record found to lock.' };
    record.isLocked = true;
    record.lockedBy = `${actor.fullName} (Principal)`;
    record.lockedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, all);
    saveDocumentToFirestore('student_attendance', record.id, record).catch(() => {});
    this.logAction(actor, 'ATTENDANCE_LOCKED', `Locked attendance for ${record.className} on ${date}.`);
    return { success: true };
  }

  public unlockAttendance(
    date: string,
    classId: string,
    reason: string,
    actor: User
  ): { success: boolean; error?: string } {
    if (actor.role !== 'principal') {
      return { success: false, error: 'Only the Principal can unlock attendance.' };
    }
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'A specific reason (minimum 5 characters) is required to unlock attendance.' };
    }
    const all = this.getAllStudentAttendance();
    const record = all.find(a => a.date === date && a.classId === classId);
    if (!record) return { success: false, error: 'Attendance record not found.' };
    record.isLocked = false;
    if (!record.unlockHistory) record.unlockHistory = [];
    record.unlockHistory.push({
      unlockedBy: `${actor.fullName} (Principal)`,
      unlockedAt: new Date().toISOString(),
      reason: reason.trim(),
    });
    this.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, all);
    saveDocumentToFirestore('student_attendance', record.id, record).catch(() => {});
    this.logAction(
      actor,
      'ATTENDANCE_UNLOCKED',
      `Unlocked attendance for ${record.className} on ${date}. Reason: "${reason.trim()}"`
    );
    return { success: true };
  }

  // --- Staff Attendance ---
  public getAllStaffAttendance(): DailyStaffAttendance[] {
    return this.getItem<DailyStaffAttendance[]>(STORAGE_KEYS.STAFF_ATTENDANCE, INITIAL_STAFF_ATTENDANCE);
  }

  public getStaffAttendanceByDate(date: string): DailyStaffAttendance | undefined {
    return this.getAllStaffAttendance().find(a => a.date === date);
  }

  public saveStaffAttendance(
    date: string,
    records: { staffId: string; staffUid: string; staffName: string; status: StaffAttendanceStatus; remarks?: string }[],
    actor: User
  ): { success: boolean; error?: string } {
    if (actor.role !== 'principal') {
      return { success: false, error: 'Unauthorized: Only the Principal can mark staff attendance.' };
    }
    const today = this.getTodayInKolkata();
    if (date > today) {
      return {
        success: false,
        error: `Strict Date Policy: Staff attendance cannot be marked in advance for future date ${date}.`
      };
    }
    const all = this.getAllStaffAttendance();
    const existingIndex = all.findIndex(a => a.date === date);
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const onLeaveCount = records.filter(r => r.status === 'on_leave').length;
    const docId = `staff_${date}`;
    const entry: DailyStaffAttendance = {
      id: docId,
      date,
      records,
      totalStaff: records.length,
      presentCount,
      absentCount,
      onLeaveCount,
      markedBy: `${actor.fullName} (Principal)`,
      markedAt: existingIndex !== -1 ? all[existingIndex].markedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex !== -1) {
      all[existingIndex] = entry;
    } else {
      all.unshift(entry);
    }
    this.setItem(STORAGE_KEYS.STAFF_ATTENDANCE, all);
    saveDocumentToFirestore('staff_attendance', docId, entry).catch(() => {});
    this.logAction(
      actor,
      'STAFF_ATTENDANCE_MARKED',
      `Marked staff attendance for ${date}: ${presentCount} Present, ${absentCount} Absent, ${onLeaveCount} Leave.`
    );
    return { success: true };
  }

  // --- Calendar & Holidays ---
  public getCalendarConfig(): SchoolCalendarConfig {
    return this.getItem<SchoolCalendarConfig>(STORAGE_KEYS.CALENDAR, INITIAL_CALENDAR);
  }

  public updateCalendarConfig(config: SchoolCalendarConfig, actor: User): void {
    this.setItem(STORAGE_KEYS.CALENDAR, config);
    this.logAction(actor, 'CALENDAR_UPDATED', 'Updated school working days and holidays config.');
  }

  public addHoliday(holiday: Omit<Holiday, 'id'>, actor: User): { success: boolean; holiday?: Holiday } {
    const config = this.getCalendarConfig();
    const newHol: Holiday = {
      ...holiday,
      id: `h-${Date.now()}`
    };
    config.holidays.push(newHol);
    this.setItem(STORAGE_KEYS.CALENDAR, config);
    this.logAction(actor, 'HOLIDAY_ADDED', `Added holiday: ${newHol.name} (${newHol.startDate})`);
    return { success: true, holiday: newHol };
  }

  public deleteHoliday(id: string, actor: User): { success: boolean } {
    const config = this.getCalendarConfig();
    config.holidays = config.holidays.filter(h => h.id !== id);
    this.setItem(STORAGE_KEYS.CALENDAR, config);
    this.logAction(actor, 'HOLIDAY_REMOVED', `Removed holiday ID: ${id}`);
    return { success: true };
  }

  public isSchoolDay(dateStr: string): { isWorkingDay: boolean; reason?: string } {
    const config = this.getCalendarConfig();
    const date = new Date(dateStr + 'T12:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
    const dayName = days[date.getDay()];
    if (config.weeklyOffDays.includes(dayName as any)) {
      return { isWorkingDay: false, reason: `Weekly Off (${dayName})` };
    }
    const matchingHoliday = config.holidays.find(h => {
      return dateStr >= h.startDate && dateStr <= h.endDate;
    });
    if (matchingHoliday) {
      return { isWorkingDay: false, reason: `Holiday: ${matchingHoliday.name}` };
    }
    return { isWorkingDay: true };
  }

  // --- Academic Years Management ---
  public getAcademicYears(): AcademicYear[] {
    return this.getItem<AcademicYear[]>(STORAGE_KEYS.ACADEMIC_YEARS, INITIAL_ACADEMIC_YEARS);
  }

  public getActiveAcademicYear(): AcademicYear {
    const list = this.getAcademicYears();
    const active = list.find(y => y.status === 'active');
    if (active) return active;
    if (list.length > 0) return list[0];
    return INITIAL_ACADEMIC_YEARS[0];
  }

  public getAcademicYearById(id: string): AcademicYear | undefined {
    return this.getAcademicYears().find(y => y.id === id);
  }

  public addAcademicYear(
    data: Omit<AcademicYear, 'id' | 'createdAt'>,
    actor: User
  ): { success: boolean; academicYear?: AcademicYear; error?: string } {
    if (actor.role !== 'principal') {
      return { success: false, error: 'Unauthorized: Only the Principal can create academic years.' };
    }
    const cleanName = data.name.trim();
    if (!cleanName) {
      return { success: false, error: 'Academic year session name (e.g. 2026-27 or 2027-28) is required.' };
    }
    if (!data.startDate || !data.endDate) {
      return { success: false, error: 'Start date and End date are required.' };
    }
    if (data.startDate >= data.endDate) {
      return { success: false, error: 'Academic year Start Date must be earlier than End Date.' };
    }
    const years = this.getAcademicYears();
    const exists = years.some(y => y.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      return { success: false, error: `Academic Year "${cleanName}" already exists.` };
    }
    const safeId = `ay_${cleanName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    const newYear: AcademicYear = {
      ...data,
      id: safeId,
      name: cleanName,
      status: data.status || 'upcoming',
      createdAt: new Date().toISOString(),
      activatedAt: data.status === 'active' ? new Date().toISOString() : undefined
    };
    if (newYear.status === 'active') {
      years.forEach(y => {
        if (y.status === 'active') {
          y.status = 'closed';
          y.closedAt = new Date().toISOString();
          y.closedBy = `${actor.fullName} (Principal)`;
        }
      });
    }
    years.push(newYear);
    this.setItem(STORAGE_KEYS.ACADEMIC_YEARS, years);
    saveDocumentToFirestore('academic_years', newYear.id, newYear).catch(() => {});
    this.logAction(actor, 'ACADEMIC_YEAR_CREATED', `Created Academic Year "${newYear.name}" (${newYear.startDate} to ${newYear.endDate})`);
    return { success: true, academicYear: newYear };
  }

  public activateAcademicYear(id: string, actor: User): { success: boolean; error?: string } {
    if (actor.role !== 'principal') {
      return { success: false, error: 'Unauthorized: Only the Principal can activate an academic year.' };
    }
    const years = this.getAcademicYears();
    const target = years.find(y => y.id === id);
    if (!target) return { success: false, error: 'Academic year not found.' };
    years.forEach(y => {
      if (y.id === id) {
        y.status = 'active';
        y.activatedAt = new Date().toISOString();
      } else if (y.status === 'active') {
        y.status = 'closed';
        y.closedAt = new Date().toISOString();
        y.closedBy = `${actor.fullName} (Principal)`;
      }
    });
    this.setItem(STORAGE_KEYS.ACADEMIC_YEARS, years);

    const enrollments = this.getEnrollmentsForAcademicYear(id);
    if (enrollments.length > 0) {
      const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
      students.forEach(st => {
        const enr = enrollments.find(e => e.studentId === st.id);
        if (enr) {
          st.classId = enr.classId;
          st.className = enr.className;
          st.section = enr.section;
          st.rollNo = enr.rollNo;
          st.currentAcademicYearId = id;
          if (enr.status === 'transferred') {
            st.status = 'transferred';
          } else if (st.status === 'transferred') {
            st.status = 'active';
          }
        }
      });
      this.setItem(STORAGE_KEYS.STUDENTS, students);
    }
    const calendar = this.getCalendarConfig();
    calendar.academicYear = target.name;
    this.setItem(STORAGE_KEYS.CALENDAR, calendar);
    this.logAction(actor, 'ACADEMIC_YEAR_ACTIVATED', `Activated Academic Year "${target.name}". All rosters defaulted to this session.`);
    return { success: true };
  }

  public closeAcademicYear(id: string, actor: User): { success: boolean; error?: string } {
    if (actor.role !== 'principal') {
      return { success: false, error: 'Unauthorized: Only the Principal can close an academic year.' };
    }
    const years = this.getAcademicYears();
    const target = years.find(y => y.id === id);
    if (!target) return { success: false, error: 'Academic year not found.' };
    if (target.status === 'closed') {
      return { success: false, error: `Academic Year "${target.name}" is already closed.` };
    }
    const activeCount = years.filter(y => y.status === 'active').length;
    if (target.status === 'active' && activeCount <= 1 && years.length <= 1) {
      return { success: false, error: 'Cannot close the only academic year. Create and activate a new academic year first.' };
    }
    target.status = 'closed';
    target.closedAt = new Date().toISOString();
    target.closedBy = `${actor.fullName} (Principal)`;
    this.setItem(STORAGE_KEYS.ACADEMIC_YEARS, years);
    this.logAction(actor, 'ACADEMIC_YEAR_CLOSED', `Closed Academic Year "${target.name}". Attendance records for this year remain preserved.`);
    return { success: true };
  }

  // --- Student Enrollments & Promotions ---
  public getEnrollments(): StudentEnrollment[] {
    return this.getItem<StudentEnrollment[]>(STORAGE_KEYS.ENROLLMENTS, INITIAL_ENROLLMENTS);
  }

  public getEnrollmentsForAcademicYear(academicYearId: string): StudentEnrollment[] {
    return this.getEnrollments().filter(e => e.academicYearId === academicYearId);
  }

  public getEnrollmentsForStudent(studentId: string): StudentEnrollment[] {
    return this.getEnrollments().filter(e => e.studentId === studentId);
  }

  public getEnrollmentsForClass(academicYearId: string, classId: string, section?: string): StudentEnrollment[] {
    return this.getEnrollments().filter(e => {
      const matchYear = e.academicYearId === academicYearId;
      const matchClass = e.classId === classId;
      if (!matchYear || !matchClass) return false;
      if (section && section !== 'all') {
        return (e.section || '') === section;
      }
      return true;
    });
  }

  public executePromotionBatch(
    payload: {
      sourceAcademicYearId: string;
      targetAcademicYearId: string;
      promotions: Array<{
        studentId: string;
        decision: 'promoted' | 'repeated' | 'transferred';
        targetClassId?: string;
        targetClassName?: string;
        targetSection?: string;
        targetRollNo?: string;
        remarks?: string;
      }>;
    },
    actor: User
  ): { success: boolean; count?: number; error?: string } {
    if (actor.role !== 'principal') {
      return { success: false, error: 'Unauthorized: Only the Principal can execute student class promotion.' };
    }
    const { sourceAcademicYearId, targetAcademicYearId, promotions } = payload;
    if (!sourceAcademicYearId || !targetAcademicYearId) {
      return { success: false, error: 'Source and Target Academic Years are required.' };
    }
    if (sourceAcademicYearId === targetAcademicYearId) {
      return { success: false, error: 'Source and Target Academic Years cannot be identical.' };
    }
    if (!promotions || promotions.length === 0) {
      return { success: false, error: 'No student promotions selected.' };
    }
    const targetYear = this.getAcademicYearById(targetAcademicYearId);
    if (!targetYear) {
      return { success: false, error: 'Target Academic Year not found.' };
    }
    const allStudents = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const allEnrollments = this.getEnrollments();
    const existingTargetEnrollments = allEnrollments.filter(e => e.academicYearId === targetAcademicYearId);

    const plannedRollMap = new Map<string, string>();
    for (const enr of existingTargetEnrollments) {
      if (enr.status !== 'transferred') {
        const key = `${enr.classId}_${enr.section || ''}_${enr.rollNo.trim().toLowerCase()}`;
        plannedRollMap.set(key, enr.studentId);
      }
    }
    for (const p of promotions) {
      if (p.decision !== 'transferred') {
        if (!p.targetClassId || !p.targetRollNo || !p.targetRollNo.trim()) {
          const st = allStudents.find(s => s.id === p.studentId);
          return {
            success: false,
            error: `Class and Roll Number are required for ${st ? st.fullName : 'every student'} being promoted or repeating.`
          };
        }
        const key = `${p.targetClassId}_${p.targetSection || ''}_${p.targetRollNo.trim().toLowerCase()}`;
        const existingStudentId = plannedRollMap.get(key);
        if (existingStudentId && existingStudentId !== p.studentId) {
          const conflictStudent = allStudents.find(s => s.id === existingStudentId)?.fullName || 'Another student';
          return {
            success: false,
            error: `Duplicate Roll Number Conflict: Roll No "${p.targetRollNo}" is assigned to multiple students in ${p.targetClassName || 'class'}${p.targetSection ? ' Section ' + p.targetSection : ''} (conflicts with ${conflictStudent}).`
          };
        }
        plannedRollMap.set(key, p.studentId);
      }
    }

    let updatedCount = 0;
    const activeYear = this.getActiveAcademicYear();
    const isTargetActive = activeYear.id === targetAcademicYearId;

    for (const p of promotions) {
      const student = allStudents.find(s => s.id === p.studentId);
      if (!student) continue;
      const previousClassId = student.classId;
      const previousClassName = student.className;
      const previousSection = student.section;
      const previousRollNo = student.rollNo;

      const existingEnrIndex = allEnrollments.findIndex(
        e => e.studentId === p.studentId && e.academicYearId === targetAcademicYearId
      );

      const enrRecord: StudentEnrollment = {
        id: existingEnrIndex !== -1 ? allEnrollments[existingEnrIndex].id : `enr-${p.studentId}-${targetAcademicYearId}`,
        studentId: p.studentId,
        studentName: student.fullName,
        academicYearId: targetAcademicYearId,
        academicYearName: targetYear.name,
        classId: p.decision === 'transferred' ? previousClassId : p.targetClassId!,
        className: p.decision === 'transferred' ? previousClassName : (p.targetClassName || previousClassName),
        section: p.decision === 'transferred' ? (previousSection || '') : (p.targetSection || ''),
        rollNo: p.decision === 'transferred' ? previousRollNo : p.targetRollNo!.trim(),
        status: p.decision === 'transferred' ? 'transferred' : 'active',
        promotionType: p.decision,
        previousClassId,
        previousClassName,
        previousSection,
        previousRollNo,
        remarks: p.remarks,
        enrolledAt: new Date().toISOString(),
        enrolledBy: `${actor.fullName} (Principal)`
      };

      if (existingEnrIndex !== -1) {
        allEnrollments[existingEnrIndex] = enrRecord;
      } else {
        allEnrollments.push(enrRecord);
      }

      if (isTargetActive) {
        student.currentAcademicYearId = targetAcademicYearId;
        if (p.decision === 'transferred') {
          student.status = 'transferred';
        } else {
          student.status = 'active';
          student.classId = p.targetClassId!;
          student.className = p.targetClassName || student.className;
          student.section = p.targetSection || '';
          student.rollNo = p.targetRollNo!.trim();
        }
      }
      updatedCount++;
    }

    this.setItem(STORAGE_KEYS.ENROLLMENTS, allEnrollments);
    if (isTargetActive) {
      this.setItem(STORAGE_KEYS.STUDENTS, allStudents);
    }
    this.logAction(
      actor,
      'STUDENTS_PROMOTED',
      `Processed ${updatedCount} student promotions into session ${targetYear.name}. Previous session records remain preserved.`
    );
    return { success: true, count: updatedCount };
  }

  public getStudentAttendanceForAcademicYear(academicYearId: string): DailyClassAttendance[] {
    const targetYear = this.getAcademicYearById(academicYearId);
    const all = this.getAllStudentAttendance();
    return all.filter(a => {
      if (a.academicYearId) {
        return a.academicYearId === academicYearId;
      }
      if (targetYear && a.date >= targetYear.startDate && a.date <= targetYear.endDate) {
        return true;
      }
      return false;
    });
  }

  public getPrincipalDashboardStats(todayStr: string) {
    const students = this.getStudents().filter(s => s.status === 'active');
    const staff = this.getStaffMembers().filter(s => s.status === 'active');
    const classes = this.getClasses().filter(c => c.status === 'active');
    const todayAttendanceList = this.getAllStudentAttendance().filter(a => a.date === todayStr);

    let totalStudentsMarked = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    todayAttendanceList.forEach(a => {
      totalStudentsMarked += a.totalStudents;
      totalPresent += a.presentCount;
      totalAbsent += a.absentCount;
    });

    const studentAttendanceRate = totalStudentsMarked > 0
      ? Math.round((totalPresent / totalStudentsMarked) * 100)
      : 0;

    const submittedClassIds = new Set(todayAttendanceList.map(a => a.classId));
    const pendingClasses = classes.filter(c => !submittedClassIds.has(c.id));
    const todayStaffAtt = this.getStaffAttendanceByDate(todayStr);
    const recentActivity = this.getAllStudentAttendance().slice(0, 5);

    return {
      totalStudents: students.length,
      totalStaff: staff.length,
      totalClasses: classes.length,
      todayPresent: totalPresent,
      todayAbsent: totalAbsent,
      studentAttendanceRate,
      pendingClassesCount: pendingClasses.length,
      pendingClasses,
      staffAttendanceSummary: todayStaffAtt ? {
        present: todayStaffAtt.presentCount,
        absent: todayStaffAtt.absentCount,
        onLeave: todayStaffAtt.onLeaveCount,
        total: todayStaffAtt.totalStaff,
      } : null,
      recentActivity,
    };
  }
}

export const storage = new StorageService();
storage.initialize();
