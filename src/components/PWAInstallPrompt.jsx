import { useState, useEffect } from 'react';

/**
 * PWAInstallPrompt — subtle banner shown when the browser fires `beforeinstallprompt`.
 * Install or dismiss. Dismissal stored in localStorage so it won't nag.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === 'true'
  );
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Hide if already installed
  useEffect(() => {
    const handler = () => setDeferredPrompt(null);
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setInstalling(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-gray-900/95 backdrop-blur-sm border-b border-green-500/30 px-4 py-3 flex items-center justify-between gap-3 animate-slide-down">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl shrink-0">📱</span>
        <p className="text-sm text-white/90 leading-snug truncate">
          Install <span className="font-semibold text-green-400">Mico's Workspace</span> for the best experience
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          disabled={installing}
          className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-500 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {installing ? '...' : 'Install'}
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-gray-400 text-sm hover:text-white cursor-pointer transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
