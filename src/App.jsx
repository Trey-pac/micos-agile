import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FarmConfigProvider } from './contexts/FarmConfigContext';
import { DemoModeProvider } from './contexts/DemoModeContext';
import LandingPage from './components/LandingPage';
import FarmSignup from './components/FarmSignup';
import OnboardingWizard from './components/OnboardingWizard';
import AppRoutes from './components/AppRoutes';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { createDemoFarm } from './services/demoService';

export default function App() {
  const {
    user, farmId, role, loading, error,
    needsSetup, onboardingComplete,
    login, logout, setFarmCreated, markOnboardingDone,
    updateOwnRole,
  } = useAuth();

  // Emergency admin escape hatch: Ctrl+Shift+A
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (user && role !== 'admin') {
          if (window.confirm('Promote yourself to admin? (Emergency escape hatch)')) {
            updateOwnRole('admin');
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [user, role, updateOwnRole]);

  // Demo mode state — lets visitors explore without signing in
  const [demoFarmId, setDemoFarmId] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleTryDemo = async () => {
    setDemoLoading(true);
    try {
      const id = await createDemoFarm();
      setDemoFarmId(id);
    } catch (err) {
      console.error('Failed to create demo farm:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  const exitDemo = () => setDemoFarmId(null);

  // Full-screen loading spinner while auth state resolves
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  // Demo mode — render full app with demo farmId and a synthetic user
  if (demoFarmId) {
    const demoUser = { uid: 'demo', email: 'demo@farmworkspace.app', displayName: 'Demo User' };
    return (
      <ThemeProvider userId="demo" farmId={demoFarmId}>
        <FarmConfigProvider farmId={demoFarmId}>
          <ToastProvider>
            <DemoModeProvider>
              <BrowserRouter>
                <AppRoutes
                  user={demoUser}
                  farmId={demoFarmId}
                  role="admin"
                  onLogout={exitDemo}
                  isDemo
                />
              </BrowserRouter>
            </DemoModeProvider>
          </ToastProvider>
        </FarmConfigProvider>
      </ThemeProvider>
    );
  }

  // Not authenticated — show landing page (marketing) with sign-in CTA
  if (!user) {
    return <LandingPage onGetStarted={login} onTryDemo={handleTryDemo} demoLoading={demoLoading} />;
  }

  // Auth error — show it instead of white-screening
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h1>
          <p className="text-sm text-red-600 mb-4 font-mono bg-red-50 p-3 rounded-lg break-words">{error}</p>
          <div className="text-xs text-gray-500 mb-4 text-left bg-gray-50 p-3 rounded-lg">
            <div>user: {user?.email || 'none'}</div>
            <div>farmId: {farmId || 'null'}</div>
            <div>role: {role || 'null'}</div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-3 rounded-xl">Reload</button>
            <button onClick={logout} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-6 py-3 rounded-xl">Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but missing farmId — treat as needs setup
  if (!farmId) {
    return <FarmSignup user={user} onFarmCreated={setFarmCreated} onLogout={logout} />;
  }

  // Authenticated but no farm yet — show farm signup
  if (needsSetup) {
    return <FarmSignup user={user} onFarmCreated={setFarmCreated} onLogout={logout} />;
  }

  // Farm exists but onboarding not complete — show wizard
  if (!onboardingComplete) {
    return <OnboardingWizard user={user} farmId={farmId} onComplete={markOnboardingDone} />;
  }

  // ── TEMPORARY DEBUG MODE ──────────────────────────────────────────────────
  // Shows auth state on screen so we can see what's happening.
  // Remove this block once the white screen issue is resolved.
  const [debugBypass, setDebugBypass] = useState(false);

  if (!debugBypass) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', padding: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 8 }}>🔍 Debug Panel</h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Auth resolved successfully. Here's what the app sees:</p>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, fontSize: 13, fontFamily: 'monospace', lineHeight: 1.8, marginBottom: 16 }}>
            <div><strong>email:</strong> {user?.email || 'null'}</div>
            <div><strong>uid:</strong> {user?.uid || 'null'}</div>
            <div><strong>farmId:</strong> {farmId || 'null'}</div>
            <div><strong>role:</strong> {role || 'null'}</div>
            <div><strong>loading:</strong> {String(loading)}</div>
            <div><strong>error:</strong> {error || 'none'}</div>
            <div><strong>needsSetup:</strong> {String(needsSetup)}</div>
            <div><strong>onboardingComplete:</strong> {String(onboardingComplete)}</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setDebugBypass(true)}
              style={{ flex: 1, padding: '14px 20px', borderRadius: 12, background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}
            >
              Continue to App →
            </button>
            <button
              onClick={logout}
              style={{ padding: '14px 20px', borderRadius: 12, background: '#e5e7eb', color: '#374151', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fully set up — render the app
  return (
    <ThemeProvider userId={user?.uid} farmId={farmId}>
      <FarmConfigProvider farmId={farmId}>
        <ToastProvider>
          <DemoModeProvider>
            <PWAInstallPrompt />
            <BrowserRouter>
              <AppRoutes user={user} farmId={farmId} role={role} onLogout={logout} />
            </BrowserRouter>
          </DemoModeProvider>
        </ToastProvider>
      </FarmConfigProvider>
    </ThemeProvider>
  );
}