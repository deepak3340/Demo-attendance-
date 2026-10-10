import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  getDocFromServer,
  Unsubscribe
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously,
  onAuthStateChanged,
  ConfirmationResult,
  User as FirebaseUser
} from 'firebase/auth';
import { RealtimeSyncStatus } from '../types';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD5ACSo67rj2Ijik7umM3qHi8TpAOugVUQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fir-attendance-62fd9.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fir-attendance-62fd9",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fir-attendance-62fd9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "577579656961",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:577579656961:web:3740c9469639becd0f1d00",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YLM18B3SQK"
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let isFirebaseInitialized = false;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  isFirebaseInitialized = true;
} catch (error) {
  console.warn('Firebase initialization notice:', error);
}

export { app, db, auth, isFirebaseInitialized };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global Realtime Status Tracking
const syncStatusState: RealtimeSyncStatus = {
  isConnected: false,
  isSyncing: false,
  lastSyncedAt: null,
  listenerCount: 0,
  syncedCollections: [],
  lastError: null,
};

const syncListeners = new Set<(status: RealtimeSyncStatus) => void>();

function notifySyncStatus() {
  const copy = { ...syncStatusState, syncedCollections: [...syncStatusState.syncedCollections] };
  syncListeners.forEach(listener => {
    try {
      listener(copy);
    } catch {}
  });
}

export function subscribeToSyncStatus(listener: (status: RealtimeSyncStatus) => void): () => void {
  listener({ ...syncStatusState, syncedCollections: [...syncStatusState.syncedCollections] });
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

export function getRealtimeSyncStatus(): RealtimeSyncStatus {
  return { ...syncStatusState, syncedCollections: [...syncStatusState.syncedCollections] };
}

/**
 * Ensures Firebase Auth user is present (signs in anonymously if needed)
 * so that security rules requiring `request.auth != null` succeed seamlessly.
 */
export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  if (!isFirebaseInitialized || !auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Anonymous auth initialization note:', err);
    return null;
  }
}

/**
 * Validate live connection to Firestore using getDocFromServer
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  if (!isFirebaseInitialized || !db) return false;
  try {
    await ensureFirebaseAuth();
    const testDoc = doc(db, 'system_status', 'ping');
    await setDoc(testDoc, {
      lastPing: new Date().toISOString(),
      appName: 'Attendance Management System',
      status: 'active',
      clientTime: new Date().toISOString()
    }, { merge: true });

    // Validate server reachability
    await getDocFromServer(testDoc);

    syncStatusState.isConnected = true;
    syncStatusState.lastSyncedAt = new Date().toISOString();
    syncStatusState.lastError = null;
    notifySyncStatus();
    return true;
  } catch (err: any) {
    console.warn('Background Firestore heartbeat notice:', err);
    syncStatusState.lastError = err?.message || 'Connection failed';
    notifySyncStatus();
    return false;
  }
}

/**
 * Save / Update document to Firestore with real-time update metadata
 */
export async function saveDocumentToFirestore(collectionName: string, docId: string, data: any): Promise<boolean> {
  if (!isFirebaseInitialized || !db) return false;
  syncStatusState.isSyncing = true;
  notifySyncStatus();
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      _syncedAt: new Date().toISOString()
    }, { merge: true });

    syncStatusState.isConnected = true;
    syncStatusState.isSyncing = false;
    syncStatusState.lastSyncedAt = new Date().toISOString();
    syncStatusState.lastError = null;
    notifySyncStatus();
    return true;
  } catch (err: any) {
    console.warn(`Firestore save notice for ${collectionName}/${docId}:`, err);
    syncStatusState.isSyncing = false;
    syncStatusState.lastError = err?.message || 'Write failed';
    notifySyncStatus();
    return false;
  }
}

/**
 * Fetch document from Firestore
 */
export async function getDocumentFromFirestore<T>(collectionName: string, docId: string): Promise<T | null> {
  if (!isFirebaseInitialized || !db) return null;
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as T;
    }
    return null;
  } catch (err) {
    console.warn(`Firestore read notice for ${collectionName}/${docId}:`, err);
    return null;
  }
}

/**
 * Delete document from Firestore
 */
export async function deleteDocumentFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  if (!isFirebaseInitialized || !db) return false;
  syncStatusState.isSyncing = true;
  notifySyncStatus();
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);

    syncStatusState.isSyncing = false;
    syncStatusState.lastSyncedAt = new Date().toISOString();
    notifySyncStatus();
    return true;
  } catch (err: any) {
    console.warn(`Firestore delete notice for ${collectionName}/${docId}:`, err);
    syncStatusState.isSyncing = false;
    syncStatusState.lastError = err?.message || 'Delete failed';
    notifySyncStatus();
    return false;
  }
}

/**
 * Purges old seeded cloud collections while preserving Principal account and School profile
 */
export async function clearAllCloudCollectionsExceptPrincipal(): Promise<void> {
  if (!isFirebaseInitialized || !db) return;
  try {
    await ensureFirebaseAuth();
    const collectionsToClear = [
      'classes',
      'subjects',
      'periods',
      'teacher_assignments',
      'timetable',
      'substitutes',
      'students',
      'student_enrollments',
      'student_attendance',
      'staff_attendance'
    ];

    for (const colName of collectionsToClear) {
      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        const deleteOps = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deleteOps);
      } catch (e) {
        console.warn(`Error clearing cloud collection ${colName}:`, e);
      }
    }

    // Retain only Principal in users collection
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      for (const d of usersSnap.docs) {
        if (d.id !== 'usr_prin_deepak') {
          await deleteDoc(d.ref);
        }
      }
    } catch (e) {
      console.warn('Error clearing non-principal users from Firestore:', e);
    }
  } catch (err) {
    console.warn('Error during cloud cleanup:', err);
  }
}

