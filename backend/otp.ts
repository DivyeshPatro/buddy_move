// ============================================================
// OTP verification layer — provider-agnostic.
//
//   • Firebase Phone Auth (PRIMARY): the web/mobile client runs the Firebase
//     SDK, the user receives + enters the OTP, and the client gets a Firebase
//     ID token. We verify that token here with the Admin SDK and trust the
//     phone number inside it. (Firebase "test phone numbers" simulate this for
//     free during development.)
//   • Truecaller (mobile one-tap): verified server-side when a mobile app sends
//     a Truecaller token. Stubbed until a mobile app ships.
//   • Dev fallback: fixed code "123456" — fail-CLOSED. Active ONLY in non-production
//     AND when explicitly opted in via ALLOW_DEV_OTP=true. NEVER active in
//     production, regardless of Firebase config, so a missing FCM_* in prod can
//     never silently re-enable the bypass (the previous behaviour, a critical
//     account-takeover hole).
//
// To enable real OTP: `npm i firebase-admin` and set FCM_PROJECT_ID /
// FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY in .env.
// ============================================================

import { logger } from "./logger";

export const DEV_OTP = process.env.DEV_OTP_CODE || "123456";
const isProd = () => process.env.NODE_ENV === "production";

// Safety: refuse to start if a dev OTP bypass is enabled in production.
if (process.env.NODE_ENV === "production" && (process.env.ALLOW_DEV_OTP === "true" || process.env.ALLOW_DEV_OTP === "1")) {
  logger.error({ env: { NODE_ENV: process.env.NODE_ENV, ALLOW_DEV_OTP: process.env.ALLOW_DEV_OTP } },
    "Startup blocked: ALLOW_DEV_OTP must never be enabled in production. Disable ALLOW_DEV_OTP or set NODE_ENV!=production and restart.");
  throw new Error('Security configuration error: ALLOW_DEV_OTP cannot be enabled when NODE_ENV=production');
}

export interface OtpResult {
  ok: boolean;
  phone?: string;
  mode: "firebase" | "truecaller" | "dev";
  reason?: string;
}

export function firebaseConfigured(): boolean {
  return !!(process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY);
}

/**
 * Dev fixed-code login. FAIL-CLOSED: only in non-production AND when explicitly
 * enabled with ALLOW_DEV_OTP=true. Production is ALWAYS false — even if Firebase
 * is unconfigured (in that case real OTP simply fails, which is the safe outcome).
 */
export function devOtpActive(): boolean {
  return !isProd() && process.env.ALLOW_DEV_OTP === "true";
}

// firebase-admin is loaded lazily so the app runs fine without it installed.
let adminAuth: any = null;
let firebaseInitFailed = false;

async function getFirebaseAuth(): Promise<any | null> {
  if (adminAuth) return adminAuth;
  if (firebaseInitFailed || !firebaseConfigured()) return null;
  try {
    const admin: any = await import("firebase-admin");
    const mod = admin.default || admin;
    const app = mod.apps?.length
      ? mod.app()
      : mod.initializeApp({
          credential: mod.credential.cert({
            projectId: process.env.FCM_PROJECT_ID,
            clientEmail: process.env.FCM_CLIENT_EMAIL,
            // .env stores the private key with literal \n — convert back to real newlines.
            privateKey: (process.env.FCM_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
          }),
        });
    adminAuth = mod.auth(app);
    return adminAuth;
  } catch (e: any) {
    firebaseInitFailed = true;
      logger.warn({ err: e }, "[otp] firebase-admin unavailable");
    return null;
  }
}

/** Verify a Firebase ID token produced by the client after phone OTP. */
export async function verifyFirebaseIdToken(idToken: string): Promise<OtpResult> {
  const auth = await getFirebaseAuth();
  if (!auth) return { ok: false, mode: "firebase", reason: "firebase-not-configured" };
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return { ok: true, mode: "firebase", phone: decoded.phone_number };
  } catch (e: any) {
    return { ok: false, mode: "firebase", reason: e?.message || "invalid-token" };
  }
}

/**
 * Main entry used by the /api/auth/verify-otp route.
 * Prefers a real Firebase ID token; falls back to the dev fixed code when allowed.
 */
export async function verifyOtp(opts: { code?: string; firebaseIdToken?: string }): Promise<OtpResult> {
  // If a Firebase ID token is supplied, verify via Firebase.
  if (opts.firebaseIdToken) {
    return verifyFirebaseIdToken(opts.firebaseIdToken);
  }

  // Development fallback: only active when ALLOW_DEV_OTP=true and not in production.
  if (devOtpActive()) {
    if (opts.code === DEV_OTP) return { ok: true, mode: "dev" };
    return { ok: false, mode: "dev", reason: `Invalid OTP (dev mode expects ${DEV_OTP})` };
  }

  // If a code is supplied but dev OTP is disabled, inform the client that OTP is missing or invalid.
  if (opts.code) {
    return { ok: false, mode: "dev", reason: "Invalid OTP code or dev OTP not enabled" };
  }

  // No credentials provided at all.
  return { ok: false, mode: "firebase", reason: "OTP credential missing or invalid" };
}
