/**
 * useDemoOverlay.js — Demo mode data overlay.
 *
 * When demo mode is active, replaces real Firestore data with local demo data.
 * When inactive, passes real data through unchanged.
 * Also provides dg() (demo guard), dl() (demo loading), de() (demo error),
 * and demo-aware mutation callbacks for interactive UI elements.
 */
import { useCallback } from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';

export function useDemoOverlay(realData) {
  const { isDemoMode, demoData, updateDemoData } = useDemoMode();
  const dm = isDemoMode && demoData ? demoData : {};

  // Shared no-op for stable references in demo mode
  const demoNoopAsync = useCallback(async () => {}, []);

  // Demo guard: wraps a function to become a no-op in demo mode
  const dg = useCallback((fn) => isDemoMode ? demoNoopAsync : fn, [isDemoMode, demoNoopAsync]);

  // Demo loading helper: returns false in demo mode, real value otherwise
  const dl = useCallback((realLoading) => isDemoMode ? false : realLoading, [isDemoMode]);

  // Demo error helper: returns null in demo mode, real value otherwise
  const de = useCallback((realError) => isDemoMode ? null : realError, [isDemoMode]);

  // Demo-aware order status change (updates local demo state for drag-and-drop)
  const demoAdvanceOrderStatus = useCallback(async (orderId, newStatus) => {
    updateDemoData('orders', prev =>
      (prev || []).map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    );
    updateDemoData('shopifyOrders', prev =>
      (prev || []).map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    );
  }, [updateDemoData]);

  // Demo-aware task status change for Kanban drag
  const demoMoveTaskStatus = useCallback((taskId, newStatus) => {
    updateDemoData('tasks', prev =>
      (prev || []).map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );
  }, [updateDemoData]);

  return {
    isDemoMode, dg, dl, de,
    demoAdvanceOrderStatus, demoMoveTaskStatus,

    // Demo-aware data aliases (replaces eff* pattern from old AppRoutes)
    tasks:              isDemoMode ? (dm.tasks              || [])  : realData.tasks,
    sprints:            isDemoMode ? (dm.sprints            || [])  : realData.sprints,
    batches:            isDemoMode ? (dm.batches            || [])  : realData.batches,
    activeBatches:      isDemoMode ? (dm.activeBatches      || [])  : realData.activeBatches,
    readyBatches:       isDemoMode ? (dm.readyBatches       || [])  : realData.readyBatches,
    products:           isDemoMode ? (dm.products           || [])  : realData.products,
    availableProducts:  isDemoMode ? (dm.availableProducts  || [])  : realData.availableProducts,
    orders:             isDemoMode ? (dm.orders             || [])  : realData.orders,
    customers:          isDemoMode ? (dm.customers          || [])  : realData.customers,
    expenses:           isDemoMode ? (dm.expenses           || [])  : realData.expenses,
    revenue:            isDemoMode ? (dm.revenue            || [])  : realData.revenue,
    infrastructure:     isDemoMode ? (dm.infrastructure     || [])  : realData.infrastructure,
    inventory:          isDemoMode ? (dm.inventory          || [])  : realData.inventory,
    activities:         isDemoMode ? (dm.activities         || [])  : realData.activities,
    deliveries:         isDemoMode ? (dm.deliveries         || [])  : realData.deliveries,
    todayDeliveries:    isDemoMode ? (dm.todayDeliveries    || [])  : realData.todayDeliveries,
    shopifyCustomers:   isDemoMode ? (dm.shopifyCustomers   || [])  : realData.shopifyCustomers,
    shopifyOrders:      isDemoMode ? (dm.shopifyOrders      || [])  : realData.shopifyOrders,
    cropProfiles:       isDemoMode ? (dm.cropProfiles       || [])  : realData.cropProfiles,
    activeCropProfiles: isDemoMode ? (dm.activeCropProfiles || [])  : realData.activeCropProfiles,
    costs:              isDemoMode ? (dm.costs              || [])  : realData.costs,
    biReports:          isDemoMode ? (dm.biReports          || [])  : realData.biReports,
    vendors:            isDemoMode ? (dm.vendors            || [])  : realData.vendors,
    selectedSprintId:   isDemoMode ? (dm.selectedSprintId   || null) : realData.selectedSprintId,
  };
}
