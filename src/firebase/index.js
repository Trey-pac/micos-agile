// Barrel re-export for backwards compatibility.
// Prefer importing from the specific sub-module when writing new code.
export { getDb } from './firestore';
export { getFirebaseAuth, getGoogleProvider } from './auth';
export { getFirebaseApp } from './app';
export { getMessagingInstance, getToken, onMessage } from './messaging';
