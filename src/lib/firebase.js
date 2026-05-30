// Firebase configuration
// Replace these values with your Firebase project config
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, ref as storageRef, uploadBytes, getBlob, deleteObject } from 'firebase/storage';
import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Google Drive + Docs API scopes (for Drive-backed resume sync)
// drive.file: per-app file access (only files we create / user explicitly opens)
// documents:  Docs API edit access for those files
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
];
GOOGLE_DRIVE_SCOPES.forEach((scope) => googleProvider.addScope(scope));

// Gmail scopes used by the "Tailor & Send" flow. These are requested
// incrementally (lazily) — only when the user opts in to the email features —
// via AuthContext.requestGmailSendAccess() / requestGmailReadAccess().
export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

// Firestore
export const db = getFirestore(app);

// Cloud Functions
export const functions = getFunctions(app);

// Cloud Storage (for DOCX binaries)
export const storage = getStorage(app);
export { storageRef, uploadBytes, getBlob, deleteObject };

// Analytics - only initialize in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Connect to Functions emulator only when explicitly requested. By default,
// local development uses the deployed Firebase backend.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

// Helper to call Cloud Functions
export { httpsCallable };

// Export analytics utilities
export { analytics, logEvent, setUserId, setUserProperties };

export default app;
