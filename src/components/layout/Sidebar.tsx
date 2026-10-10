import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserPlus,
  Clock,
  GraduationCap,
  CalendarCheck,
  Briefcase,
  FileSpreadsheet,
  CalendarDays,
  ShieldAlert,
  Settings,
  LogOut,
  X,
  History,
  KeyRound,
  User as UserIcon,
  Archive,
  CalendarRange
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenArchivedModal?: () => void;
  onOpenLogoutModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  onOpenArchivedModal,
  onOpenLogoutModal,
}) => {
  const { currentUser, logout } = useAuth();

  React.useEffect(() => {
    if (isOpenMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenMobile]);

  if (!currentUser) return null;

  const principalNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'academic-years', label: 'Academic Sessions & Promotion', icon: CalendarRange },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'classes-subjects', label: 'Classes & Subjects', icon: BookOpen },
    { id: 'assignments', label: 'Assign Faculty', icon: UserPlus },
    { id: 'timetable', label: 'Timetable & Periods', icon: Clock },
    { id: 'students', label: 'Student Rosters', icon: GraduationCap },
    { id: 'student-attendance', label: 'Student Attendance', icon: CalendarCheck },
    { id: 'staff-attendance', label: 'Teacher Attendance', icon: Briefcase },
    { id: 'reports', label: 'Attendance Reports / Excel', icon: FileSpreadsheet },
    { id: 'calendar', label: 'School Calendar', icon: CalendarDays },
    { id: 'audit-logs', label: 'System Audit Trail', icon: ShieldAlert },
    { id: 'archived', label: 'Archived Records / Trash', icon: Archive, isSpecial: true },
    { id: 'profile', label: 'Profile & Settings', icon: Settings },
  ];

  const staffNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-timetable', label: 'My Timetable', icon: Clock },
    { id: 'my-classes', label: 'My Classes', icon: BookOpen },
    { id: 'mark-attendance', label: 'Mark Student Attendance', icon: CalendarCheck },
    { id: 'attendance-history', label: 'Attendance History', icon: History },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'change-password', label: 'Change Password', icon: KeyRound },
  ];

  const navItems = currentUser.role === 'principal' ? principalNavItems : staffNavItems;

  const handleNavClick = (item: any) => {
    if (item.id === 'archived' && onOpenArchivedModal) {
      onOpenArchivedModal();
      onCloseMobile();
      return;
    }
    onSelectView(item.id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111633] text-slate-200 border-r border-indigo-950/60 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-indigo-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight">Attendance</span>
              <span className="text-xs px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-400/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-indigo-300/80 font-medium tracking-wide">
              {currentUser.role === 'principal' ? 'Principal Console' : 'Faculty Portal'}
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          aria-label="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role & User Badge */}
      <div className="px-5 py-3 bg-[#0d122b] border-b border-indigo-950">
        <div className="flex items-center justify-between">
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {currentUser.fullName}
            </p>
            <p className="text-[11px] text-indigo-300 font-mono">
              UID: {currentUser.uid}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-indigo-900 scrollbar-track-transparent">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-indigo-400/80 uppercase">
          Menu Navigation
        </div>
        {navItems.map((item: any) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-indigo-300 group-hover:text-white'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-indigo-950 bg-[#0d122b]/80 space-y-1">
        <div className="px-3 py-2 rounded-lg bg-indigo-950/40 border border-indigo-800/30 mb-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-white truncate">{currentUser.fullName}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 shrink-0">
              UID: {currentUser.uid}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {currentUser.role === 'principal' ? 'Principal Administrator' : 'Faculty Member'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenLogoutModal || logout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 h-screen sticky top-0 flex-shrink-0 z-20">
        {sidebarContent}
      </aside>
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-10 transition-transform">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
