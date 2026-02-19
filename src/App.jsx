import { BrowserRouter } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FarmConfigProvider } from './contexts/FarmConfigContext';
import LoginScreen from './components/LoginScreen';
import FarmSignup from './components/FarmSignup';
import OnboardingWizard from './components/OnboardingWizard';
import AppRoutes from './components/AppRoutes';
import PWAInstallPrompt from './components/PWAInstallPrompt';

export default function App() {
  const {
    user, farmId, role, loading, error,
    needsSetup, onboardingComplete,
    login, logout, setFarmCreated, markOnboardingDone,
  } = useAuth();

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

  // Not authenticated — show login screen
  if (!user) {
    return <LoginScreen onLogin={login} error={error} />;
  }

  // Authenticated but no farm yet — show farm signup
  if (needsSetup) {
    return <FarmSignup user={user} onFarmCreated={setFarmCreated} onLogout={logout} />;
  }

  // Farm exists but onboarding not complete — show wizard
  if (!onboardingComplete) {
    return <OnboardingWizard user={user} farmId={farmId} onComplete={markOnboardingDone} />;
  }

  // Fully set up — render the app
  return (
    <ThemeProvider userId={user?.uid} farmId={farmId}>
      <FarmConfigProvider farmId={farmId}>
        <ToastProvider>
          <PWAInstallPrompt />
          <BrowserRouter>
            <AppRoutes user={user} farmId={farmId} role={role} onLogout={logout} />
          </BrowserRouter>
        </ToastProvider>
      </FarmConfigProvider>
    </ThemeProvider>
  );
}