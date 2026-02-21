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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
