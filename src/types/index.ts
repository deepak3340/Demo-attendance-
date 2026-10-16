export type UserRole = 'principal' | 'staff';

export interface User {
  id: string;
  uid: string; // 'PRIN01' or 6-digit numeric for staff like '482731'
  mobile: string;
  fullName: string;
  email: string;
  role: UserRole;
  password?: string;
  passwordHash?: string;
  status: 'active' | 'inactive' | 'archived';
  gender?: 'Male' | 'Female' | 'Other';
  designation?: string;
  createdAt: string;
  archivedAt?: string;
  archivedBy?: string;
  _syncedAt?: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. 'Class 10', 'Nursery', 'UKG'
  sections?: string[]; // e.g. ['A', 'B'] or [] if no sections
  section?: string; // fallback single section
  room?: string;
  status: 'active' | 'inactive' | 'archived';
  archivedAt?: string;
  archivedBy?: string;
  _syncedAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  classIds: string[]; // classes this subject is offered in
  status: 'active' | 'inactive' | 'archived';
  archivedAt?: string;
  archivedBy?: string;
  _syncedAt?: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherUid: string;
  classId: string;
  className: string;
  section?: string;
  subjectId: string;
  subjectName: string;
  assignedAt: string;
  _syncedAt?: string;
}

export interface PeriodConfig {
  id: string;
  periodNumber: number;
  name: string;
  startTime: string; // e.g. '08:00'
  endTime: string; // e.g. '08:45'
  type: 'attendance' | 'regular' | 'break';
  status: 'active' | 'inactive';
  _syncedAt?: string;
}

export interface TimetableEntry {
  id: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  periodId?: string;
  periodNumber: number;
  periodName?: string;
  startTime?: string;
  endTime?: string;
  classId: string;
  className: string;
  section?: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  room?: string;
  _syncedAt?: string;
}

export interface SubstituteAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  periodNumber: number;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  originalTeacherId: string;
  originalTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  reason: string;
  _syncedAt?: string;
}

export interface AcademicYear {
  id: string; // e.g. 'ay_2026_27'
  name: string; // e.g. '2026-27'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'active' | 'upcoming' | 'closed';
  createdAt: string;
  activatedAt?: string;
  closedAt?: string;
  closedBy?: string;
  notes?: string;
  _syncedAt?: string;
}

export type PromotionDecision = 'promoted' | 'repeated' | 'transferred' | 'admitted';

export interface StudentEnrollment {
  id: string;
  studentId: string; // Permanent student ID (preserved across all years)
  studentName: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  section: string;
  rollNo: string;
  status: 'active' | 'transferred' | 'completed';
  promotionType?: PromotionDecision;
  previousClassId?: string;
  previousClassName?: string;
  previousSection?: string;
  previousRollNo?: string;
  remarks?: string;
  enrolledAt: string;
  enrolledBy: string;
  _syncedAt?: string;
}

export interface Student {
  id: string; // Permanent ID preserved across all academic years
  rollNo: string; // Active roll number in current active academic year
  fullName: string;
  classId: string; // Active class ID in current active academic year
  className: string;
  section: string; // Active section in current active academic year
  gender: 'Male' | 'Female';
  guardianName: string;
  guardianMobile: string;
  status: 'active' | 'inactive' | 'archived' | 'transferred';
  admissionDate: string;
  admissionAcademicYearId?: string;
  currentAcademicYearId?: string;
  archivedAt?: string;
  archivedBy?: string;
  _syncedAt?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface StudentAttendanceRecord {
  studentId: string;
  rollNo: string;
  studentName: string;
  status: AttendanceStatus;
  earlyDepartureNote?: string;
}

export interface DailyClassAttendance {
  id: string; // `${date}_${classId}` or `${date}_${classId}_${section || 'all'}`
  academicYearId?: string; // Linked academic year ID
  academicYearName?: string; // Linked academic year name (e.g. '2026-27')
  date: string; // YYYY-MM-DD
  classId: string;
  className: string;
  section?: string;
  records: StudentAttendanceRecord[];
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  leaveCount?: number;
  markedBy: {
    userId: string;
    userName: string;
    role: UserRole;
  };
  markedAt: string;
  updatedAt: string;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  unlockHistory?: {
    unlockedBy: string;
    unlockedAt: string;
    reason: string;
  }[];
  _syncedAt?: string;
}

export type StaffAttendanceStatus = 'present' | 'absent' | 'on_leave';

export interface StaffAttendanceRecord {
  staffId: string;
  staffUid: string;
  staffName: string;
  status: StaffAttendanceStatus;
  remarks?: string;
}

export interface DailyStaffAttendance {
  id: string; // `staff_${date}`
  date: string; // YYYY-MM-DD
  records: StaffAttendanceRecord[];
  totalStaff: number;
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  markedBy: string;
  markedAt: string;
  updatedAt: string;
  _syncedAt?: string;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: 'national' | 'festival' | 'vacation' | 'school';
  description?: string;
  _syncedAt?: string;
}

export interface SchoolCalendarConfig {
  academicYear: string;
  workingDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[];
  weeklyOffDays: ('Sunday' | 'Saturday')[];
  holidays: Holiday[];
  _syncedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  ipAddress?: string;
  _syncedAt?: string;
}

export interface SchoolProfile {
  name: string;
  code: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  principalName: string;
  establishedYear: string;
  _syncedAt?: string;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  userName: string;
  role: UserRole;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  isCurrent: boolean;
}

export interface RealtimeSyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  listenerCount: number;
  syncedCollections: string[];
  lastError: string | null;
}