// Active onSnapshot Unsubscribe collection
const activeUnsubscribers: Unsubscribe[] = [];

/**
 * Setup Real-time Firestore Listeners on primary collections
 * When any record changes in Firestore (e.g. from another tab or teacher),
 * this instantly triggers `onDataChange(collectionName, items)`
 */
export function setupRealtimeListeners(
  onDataChange: (collectionName: string, items: any[]) => void
): () => void {
  if (!isFirebaseInitialized || !db) {
    return () => {};
  }

  // Clear any existing listeners
  activeUnsubscribers.forEach(unsub => {
    try { unsub(); } catch {}
  });
  activeUnsubscribers.length = 0;

  const targetCollections = [
    'student_attendance',
    'staff_attendance',
    'users',
    'classes',
    'subjects',
    'students',
    'academic_years',
    'student_enrollments',
    'teacher_assignments',
    'periods',
    'timetable',
    'calendar_config',
    'school_profile',
    'audit_logs'
  ];

  syncStatusState.syncedCollections = [...targetCollections];

  targetCollections.forEach(colName => {
    try {
      const colRef = collection(db, colName);
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          syncStatusState.isConnected = true;
          syncStatusState.lastSyncedAt = new Date().toISOString();
          syncStatusState.lastError = null;

          if (snapshot.empty) {
            onDataChange(colName, []);
            notifySyncStatus();
            return;
          }

          const items = snapshot.docs.map(d => ({
            ...d.data(),
            id: d.id
          }));

          onDataChange(colName, items);
          notifySyncStatus();
        },
        (error) => {
          console.warn(`Realtime onSnapshot notice for ${colName}:`, error.message);
          syncStatusState.lastError = error.message;
          notifySyncStatus();
        }
      );

      activeUnsubscribers.push(unsub);
    } catch (e) {
      console.warn(`Listener registration error for ${colName}:`, e);
    }
  });

  syncStatusState.listenerCount = activeUnsubscribers.length;
  notifySyncStatus();

  return () => {
    activeUnsubscribers.forEach(unsub => {
      try { unsub(); } catch {}
    });
    activeUnsubscribers.length = 0;
    syncStatusState.listenerCount = 0;
    notifySyncStatus();
  };
}

let activeVerifier: RecaptchaVerifier | null = null;

/**
 * Phone Authentication: Sets up reCAPTCHA verifier attached to a DOM container
 */
export function setupRecaptcha(
  containerId: string,
  callbacks?: {
    onVerify?: (response: string) => void;
    onExpire?: () => void;
  }
): RecaptchaVerifier | null {
  if (!isFirebaseInitialized || !auth) return null;
  try {
    const container = document.getElementById(containerId);
    if (!container) return null;
    if (activeVerifier) {
      try {
        activeVerifier.clear();
      } catch (e) {
        console.warn('Cleared prior reCAPTCHA:', e);
      }
      activeVerifier = null;
    }
    container.innerHTML = '';
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'normal',
      callback: (response: string) => {
        if (callbacks?.onVerify) callbacks.onVerify(response);
      },
      'expired-callback': () => {
        if (callbacks?.onExpire) callbacks.onExpire();
      }
    });
    activeVerifier = verifier;
    return verifier;
  } catch (e) {
    console.error('Error creating RecaptchaVerifier:', e);
    return null;
  }
}

/**
 * Phone Authentication: Request real SMS OTP via Firebase
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string }> {
  if (!isFirebaseInitialized || !auth) {
    return { success: false, error: 'Firebase Auth is not initialized.' };
  }
  try {
    let formatted = phoneNumber.trim();
    if (!formatted.startsWith('+')) {
      if (formatted.length === 10) {
        formatted = `+91${formatted}`;
      } else {
        formatted = `+${formatted}`;
      }
    }
    const confirmationResult = await signInWithPhoneNumber(auth, formatted, verifier);
    return { success: true, confirmationResult };
  } catch (err: any) {
    console.error('Firebase signInWithPhoneNumber failed:', err);
    let friendly = err?.message || 'Failed to send SMS OTP.';
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
    if (err?.code === 'auth/unauthorized-domain') {
      friendly = `Firebase Unauthorized Domain: Yeh domain (${currentHost}) Firebase Console me authorized nahi hai. Solution: Firebase Console > Authentication > Settings > Authorized domains me "${currentHost}" ya "run.app" add karein.`;
    } else if (err?.code === 'auth/operation-not-supported-in-this-environment' || err?.code === 'auth/admin-restricted-operation') {
      friendly = 'Firebase Phone Authentication disabled hai. Solution: Firebase Console > Authentication > Sign-in method me "Phone" provider ko Enable karein.';
    } else if (err?.code === 'auth/quota-exceeded') {
      friendly = 'SMS Quota exceed ho gaya hai. Solution: Firebase Console > Authentication > Sign-in method > Phone me jakar "Phone numbers for testing" add karein.';
    } else if (err?.code === 'auth/invalid-phone-number') {
      friendly = 'Invalid phone number format. Kripya sahi 10-digit mobile number enter karein.';
    } else if (err?.code === 'auth/too-many-requests') {
      friendly = 'Too many requests. Security reason se Firebase ne temporary limit lagayi hai. Kripya 5-10 minute baad retry karein.';
    } else if (err?.code === 'auth/captcha-check-failed') {
      friendly = 'reCAPTCHA verification incomplete ya failed. Kripya captcha check complete karein.';
    }
    return { success: false, error: friendly };
  }
}
