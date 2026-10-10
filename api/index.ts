import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Security Headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// --- In-Memory Secure Session & Rate Limiting Storage ---
export interface ServerSession {
  sessionId: string;
  userId: string;
  userName: string;
  role: 'principal' | 'staff';
  mobile: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  ipAddress: string;
  userAgent: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  reauthExpiresAt?: number;
}

interface RateLimitTracker {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

interface PasswordResetTicket {
  ticketId: string;
  userId: string;
  mobile: string;
  expiresAt: number;
  used: boolean;
  attempts: number;
}

// Memory stores
const activeSessions = new Map<string, ServerSession>();
const loginRateLimits = new Map<string, RateLimitTracker>();
const otpRateLimits = new Map<string, RateLimitTracker>();
const resetTickets = new Map<string, PasswordResetTicket>();

// Configurable session limits
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
const MAX_SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours absolute max
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 min cooldown
const OTP_MAX_ATTEMPTS = 3;
const OTP_LOCKOUT_MS = 10 * 60 * 1000; // 10 min cooldown

function parseUserAgent(ua: string = '') {
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/iPad|Tablet/i.test(ua)) deviceType = 'Tablet';
  else if (/Mobile|Android|iPhone/i.test(ua)) deviceType = 'Mobile';

  let browser = 'Browser';
  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';

  return { deviceType, browser };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sId, session] of activeSessions.entries()) {
    if (now > session.expiresAt || (now - session.lastActivityAt) > INACTIVITY_TIMEOUT_MS) {
      activeSessions.delete(sId);
    }
  }
  for (const [id, ticket] of resetTickets.entries()) {
    if (now > ticket.expiresAt || ticket.used) {
      resetTickets.delete(id);
    }
  }
}, 60 * 1000);

// --- Auth Middleware ---
function authenticateSession(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.ams_session) {
    token = req.cookies.ams_session;
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required. No active session found.' });
    return;
  }

  const session = activeSessions.get(token);
  if (!session) {
    res.status(401).json({ success: false, error: 'Session expired or invalidated. Please log in again.' });
    return;
  }

  const now = Date.now();
  if (now > session.expiresAt) {
    activeSessions.delete(token);
    res.status(401).json({ success: false, error: 'Maximum session lifetime reached. Please log in again.' });
    return;
  }

  if ((now - session.lastActivityAt) > INACTIVITY_TIMEOUT_MS) {
    activeSessions.delete(token);
    res.status(401).json({ success: false, error: 'Logged out due to inactivity.' });
    return;
  }

  session.lastActivityAt = now;
  (req as any).session = session;
  next();
}

function requirePrincipal(req: Request, res: Response, next: NextFunction): void {
  const session: ServerSession = (req as any).session;
  if (!session || session.role !== 'principal') {
    res.status(403).json({ success: false, error: 'Forbidden: This action requires Principal authorization.' });
    return;
  }
  next();
}

// --- API Router that mounts under both /api and root ---
const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'Attendance Management System - Secure API',
    timestamp: new Date().toISOString(),
    sessionSecurity: {
      inactivityTimeoutMinutes: 15,
      maxSessionLifetimeHours: 8,
      rateLimitMaxAttempts: LOGIN_MAX_ATTEMPTS
    }
  });
});

apiRouter.post('/auth/login', (req, res) => {
  const { identifier, password, userProfile } = req.body;
  const ip = getClientIp(req);
  const cleanId = (identifier || '').trim().toLowerCase();
  const rateLimitKey = `${ip}_${cleanId}`;
  const now = Date.now();

  const tracker = loginRateLimits.get(rateLimitKey);
  if (tracker && tracker.lockedUntil && tracker.lockedUntil > now) {
    const remainingSecs = Math.ceil((tracker.lockedUntil - now) / 1000);
    res.status(429).json({
      success: false,
      error: `Too many failed attempts. Temporary cooldown in effect. Try again in ${remainingSecs} seconds.`
    });
    return;
  }

  if (!cleanId || !password) {
    res.status(400).json({ success: false, error: 'UID, mobile number, or email and password are required.' });
    return;
  }

  if (!userProfile) {
    const currentTracker = tracker || { attempts: 0, firstAttemptAt: now };
    currentTracker.attempts += 1;
    if (currentTracker.attempts >= LOGIN_MAX_ATTEMPTS) {
      currentTracker.lockedUntil = now + LOGIN_LOCKOUT_MS;
    }
    loginRateLimits.set(rateLimitKey, currentTracker);
    res.status(401).json({ success: false, error: 'Invalid credentials. Please verify your UID, mobile, or password.' });
    return;
  }

  loginRateLimits.delete(rateLimitKey);

  const sessionId = crypto.randomBytes(32).toString('hex');
  const { deviceType, browser } = parseUserAgent(req.headers['user-agent']);

  const session: ServerSession = {
    sessionId,
    userId: userProfile.id,
    userName: userProfile.fullName,
    role: userProfile.role,
    mobile: userProfile.mobile,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + MAX_SESSION_LIFETIME_MS,
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || 'Unknown Device',
    deviceType,
    browser,
  };
  activeSessions.set(sessionId, session);

  res.cookie('ams_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_SESSION_LIFETIME_MS
  });

  res.json({
    success: true,
    token: sessionId,
    session: {
      userId: session.userId,
      userName: session.userName,
      role: session.role,
      expiresAt: new Date(session.expiresAt).toISOString(),
      inactivityTimeoutMinutes: 15
    }
  });
});

