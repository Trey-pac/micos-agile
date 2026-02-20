import { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { subscribeVendors, addVendor as addVendorService } from '../services/vendorService';
import { getNamingOverrides, setEpicName, setFeatureName } from '../services/namingService';
import { useTasks } from '../hooks/useTasks';
import { useSprints } from '../hooks/useSprints';
import { teamMembers } from '../data/constants';
import { useBatches } from '../hooks/useBatches';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useBudget } from '../hooks/useBudget';
import { useInventory } from '../hooks/useInventory';
import { useActivities } from '../hooks/useActivities';
import { useDeliveries } from '../hooks/useDeliveries';
import { useToast } from '../contexts/ToastContext';
import Layout from './Layout';
import Dashboard from './Dashboard';
import KanbanBoard from './KanbanBoard';
import PlanningBoard from './PlanningBoard';
import CalendarView from './CalendarView';
import VendorsView from './VendorsView';
import InventoryAlerts from './InventoryAlerts';
import BudgetTracker from './BudgetTracker';
import GrowthTracker from './GrowthTracker';
import BatchLogger from './BatchLogger';
import HarvestLogger from './HarvestLogger';
import ProductManager from './ProductManager';
import CustomerManager from './CustomerManager';
import OrderManager from './OrderManager';
import SowingSchedule from './SowingSchedule';
import ActivityLog from './ActivityLog';
import CrewDailyBoard from './CrewDailyBoard';
import PipelineDashboard from './PipelineDashboard';
import FarmDashboard from './FarmDashboard';
import DeliveryTracker from './DeliveryTracker';
import EndOfDayReport from './EndOfDayReport';
import ChefCatalog from './ChefCatalog';
import ChefCart from './ChefCart';
import ChefOrders from './ChefOrders';
import TaskModal from './modals/TaskModal';
import VendorModal from './modals/VendorModal';
import SprintModal from './modals/SprintModal';
import CompletionModal from './modals/CompletionModal';
import DevRequestModal from './modals/DevRequestModal';
import NotificationPermissionModal from './modals/NotificationPermissionModal';
import RoadblockModal from './modals/RoadblockModal';
import DevToolbar from './DevToolbar';
import Alert from './ui/Alert';
import { sendPushNotification, startForegroundListener } from '../services/notificationService';
import { notifyOrderStatusChange } from '../services/notificationTriggers';
import { startOrderWatcher } from '../services/orderWatcherService';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import HarvestQueue from './HarvestQueue';
import PackingList from './PackingList';
import SettingsPage from './SettingsPage';
import AdminPanel from './AdminPanel';
import RoleGuard from './RoleGuard';
import ShopifySync from './admin/ShopifySync';
import CustomerSegments from './admin/CustomerSegments';
import ShopifyChefOrders from './orders/ShopifyChefOrders';
import { useTeam } from '../hooks/useTeam';
import { useShopifyCustomers } from '../hooks/useShopifyCustomers';
import { useShopifyOrders } from '../hooks/useShopifyOrders';

/**
 * All authenticated routes. Hooks are called once here and data flows
 * down as props — no hook calls inside child components.
 */
