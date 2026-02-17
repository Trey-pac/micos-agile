import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import PlanningBoard from './components/PlanningBoard';
import CalendarView from './components/CalendarView';
import VendorsView from './components/VendorsView';
import InventoryManager from './components/InventoryManager';
import BudgetTracker from './components/BudgetTracker';
import ProductionTracker from './components/ProductionTracker';

export default function App() {
  const { user, farmId, loading, error, login, logout } = useAuth();

  // Full-screen loading spinner while auth state resolves
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login screen
  if (!user) {
    return <LoginScreen onLogin={login} error={error} />;
  }

  // Authenticated — render the app with router
  // snarkyContext is passed to Layout so the comment generator can be
  // context-aware. It will be enriched with sprint/filter state once
  // the kanban and planning pages are fully ported in Phase 5.
  const snarkyContext = {
    viewFilter: 'all',
    sprint: null,
    backlogCount: 0,
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <Layout
              user={user}
              onLogout={logout}
              snarkyContext={snarkyContext}
            />
          }
        >
          <Route index element={<Navigate to="/kanban" replace />} />
          <Route path="kanban" element={<KanbanBoard />} />
          <Route path="planning" element={<PlanningBoard />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="vendors" element={<VendorsView />} />
          <Route path="inventory" element={<InventoryManager />} />
          <Route path="budget" element={<BudgetTracker />} />
          <Route path="production" element={<ProductionTracker />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/kanban" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
