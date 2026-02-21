import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// ── NUKE any stale service workers left from previous deploys ────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}
if ('caches' in window) {
  caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
}

// ── Global error safety net — catch async errors that bypass ErrorBoundary ───
window.addEventListener('unhandledrejection', (e) => {
  console.error('[GlobalErrorHandler] Unhandled promise rejection:', e.reason);
  // Don't crash the app — just log it
  e.preventDefault();
});
window.addEventListener('error', (e) => {
  console.error('[GlobalErrorHandler] Uncaught error:', e.error || e.message);
});

// ── React 19 error callbacks + ErrorBoundary ─────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'), {
  // React 19: called when an error is caught by an ErrorBoundary
  onCaughtError(error, errorInfo) {
    console.error('[React] Caught by ErrorBoundary:', error, errorInfo);
  },
  // React 19: called when a render error is NOT caught by any ErrorBoundary
  onUncaughtError(error, errorInfo) {
    console.error('[React] Uncaught render error:', error, errorInfo);
    // Show a visible fallback so the user doesn't see a white screen
    const el = document.getElementById('root');
    if (el) {
      el.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;font-family:system-ui;background:#111827">
          <div style="max-width:28rem;text-align:center;background:#1f2937;border-radius:1rem;padding:2rem;box-shadow:0 4px 20px rgba(0,0,0,.3);">
            <div style="font-size:3rem;margin-bottom:1rem">💥</div>
            <h1 style="font-size:1.25rem;font-weight:700;color:#fff;margin-bottom:.5rem">Something went wrong</h1>
            <p style="font-size:.875rem;color:#9ca3af;margin-bottom:1rem">${error?.message || 'Unknown error'}</p>
            <button onclick="sessionStorage.clear();location.reload()" style="background:#0ea5e9;color:#fff;font-weight:700;padding:.75rem 1.5rem;border-radius:.75rem;border:none;cursor:pointer">
              Reload
            </button>
          </div>
        </div>`;
    }
  },
  // React 19: called when React recovers from errors (suspense, transitions)
  onRecoverableError(error) {
    console.warn('[React] Recoverable error:', error);
  },
});

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
