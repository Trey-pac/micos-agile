/**
 * notificationService.js — FCM push notification system
 *
 * Provides permission request, FCM token management, foreground message handling,
 * and push notification dispatch. Tokens are stored per-device in Firestore
 * at farms/{farmId}/customers/{customerId}/fcmTokens/{tokenId}.
 */
import { doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getDb, getMessagingInstance, getToken, onMessage } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// ── 1. Request notification permission ──────────────────────────────────────

export async function requestPermission() {
  if (!('Notification' in window)) {
    console.warn('[notifications] Not supported in this browser');
    return 'unsupported';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const result = await Notification.requestPermission();
  return result; // 'granted' | 'denied' | 'default'
}

// ── 2. Get FCM token + save to Firestore subcollection ──────────────────────
//
// Stores at: farms/{farmId}/customers/{customerId}/fcmTokens/{tokenId}
// Each device gets its own doc so multi-device works.

export async function registerFCMToken(farmId, userId) {
  if (!farmId || !userId) return null;
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('[notifications] Messaging not supported');
      return null;
    }

    // Get the service worker registration (registered by vite-plugin-pwa)
    const swReg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      await saveFCMToken(farmId, userId, token);
      return token;
    }

    console.warn('[notifications] No FCM token received');
    return null;
  } catch (err) {
    console.error('[notifications] FCM registration failed:', err);
    return null;
  }
}

export async function saveFCMToken(farmId, userId, token) {
  if (!farmId || !userId || !token) return;
  try {
    // Use token as doc ID to deduplicate per device
    const ref = doc(getDb(), 'farms', farmId, 'customers', userId, 'fcmTokens', token);
    await setDoc(ref, {
      token,
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  } catch (err) {
    console.error('[notifications] Failed to save FCM token:', err);
  }
}

// ── 3. Get user notification preferences ────────────────────────────────────

export async function getNotificationPreference(farmId, userId) {
  if (!farmId || !userId) return null;
  try {
    const ref = doc(getDb(), 'farms', farmId, 'users', userId);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().notificationsEnabled ?? null : null;
  } catch (err) {
    console.error('[notifications] Failed to get preference:', err);
    return null;
  }
}

export async function setNotificationPreference(farmId, userId, enabled) {
  if (!farmId || !userId) return;
  try {
    const ref = doc(getDb(), 'farms', farmId, 'users', userId);
    await setDoc(ref, { notificationsEnabled: enabled, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('[notifications] Failed to set preference:', err);
  }
}

// ── 4. Foreground message listener ──────────────────────────────────────────
//
// Call once at app startup. When a push arrives while the app is in the
// foreground, Firebase suppresses the system notification and fires onMessage
// instead. We surface it via the toast system.

let foregroundListenerActive = false;

export async function startForegroundListener(toastCallback) {
  if (foregroundListenerActive) return;
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || payload.data || {};
      if (title && toastCallback) {
        toastCallback({ message: `${title}: ${body || ''}`, icon: '🔔', duration: 5000 });
      }
    });

    foregroundListenerActive = true;
  } catch (err) {
    console.error('[notifications] Foreground listener failed:', err);
  }
}

// ── 5. Send push notification ───────────────────────────────────────────────
//
// Shows a browser notification when possible (foreground).
// Server-side FCM dispatch happens via the webhook / Vercel API route.

export async function sendPushNotification(userId, title, body) {
  // Show a browser notification if permission is granted and we're in foreground
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      });
    } catch {
      // Service worker required in some browsers — fallback silently
    }
  }
}

// ── 6. Get all FCM tokens for a user (for server-side dispatch) ─────────────

export async function getUserFCMTokens(farmId, userId) {
  if (!farmId || !userId) return [];
  try {
    const col = collection(getDb(), 'farms', farmId, 'customers', userId, 'fcmTokens');
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data().token).filter(Boolean);
  } catch (err) {
    console.error('[notifications] Failed to get FCM tokens:', err);
    return [];
  }
}