export default function AppRoutes({ user, farmId, role: actualRole, onLogout, isDemo }) {
  const [impersonatedRole, setImpersonatedRole] = useState(null);
  // effectiveRole drives ALL nav, guards, and views
  const role = (actualRole === 'admin' && impersonatedRole) ? impersonatedRole : actualRole;

  const {
    tasks, loading: tasksLoading, error: tasksError, addTask, editTask, removeTask,
    moveTaskStatus, moveTaskSprint,
    reorderColumnTasks, moveTaskToColumn, moveTaskToSprint,
  } = useTasks(farmId);
  const {
    sprints, selectedSprintId, setSelectedSprintId,
    loading: sprintsLoading, error: sprintsError, addSprint,
  } = useSprints(farmId);
  const {
    batches, activeBatches, readyBatches, loading: batchesLoading, error: batchesError,
    addBatch, editBatch, advanceStage, harvestBatch,
    plantCrewBatch, advanceCrewStage, harvestCrewBatch,
  } = useBatches(farmId);
  const {
    products, availableProducts, loading: productsLoading, error: productsError,
    addProduct, editProduct, removeProduct,
  } = useProducts(farmId);
  const {
    orders, loading: ordersLoading, error: ordersError, addOrder, advanceOrderStatus,
  } = useOrders(farmId, role === 'chef' ? user?.uid : null);
  const {
    customers, loading: customersLoading, error: customersError, addCustomer, editCustomer, removeCustomer,
  } = useCustomers(farmId);
  const {
    expenses, revenue, infrastructure, loading: budgetLoading, error: budgetError,
    addExpense, addRevenue,
    addProject, editProject, removeProject,
  } = useBudget(farmId);
  const {
    inventory, loading: inventoryLoading, error: inventoryError, addItem, editItem, removeItem,
  } = useInventory(farmId);
  const {
    activities, loading: activitiesLoading, error: activitiesError, addActivity, deleteActivity,
  } = useActivities(farmId);
  const {
    deliveries, todayDeliveries, loading: deliveriesLoading, error: deliveriesError,
  } = useDeliveries(farmId);
  const {
    members: teamMembers_live, invites: teamInvites, loading: teamLoading, error: teamError,
  } = useTeam(farmId);
  const {
    customers: shopifyCustomers, loading: shopifyCustomersLoading,
  } = useShopifyCustomers(farmId);
  const {
    orders: shopifyOrders, loading: shopifyOrdersLoading,
  } = useShopifyOrders(farmId);
  const refresh = useRefreshOnFocus();

  const navigate = useNavigate();
  const { addToast } = useToast();

  // Merge live Firestore team members with hardcoded fallback for consistent {id, name, color} shape
  const allTeamMembers = useMemo(() => {
    const COLORS = ['forest', 'ocean', 'coral', 'plant-green', 'violet', 'amber', 'rose', 'teal'];
    const hardcoded = teamMembers; // from constants.js
    if (!teamMembers_live || teamMembers_live.length === 0) return hardcoded;
    const merged = teamMembers_live.map((m, i) => {
      const hc = hardcoded.find(h => h.id === m.id);
      return {
        id: m.id,
        name: hc?.name || m.displayName || m.email?.split('@')[0] || m.id,
        color: hc?.color || COLORS[i % COLORS.length],
      };
    });
    // Add any hardcoded members not in live data (e.g. 'team')
    hardcoded.forEach(h => {
      if (!merged.find(m => m.id === h.id)) merged.push(h);
    });
    return merged;
  }, [teamMembers_live]);

  const [viewFilter, setViewFilter] = useState('all');
  const [namingOverrides, setNamingOverrides] = useState({ epics: {}, features: {} });
  const [taskModal, setTaskModal] = useState(null);
  const [planningTargetSprint, setPlanningTargetSprint] = useState(null);
  const [vendorModal, setVendorModal] = useState(false);
  const [sprintModal, setSprintModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [cart, setCart] = useState([]);
  // null | { task, pendingFn }
  const [completionModal, setCompletionModal] = useState(null);
  const [roadblockModal, setRoadblockModal] = useState(null);
  const [devRequestModal, setDevRequestModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Delay notification permission ask by 5 seconds after mount
  useEffect(() => {
    const timer = setTimeout(() => setShowNotificationModal(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Start foreground push listener — surfaces incoming FCM messages as toasts
  useEffect(() => {
    startForegroundListener(addToast);
  }, [addToast]);

  useEffect(() => {
    if (!farmId) return;
    setVendorsLoading(true);
    return subscribeVendors(
      farmId,
      (data) => { setVendors(data); setVendorsLoading(false); },
      (err) => { console.error('Vendor subscription error:', err); setVendorsLoading(false); }
    );
  }, [farmId]);

  useEffect(() => {
    if (!farmId) return;
    getNamingOverrides(farmId).then(setNamingOverrides);
  }, [farmId]);

  // ── Order watcher — auto-generates harvest plans ──
  useEffect(() => {
    if (!farmId || role === 'chef') return;
    return startOrderWatcher(farmId);
  }, [farmId, role]);

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

  // ── Completion interceptors: show modal before committing 'done' ──────────
  // ── Roadblock interceptors: show modal before committing 'roadblock' ───────

  const handleMoveTaskStatus = useCallback((taskId, newStatus) => {
    if (newStatus === 'done') {
      const task = tasks.find((t) => t.id === taskId);
      // Check if this is an unblock task completing — trigger auto-unblock
      if (task?.tags?.includes('unblock-request') && task?.linkedTaskId) {
        handleUnblockCleared(task);
      }
      setCompletionModal({ task, pendingFn: () => moveTaskStatus(taskId, newStatus) });
      return;
    }
    if (newStatus === 'roadblock') {
      const task = tasks.find((t) => t.id === taskId);
      setRoadblockModal({ task, pendingFn: () => moveTaskStatus(taskId, newStatus) });
      return;
    }
    moveTaskStatus(taskId, newStatus);
  }, [moveTaskStatus, tasks]);

  const handleMoveTaskToColumn = useCallback((taskId, newStatus, targetTasks) => {
    if (newStatus === 'done') {
      const task = tasks.find((t) => t.id === taskId);
      if (task?.tags?.includes('unblock-request') && task?.linkedTaskId) {
        handleUnblockCleared(task);
      }
      setCompletionModal({ task, pendingFn: () => moveTaskToColumn(taskId, newStatus, targetTasks) });
      return;
    }
    if (newStatus === 'roadblock') {
      const task = tasks.find((t) => t.id === taskId);
      setRoadblockModal({ task, pendingFn: () => moveTaskToColumn(taskId, newStatus, targetTasks) });
      return;
    }
    moveTaskToColumn(taskId, newStatus, targetTasks);
  }, [moveTaskToColumn, tasks]);

  const handleCompletionSave = useCallback(async (activityData) => {
    const { task, pendingFn } = completionModal;
    if (activityData?.note) {
      await addActivity({
        ...activityData,
        taskId:    task?.id    || null,
        taskTitle: task?.title || null,
        epicId:    task?.epicId    || null,
        featureId: task?.featureId || null,
        createdBy: user?.displayName || user?.email || null,
      });
    }
    await pendingFn();
    setCompletionModal(null);
  }, [completionModal, addActivity, user]);

  const handleCompletionSkip = useCallback(async () => {
    await completionModal.pendingFn();
    setCompletionModal(null);
  }, [completionModal]);

  // ── Roadblock handlers ────────────────────────────────────────────────────

  const handleRoadblockSubmit = useCallback(async ({ reason, unblockOwnerId, urgency }) => {
    const { task, pendingFn } = roadblockModal;
    const today = new Date().toISOString().split('T')[0];
    const unblockerName = (allTeamMembers.find(m => m.id === unblockOwnerId) || {}).name || unblockOwnerId;
    const urgencyLabel =
      urgency === 'immediate' ? '🔴 Immediate' :
      urgency === 'end-of-day' ? '🟡 By End of Day' : '🔵 By End of Sprint';

    // 1. Create the unblock task
    const unblockPriority = (urgency === 'immediate' || urgency === 'end-of-day') ? 'high' : 'medium';
    const unblockTaskData = {
      title: `🚧 UNBLOCK: ${task.title}`,
      status: 'not-started',
      owner: unblockOwnerId,
      priority: unblockPriority,
      sprintId: selectedSprintId || null,
      tags: ['unblock-request'],
      notes: [
        `Blocked by: ${(allTeamMembers.find(m => m.id === task.owner) || {}).name || task.owner || 'Unknown'}`,
        `Reason: ${reason}`,
        `Original task: ${task.title}`,
        `Urgency: ${urgencyLabel}`,
        `Linked task ID: ${task.id}`,
      ].join('\n'),
      linkedTaskId: task.id,
      size: 'S',
    };

    // Add unblock task and get its ID
    const unblockTaskId = await addTask(unblockTaskData);

    // 2. Update original task with roadblock info
    const timesBlocked = (task.roadblockInfo?.timesBlocked || 0) + 1;
    const noteSuffix = `\n\n🚧 ROADBLOCKED [${today}]: ${reason}. Assigned to ${unblockerName}. Urgency: ${urgencyLabel}.`;
    await editTask(task.id, {
      roadblockInfo: {
        reason,
        unblockOwnerId,
        urgency,
        unblockTaskId: unblockTaskId || null,
        roadblockedAt: today,
        roadblockedBy: user?.displayName || user?.email || null,
        timesBlocked,
      },
      notes: (task.notes || '') + noteSuffix,
    });

    // 3. Commit the status change
    await pendingFn();

    // 4. Urgency-based notifications and toasts
    if (urgency === 'immediate') {
      sendPushNotification(unblockOwnerId, `🔴 Urgent: ${task.title} needs you NOW`, reason);
      addToast({ message: `🔴 URGENT roadblock sent to ${unblockerName}`, icon: '🚧', duration: 0 }); // persistent
    } else if (urgency === 'end-of-day') {
      sendPushNotification(unblockOwnerId, `🟡 ${task.title} needs you today`, reason);
      addToast({ message: `Unblock request sent to ${unblockerName} ✓`, icon: '🚧' });
    } else {
      addToast({ message: `Unblock request sent to ${unblockerName} ✓`, icon: '🚧' });
    }

    setRoadblockModal(null);
  }, [roadblockModal, selectedSprintId, addTask, editTask, user, addToast]);

  const handleRoadblockSkip = useCallback(async () => {
    await roadblockModal.pendingFn();
    addToast({ message: 'Task marked as roadblocked', icon: '🚧' });
    setRoadblockModal(null);
  }, [roadblockModal, addToast]);

  // ── Unblock cleared: when unblock task moves to "done" ────────────────────

  const handleUnblockCleared = useCallback(async (unblockTask) => {
    if (!unblockTask?.linkedTaskId) return;
    const originalTask = tasks.find(t => t.id === unblockTask.linkedTaskId);
    if (!originalTask || originalTask.status !== 'roadblock') return;

    const today = new Date().toISOString().split('T')[0];
    const unblockerName = (allTeamMembers.find(m => m.id === unblockTask.owner) || {}).name || 'someone';

    await editTask(originalTask.id, {
      status: 'in-progress',
      notes: (originalTask.notes || '') + `\n✅ UNBLOCKED [${today}] by ${unblockerName}`,
    });

    addToast({ message: `${originalTask.title} is unblocked — back in progress`, icon: '✅' });
  }, [tasks, editTask, addToast]);

  // ── Task modal handlers ───────────────────────────────────────────────────

  const handleAddTask = (defaultStatus) => {
    setTaskModal({ mode: 'add', defaults: { status: defaultStatus || 'not-started' } });
  };

  // Accepts an object of defaults: { sprintId, epicId, featureId, status, ... }
  const handleAddTaskWithDefaults = (defaults = {}) => {
    setTaskModal({ mode: 'add', defaults: { status: 'not-started', ...defaults } });
  };

  const handleEditTask = (task) => {
    setTaskModal({ mode: 'edit', task });
  };

  const handleSaveTask = async (formData) => {
    if (taskModal?.mode === 'edit') {
      await editTask(taskModal.task.id, formData);
      addToast({ message: 'Task updated', icon: '✏️' });
    } else {
      const defaults = taskModal?.defaults || {};
      const sprintId = defaults.sprintId !== undefined ? defaults.sprintId : (selectedSprintId || null);
      await addTask({ ...formData, sprintId });
      addToast({ message: 'Task created', icon: '✅' });
    }
    setTaskModal(null);
  };

  const handleDeleteTask = async (taskId) => {
    await removeTask(taskId);
    addToast({ message: 'Task deleted', icon: '🗑️' });
    setTaskModal(null);
  };

  const handleCreateSprint = () => setSprintModal(true);

  const handleSaveSprint = async (formData) => {
    await addSprint(formData);
    addToast({ message: `Sprint ${formData.number || ''} created`.trim(), icon: '🚀' });
    setSprintModal(false);
  };

  const handleGoToSprint = (sprintId) => {
    setPlanningTargetSprint(sprintId);
    navigate('/planning');
  };

  const handleAddVendor = () => setVendorModal(true);

  const handleSaveVendor = async (formData) => {
    if (!farmId) return;
    try {
      await addVendorService(farmId, formData);
      addToast({ message: 'Vendor added', icon: '👥' });
    } catch (err) {
      console.error('Add vendor error:', err);
      addToast({ message: 'Failed to save vendor', icon: '⚠️', duration: 4000 });
    }
    setVendorModal(false);
  };

  const handleAddToCart = useCallback((product, qty) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        pricePerUnit: product.pricePerUnit,
        quantity: qty,
      }];
    });
  }, []);

  const handleUpdateCartQty = useCallback((productId, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const handlePlaceOrder = useCallback(async (deliveryDate, specialInstructions) => {
    const total = cart.reduce((sum, i) => sum + i.pricePerUnit * i.quantity, 0);
    await addOrder({
      customerId: user?.uid,
      customerName: user?.displayName || user?.email,
      customerEmail: user?.email,
      items: cart,
      total,
      requestedDeliveryDate: deliveryDate,
      specialInstructions,
    });
    setCart([]);
  }, [cart, addOrder, user]);

  const handleReorder = useCallback((order) => {
    setCart(order.items.map((i) => ({ ...i })));
    navigate('/cart');
  }, [navigate]);

  // Auto-create a revenue entry when an order reaches "delivered" + notify chef
  const handleAdvanceOrderStatus = useCallback(async (orderId, newStatus) => {
    await advanceOrderStatus(orderId, newStatus);

    // Fire push notification to the chef (fire-and-forget)
    const order = orders.find((o) => o.id === orderId);
    if (order && farmId) {
      notifyOrderStatusChange(farmId, order, newStatus);
    }

    if (newStatus === 'delivered' && order) {
      await addRevenue({
        orderId,
        customerId:    order.customerId,
        customerName:  order.customerName || order.customerEmail || '',
        amount:        order.total || 0,
        date:          new Date().toISOString().split('T')[0],
        items:         order.items || [],
      });
    }
  }, [advanceOrderStatus, orders, addRevenue, farmId]);

  // ── Dev Request handler ───────────────────────────────────────────────────
  const handleSubmitDevRequest = async ({ title, category, urgency, details }) => {
    const today = new Date().toISOString().split('T')[0];
    const priority =
      urgency === 'this-sprint' ? 'high' :
      urgency === 'next-sprint' ? 'medium' : 'low';

    let sprintId = null;
    if (urgency === 'this-sprint') {
      sprintId = selectedSprintId || null;
    } else if (urgency === 'next-sprint') {
      const sorted = [...sprints].sort((a, b) => (a.number || 0) - (b.number || 0));
      const curIdx = sorted.findIndex(s => s.id === selectedSprintId);
      const next   = curIdx >= 0 ? sorted[curIdx + 1] : null;
      sprintId = next?.id || null;
    }

    const noteLines = [
      `Category: ${category}`,
      `Requested by: ${user?.displayName || user?.email || 'Unknown'}`,
      `Date: ${today}`,
    ];
    if (details) noteLines.push('', details);

    await addTask({
      title,
      status:    'not-started',
      priority,
      owner:     'trey',
      sprintId,
      tags:      ['dev-request'],
      notes:     noteLines.join('\n'),
      size:      'S',
      epicId:    null,
      featureId: null,
    });

    addToast({ message: 'Request submitted ✓', icon: '🛠️' });
    setDevRequestModal(false);
  };

  const sprint = sprints.find(s => s.id === selectedSprintId);
  const backlogCount = tasks.filter(t => !t.sprintId).length;
  const snarkyContext = { viewFilter, sprint, backlogCount };

  // Collect any active errors for a global banner
  const activeErrors = [
    tasksError && 'Tasks', sprintsError && 'Sprints', batchesError && 'Production',
    productsError && 'Products', ordersError && 'Orders', customersError && 'Customers',
    budgetError && 'Budget', inventoryError && 'Inventory', activitiesError && 'Activity',
    deliveriesError && 'Deliveries', teamError && 'Team',
  ].filter(Boolean);

  const defaultRoute =
    role === 'chef'     ? '/shop'  :
    role === 'employee' ? '/crew'  :
    '/kanban';

  return (
    <>
      {/* Global error banner — shows if any Firestore subscription fails */}
      {activeErrors.length > 0 && (
        <Alert
          variant="error"
          message={`⚠️ Connection issue with: ${activeErrors.join(', ')} — data may be stale.`}
          action={{ label: 'Refresh', onClick: () => window.location.reload() }}
        />
      )}
      <Routes>
        <Route element={<Layout user={user} role={role} onLogout={onLogout} snarkyContext={snarkyContext} onDevRequest={() => setDevRequestModal(true)} isDemo={isDemo} />}>
          <Route index element={<Navigate to={defaultRoute} replace />} />

          {/* ── Management routes (admin + manager) ── */}
          <Route
            path="kanban"
            element={
              <KanbanBoard
                loading={tasksLoading || sprintsLoading}
                tasks={tasks}
                sprints={sprints}
                selectedSprintId={selectedSprintId}
                onSelectSprint={setSelectedSprintId}
                viewFilter={viewFilter}
                onViewFilterChange={setViewFilter}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTaskStatus={handleMoveTaskStatus}
                onMoveTaskToColumn={handleMoveTaskToColumn}
                onReorderColumnTasks={reorderColumnTasks}
                onCreateSprint={handleCreateSprint}
                error={tasksError || sprintsError}
              />
            }
          />
          <Route
            path="planning"
            element={
              <PlanningBoard
                loading={tasksLoading || sprintsLoading}
                tasks={tasks}
                sprints={sprints}
                onMoveTaskToSprint={moveTaskToSprint}
                onMoveTaskSprint={moveTaskSprint}
                onMoveTaskStatus={handleMoveTaskStatus}
                onUpdateTask={editTask}
                onCreateSprint={handleCreateSprint}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTaskWithDefaults}
                namingOverrides={namingOverrides}
                onRenameEpic={handleRenameEpic}
                onRenameFeature={handleRenameFeature}
                targetSprintId={planningTargetSprint}
                error={tasksError || sprintsError}
              />
            }
          />
          <Route path="calendar" element={<CalendarView loading={tasksLoading || sprintsLoading} tasks={tasks} sprints={sprints} onGoToSprint={handleGoToSprint} />} />
          <Route
            path="vendors"
            element={
              <VendorsView
                loading={vendorsLoading}
                vendors={vendors}
                onAddVendor={handleAddVendor}
                onViewActivity={(vendorId, vendorName) =>
                  navigate('/activity', { state: { contactId: vendorId, contactName: vendorName } })
                }
                farmId={farmId}
              />
            }
          />
          <Route
            path="inventory"
            element={
              <InventoryAlerts
                loading={inventoryLoading}
                inventory={inventory}
                orders={orders}
                activeBatches={activeBatches}
                onAdd={addItem}
                onEdit={editItem}
                onRemove={removeItem}
                farmId={farmId}
              />
            }
          />
          <Route
            path="budget"
            element={
              <BudgetTracker
                loading={budgetLoading}
                expenses={expenses}
                revenue={revenue}
                infrastructure={infrastructure}
                onAddExpense={addExpense}
                onAddProject={addProject}
                onEditProject={editProject}
                onDeleteProject={removeProject}
                error={budgetError}
              />
            }
          />
          <Route
            path="production"
            element={
              <GrowthTracker
                loading={batchesLoading}
                activeBatches={activeBatches}
                readyBatches={readyBatches}
                onAdvanceStage={advanceStage}
              />
            }
          />
          <Route path="production/log" element={
            <RoleGuard allow={['admin', 'manager', 'employee']} role={role}>
              <BatchLogger onAddBatch={addBatch} />
            </RoleGuard>
          } />
          <Route
            path="production/harvest"
            element={
              <RoleGuard allow={['admin', 'manager', 'employee']} role={role}>
                <HarvestLogger loading={batchesLoading} readyBatches={readyBatches} onHarvest={harvestBatch} />
              </RoleGuard>
            }
          />
          <Route
            path="sowing"
            element={
              <SowingSchedule
                loading={ordersLoading || batchesLoading}
                orders={orders}
                activeBatches={activeBatches}
                onAddBatch={addBatch}
              />
            }
          />
          <Route
            path="activity"
            element={
              <ActivityLog
                loading={activitiesLoading}
                activities={activities}
                vendors={vendors}
                customers={customers}
                onDeleteActivity={deleteActivity}
                error={activitiesError}
              />
            }
          />

          <Route
            path="products"
            element={
              <ProductManager
                loading={productsLoading}
                products={products}
                onAddProduct={addProduct}
                onEditProduct={editProduct}
                onDeleteProduct={removeProduct}
                farmId={farmId}
              />
            }
          />
          <Route
            path="customers"
            element={
              <CustomerManager
                shopifyCustomers={shopifyCustomers}
                loading={shopifyCustomersLoading}
                farmId={farmId}
              />
            }
          />
          <Route
            path="orders"
            element={
              <OrderManager
                loading={ordersLoading}
                orders={orders}
                shopifyOrders={shopifyOrders}
                onAdvanceStatus={handleAdvanceOrderStatus}
                error={ordersError}
              />
            }
          />
          <Route
            path="dashboard"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <Dashboard
                  loading={tasksLoading || sprintsLoading}
                  farmId={farmId}
                  tasks={tasks}
                  sprints={sprints}
                  activities={activities}
                  orders={orders}
                  activeBatches={activeBatches}
                  batches={batches}
                  todayDeliveries={todayDeliveries}
                  shopifyCustomers={shopifyCustomers}
                  shopifyOrders={shopifyOrders}
                  user={user}
                  refresh={refresh}
                />
              </RoleGuard>
            }
          />
          <Route
            path="crew"
            element={
              <RoleGuard allow={['admin', 'manager', 'employee']} role={role}>
                <CrewDailyBoard
                  loading={ordersLoading || batchesLoading}
                  orders={orders}
                  activeBatches={activeBatches}
                  onPlantBatch={plantCrewBatch}
                  onAdvanceStage={advanceCrewStage}
                  onHarvestBatch={harvestCrewBatch}
                  onEditBatch={editBatch}
                  user={user}
                  error={ordersError || batchesError}
                />
              </RoleGuard>
            }
          />

          <Route
            path="pipeline"
            element={<PipelineDashboard loading={batchesLoading || ordersLoading} batches={batches} orders={orders} />}
          />
          <Route
            path="farm"
            element={
              <RoleGuard allow={['admin', 'manager', 'employee']} role={role}>
                <FarmDashboard
                  activeBatches={activeBatches}
                  readyBatches={readyBatches}
                  loading={batchesLoading}
                />
              </RoleGuard>
            }
          />
          <Route
            path="deliveries"
            element={
              <RoleGuard allow={['admin', 'manager', 'driver']} role={role}>
                <DeliveryTracker loading={deliveriesLoading} deliveries={deliveries} error={deliveriesError} />
              </RoleGuard>
            }
          />
          <Route
            path="reports"
            element={<EndOfDayReport loading={batchesLoading || ordersLoading} batches={batches} orders={orders} />}
          />
          <Route
            path="harvest-queue"
            element={
              <HarvestQueue
                farmId={farmId}
                orders={orders}
                loading={ordersLoading}
              />
            }
          />
          <Route
            path="packing-list"
            element={
              <PackingList
                orders={orders}
                onAdvanceStatus={handleAdvanceOrderStatus}
                loading={ordersLoading}
              />
            }
          />

          {/* ── Chef routes ── */}
          <Route
            path="shop"
            element={
              <RoleGuard allow={['chef', 'admin', 'manager']} role={role}>
                <ChefCatalog
                  loading={productsLoading}
                  products={availableProducts}
                  cart={cart}
                  onAddToCart={handleAddToCart}
                  error={productsError}
                />
              </RoleGuard>
            }
          />
          <Route
            path="cart"
            element={
              <RoleGuard allow={['chef', 'admin', 'manager']} role={role}>
                <ChefCart
                  cart={cart}
                  onUpdateQty={handleUpdateCartQty}
                  onPlaceOrder={handlePlaceOrder}
                />
              </RoleGuard>
            }
          />
          <Route
            path="my-orders"
            element={
              <RoleGuard allow={['chef', 'admin', 'manager']} role={role}>
                <ChefOrders
                  loading={ordersLoading}
                  orders={orders}
                  onReorder={handleReorder}
                  refresh={refresh}
                  error={ordersError}
                />
              </RoleGuard>
            }
          />

          <Route path="settings" element={<SettingsPage user={user} farmId={farmId} role={role} />} />
          <Route
            path="shopify-sync"
            element={
              <RoleGuard allow={['admin']} role={role}>
                <ShopifySync farmId={farmId} />
              </RoleGuard>
            }
          />
          <Route
            path="customer-segments"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <CustomerSegments
                  shopifyCustomers={shopifyCustomers}
                  shopifyOrders={shopifyOrders}
                  loading={shopifyCustomersLoading}
                />
              </RoleGuard>
            }
          />
          <Route
            path="chef-orders"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <ShopifyChefOrders
                  shopifyOrders={shopifyOrders}
                  loading={shopifyOrdersLoading}
                />
              </RoleGuard>
            }
          />
          <Route
            path="admin"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <AdminPanel
                  user={user}
                  farmId={farmId}
                  role={role}
                  members={teamMembers_live}
                  invites={teamInvites}
                  teamLoading={teamLoading}
                />
              </RoleGuard>
            }
          />
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Route>
      </Routes>

      {/* === Modals (rendered above routes) === */}
      {taskModal && (
        <TaskModal
          task={taskModal.mode === 'edit' ? taskModal.task : null}
          defaultValues={taskModal.mode === 'add' ? (taskModal.defaults || {}) : {}}
          sprints={sprints}
          allTasks={tasks}
          teamMembers={allTeamMembers}
          onClose={() => setTaskModal(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onNavigateToTask={(linkedId) => {
            setTaskModal(null);
            const linked = tasks.find(t => t.id === linkedId);
            if (linked) {
              setTimeout(() => setTaskModal({ mode: 'edit', task: linked }), 100);
            }
          }}
        />
      )}
      {vendorModal && (
        <VendorModal
          onClose={() => setVendorModal(false)}
          onSave={handleSaveVendor}
        />
      )}
      {sprintModal && (
        <SprintModal
          sprintNumber={sprints.length + 1}
          onClose={() => setSprintModal(false)}
          onSave={handleSaveSprint}
        />
      )}
      {completionModal && (
        <CompletionModal
          task={completionModal.task}
          vendors={vendors}
          customers={customers}
          onSave={handleCompletionSave}
          onSkip={handleCompletionSkip}
        />
      )}
      {roadblockModal && (
        <RoadblockModal
          task={roadblockModal.task}
          teamMembers={allTeamMembers}
          onSubmit={handleRoadblockSubmit}
          onSkip={handleRoadblockSkip}
        />
      )}
      {devRequestModal && (
        <DevRequestModal
          onSubmit={handleSubmitDevRequest}
          onClose={() => setDevRequestModal(false)}
        />
      )}
      {showNotificationModal && (
        <NotificationPermissionModal
          farmId={farmId}
          userId={user?.uid}
          onClose={() => setShowNotificationModal(false)}
        />
      )}

      {/* Dev toolbar — only visible to admins */}
      <DevToolbar
        actualRole={actualRole}
        activeRole={role}
        onImpersonate={setImpersonatedRole}
        user={user}
        farmId={farmId}
      />
    </>
  );
}