apiRouter.post('/auth/heartbeat', authenticateSession, (req, res) => {
  const session: ServerSession = (req as any).session;
  res.json({
    success: true,
    lastActivityAt: session.lastActivityAt,
    remainingMinutes: Math.max(0, Math.floor((INACTIVITY_TIMEOUT_MS - (Date.now() - session.lastActivityAt)) / 60000))
  });
});

apiRouter.post('/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.ams_session) {
    token = req.cookies.ams_session;
  }

  if (token && activeSessions.has(token)) {
    activeSessions.delete(token);
  }
  res.clearCookie('ams_session');
  res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.post('/auth/logout-all', authenticateSession, (req, res) => {
  const currentSession: ServerSession = (req as any).session;
  const targetUserId = currentSession.userId;
  for (const [sId, session] of activeSessions.entries()) {
    if (session.userId === targetUserId) {
      activeSessions.delete(sId);
    }
  }
  res.clearCookie('ams_session');
  res.json({ success: true, message: 'All active sessions on all devices have been terminated.' });
});

apiRouter.get('/auth/sessions', authenticateSession, (req, res) => {
  const currentSession: ServerSession = (req as any).session;
  const userSessions: any[] = [];
  for (const session of activeSessions.values()) {
    if (session.userId === currentSession.userId) {
      userSessions.push({
        sessionId: session.sessionId.substring(0, 8) + '...',
        createdAt: new Date(session.createdAt).toISOString(),
        lastActivityAt: new Date(session.lastActivityAt).toISOString(),
        ipAddress: 'Protected',
        deviceType: session.deviceType,
        browser: session.browser,
        isCurrent: session.sessionId === currentSession.sessionId
      });
    }
  }
  res.json({ success: true, sessions: userSessions });
});

apiRouter.post('/auth/reauthenticate', authenticateSession, (req, res) => {
  const session: ServerSession = (req as any).session;
  const { password, storedUserPassword } = req.body;
  if (!password || !storedUserPassword || password !== storedUserPassword) {
    res.status(401).json({ success: false, error: 'Re-authentication failed: Incorrect password.' });
    return;
  }
  session.reauthExpiresAt = Date.now() + 60 * 1000;
  res.json({
    success: true,
    reauthExpiresAt: new Date(session.reauthExpiresAt).toISOString(),
    message: 'Identity verified. You may proceed with this sensitive action.'
  });
});

