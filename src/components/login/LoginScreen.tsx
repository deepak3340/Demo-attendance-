import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import {
  GraduationCap,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  School,
  Smartphone,
  Radio
} from 'lucide-react';
import { firebaseConfig } from '../../services/firebase';

export const LoginScreen: React.FC = () => {
  const { login, initiatePhonePasswordReset, confirmPhoneOtpAndSetPassword } = useAuth();
  const school = storage.getSchool();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password Phone Auth modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const result = await login(identifier, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication service error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotIdentifier('');
    setShowForgotModal(true);
    setForgotStep('request');
    setForgotError('');
    setForgotSuccess('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleRequestPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await initiatePhonePasswordReset(forgotIdentifier, 'recaptcha-container');
      if (res.success) {
        setMaskedMobile(res.maskedMobile || 'your registered number');
        setForgotStep('verify');
      } else {
        setForgotError(res.error || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Error communicating with security gateway.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtpAndSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (otpCode.length !== 6) {
      setForgotError('Please enter the complete 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await confirmPhoneOtpAndSetPassword(otpCode, newPassword);
      if (res.success) {
        setForgotSuccess('Identity verified! Your password has been updated. You can now log in.');
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotStep('request');
          setPassword(newPassword);
          setIdentifier(forgotIdentifier);
          setForgotSuccess('');
        }, 2000);
      } else {
        setForgotError(res.error || 'Invalid or expired OTP verification code.');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Failed to complete password reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] flex items-center justify-center p-2.5 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-indigo-950/5 border border-indigo-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:min-h-[620px]">
        {/* Left Side: Brand Banner */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#3b0764] p-5 sm:p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 sm:mb-6 shadow-inner">
              <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-300" />
            </div>
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug">
              Attendance
              <br className="hidden sm:inline" />{' '}
              Management System
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 font-medium tracking-wide">
              Simple • Secure • Reliable
            </p>
          </div>

          {/* School Card Illustration */}
          <div className="relative z-10 my-4 sm:my-8 py-4 sm:py-6 px-4 sm:px-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/30 text-indigo-200 mx-auto flex items-center justify-center mb-2">
              <School className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white tracking-wide">
              {school.name}
            </p>
            <p className="text-[11px] sm:text-xs text-indigo-200/90 mt-0.5 sm:mt-1 italic">
              &quot;Better Attendance Builds a Brighter Future&quot;
            </p>
            <div className="mt-3 pt-2.5 sm:pt-3 border-t border-white/10 flex items-center justify-center gap-4 text-[10px] sm:text-[11px] text-indigo-200">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Principal & Staff Portal
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="relative z-10 text-[10px] sm:text-[11px] text-indigo-300/80 hidden lg:block">
            Official Institution Platform &bull; Single School System &bull; Active Firebase Cloud Sync
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-7 p-4 sm:p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Secure Sign In
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                Enter your assigned UID, registered mobile number, or email
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 sm:mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  UID / Mobile / Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. PRIN01 or registered mobile"
                    required
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none"
                  />
                  <div className="absolute right-3.5 top-2.5 sm:top-3 text-slate-400 pointer-events-none">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors cursor-pointer py-0.5"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none pr-11 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 sm:top-2.5 p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer touch-manipulation"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-3 sm:py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-600">
                <p className="font-semibold text-slate-800">
                  Protected School Attendance Portal
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Secure school administration system with verified account authentication
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Phone Authentication OTP Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-indigo-100 relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              disabled={forgotLoading}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Phone OTP Password Recovery
                </h3>
                <p className="text-xs text-slate-500">
                  Firebase Phone Authentication & reCAPTCHA verification
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestPhoneOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Registered UID or Mobile Number
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. PRIN01 or 9826613340"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    An SMS verification code will be dispatched to your registered phone number via Firebase.
                  </p>
                </div>

                <div id="recaptcha-container" className="flex justify-center my-2 min-h-[78px]"></div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                    className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending SMS OTP...</span>
                      </>
                    ) : (
                      <span>Send Verification Code</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpAndSetPassword} className="space-y-3.5">
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
                  <p className="font-semibold">SMS Sent!</p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Enter the 6-digit verification code sent to {maskedMobile}.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Enter 6-Digit SMS Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-center text-xl font-mono tracking-widest focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={() => setForgotStep('request')}
                    className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    ← Resend SMS
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      disabled={forgotLoading}
                      className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      {forgotLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Set New Password</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
