import { initializeApp, getApps, getApp } from 'firebase/app';

// Firebase client config — env vars take precedence, hardcoded fallbacks ensure
// the deployed build always works even if Vercel env isn't injected at build time.
// (Firebase client config is public by design — security is enforced by rules.)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDXTytDXonkcj9A3XuzCeV1F4V-Sfa51Ug',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mico-s-micro-farm-agile.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mico-s-micro-farm-agile',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mico-s-micro-farm-agile.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '899003989851',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:899003989851:web:e47df3198e73640e22647e',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-L3WMNTCW9G',
};

// Log config at startup (projectId only) so we can verify what the build has
if (typeof window !== 'undefined') {
  console.log('[Firebase] projectId:', firebaseConfig.projectId, '| authDomain:', firebaseConfig.authDomain);
}

let _app;
export function getFirebaseApp() {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}
