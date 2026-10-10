import {
  SchoolProfile,
  User,
  SchoolClass,
  Subject,
  TeacherAssignment,
  PeriodConfig,
  TimetableEntry,
  Student,
  DailyClassAttendance,
  DailyStaffAttendance,
  SchoolCalendarConfig,
  AuditLog,
  AcademicYear,
  StudentEnrollment
} from '../types';

export const INITIAL_SCHOOL: SchoolProfile = {
  name: "Sanskar High School",
  code: "SHS-GARODA",
  tagline: "Simple • Secure • Reliable • Better Attendance Builds a Brighter Future",
  address: "Garoda",
  phone: "9826613340",
  email: "Deepak.lohar9826@gmail.com",
  principalName: "Mr Deepak Gehlot",
  establishedYear: "2024",
};

// Only the Principal account is kept in the initial database
export const INITIAL_USERS: User[] = [
  {
    id: "usr_prin_deepak",
    uid: "PRIN01",
    mobile: "9826613340",
    fullName: "Mr Deepak Gehlot",
    email: "Deepak.lohar9826@gmail.com",
    role: "principal",
    password: "Deepak@123@",
    status: "active",
    gender: "Male",
    designation: "Principal & School Administrator",
    createdAt: "2024-04-01T08:00:00.000Z",
  }
];

// Clean slate: all classes, subjects, periods, timetables, and students start empty
// Principal will manually configure them and test the workflows
export const INITIAL_CLASSES: SchoolClass[] = [];

export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_ASSIGNMENTS: TeacherAssignment[] = [];

export const INITIAL_PERIODS: PeriodConfig[] = [];

export const INITIAL_TIMETABLE: TimetableEntry[] = [];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: "ay_2026_27",
    name: "2026-27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    status: "active",
    createdAt: "2026-04-01T00:00:00.000Z",
    activatedAt: "2026-04-01T00:00:00.000Z",
    notes: "Default active academic session for Sanskar High School"
  }
];

export const INITIAL_ENROLLMENTS: StudentEnrollment[] = [];

export const INITIAL_STUDENT_ATTENDANCE: DailyClassAttendance[] = [];

export const INITIAL_STAFF_ATTENDANCE: DailyStaffAttendance[] = [];

export const INITIAL_CALENDAR: SchoolCalendarConfig = {
  academicYear: "2026-2027",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  weeklyOffDays: ["Sunday"],
  holidays: []
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-init-1",
    timestamp: new Date().toISOString(),
    userId: "usr_prin_deepak",
    userName: "Mr Deepak Gehlot",
    userRole: "principal",
    action: "SYSTEM_INITIALIZED",
    details: "Initialized clean slate for Sanskar High School with Principal account only. Ready for manual data addition and testing."
  }
];
