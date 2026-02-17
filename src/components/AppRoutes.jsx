import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
  } = useTasks(farmId);
  const {
    sprints, selectedSprintId, setSelectedSprintId,
    addSprint, updateSprint,
  } = useSprints(farmId);

  // === UI state ===
  const [viewFilter, setViewFilter] = useState('all');
  const [taskModal, setTaskModal] = useState(null);      // null | { mode: 'add', defaults } | { mode: 'edit', task }
  const [vendorModal, setVendorModal] = useState(false);
  const [sprintModal, setSprintModal] = useState(false);
  const [vendors, setVendors] = useState([]);             // Vendors will come from useVendors hook later
  const [draggedTask, setDraggedTask] = useState(null);

  // === Task modal handlers ===
  const handleAddTask = (defaultStatus) => {
    setTaskModal({ mode: 'add', defaults: { status: defaultStatus || 'not-started' } });
  };

  const handleEditTask = (task) => {
    setTaskModal({ mode: 'edit', task });
  };

  const handleSaveTask = async (formData) => {
    if (taskModal?.mode === 'edit') {
      await editTask(taskModal.task.id, formData);
    } else {
      await addTask({
        ...formData,
        sprintId: selectedSprintId || null,
      });
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

  // === Vendor handlers (stub until useVendors hook) ===
  const handleAddVendor = () => setVendorModal(true);

  const handleSaveVendor = (formData) => {
    setVendors(prev => [...prev, { ...formData, id: Date.now().toString() }]);
    setVendorModal(false);
  };

  // === Planning drag-drop ===
  const handlePlanningDragStart = (task) => setDraggedTask(task);

  const handlePlanningDrop = (targetSprintId) => {
    if (draggedTask) {
      moveTaskSprint(draggedTask.id, targetSprintId);
      setDraggedTask(null);
    }
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
                onDragStart={handlePlanningDragStart}
                onDrop={handlePlanningDrop}
                onCreateSprint={handleCreateSprint}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            }
          />
          <Route path="calendar" element={<CalendarView tasks={tasks} />} />
          <Route path="vendors" element={<VendorsView vendors={vendors} onAddVendor={handleAddVendor} />} />
          <Route path="inventory" element={<InventoryManager />} />
          <Route path="budget" element={<BudgetTracker />} />
          <Route path="production" element={<ProductionTracker />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/kanban" replace />} />
        </Route>
      </Routes>

      {/* === Modals (rendered above routes) === */}
      {taskModal && (
        <TaskModal
          task={taskModal.mode === 'edit' ? taskModal.task : { ...taskModal.defaults }}
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
