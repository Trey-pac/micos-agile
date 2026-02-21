import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// ── NUKE stale service workers on EVERY page load ────────────────────────────
// A cached broken build was causing persistent white screens.
// This unregisters ALL existing SWs, then re-registers fresh.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
  // Also clear all caches
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) caches.delete(name);
    });
  }
}

// Register service worker AFTER clearing stale ones
registerSW({
  immediate: true,
  onNeedRefresh() {
    // New content available — reload once (guard against infinite loop)
    if (!sessionStorage.getItem('sw-reloaded')) {
      sessionStorage.setItem('sw-reloaded', '1');
      window.location.reload();
    }
  },
  onOfflineReady() {
    // ready
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
