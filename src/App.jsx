import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FarmConfigProvider } from './contexts/FarmConfigContext';
import { DemoModeProvider } from './contexts/DemoModeContext';
import LandingPage from './components/LandingPage';
import AppRoutes from './components/AppRoutes';
// import PWAInstallPrompt from './components/PWAInstallPrompt'; // PWA disabled
import { createDemoFarm } from './services/demoService';

export default function App() {
  const {
    user, farmId, role, approved, loading, error,
    login, logout,
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

  // Auth error — show message instead of white screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sign-in Error</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{error}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Signed in as: {user?.email || 'unknown'} · UID: {user?.uid?.slice(0, 8) || '–'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-3 rounded-xl cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={logout}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold px-6 py-3 rounded-xl cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  // ── ACCESS DENIED — user signed in but not in approved list ────────────
  if (!approved) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Access Denied</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
            You don't have permission to access the Mico's Workspace.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Contact your farm administrator to request access.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            Signed in as: {user.email}
          </p>
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Fully set up — render the app (farmId always resolved by useAuth)
  return (
    <ThemeProvider userId={user?.uid} farmId={farmId}>
      <FarmConfigProvider farmId={farmId}>
        <ToastProvider>
          <DemoModeProvider>
            {/* <PWAInstallPrompt /> */}
            <BrowserRouter>
              <AppRoutes user={user} farmId={farmId} role={role} onLogout={logout} />
            </BrowserRouter>
          </DemoModeProvider>
        </ToastProvider>
      </FarmConfigProvider>
    </ThemeProvider>
  );
}