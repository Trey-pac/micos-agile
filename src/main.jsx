import React from 'react';
import ReactDOM from 'react-dom/client';

// ── STEP 1: Can React render ANYTHING? ──
// If you see this green box, React works. The problem is in App/imports.
// If you still see white, the problem is in the build/deploy pipeline.
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement('div', {
    style: {
      minHeight: '100vh',
      background: '#dcfce7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui',
    }
  },
    React.createElement('div', {
      style: {
        background: 'white',
        borderRadius: 16,
        padding: 32,
        maxWidth: 400,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }
    },
      React.createElement('h1', { style: { fontSize: 28, margin: '0 0 8px' } }, '✅ React Works!'),
      React.createElement('p', { style: { color: '#666', fontSize: 14 } }, 'If you see this, the build deployed correctly.'),
      React.createElement('p', { style: { color: '#666', fontSize: 14, marginTop: 8 } }, 'The crash is somewhere in the app imports.'),
      React.createElement('p', { style: { color: '#999', fontSize: 12, marginTop: 16 } }, 'Commit: bare-minimum-test'),
    )
  )
);
