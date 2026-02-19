import { useState, useEffect, useRef } from 'react';
import {
  requestPermission,
  setNotificationPreference,
  getNotificationPreference,
  registerFCMToken,
} from '../../services/notificationService';

/**
 * NotificationPermissionModal — shown on first login when user hasn't
 * responded to the notification prompt yet. Clean, non-intrusive ask.
 */
export default function NotificationPermissionModal({ farmId, userId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Check if user already made a choice
  useEffect(() => {
    if (!farmId || !userId) { setChecking(false); return; }
    let cancelled = false;
    getNotificationPreference(farmId, userId)
      .then((pref) => {
        if (cancelled) return;
        if (pref !== null) {
          onCloseRef.current();
        }
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [farmId, userId]);

  if (checking) return null;

  const handleAllow = async () => {
    setLoading(true);
    try {
      const result = await requestPermission();
      const enabled = result === 'granted';
      await setNotificationPreference(farmId, userId, enabled);

      // Register FCM token if permission was granted
      if (enabled) {
        await registerFCMToken(farmId, userId);
      }
    } catch (err) {
      console.error('[notifications] Permission request error:', err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleNotNow = async () => {
    try {
      await setNotificationPreference(farmId, userId, false);
    } catch (err) {
      console.error('[notifications] Error saving preference:', err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleNotNow} />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Illustration area */}
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="w-16 h-16 mx-auto bg-green-500/15 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl">🔔</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-1.5">Stay in the loop</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Get instant alerts when tasks need your attention — roadblocks, urgent requests, and more.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2.5">
          <button
            onClick={handleAllow}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-500 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {loading ? 'Setting up…' : 'Allow Notifications'}
          </button>
          <button
            onClick={handleNotNow}
            className="w-full py-2.5 text-gray-500 text-sm font-medium hover:text-gray-300 cursor-pointer transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
