/**
 * Universal Cryptographic Password Hashing & Verification Utility.
 * Implements salted SHA-256 cryptographic hashing.
 * 
 * Works seamlessly in both browser (window.crypto.subtle) and Node.js environments.
 * Format: "sha256$<salt>$<hash>"
 */

export const DEFAULT_PRINCIPAL_PASSWORD = 'Deepak@123@';

/**
 * Generates a random cryptographic salt (hex string).
 */
export function generateSalt(length = 16): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes SHA-256 hex digest of a UTF-8 string using crypto.subtle.
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a plaintext password using a salt and SHA-256.
 * Output format: "sha256$<salt>$<digest>"
 */
export async function hashPassword(plaintext: string, salt?: string): Promise<string> {
  const effectiveSalt = salt || generateSalt(16);
  const combined = `${effectiveSalt}:${plaintext}`;
  const digest = await sha256Hex(combined);
  return `sha256$${effectiveSalt}$${digest}`;
}

/**
 * Verifies a candidate plaintext password against a stored hash (or legacy plaintext).
 * Also supports matching default initial credentials for seamless fallback.
 */
export async function verifyPassword(
  candidate: string,
  storedHashOrPlain?: string | null,
  fallbackAllowed: string[] = [DEFAULT_PRINCIPAL_PASSWORD, 'Deepak@123']
): Promise<boolean> {
  const cleanCandidate = (candidate || '').trim();
  if (!cleanCandidate) return false;

  // 1. If stored in sha256$<salt>$<digest> format
  if (storedHashOrPlain && storedHashOrPlain.startsWith('sha256$')) {
    const parts = storedHashOrPlain.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const expectedDigest = parts[2];
      const candidateDigest = await sha256Hex(`${salt}:${cleanCandidate}`);
      if (candidateDigest === expectedDigest) {
        return true;
      }

      // Check if the stored hash belongs to the initial default administrator credentials
      const isDefaultHash =
        (await sha256Hex(`${salt}:${DEFAULT_PRINCIPAL_PASSWORD}`)) === expectedDigest ||
        (await sha256Hex(`${salt}:Deepak@123`)) === expectedDigest;

      // If still using default credentials, allow matching alternate default spellings
      if (isDefaultHash) {
        for (const fallback of fallbackAllowed) {
          if (cleanCandidate === fallback) {
            return true;
          }
        }
      }

      // Once the user has updated to a custom password, old default passwords no longer work
      return false;
    }
  }

  // 2. Direct comparison if stored is plaintext
  if (storedHashOrPlain && cleanCandidate === storedHashOrPlain.trim()) {
    return true;
  }

  // 3. Fallback comparison only if stored is empty or is initial default password
  if (!storedHashOrPlain || storedHashOrPlain === DEFAULT_PRINCIPAL_PASSWORD || storedHashOrPlain === 'Deepak@123') {
    for (const fallback of fallbackAllowed) {
      if (cleanCandidate === fallback) {
        return true;
      }
    }
  }

  return false;
}
