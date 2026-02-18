import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { subscribeVendors, addVendor as addVendorService } from '../services/vendorService';
import { useTasks } from '../hooks/useTasks';
import { useSprints } from '../hooks/useSprints';
import Layout from './Layout';
import Dashboard from './Dashboard';
import KanbanBoard from './KanbanBoard';
import PlanningBoard from './PlanningBoard';
import CalendarView from './CalendarView';
import VendorsView from './VendorsView';
import InventoryManager from './InventoryManager';
import BudgetTracker from './BudgetTracker';
import ProductionTracker from './ProductionTracker';
import TaskModal from './modals/TaskModal';
import VendorModal from './modals/VendorModal';
import SprintModal from './modals/SprintModal';

/**
 * All authenticated routes. Hooks are called once here and data flows
 * down as props — no hook calls inside child components.
 */
export default function AppRoutes({ user, farmId, onLogout }) {
  // === Core data hooks ===
  const {
    tasks, addTask, editTask, removeTask,
    moveTaskStatus, moveTaskSprint,
    reorderColumnTasks, moveTaskToColumn, moveTaskToSprint,
  } = useTasks(farmId);
  const {
    sprints, selectedSprintId, setSelectedSprintId,
    addSprint, updateSprint,
  } = useSprints(farmId);

  const navigate = useNavigate();

  // === UI state ===
  const [viewFilter, setViewFilter] = useState('all');
  const [taskModal, setTaskModal] = useState(null);
  const [planningTargetSprint, setPlanningTargetSprint] = useState(null);      // null | { mode: 'add', defaults } | { mode: 'edit', task }
  const [vendorModal, setVendorModal] = useState(false);
  const [sprintModal, setSprintModal] = useState(false);
  const [vendors, setVendors] = useState([]);

  // Real-time Firestore vendor subscription
  useEffect(() => {
    if (!farmId) return;
    return subscribeVendors(
      farmId,
      setVendors,
      (err) => console.error('Vendor subscription error:', err)
    );
  }, [farmId]);

  // === Task modal handlers ===
  const handleAddTask = (defaultStatus) => {
    setTaskModal({ mode: 'add', defaults: { status: defaultStatus || 'not-started' } });
  };

  // Called from PlanningBoard + buttons: sprintId is a sprint id or null (backlog)
  const handleAddTaskToSprint = (sprintId) => {
    setTaskModal({ mode: 'add', defaults: { status: 'not-started', sprintId } });
  };

  const handleEditTask = (task) => {
    setTaskModal({ mode: 'edit', task });
  };

  const handleSaveTask = async (formData) => {
    if (taskModal?.mode === 'edit') {
      await editTask(taskModal.task.id, formData);
    } else {
      // If opened from PlanningBoard + button, use its sprintId (may be null for backlog).
      // Otherwise fall back to the Kanban selected sprint.
      const sprintId = taskModal?.defaults?.sprintId !== undefined
        ? taskModal.defaults.sprintId
        : (selectedSprintId || null);
      await addTask({ ...formData, sprintId });
    }
    setTaskModal(null);
  };

  const handleDeleteTask = async (taskId) => {
    await removeTask(taskId);
    setTaskModal(null);
  };

  // === Sprint modal handlers ===
  const handleCreateSprint = () => setSprintModal(true);

  const handleSaveSprint = async (formData) => {
    await addSprint(formData);
    setSprintModal(false);
  };

  // === Calendar → Planning navigation ===
  const handleGoToSprint = (sprintId) => {
    setPlanningTargetSprint(sprintId);
    navigate('/planning');
  };

  // === Vendor handlers (stub until useVendors hook) ===
  const handleAddVendor = () => setVendorModal(true);

  const handleSaveVendor = async (formData) => {
    if (!farmId) return;
    try {
      await addVendorService(farmId, formData);
    } catch (err) {
      console.error('Add vendor error:', err);
    }
    setVendorModal(false);
  };

  // === Snarky comment context ===
  const sprint = sprints.find(s => s.id === selectedSprintId);
  const backlogCount = tasks.filter(t => !t.sprintId).length;
  const snarkyContext = { viewFilter, sprint, backlogCount };

  return (
    <>
      <Routes>
        <Route element={<Layout user={user} onLogout={onLogout} snarkyContext={snarkyContext} />}>
          <Route index element={<Navigate to="/kanban" replace />} />
          <Route
            path="kanban"
            element={
              <KanbanBoard
                tasks={tasks}
                sprints={sprints}
                selectedSprintId={selectedSprintId}
                onSelectSprint={setSelectedSprintId}
                viewFilter={viewFilter}
                onViewFilterChange={setViewFilter}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTaskStatus={moveTaskStatus}
                onMoveTaskToColumn={moveTaskToColumn}
                onReorderColumnTasks={reorderColumnTasks}
                onCreateSprint={handleCreateSprint}
              />
            }
          />
          <Route
            path="planning"
            element={
              <PlanningBoard
                tasks={tasks}
                sprints={sprints}
                onMoveTaskToSprint={moveTaskToSprint}
                onMoveTaskSprint={moveTaskSprint}
                onCreateSprint={handleCreateSprint}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTaskToSprint}
                targetSprintId={planningTargetSprint}
              />
            }
          />
          <Route path="calendar" element={<CalendarView tasks={tasks} sprints={sprints} onGoToSprint={handleGoToSprint} />} />
          <Route path="vendors" element={<VendorsView vendors={vendors} onAddVendor={handleAddVendor} />} />
          <Route path="inventory" element={<InventoryManager />} />
          <Route path="budget" element={<BudgetTracker />} />
          <Route path="production" element={<ProductionTracker />} />
          <Route path="dashboard" element={<Dashboard farmId={farmId} taskCount={tasks.length} />} />
          <Route path="*" element={<Navigate to="/kanban" replace />} />
        </Route>
      </Routes>

      {/* === Modals (rendered above routes) === */}
      {taskModal && (
        <TaskModal
          task={taskModal.mode === 'edit' ? taskModal.task : null}
          defaultStatus={taskModal.mode === 'add' ? taskModal.defaults?.status : undefined}
          onClose={() => setTaskModal(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
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
    </>
  );
}
