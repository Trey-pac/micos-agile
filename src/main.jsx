import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Register service worker with immediate activation and auto-reload on update
registerSW({
  immediate: true,
  onNeedRefresh() {
    // New content available — reload to pick up the latest build
    window.location.reload();
  },
  onOfflineReady() {
    console.log('[SW] App is ready for offline use');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
