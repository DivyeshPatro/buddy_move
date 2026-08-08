// Frontend Firebase initialisation — used for real phone-number OTP.
// Config comes from VITE_FIREBASE_* env vars (safe to expose; these are public).
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

// Only enable Firebase auth if the core web config is present.
export const firebaseEnabled = !!(config.apiKey && config.authDomain && config.projectId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (firebaseEnabled) {
  app = getApps().length ? getApp() : initializeApp(config as any);
  authInstance = getAuth(app);
}

export const firebaseAuth = authInstance;
