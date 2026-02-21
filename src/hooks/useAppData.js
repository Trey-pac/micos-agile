/**
 * useAppData.js — Central data hook that wires ALL Firestore subscriptions.
 *
 * Called once in AppRoutes. Returns unified data, mutations, loading, and
 * error states. Also manages side effects: vendor subscription, naming
 * overrides, connection test, foreground push listener, order watcher.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../firebase';
import { subscribeVendors } from '../services/vendorService';
import { getNamingOverrides, setEpicName, setFeatureName } from '../services/namingService';
import { startForegroundListener } from '../services/notificationService';
import { startOrderWatcher } from '../services/orderWatcherService';
import { useTasks } from './useTasks';
import { useSprints } from './useSprints';
import { useBatches } from './useBatches';
import { useProducts } from './useProducts';
import { useOrders } from './useOrders';
import { useCustomers } from './useCustomers';
import { useBudget } from './useBudget';
import { useInventory } from './useInventory';
import { useActivities } from './useActivities';
import { useDeliveries } from './useDeliveries';
import { useTeam } from './useTeam';
import { useShopifyCustomers } from './useShopifyCustomers';
import { useShopifyOrders } from './useShopifyOrders';
import { useCropProfiles } from './useCropProfiles';
import { useCosts } from './useCosts';
import { useReports } from './useReports';
import { useRefreshOnFocus } from './useRefreshOnFocus';
import { teamMembers as hardcodedTeamMembers } from '../data/constants';
import { useToast } from '../contexts/ToastContext';

export function useAppData(farmId, user, role, isDemoMode) {
  // ── Firestore subscriptions ────────────────────────────────────────────────
  const {
    tasks, loading: tasksLoading, error: tasksError,
    addTask, editTask, removeTask,
    moveTaskStatus, moveTaskSprint,
    reorderColumnTasks, moveTaskToColumn, moveTaskToSprint,
  } = useTasks(farmId);

  const {
    sprints, selectedSprintId, setSelectedSprintId,
    loading: sprintsLoading, error: sprintsError, addSprint,
  } = useSprints(farmId);

  const {
    batches, activeBatches, readyBatches,
    loading: batchesLoading, error: batchesError,
    addBatch, editBatch, advanceStage, harvestBatch,
    plantCrewBatch, advanceCrewStage, harvestCrewBatch,
  } = useBatches(farmId);

  const {
    products, availableProducts,
    loading: productsLoading, error: productsError,
    addProduct, editProduct, removeProduct,
  } = useProducts(farmId);

  const {
    orders, loading: ordersLoading, error: ordersError,
    addOrder, advanceOrderStatus, updateOrder,
  } = useOrders(farmId, role === 'chef' ? user?.uid : null);

  const {
    customers, loading: customersLoading, error: customersError,
    addCustomer, editCustomer, removeCustomer,
  } = useCustomers(farmId);

  const {
    expenses, revenue, infrastructure,
    loading: budgetLoading, error: budgetError,
    addExpense, addRevenue,
    addProject, editProject, removeProject,
  } = useBudget(farmId);

  const {
    inventory, loading: inventoryLoading, error: inventoryError,
    addItem, editItem, removeItem,
  } = useInventory(farmId);

  const {
    activities, loading: activitiesLoading, error: activitiesError,
    addActivity, deleteActivity,
  } = useActivities(farmId);

  const {
    deliveries, todayDeliveries,
    loading: deliveriesLoading, error: deliveriesError,
  } = useDeliveries(farmId);

  const {
    members: teamMembers_live, invites: teamInvites,
    loading: teamLoading, error: teamError,
  } = useTeam(farmId);

  const {
    customers: shopifyCustomers, loading: shopifyCustomersLoading,
  } = useShopifyCustomers(farmId);

  const {
    orders: shopifyOrders, loading: shopifyOrdersLoading,
  } = useShopifyOrders(farmId);

  const {
    profiles: cropProfiles, activeProfiles: activeCropProfiles,
    loading: cropProfilesLoading, error: cropProfilesError,
    addProfile: addCropProfile, editProfile: editCropProfile,
    removeProfile: removeCropProfile,
  } = useCropProfiles(farmId);

  const {
    costs, loading: costsLoading, error: costsError,
    addCost, editCost: editCostFn, removeCost,
  } = useCosts(farmId);

  const {
    reports: biReports, loading: biReportsLoading, saveReport,
  } = useReports(farmId);

  const refresh = useRefreshOnFocus();
  const { addToast } = useToast();

  // ── Merge live team members with hardcoded fallback ────────────────────────
  const allTeamMembers = useMemo(() => {
    const COLORS = ['forest', 'ocean', 'coral', 'plant-green', 'violet', 'amber', 'rose', 'teal'];
    if (!teamMembers_live || teamMembers_live.length === 0) return hardcodedTeamMembers;
    const merged = teamMembers_live.map((m, i) => {
      const hc = hardcodedTeamMembers.find(h => h.id === m.id);
      return {
        id: m.id,
        name: hc?.name || m.displayName || m.email?.split('@')[0] || m.id,
        color: hc?.color || COLORS[i % COLORS.length],
      };
    });
    hardcodedTeamMembers.forEach(h => {
      if (!merged.find(m => m.id === h.id)) merged.push(h);
    });
    return merged;
  }, [teamMembers_live]);

  // ── Vendors (manual subscription — not a custom hook) ──────────────────────
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  useEffect(() => {
    if (!farmId) return;
    setVendorsLoading(true);
    return subscribeVendors(
      farmId,
      (v) => { setVendors(v); setVendorsLoading(false); },
      (err) => { console.error('Vendor subscription error:', err); setVendorsLoading(false); }
    );
  }, [farmId]);

  // ── Naming overrides ──────────────────────────────────────────────────────
  const [namingOverrides, setNamingOverrides] = useState({ epics: {}, features: {} });

  useEffect(() => {
    if (!farmId) return;
    getNamingOverrides(farmId).then(setNamingOverrides);
  }, [farmId]);

  const handleRenameEpic = useCallback(async (epicId, name) => {
    if (!farmId) return;
    await setEpicName(farmId, epicId, name);
    setNamingOverrides(prev => ({ ...prev, epics: { ...prev.epics, [epicId]: name } }));
  }, [farmId]);

  const handleRenameFeature = useCallback(async (featureId, name) => {
    if (!farmId) return;
    await setFeatureName(farmId, featureId, name);
    setNamingOverrides(prev => ({ ...prev, features: { ...prev.features, [featureId]: name } }));
  }, [farmId]);

  // ── Firestore connection test ──────────────────────────────────────────────
  const [connStatus, setConnStatus] = useState('testing');

  useEffect(() => {
    if (!farmId || isDemoMode) return;
    (async () => {
      try {
        const farmRef = doc(getDb(), 'farms', farmId);
        const snap = await getDoc(farmRef);
        if (snap.exists()) {
          setConnStatus('ok');
        } else {
          console.warn('[ConnTest] ⚠️ Farm doc NOT FOUND:', farmId);
          setConnStatus('no-farm-doc');
        }
      } catch (err) {
        console.error('[ConnTest] ❌ Failed to read farm doc:', err.code, err.message);
        setConnStatus('error: ' + (err.code || err.message));
      }
    })();
  }, [farmId, isDemoMode]);

  // ── Push notifications foreground listener ─────────────────────────────────
  useEffect(() => {
    startForegroundListener(addToast);
  }, [addToast]);

  // ── Order watcher — auto-generates harvest plans ───────────────────────────
  useEffect(() => {
    if (!farmId || role === 'chef') return;
    return startOrderWatcher(farmId);
  }, [farmId, role]);

  // ── Data diagnostics for DevToolbar ────────────────────────────────────────
  const dataDiag = useMemo(() => [
    { label: 'Conn', count: connStatus === 'ok' ? 1 : 0, error: connStatus.startsWith('error') ? connStatus : null, loading: connStatus === 'testing' },
    { label: 'Tasks', count: tasks.length, error: tasksError, loading: tasksLoading },
    { label: 'Sprints', count: sprints.length, error: sprintsError, loading: sprintsLoading },
    { label: 'Orders', count: orders.length, error: ordersError, loading: ordersLoading },
    { label: 'ShopOrders', count: shopifyOrders.length, error: null, loading: shopifyOrdersLoading },
    { label: 'ShopCusts', count: shopifyCustomers.length, error: null, loading: shopifyCustomersLoading },
    { label: 'Products', count: products.length, error: productsError, loading: productsLoading },
    { label: 'Customers', count: customers.length, error: customersError, loading: customersLoading },
    { label: 'Batches', count: batches.length, error: batchesError, loading: batchesLoading },
    { label: 'Inventory', count: inventory.length, error: inventoryError, loading: inventoryLoading },
    { label: 'Vendors', count: vendors.length, error: null, loading: vendorsLoading },
    { label: 'Activities', count: activities.length, error: activitiesError, loading: activitiesLoading },
    { label: 'Deliveries', count: deliveries.length, error: deliveriesError, loading: deliveriesLoading },
    { label: 'Team', count: teamMembers_live.length, error: teamError, loading: teamLoading },
  ], [connStatus, tasks, tasksError, tasksLoading, sprints, sprintsError, sprintsLoading,
      orders, ordersError, ordersLoading, shopifyOrders, shopifyOrdersLoading,
      shopifyCustomers, shopifyCustomersLoading, products, productsError, productsLoading,
      customers, customersError, customersLoading, batches, batchesError, batchesLoading,
      inventory, inventoryError, inventoryLoading, vendors, vendorsLoading,
      activities, activitiesError, activitiesLoading, deliveries, deliveriesError,
      deliveriesLoading, teamMembers_live, teamError, teamLoading]);

  // ── Return unified data object ─────────────────────────────────────────────
  return {
    // Data
    tasks, sprints, batches, activeBatches, readyBatches,
    products, availableProducts, orders, customers,
    expenses, revenue, infrastructure, inventory,
    activities, deliveries, todayDeliveries,
    shopifyCustomers, shopifyOrders,
    cropProfiles, activeCropProfiles,
    costs, biReports, vendors,
    selectedSprintId, allTeamMembers,
    teamMembers_live, teamInvites,
    namingOverrides, connStatus, refresh, dataDiag,
    // Loading
    tasksLoading, sprintsLoading, batchesLoading, productsLoading,
    ordersLoading, customersLoading, budgetLoading, inventoryLoading,
    activitiesLoading, deliveriesLoading, teamLoading,
    shopifyCustomersLoading, shopifyOrdersLoading,
    cropProfilesLoading, costsLoading, biReportsLoading, vendorsLoading,
    // Errors
    tasksError, sprintsError, batchesError, productsError,
    ordersError, customersError, budgetError, inventoryError,
    activitiesError, deliveriesError, teamError,
    cropProfilesError, costsError,
    // Mutations
    addTask, editTask, removeTask,
    moveTaskStatus, moveTaskSprint,
    reorderColumnTasks, moveTaskToColumn, moveTaskToSprint,
    setSelectedSprintId, addSprint,
    addBatch, editBatch, advanceStage, harvestBatch,
    plantCrewBatch, advanceCrewStage, harvestCrewBatch,
    addProduct, editProduct, removeProduct,
    addOrder, advanceOrderStatus, updateOrder,
    addCustomer, editCustomer, removeCustomer,
    addExpense, addRevenue,
    addProject, editProject, removeProject,
    addItem, editItem, removeItem,
    addActivity, deleteActivity,
    addCropProfile, editCropProfile, removeCropProfile,
    addCost, editCostFn, removeCost,
    saveReport,
    handleRenameEpic, handleRenameFeature,
  };
}
