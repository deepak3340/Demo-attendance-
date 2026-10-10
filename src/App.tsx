import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { storage } from './services/storage';
import { LoginScreen } from './components/login/LoginScreen';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PrincipalDashboard } from './components/principal/PrincipalDashboard';
import { AcademicYearPromotion } from './components/principal/AcademicYearPromotion';
import { StaffManagement } from './components/principal/StaffManagement';
import { ClassesAndSubjects } from './components/principal/ClassesAndSubjects';
import { AssignClassesSubjects } from './components/principal/AssignClassesSubjects';
import { TimetableManagement } from './components/principal/TimetableManagement';
import { StudentManagement } from './components/principal/StudentManagement';
import { StudentAttendanceView } from './components/principal/StudentAttendanceView';
import { TeacherAttendance } from './components/principal/TeacherAttendance';
import { AttendanceReports } from './components/principal/AttendanceReports';
import { SchoolCalendar } from './components/principal/SchoolCalendar';
import { AuditLogsView } from './components/principal/AuditLogsView';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { StaffTimetable } from './components/staff/StaffTimetable';
import { StaffClasses } from './components/staff/StaffClasses';
import { MarkStudentAttendance } from './components/staff/MarkStudentAttendance';
import { StaffAttendanceHistory } from './components/staff/StaffAttendanceHistory';
import { ProfileModal } from './components/common/ProfileModal';
import { ChangePasswordModal } from './components/common/ChangePasswordModal';
import { SecuritySessionsModal } from './components/common/SecuritySessionsModal';
import { ArchivedRecordsModal } from './components/common/ArchivedRecordsModal';
import { InactivityWarningModal } from './components/common/InactivityWarningModal';
import { LogoutConfirmModal } from './components/common/LogoutConfirmModal';

const AppContent: React.FC = () => {
  const {
    currentUser,
    isLoading,
    showInactivityWarning,
    inactivityCountdown,
    extendSession,
    logout
  } = useAuth();

  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isSecuritySessionsModalOpen, setIsSecuritySessionsModalOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // View navigation params (e.g. { date, classId })
  const [viewParams, setViewParams] = useState<any>(null);
  const [dataRefreshKey, setDataRefreshKey] = useState<number>(0);

  // Subscribe to storage changes for instant real-time UI updates
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDataRefreshKey(prev => prev + 1);
    });
    return unsub;
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fd] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading Attendance System & Connecting Firebase...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  const handleNavigate = (viewId: string, params?: any) => {
    if (viewId === 'profile') {
      setIsProfileModalOpen(true);
      return;
    }
    if (viewId === 'change-password') {
      setIsChangePasswordModalOpen(true);
      return;
    }
    if (viewId === 'security') {
      setIsSecuritySessionsModalOpen(true);
      return;
    }
    if (viewId === 'archived') {
      setIsArchivedModalOpen(true);
      return;
    }
    setViewParams(params || null);
    setActiveView(viewId);
  };

  const getActiveViewTitle = () => {
    if (currentUser.role === 'principal') {
      switch (activeView) {
        case 'dashboard':
          return 'Dashboard Overview';
        case 'academic-years':
          return 'Academic Sessions & Promotion';
        case 'staff':
          return 'Staff Management';
        case 'classes-subjects':
          return 'Classes & Subjects';
        case 'assignments':
          return 'Assign Faculty';
        case 'timetable':
          return 'Timetable & Periods';
        case 'students':
          return 'Student Rosters';
        case 'student-attendance':
          return 'Student Attendance';
        case 'staff-attendance':
          return 'Teacher Attendance';
        case 'reports':
          return 'Attendance Reports / Excel';
        case 'calendar':
          return 'School Calendar';
        case 'audit-logs':
          return 'System Audit Trail';
        default:
          return 'Principal Portal';
      }
    } else {
      switch (activeView) {
        case 'dashboard':
          return 'Teacher Dashboard';
        case 'my-timetable':
          return 'My Weekly Timetable';
        case 'my-classes':
          return 'My Assigned Classes';
        case 'mark-attendance':
          return 'Mark Student Attendance';
        case 'attendance-history':
          return 'Attendance History';
        default:
          return 'Staff Portal';
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] flex" key={dataRefreshKey}>
      {/* Sidebar */}
      <Sidebar
        currentView={activeView}
        onSelectView={handleNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenArchivedModal={() => setIsArchivedModalOpen(true)}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Navbar */}
        <Navbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          activeViewTitle={getActiveViewTitle()}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 animate-fadeIn">
          {currentUser.role === 'principal' ? (
            <>
              {activeView === 'dashboard' && (
                <PrincipalDashboard
                  onNavigate={handleNavigate}
                  onOpenArchivedModal={() => setIsArchivedModalOpen(true)}
                />
              )}
              {activeView === 'academic-years' && <AcademicYearPromotion />}
              {activeView === 'staff' && <StaffManagement />}
              {activeView === 'classes-subjects' && <ClassesAndSubjects />}
              {activeView === 'assignments' && <AssignClassesSubjects />}
              {activeView === 'timetable' && <TimetableManagement />}
              {activeView === 'students' && (
                <StudentManagement
                  onNavigateToClasses={() => setActiveView('classes-subjects')}
                />
              )}
              {activeView === 'student-attendance' && (
                <StudentAttendanceView
                  initialDate={viewParams?.date}
                  initialClassId={viewParams?.classId}
                  onNavigateToReports={() => setActiveView('reports')}
                  onNavigateToClasses={() => setActiveView('classes-subjects')}
                />
              )}
              {activeView === 'staff-attendance' && <TeacherAttendance />}
              {activeView === 'reports' && <AttendanceReports />}
              {activeView === 'calendar' && <SchoolCalendar />}
              {activeView === 'audit-logs' && <AuditLogsView />}
            </>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <StaffDashboard onNavigate={handleNavigate} />
              )}
              {activeView === 'my-timetable' && <StaffTimetable />}
              {activeView === 'my-classes' && (
                <StaffClasses
                  onNavigateToAttendance={(classId) =>
                    handleNavigate('mark-attendance', { classId })
                  }
                />
              )}
              {activeView === 'mark-attendance' && (
                <MarkStudentAttendance
                  initialClassId={viewParams?.classId}
                  initialDate={viewParams?.date}
                />
              )}
              {activeView === 'attendance-history' && (
                <StaffAttendanceHistory
                  onViewRecord={(date, classId) =>
                    handleNavigate('mark-attendance', { date, classId })
                  }
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Common Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenSecuritySessions={() => setIsSecuritySessionsModalOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      <SecuritySessionsModal
        isOpen={isSecuritySessionsModalOpen}
        onClose={() => setIsSecuritySessionsModalOpen(false)}
      />

      <ArchivedRecordsModal
        isOpen={isArchivedModalOpen}
        onClose={() => setIsArchivedModalOpen(false)}
        onDataChanged={() => setDataRefreshKey(prev => prev + 1)}
      />

      <InactivityWarningModal
        isOpen={showInactivityWarning}
        countdownSeconds={inactivityCountdown}
        onStayLoggedIn={extendSession}
        onLogoutNow={logout}
      />

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
