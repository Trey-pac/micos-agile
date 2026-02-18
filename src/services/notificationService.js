/**
 * notificationService.js — FCM foundation
 *
 * Provides permission request, token persistence, and push notification dispatch.
 * Currently logs to console when FCM server key isn't configured.
 * The INTERFACE is ready so the Roadblock system (and future features) can call it.
 */
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

// ── 2. Save FCM token to user's Firestore doc ──────────────────────────────

export async function saveFCMToken(farmId, userId, token) {
  if (!farmId || !userId || !token) return;
  try {
    const ref = doc(db, 'farms', farmId, 'users', userId);
    await setDoc(ref, { fcmToken: token, updatedAt: new Date().toISOString() }, { merge: true });
    console.log('[notifications] FCM token saved for user', userId);
  } catch (err) {
    console.error('[notifications] Failed to save FCM token:', err);
  }
}

// ── 3. Get user notification preferences ────────────────────────────────────

export async function getNotificationPreference(farmId, userId) {
  if (!farmId || !userId) return null;
  try {
    const ref = doc(db, 'farms', farmId, 'users', userId);
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
    const ref = doc(db, 'farms', farmId, 'users', userId);
    await setDoc(ref, { notificationsEnabled: enabled, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('[notifications] Failed to set preference:', err);
  }
}

// ── 4. Send push notification ───────────────────────────────────────────────
//
// For now: logs to console. When FCM server key is configured, this will
// call a Cloud Function or direct FCM API to deliver the notification.
//
// The interface is stable — callers don't need to change when real push is added.

export async function sendPushNotification(userId, title, body) {
  console.log(`[notifications] 📬 Push to ${userId}:`, { title, body });

  // Also show a browser notification if permission is granted and we're in foreground
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

  // TODO: When FCM server key is configured:
  // 1. Look up user's FCM token from Firestore
  // 2. Call Cloud Function endpoint: POST /api/notify { token, title, body }
  // 3. Handle token refresh / expiry
}
