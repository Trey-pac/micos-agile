import { BrowserRouter } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginScreen from './components/LoginScreen';
import AppRoutes from './components/AppRoutes';
import PWAInstallPrompt from './components/PWAInstallPrompt';

export default function App() {
  const { user, farmId, role, loading, error, login, logout } = useAuth();

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

  // Authenticated — render router with all hooks + routes
  return (
    <ThemeProvider userId={user?.uid} farmId={farmId}>
      <ToastProvider>
        <PWAInstallPrompt />
        <BrowserRouter>
          <AppRoutes user={user} farmId={farmId} role={role} onLogout={logout} />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}