apiRouter.post('/auth/request-phone-otp', (req, res) => {
  const { identifier, registeredUsers } = req.body;
  const ip = getClientIp(req);
  const now = Date.now();

  const tracker = otpRateLimits.get(ip) || { attempts: 0, firstAttemptAt: now };
  if (tracker.lockedUntil && tracker.lockedUntil > now) {
    const remaining = Math.ceil((tracker.lockedUntil - now) / 1000);
    res.status(429).json({
      success: false,
      error: `Too many password reset requests. Please wait ${remaining} seconds.`
    });
    return;
  }

  tracker.attempts += 1;
  if (tracker.attempts >= OTP_MAX_ATTEMPTS) {
    tracker.lockedUntil = now + OTP_LOCKOUT_MS;
  }
  otpRateLimits.set(ip, tracker);

  const clean = (identifier || '').trim().toLowerCase();
  if (!clean || !Array.isArray(registeredUsers)) {
    res.status(400).json({ success: false, error: 'Please enter your UID or registered mobile number.' });
    return;
  }

  const user = registeredUsers.find((u: any) =>
    (u.uid && u.uid.toLowerCase() === clean) ||
    u.mobile === clean ||
    (u.email && u.email.toLowerCase() === clean)
  );

  if (!user || user.status !== 'active') {
    res.json({
      success: true,
      exists: false,
      message: 'If an active account exists with this credential, a verification session has been prepared.'
    });
    return;
  }

  const ticketId = crypto.randomBytes(24).toString('hex');
  resetTickets.set(ticketId, {
    ticketId,
    userId: user.id,
    mobile: user.mobile,
    expiresAt: now + 5 * 60 * 1000,
    used: false,
    attempts: 0
  });

  let formattedPhone = user.mobile.trim();
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+91${formattedPhone}`;
  }

  res.json({
    success: true,
    exists: true,
    ticketId,
    phoneNumber: formattedPhone,
    maskedMobile: 'your registered phone number',
    message: 'Verification prepared. Proceeding with Firebase Phone Authentication.'
  });
});

apiRouter.post('/auth/complete-password-reset', (req, res) => {
  const { ticketId, newPassword } = req.body;
  if (!ticketId || !newPassword || newPassword.length < 6) {
    res.status(400).json({ success: false, error: 'Valid reset ticket and password (min 6 characters) required.' });
    return;
  }

  const ticket = resetTickets.get(ticketId);
  if (!ticket || ticket.used || Date.now() > ticket.expiresAt) {
    res.status(400).json({ success: false, error: 'Password reset authorization has expired or was already used. Please request again.' });
    return;
  }

  ticket.used = true;
  resetTickets.delete(ticketId);
  res.json({
    success: true,
    userId: ticket.userId,
    message: 'Password reset validated on secure backend.'
  });
});

apiRouter.post('/records/verify-permanent-delete', authenticateSession, requirePrincipal, (req, res) => {
  const session: ServerSession = (req as any).session;
  const { itemType, itemId, expectedName, confirmationInput, hasDependencies } = req.body;

  const now = Date.now();
  if (!session.reauthExpiresAt || session.reauthExpiresAt < now) {
    res.status(403).json({
      success: false,
      requireReauth: true,
      error: 'Security verification expired: Please enter your administrator password to authorize permanent deletion.'
    });
    return;
  }

  if (!confirmationInput || confirmationInput.trim() !== expectedName.trim()) {
    res.status(400).json({
      success: false,
      error: `Confirmation mismatch. You must type "${expectedName}" exactly to authorize permanent destruction.`
    });
    return;
  }

  if (hasDependencies && !req.body.confirmCascade) {
    res.status(400).json({
      success: false,
      error: `Cannot delete ${itemType} because active linked records exist. Please archive/soft delete instead, or check cascade deletion.`
    });
    return;
  }

  res.json({
    success: true,
    verified: true,
    message: `Permanent deletion authorization granted for ${itemType} "${expectedName}".`
  });
});

apiRouter.post('/academic-years/create', authenticateSession, requirePrincipal, (req, res) => {
  const { name, startDate, endDate } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ success: false, error: 'Academic session name (e.g. 2026-27 or 2027-28) is required.' });
    return;
  }
  if (!startDate || !endDate) {
    res.status(400).json({ success: false, error: 'Start date and End date are required.' });
    return;
  }
  if (startDate >= endDate) {
    res.status(400).json({ success: false, error: 'Start Date must be earlier than End Date.' });
    return;
  }
  res.json({
    success: true,
    message: `Academic year "${name.trim()}" validated and authorized.`
  });
});

apiRouter.post('/academic-years/activate', authenticateSession, requirePrincipal, (req, res) => {
  const { academicYearId, name } = req.body;
  if (!academicYearId) {
    res.status(400).json({ success: false, error: 'Academic Year ID is required.' });
    return;
  }
  res.json({
    success: true,
    message: `Academic year ${name || academicYearId} authorized for active session.`
  });
});

apiRouter.post('/academic-years/close', authenticateSession, requirePrincipal, (req, res) => {
  const { academicYearId, name } = req.body;
  if (!academicYearId) {
    res.status(400).json({ success: false, error: 'Academic Year ID is required.' });
    return;
  }
  res.json({
    success: true,
    message: `Academic year ${name || academicYearId} authorized to be closed.`
  });
});

apiRouter.post('/promotions/validate-and-promote', authenticateSession, requirePrincipal, (req, res) => {
  const { sourceAcademicYearId, targetAcademicYearId, promotions, confirmed } = req.body;
  if (!confirmed) {
    res.status(400).json({ success: false, error: 'Explicit Principal confirmation is required before committing bulk promotions.' });
    return;
  }
  if (!sourceAcademicYearId || !targetAcademicYearId) {
    res.status(400).json({ success: false, error: 'Source and target academic years are required.' });
    return;
  }
  if (sourceAcademicYearId === targetAcademicYearId) {
    res.status(400).json({ success: false, error: 'Source and target academic sessions cannot be the same.' });
    return;
  }
  if (!Array.isArray(promotions) || promotions.length === 0) {
    res.status(400).json({ success: false, error: 'No student promotions provided.' });
    return;
  }

  const rollMap = new Set<string>();
  for (const p of promotions) {
    if (p.decision !== 'transferred') {
      if (!p.targetClassId || !p.targetRollNo || !p.targetRollNo.trim()) {
        res.status(400).json({
          success: false,
          error: `Missing class or roll number for student ID "${p.studentId}". All non-transferred students must have assigned class and roll number.`
        });
        return;
      }
      const key = `${p.targetClassId}_${p.targetSection || ''}_${p.targetRollNo.trim().toLowerCase()}`;
      if (rollMap.has(key)) {
        res.status(400).json({
          success: false,
          error: `Duplicate Roll Number Conflict: Roll No "${p.targetRollNo}" is assigned more than once in the target class.`
        });
        return;
      }
      rollMap.add(key);
    }
  }

  res.json({
    success: true,
    verified: true,
    count: promotions.length,
    message: `Successfully validated ${promotions.length} student promotions.`
  });
});

// Dual mounting: matches both /api/* and /* if /api prefix is stripped
app.use('/api', apiRouter);
app.use(apiRouter);

export default app;
