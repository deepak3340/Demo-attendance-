import React from 'react';
import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { evaluatePassword } from '../../utils/passwordValidation';

interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
  showMatchStatus?: boolean;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  confirmPassword,
  showMatchStatus = false,
}) => {
  const result = evaluatePassword(password);
  const { rules, score, strengthLabel, strengthBg, strengthColor } = result;

  const items = [
    { label: '8+ Characters', met: rules.minLength },
    { label: 'Upper Case (A-Z)', met: rules.hasUpper },
    { label: 'Lower Case (a-z)', met: rules.hasLower },
    { label: 'Number (0-9)', met: rules.hasNumber },
    { label: 'Special Symbol (!@#$)', met: rules.hasSpecial },
  ];

  const passwordsMatch = confirmPassword !== undefined && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword !== undefined && confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="space-y-2.5 my-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
      {/* Strength Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5 text-[11px] font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            {result.isValid ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>Password Security:</span>
          </span>
          <span className={`font-bold ${strengthColor}`}>
            {password ? strengthLabel : 'Not entered'}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <div
              key={lvl}
              className={`h-full flex-1 transition-all duration-300 rounded-full ${
                score >= lvl ? strengthBg : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium transition-colors ${
              item.met
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            {item.met ? (
              <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-slate-400 flex-shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Confirmation Match Status */}
      {showMatchStatus && confirmPassword !== undefined && confirmPassword.length > 0 && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
            passwordsMatch
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {passwordsMatch ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Passwords match correctly</span>
            </>
          ) : (
            <>
              <X className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
              <span>Passwords do not match yet</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
