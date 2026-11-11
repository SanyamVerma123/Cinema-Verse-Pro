/**
 * Security & Vault Authentication Subsystem
 * 
 * Provides:
 * - Server-side multi-turn dialogue state machine:
 *     1. "Akbar, open the gate." -> "Which Gate"
 *     2. "cinema verse" -> "Tell me the password."
 *     3. "sim sim khul ja" -> opens Private App Password Gate
 * - Cryptographically salted PBKDF2 password hashing & timing-safe verification
 * - Rate limiting against brute-force passcode attempts (5 attempts / 15 mins)
 * - Tamper-proof HMAC signed session token generation & verification (__session_vault)
 * - Strict stealth route protection middleware (returns 404 to avoid disclosure)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Global Session Secret
const SESSION_SECRET = process.env.SESSION_SECRET || 'cv_master_sec_token_9934710183_x092';

// -------------------------------------------------------------
// 1. STEALTH DIALOGUE STATE MACHINE & TRIGGER RECOGNITION
// -------------------------------------------------------------
const DIALOGUE_SESSIONS = new Map();

const STEP_1_PATTERNS = [
  'akbar open the gate',
  'akbar open gate',
  'akbar open the gates',
  'akbar open the door',
  'akbar open door',
  'akber open the gate',
  'akbar please open the gate',
  'akbar gate kholo',
  'akbar darwaza kholo',
  'अकबर दरवाजा खोलो',
  'अकबर गेट खोलो',
  'अकबर द्वार खोलो'
];

const STEP_2_PATTERNS = [
  'cinema verse',
  'cinemaverse',
  'cinema verse pro',
  'cinemaverse pro',
  'the cinema verse',
  'the cinemaverse',
  'cinema verse gate',
  'सिनेमा वर्स',
  'सिनेमावर्स',
  'सिनेमा वर्स प्रो'
];

const STEP_3_PATTERNS = [
  'sim sim khul ja',
  'simsim khul ja',
  'sim sim khulja',
  'simsim khulja',
  'sim sim khul jaa',
  'simsim khul jaa',
  'khul ja sim sim',
  'khuljasimsim',
  'open sesame',
  'सिम सिम खुल जा',
  'सिमसिम खुल जा',
  'सिम सिम खुलजा',
  'सिमसिम खुलजा',
  'खुल जा सिम सिम'
];

function normalizeQuery(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\"'।]/g, '') // Strip English & Hindi punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function processDialogueTurn(inputQuery, sessionId) {
  if (!inputQuery) return null;
  const norm = normalizeQuery(inputQuery);

  // Check Step 1: Initial Trigger ("Akbar, open the gate.")
  if (STEP_1_PATTERNS.includes(norm)) {
    const newSessionId = 'dlg_' + crypto.randomBytes(8).toString('hex');
    DIALOGUE_SESSIONS.set(newSessionId, { step: 1, created: Date.now() });
    return {
      status: 'dialogue',
      sessionId: newSessionId,
      step: 1,
      speech: 'Which Gate',
      display: 'Which Gate?'
    };
  }

  // Check ongoing session
  if (sessionId && DIALOGUE_SESSIONS.has(sessionId)) {
    const sess = DIALOGUE_SESSIONS.get(sessionId);
    // Expire session after 5 minutes
    if (Date.now() - sess.created > 5 * 60 * 1000) {
      DIALOGUE_SESSIONS.delete(sessionId);
      return null;
    }

    if (sess.step === 1 && STEP_2_PATTERNS.includes(norm)) {
      sess.step = 2;
      return {
        status: 'dialogue',
        sessionId,
        step: 2,
        speech: 'Tell me the password.',
        display: 'Tell me the password.'
      };
    }

    if (sess.step === 2) {
      const isPassphrase = STEP_3_PATTERNS.includes(norm);
      const isConfigured = verifyPrivatePassword(inputQuery.trim()).success;

      // Passphrase triggers the private password gate
      if (isPassphrase) {
        DIALOGUE_SESSIONS.delete(sessionId);
        return {
          status: 'password_gate',
          dialogue: true,
          speech: 'Passphrase accepted. Please enter your private gate password.',
          display: 'Security Gate Open: Enter Password',
          requirePassword: true,
          gate: true
        };
      }

      // If user typed their actual private password directly, grant access
      if (isConfigured) {
        DIALOGUE_SESSIONS.delete(sessionId);
        const token = createSessionToken();
        return {
          status: 'unlock',
          speech: 'Access granted. Welcome to Cinema Verse.',
          display: 'Access Granted',
          redirect: '/vault',
          token
        };
      }

      return {
        status: 'dialogue',
        sessionId,
        step: 2,
        speech: 'Incorrect password. Try again.',
        display: 'Incorrect password. Please try again.'
      };
    }
  }

  // Also support direct trigger "Sim Sim Khul Ja" if user enters directly
  if (STEP_3_PATTERNS.includes(norm)) {
    return {
      status: 'password_gate',
      dialogue: true,
      speech: 'Enter your private gate password.',
      display: 'Security Gate Open: Enter Password',
      requirePassword: true,
      gate: true
    };
  }

  return null;
}

function isSpecialCommand(query) {
  if (!query) return false;
  const norm = normalizeQuery(query);
  return STEP_1_PATTERNS.includes(norm) || STEP_3_PATTERNS.includes(norm);
}

// -------------------------------------------------------------
// 2. CRYPTOGRAPHIC PASSWORD HASHING & TIMING-SAFE VERIFICATION
// -------------------------------------------------------------
function hashPassword(password, salt) {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, finalSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: finalSalt };
}

// In-memory or env-based private credentials
function getActiveCredentials() {
  let activeHash = process.env.PRIVATE_APP_PASSWORD_HASH || '';
  let activeSalt = process.env.PRIVATE_APP_SALT || '';

  if (!activeHash) {
    const rawPass = process.env.PRIVATE_APP_PASSWORD || 'cinema2026';
    const generated = hashPassword(rawPass);
    activeHash = generated.hash;
    activeSalt = generated.salt;
  }
  return { hash: activeHash, salt: activeSalt };
}

function updatePrivatePassword(newPassword) {
  if (!newPassword || newPassword.length < 3) {
    throw new Error('Password must be at least 3 characters');
  }
  const generated = hashPassword(newPassword);
  process.env.PRIVATE_APP_PASSWORD_HASH = generated.hash;
  process.env.PRIVATE_APP_SALT = generated.salt;
  return generated;
}

// -------------------------------------------------------------
// 3. RATE LIMITING (5 ATTEMPTS PER 15 MINUTES)
// -------------------------------------------------------------
const ATTEMPT_MAP = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const clientIp = ip || '127.0.0.1';
  const now = Date.now();
  const record = ATTEMPT_MAP.get(clientIp);

  if (record) {
    if (record.lockUntil && now < record.lockUntil) {
      const remainingSec = Math.ceil((record.lockUntil - now) / 1000);
      return { allowed: false, remainingSec };
    }
    if (record.lockUntil && now >= record.lockUntil) {
      ATTEMPT_MAP.delete(clientIp);
    }
  }
  return { allowed: true };
}

function recordAttempt(ip, success) {
  const clientIp = ip || '127.0.0.1';
  const now = Date.now();
  let record = ATTEMPT_MAP.get(clientIp) || { attempts: 0, lockUntil: 0 };

  if (success) {
    ATTEMPT_MAP.delete(clientIp);
    return;
  }

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_MS;
  }
  ATTEMPT_MAP.set(clientIp, record);
}

function verifyPrivatePassword(candidatePassword, ip) {
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return {
      success: false,
      rateLimited: true,
      message: `Too many attempts. Locked for ${rateLimit.remainingSec}s.`
    };
  }

  const { hash: activePrivateHash, salt: activePrivateSalt } = getActiveCredentials();

  if (!candidatePassword || !activePrivateHash || !activePrivateSalt) {
    recordAttempt(ip, false);
    return { success: false, message: 'Invalid credentials.' };
  }

  const candidateHash = crypto.pbkdf2Sync(
    candidatePassword,
    activePrivateSalt,
    100000,
    64,
    'sha512'
  ).toString('hex');

  const bufA = Buffer.from(candidateHash, 'hex');
  const bufB = Buffer.from(activePrivateHash, 'hex');

  const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

  recordAttempt(ip, isMatch);

  return {
    success: isMatch,
    message: isMatch ? 'Access granted.' : 'Invalid credentials.'
  };
}

// -------------------------------------------------------------
// 4. HMAC SIGNED SESSION TOKENS
// -------------------------------------------------------------
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function createSessionToken() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const payload = `${nonce}.${timestamp}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [nonce, timestampStr, sig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_TTL_MS) {
    return false;
  }

  const payload = `${nonce}.${timestampStr}`;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------------
// 5. STEALTH MIDDLEWARE (REQUIRES VAULT AUTH)
// -------------------------------------------------------------
function extractSessionCookie(req) {
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)__session_vault=([^;]+)/);
  if (match) return match[1];
  const authHeader = req.headers?.['x-vault-session'];
  if (authHeader) return authHeader;
  return null;
}

function requireVaultAuth(req, res, next) {
  const token = extractSessionCookie(req);
  if (!token || !verifySessionToken(token)) {
    // Stealth: return 404 to avoid disclosing the endpoint existence
    return res.status(404).json({ error: 'Not found' });
  }
  req.isVaultAuthorized = true;
  next();
}

function isRequestAuthorized(req) {
  const token = extractSessionCookie(req);
  return token ? verifySessionToken(token) : false;
}

module.exports = {
  processDialogueTurn,
  isSpecialCommand,
  normalizeQuery,
  verifyPrivatePassword,
  updatePrivatePassword,
  createSessionToken,
  verifySessionToken,
  requireVaultAuth,
  isRequestAuthorized
};
