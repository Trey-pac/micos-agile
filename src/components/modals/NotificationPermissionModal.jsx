import { useState, useEffect, useRef } from 'react';
import {
  requestPermission,
  setNotificationPreference,
  getNotificationPreference,
  registerFCMToken,
} from '../../services/notificationService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Bell } from 'lucide-react';

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
    <Dialog open={true} onOpenChange={(open) => { if (!open) handleNotNow(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center sm:text-center">
          <div className="w-16 h-16 mx-auto bg-primary/15 rounded-2xl flex items-center justify-center mb-2">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Stay in the loop</DialogTitle>
          <DialogDescription className="text-center">
            Get instant alerts when tasks need your attention — roadblocks, urgent requests, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 pt-2">
          <Button
            className="w-full"
            onClick={handleAllow}
            disabled={loading}
          >
            {loading ? 'Setting up…' : 'Allow Notifications'}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleNotNow}
          >
            Not Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
