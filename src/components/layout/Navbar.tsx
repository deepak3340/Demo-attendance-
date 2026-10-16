import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import {
  Menu,
  LogOut,
  ShieldCheck,
  UserCheck,
  Calendar,
  Building2
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  activeViewTitle: string;
  onOpenProfile: () => void;
  onOpenLogoutModal?: () => void;
  onOpenCloudModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  activeViewTitle,
  onOpenProfile,
  onOpenLogoutModal,
  onOpenCloudModal,
}) => {
  const { currentUser, logout } = useAuth();
  const school = storage.getSchool();

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-indigo-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-3 sm:px-6 py-2.5 sm:py-3">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile hamburger & Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden min-w-[42px] min-h-[42px] flex items-center justify-center p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight truncate max-w-[155px] xs:max-w-[220px] sm:max-w-none">
                {activeViewTitle}
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                <Building2 className="w-3 h-3 mr-1" />
                {school.name}
              </span>
              {onOpenCloudModal && (
                <button
                  type="button"
                  onClick={onOpenCloudModal}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                  title="View Live Firebase Firestore Sync Status"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cloud Active</span>
                </button>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block truncate">
              {currentUser.role === 'principal' ? 'Principal Administrator Portal' : 'Faculty Attendance Portal'}
            </p>
          </div>
        </div>

        {/* Right: Date, Role badge, Profile, Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Today's Date in Asia/Kolkata */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>{todayFormatted}</span>
          </div>

          {/* Role Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold ${
              currentUser.role === 'principal'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            {currentUser.role === 'principal' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
            <span className="capitalize">{currentUser.role}</span>
          </span>

          {/* User Profile button */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left min-h-[40px] cursor-pointer"
            title="View Profile & Settings"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-semibold flex items-center justify-center text-xs sm:text-sm shadow-sm ring-2 ring-white shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                {currentUser.fullName}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                UID: {currentUser.uid}
              </p>
            </div>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={onOpenLogoutModal || logout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all font-semibold text-xs cursor-pointer touch-manipulation shadow-2xs"
            title="Sign out of your account"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
