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
// import PWAInstallPrompt from './components/PWAInstallPrompt'; // PWA disabled
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

  // Auth error — show message instead of white screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sign-in Error</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-3 rounded-xl"
          >
            Try Again
          </button>
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

  // Authenticated but no farm yet — show farm signup
  if (needsSetup) {
    return <FarmSignup user={user} onFarmCreated={setFarmCreated} onLogout={logout} />;
  }

  // Farm exists but onboarding not complete — show wizard
  if (!onboardingComplete) {
    return <OnboardingWizard user={user} farmId={farmId} onComplete={markOnboardingDone} />;
  }

  // Safety net: if we got here but farmId is null, treat as needsSetup
  if (!farmId) {
    return <FarmSignup user={user} onFarmCreated={setFarmCreated} onLogout={logout} />;
  }

  // Fully set up — render the app
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