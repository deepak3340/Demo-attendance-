/**
 * Password validation utilities and security policy enforcer.
 * Requires:
 * 1. Minimum 8 characters
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one lowercase letter (a-z)
 * 4. At least one numeric digit (0-9)
 * 5. At least one special character (!@#$%^&* etc.)
 */

export interface PasswordRuleChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 5
  rules: PasswordRuleChecks;
  errors: string[];
  strengthLabel: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  strengthColor: string;
  strengthBg: string;
}

export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

export function evaluatePassword(password: string = ''): PasswordValidationResult {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(password);

  const rules: PasswordRuleChecks = {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  };

  const score = [minLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  const errors: string[] = [];
  if (!minLength) errors.push('Password must be at least 8 characters long.');
  if (!hasUpper) errors.push('Must contain at least 1 uppercase letter (A-Z).');
  if (!hasLower) errors.push('Must contain at least 1 lowercase letter (a-z).');
  if (!hasNumber) errors.push('Must contain at least 1 number (0-9).');
  if (!hasSpecial) errors.push('Must contain at least 1 special character (e.g. !@#$%^&*).');

  let strengthLabel: PasswordValidationResult['strengthLabel'] = 'Very Weak';
  let strengthColor = 'text-rose-600';
  let strengthBg = 'bg-rose-500';

  if (score <= 1) {
    strengthLabel = 'Very Weak';
    strengthColor = 'text-rose-600';
    strengthBg = 'bg-rose-500';
  } else if (score === 2) {
    strengthLabel = 'Weak';
    strengthColor = 'text-orange-600';
    strengthBg = 'bg-orange-500';
  } else if (score === 3) {
    strengthLabel = 'Fair';
    strengthColor = 'text-amber-600';
    strengthBg = 'bg-amber-500';
  } else if (score === 4) {
    strengthLabel = 'Good';
    strengthColor = 'text-indigo-600';
    strengthBg = 'bg-indigo-500';
  } else if (score === 5) {
    strengthLabel = 'Strong';
    strengthColor = 'text-emerald-600';
    strengthBg = 'bg-emerald-500';
  }

  return {
    isValid: score === 5,
    score,
    rules,
    errors,
    strengthLabel,
    strengthColor,
    strengthBg,
  };
}
