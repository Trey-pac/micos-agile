/**
 * useAppHandlers.js — All event handler callbacks for AppRoutes.
 *
 * Separated from AppRoutes for maintainability. Receives data from
 * useAppData + UI state setters and returns handler functions.
 */
import { useCallback } from 'react';
import { toast } from 'sonner';
import { addVendor as addVendorService } from '../services/vendorService';
import { updateShopifyOrderStatus, updateShopifyOrder } from '../services/orderService';
import { sendPushNotification } from '../services/notificationService';
import { notifyOrderStatusChange } from '../services/notificationTriggers';

export function useAppHandlers({
  data,
  taskModal, setTaskModal,
  completionModal, setCompletionModal,
  roadblockModal, setRoadblockModal,
  setVendorModal, setSprintModal, setDevRequestModal,
  cart, setCart,
  setPlanningTargetSprint,
  user, farmId, navigate,
}) {
  // Destructure what we need from the unified data object
  const {
    tasks, sprints, orders, shopifyOrders, selectedSprintId, allTeamMembers,
    addTask, editTask, removeTask,
    moveTaskStatus, moveTaskToColumn,
    reorderColumnTasks,
    addSprint, setSelectedSprintId,
    addOrder, advanceOrderStatus, updateOrder,
    addRevenue, addActivity,
  } = data;

  // ── Unblock cleared: when an unblock task moves to "done" ──────────────────
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

    toast.success(`${originalTask.title} is unblocked — back in progress`);
  }, [tasks, editTask, allTeamMembers]);

  // ── Completion / Roadblock interceptors ────────────────────────────────────
  const handleMoveTaskStatus = useCallback((taskId, newStatus) => {
    if (newStatus === 'done') {
      const task = tasks.find((t) => t.id === taskId);
      if (task?.tags?.includes('unblock-request') && task?.linkedTaskId) {
        handleUnblockCleared(task);
      }
      // Move to done immediately — no completion note prompt.
      // Notes can be edited in the Kanban view after the fact.
      moveTaskStatus(taskId, newStatus);
      return;
    }
    if (newStatus === 'roadblock') {
      const task = tasks.find((t) => t.id === taskId);
      setRoadblockModal({ task, pendingFn: () => moveTaskStatus(taskId, newStatus) });
      return;
    }
    moveTaskStatus(taskId, newStatus);
  }, [moveTaskStatus, tasks, setRoadblockModal, handleUnblockCleared]);

  const handleMoveTaskToColumn = useCallback((taskId, newStatus, targetTasks) => {
    if (newStatus === 'done') {
      const task = tasks.find((t) => t.id === taskId);
      if (task?.tags?.includes('unblock-request') && task?.linkedTaskId) {
        handleUnblockCleared(task);
      }
      // Move to done immediately — no completion note prompt.
      moveTaskToColumn(taskId, newStatus, targetTasks);
      return;
    }
    if (newStatus === 'roadblock') {
      const task = tasks.find((t) => t.id === taskId);
      setRoadblockModal({ task, pendingFn: () => moveTaskToColumn(taskId, newStatus, targetTasks) });
      return;
    }
    moveTaskToColumn(taskId, newStatus, targetTasks);
  }, [moveTaskToColumn, tasks, setRoadblockModal, handleUnblockCleared]);

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
  }, [completionModal, addActivity, user, setCompletionModal]);

  const handleCompletionSkip = useCallback(async () => {
    await completionModal.pendingFn();
    setCompletionModal(null);
  }, [completionModal, setCompletionModal]);

  // ── Roadblock handlers ─────────────────────────────────────────────────────
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
      toast.warning(`🔴 URGENT roadblock sent to ${unblockerName}`, { duration: Infinity });
    } else if (urgency === 'end-of-day') {
      sendPushNotification(unblockOwnerId, `🟡 ${task.title} needs you today`, reason);
      toast.success(`Unblock request sent to ${unblockerName} ✓`);
    } else {
      toast.success(`Unblock request sent to ${unblockerName} ✓`);
    }

    setRoadblockModal(null);
  }, [roadblockModal, selectedSprintId, addTask, editTask, user, allTeamMembers, setRoadblockModal]);

  const handleRoadblockSkip = useCallback(async () => {
    await roadblockModal.pendingFn();
    toast.warning('Task marked as roadblocked');
    setRoadblockModal(null);
  }, [roadblockModal, setRoadblockModal]);

  // ── Task modal handlers ────────────────────────────────────────────────────
  const handleAddTask = useCallback((defaultStatus) => {
    setTaskModal({ mode: 'add', defaults: { status: defaultStatus || 'not-started' } });
  }, [setTaskModal]);

  const handleAddTaskWithDefaults = useCallback((defaults = {}) => {
    setTaskModal({ mode: 'add', defaults: { status: 'not-started', ...defaults } });
  }, [setTaskModal]);

  const handleEditTask = useCallback((task) => {
    setTaskModal({ mode: 'edit', task });
  }, [setTaskModal]);

  const handleSaveTask = useCallback(async (formData) => {
    if (taskModal?.mode === 'edit') {
      await editTask(taskModal.task.id, formData);
      toast.success('Task updated');
    } else {
      const defaults = taskModal?.defaults || {};
      const sprintId = defaults.sprintId !== undefined ? defaults.sprintId : (selectedSprintId || null);
      await addTask({ ...formData, sprintId });
      toast.success('Task created');
    }
    setTaskModal(null);
  }, [taskModal, editTask, addTask, selectedSprintId, setTaskModal]);

  const handleDeleteTask = useCallback(async (taskId) => {
    await removeTask(taskId);
    toast.success('Task deleted');
    setTaskModal(null);
  }, [removeTask, setTaskModal]);

  // ── Sprint handlers ────────────────────────────────────────────────────────
  const handleCreateSprint = useCallback(() => setSprintModal(true), [setSprintModal]);

  const handleSaveSprint = useCallback(async (formData) => {
    await addSprint(formData);
    toast.success(`Sprint ${formData.number || ''} created`.trim());
    setSprintModal(false);
  }, [addSprint, setSprintModal]);

  const handleGoToSprint = useCallback((sprintId) => {
    setPlanningTargetSprint(sprintId);
    navigate('/planning');
  }, [setPlanningTargetSprint, navigate]);

  // ── Vendor handlers ────────────────────────────────────────────────────────
  const handleAddVendor = useCallback(() => setVendorModal(true), [setVendorModal]);

  const handleSaveVendor = useCallback(async (formData) => {
    if (!farmId) return;
    try {
      await addVendorService(farmId, formData);
      toast.success('Vendor added');
    } catch (err) {
      console.error('Add vendor error:', err);
      toast.error('Failed to save vendor', { duration: 4000 });
    }
    setVendorModal(false);
  }, [farmId, setVendorModal]);

  // ── Cart handlers ──────────────────────────────────────────────────────────
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
  }, [setCart]);

  const handleUpdateCartQty = useCallback((productId, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
      );
    }
  }, [setCart]);

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
  }, [cart, addOrder, user, setCart]);

  const handleReorder = useCallback((order) => {
    setCart(order.items.map((i) => ({ ...i })));
    navigate('/cart');
  }, [navigate, setCart]);

  // ── Order status handlers ──────────────────────────────────────────────────
  const handleAdvanceOrderStatus = useCallback(async (orderId, newStatus) => {
    const isShopifyOrder = shopifyOrders.some((o) => o.id === orderId);

    if (isShopifyOrder) {
      await updateShopifyOrderStatus(farmId, orderId, newStatus);
    } else {
      await advanceOrderStatus(orderId, newStatus);
    }

    // Fire push notification to the chef (fire-and-forget)
    const order = orders.find((o) => o.id === orderId)
      || shopifyOrders.find((o) => o.id === orderId);
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
  }, [advanceOrderStatus, orders, shopifyOrders, addRevenue, farmId]);

  const handleUpdateOrder = useCallback(async (orderId, updates) => {
    const isShopifyOrder = shopifyOrders.some((o) => o.id === orderId);
    if (isShopifyOrder) {
      await updateShopifyOrder(farmId, orderId, updates);
    } else {
      await updateOrder(orderId, updates);
    }
  }, [updateOrder, shopifyOrders, farmId]);

  // ── Dev Request handler ────────────────────────────────────────────────────
  const handleSubmitDevRequest = useCallback(async ({ title, category, urgency, details }) => {
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

    toast.success('Request submitted ✓');
    setDevRequestModal(false);
  }, [selectedSprintId, sprints, addTask, user, setDevRequestModal]);

  return {
    handleAddTask, handleAddTaskWithDefaults, handleEditTask,
    handleSaveTask, handleDeleteTask,
    handleMoveTaskStatus, handleMoveTaskToColumn,
    handleCompletionSave, handleCompletionSkip,
    handleRoadblockSubmit, handleRoadblockSkip,
    handleCreateSprint, handleSaveSprint, handleGoToSprint,
    handleAddVendor, handleSaveVendor,
    handleAddToCart, handleUpdateCartQty, handlePlaceOrder, handleReorder,
    handleAdvanceOrderStatus, handleUpdateOrder,
    handleSubmitDevRequest,
  };
}
