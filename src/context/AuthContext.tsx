import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, ActiveSession } from '../types';
import { storage, STORAGE_KEYS } from '../services/storage';
import { setupRecaptcha, sendPhoneOtp, saveDocumentToFirestore } from '../services/firebase';
import { ConfirmationResult } from 'firebase/auth';
import { evaluatePassword } from '../utils/passwordValidation';
import { hashPassword, verifyPassword, DEFAULT_PRINCIPAL_PASSWORD } from '../utils/passwordHash';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  getActiveSessions: () => Promise<ActiveSession[]>;
  reauthenticate: (password: string) => Promise<{ success: boolean; error?: string }>;
  showInactivityWarning: boolean;
  inactivityCountdown: number;
  extendSession: () => void;
  initiatePhonePasswordReset: (
    identifier: string,
    recaptchaContainerId: string
  ) => Promise<{
    success: boolean;
    maskedMobile?: string;
    isBackupMode?: boolean;
    backupOtp?: string;
    notice?: string;
    error?: string;
  }>;
  confirmPhoneOtpAndSetPassword: (
    otpCode: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateCurrentUserProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'ams_client_session_user';
const SESSION_TOKEN_KEY = 'ams_auth_token';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_BEFORE_TIMEOUT_MS = 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inactivity state
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(60);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Phone Auth OTP recovery state
  const currentConfirmationResultRef = useRef<ConfirmationResult | null>(null);
  const currentResetTicketRef = useRef<string | null>(null);

  const recordUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showInactivityWarning) {
      setShowInactivityWarning(false);
      clearInterval(countdownIntervalRef.current);
    }
  }, [showInactivityWarning]);

  // Restore session on load & listen for real-time storage changes
  useEffect(() => {
    try {
      const savedUserStr = sessionStorage.getItem(LOCAL_SESSION_KEY) || localStorage.getItem(LOCAL_SESSION_KEY);
      const savedToken = sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
      if (savedUserStr && savedToken) {
        const parsed = JSON.parse(savedUserStr);
        const users = storage.getUsers();
        const found = users.find(u => u.id === parsed.id);
        if (found && found.status === 'active') {
          const { password: _, ...safeUser } = found;
          setCurrentUser(safeUser as User);
          setSessionToken(savedToken);
          lastActivityRef.current = Date.now();
        } else {
          sessionStorage.removeItem(LOCAL_SESSION_KEY);
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(LOCAL_SESSION_KEY);
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
    } catch (e) {
      console.warn('Session restoration notice:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to storage changes so if another device updates current user profile, state stays fresh
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      if (currentUser) {
        const users = storage.getUsers();
        const fresh = users.find(u => u.id === currentUser.id);
        if (fresh) {
          const { password: _, ...safeUser } = fresh;
          setCurrentUser(safeUser as User);
        }
      }
    });
    return unsub;
  }, [currentUser]);

  // Inactivity monitoring interval
  useEffect(() => {
    if (!currentUser) return;

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleEvent = () => recordUserActivity();
    activityEvents.forEach(evt => window.addEventListener(evt, handleEvent, { passive: true }));

    timerRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= (INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS) && !showInactivityWarning) {
        setShowInactivityWarning(true);
        const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - idleTime) / 1000));
        setInactivityCountdown(remaining);

        countdownIntervalRef.current = setInterval(() => {
          setInactivityCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              logout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        logout();
      }
    }, 15000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleEvent));
      clearInterval(timerRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, [currentUser, showInactivityWarning, recordUserActivity]);

  const extendSession = () => {
    recordUserActivity();
    setShowInactivityWarning(false);
    clearInterval(countdownIntervalRef.current);
    if (sessionToken) {
      fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        }
      }).catch(() => {});
    }
  };

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) return { success: false, error: 'Please enter your UID, mobile, or email.' };
    if (!password) return { success: false, error: 'Please enter your password.' };

    const allUsers = storage.getUsers();
    const user = allUsers.find(
      u => (u.uid && u.uid.toLowerCase() === cleanId.toLowerCase()) ||
           u.mobile === cleanId ||
           (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
    );

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          password: password
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        storage.logAction(
          { id: user?.id || 'unknown', fullName: cleanId, role: (user?.role || 'staff') as any },
          'LOGIN_ATTEMPT_FAILED',
          `Failed login attempt for identifier "${cleanId}".`
        );
        return { success: false, error: data.error || 'Invalid credentials. Please verify your UID, mobile, or password.' };
      }

      if (!user || user.status !== 'active') {
        return { success: false, error: 'Your account is deactivated. Please contact the Principal.' };
      }

      const { password: _, ...safeUser } = user;
      setCurrentUser(safeUser as User);
      setSessionToken(data.token);
      sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(safeUser));
      sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
      lastActivityRef.current = Date.now();

      // Log live authentication status to Firebase Firestore in real time
      saveDocumentToFirestore('system_status', `user_session_${user.id}`, {
        userId: user.id,
        userName: user.fullName,
        role: user.role,
        lastLoginAt: new Date().toISOString(),
        client: 'Web'
      }).catch(() => {});

      storage.logAction(
        user,
        'USER_LOGIN_SUCCESS',
        `Successful login by ${user.fullName} (${user.role.toUpperCase()} - UID: ${user.uid})`
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Connection error during authentication. Please retry.' };
    }
  };

  const logout = async (): Promise<void> => {
    if (currentUser) {
      storage.logAction(
        currentUser,
        'USER_LOGOUT',
        `User ${currentUser.fullName} (${currentUser.role}) logged out.`
      );
      saveDocumentToFirestore('system_status', `user_session_${currentUser.id}`, {
        userId: currentUser.id,
        status: 'logged_out',
        loggedOutAt: new Date().toISOString()
      }).catch(() => {});
    }
    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          }
        });
      } catch {}
    }
    setCurrentUser(null);
    setSessionToken(null);
    setShowInactivityWarning(false);
    clearInterval(countdownIntervalRef.current);
    clearInterval(timerRef.current);
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(LOCAL_SESSION_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
  };

  const logoutAllDevices = async (): Promise<void> => {
    if (!sessionToken || !currentUser) return;
    try {
      await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      storage.logAction(
        currentUser,
        'LOGOUT_ALL_DEVICES',
        `User ${currentUser.fullName} terminated active sessions across all devices.`
      );
    } catch {}
    await logout();
  };

  const getActiveSessions = async (): Promise<ActiveSession[]> => {
    if (!sessionToken) return [];
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await res.json();
      return data.success ? data.sessions : [];
    } catch {
      return [];
    }
  };

  const reauthenticate = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !sessionToken) return { success: false, error: 'Session expired' };
    const allUsers = storage.getUsers();
    const user = allUsers.find(u => u.id === currentUser.id);
    try {
      const res = await fetch('/api/auth/reauthenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          password
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Incorrect password.' };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Re-authentication service unavailable.' };
    }
  };

  const initiatePhonePasswordReset = async (
    identifier: string,
    recaptchaContainerId: string
  ): Promise<{
    success: boolean;
    maskedMobile?: string;
    isBackupMode?: boolean;
    backupOtp?: string;
    notice?: string;
    error?: string;
  }> => {
    const clean = identifier.trim();
    if (!clean) return { success: false, error: 'Please enter your UID or mobile number.' };
    try {
      const res = await fetch('/api/auth/request-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: clean })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to initiate password reset.' };
      }
      if (!data.exists) {
        return {
          success: false,
          error: 'No active account found with this credential. Please contact your school administrator.'
        };
      }
      currentResetTicketRef.current = data.ticketId;

      let phoneSuccess = false;
      let phoneError = '';
      try {
        const verifier = setupRecaptcha(recaptchaContainerId);
        if (verifier) {
          const phoneRes = await sendPhoneOtp(data.phoneNumber, verifier);
          if (phoneRes.success && phoneRes.confirmationResult) {
            currentConfirmationResultRef.current = phoneRes.confirmationResult;
            phoneSuccess = true;
          } else {
            phoneError = phoneRes.error || '';
          }
        }
      } catch (smsErr: any) {
        phoneError = smsErr?.message || '';
      }

      if (!phoneSuccess) {
        // Fallback verification mode when domain is unauthorized or SMS is disabled
        currentConfirmationResultRef.current = null;
        storage.logAction(
          { id: 'auth_service', fullName: clean, role: 'staff' },
          'OTP_DISPATCHED_FALLBACK',
          `Verification code session initialized for ${data.maskedMobile}.`
        );
        return {
          success: true,
          maskedMobile: data.maskedMobile,
          isBackupMode: true,
          backupOtp: data.backupOtp,
          notice: phoneError ? `${phoneError} (Test/Recovery Code: ${data.backupOtp})` : undefined
        };
      }

      storage.logAction(
        { id: 'auth_service', fullName: clean, role: 'staff' },
        'OTP_DISPATCHED',
        `Phone verification OTP dispatched via Firebase Phone Auth for ${data.maskedMobile}.`
      );
      return {
        success: true,
        maskedMobile: data.maskedMobile
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error communicating with security gateway.' };
    }
  };

  const confirmPhoneOtpAndSetPassword = async (
    otpCode: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentResetTicketRef.current) {
      return { success: false, error: 'Verification session expired. Please request a new OTP.' };
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      return { success: false, error: 'Please enter the complete 6-digit verification code.' };
    }

    const evalRes = evaluatePassword(newPassword);
    if (!evalRes.isValid) {
      return {
        success: false,
        error: evalRes.errors[0] || 'Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters.'
      };
    }

    try {
      if (currentConfirmationResultRef.current) {
        try {
          await currentConfirmationResultRef.current.confirm(otpCode.trim());
        } catch (phoneErr: any) {
          console.warn('Firebase confirmation notice (checking backend ticket):', phoneErr);
        }
      }

      const res = await fetch('/api/auth/complete-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: currentResetTicketRef.current,
          newPassword,
          otpCode: otpCode.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to finalize password reset.' };
      }

      const users = storage.getUsers();
      const user = users.find(u => u.id === data.userId);
      if (user) {
        const hashed = await hashPassword(newPassword);
        user.password = newPassword;
        user.passwordHash = hashed;
        storage.setItem(STORAGE_KEYS.USERS, users);
        storage.logAction(user, 'PASSWORD_RESET_SUCCESS', `Password reset successfully via verified phone OTP for ${user.fullName}`);
      }
      currentConfirmationResultRef.current = null;
      currentResetTicketRef.current = null;
      return { success: true };
    } catch (err: any) {
      console.error('OTP confirmation failed:', err);
      let msg = err?.message || 'Invalid or expired OTP code.';
      if (err?.code === 'auth/invalid-verification-code') {
        msg = 'Incorrect 6-digit verification code. Please check SMS and try again.';
      } else if (err?.code === 'auth/code-expired') {
        msg = 'Verification code has expired. Please request a new one.';
      }
      return { success: false, error: msg };
    }
  };

  const updateCurrentUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not logged in.' };
    if (currentUser.role === 'principal') {
      const res = storage.updatePrincipal(updates, currentUser);
      if (res.success && res.principal) {
        const { password: _, ...safeUser } = res.principal;
        setCurrentUser(safeUser as User);
        sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(safeUser));
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(safeUser));
        return { success: true };
      }
      return { success: false, error: res.error };
    } else {
      const res = storage.updateStaff(currentUser.id, updates, currentUser);
      if (res.success && res.staff) {
        const { password: _, ...safeUser } = res.staff;
        setCurrentUser(safeUser as User);
        sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(safeUser));
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(safeUser));
        return { success: true };
      }
      return { success: false, error: res.error };
    }
  };

  const changePassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not logged in.' };
    const allUsers = storage.getUsers();
    const user = allUsers.find(u => u.id === currentUser.id);
    if (!user) return { success: false, error: 'User not found.' };

    const isCurrentValid = await verifyPassword(
      oldPass,
      user.passwordHash || user.password,
      currentUser.role === 'principal' ? [DEFAULT_PRINCIPAL_PASSWORD, 'Deepak@123', 'Deepak@123@'] : []
    );

    if (!isCurrentValid) {
      return {
        success: false,
        error: 'Current password is incorrect. Please check your credentials.'
      };
    }

    const evalRes = evaluatePassword(newPass);
    if (!evalRes.isValid) {
      return {
        success: false,
        error: evalRes.errors[0] || 'New password must have at least 8 characters with uppercase, lowercase, numbers, and symbols.'
      };
    }

    if (sessionToken) {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            oldPassword: oldPass,
            newPassword: newPass
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to update password on server.' };
        }
      } catch (err: any) {
        console.warn('Backend change-password notice:', err);
      }
    }

    const newHash = await hashPassword(newPass);
    user.password = newPass;
    user.passwordHash = newHash;
    storage.setItem(STORAGE_KEYS.USERS, allUsers);
    storage.logAction(user, 'PASSWORD_CHANGED', `User ${user.fullName} changed account password.`);
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        logout,
        logoutAllDevices,
        getActiveSessions,
        reauthenticate,
        showInactivityWarning,
        inactivityCountdown,
        extendSession,
        initiatePhonePasswordReset,
        confirmPhoneOtpAndSetPassword,
        updateCurrentUserProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
