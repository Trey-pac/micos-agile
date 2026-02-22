/**
 * TasksContext — Domain context for tasks + sprints.
 *
 * Owns useTasks and useSprints subscriptions. Provides data, loading,
 * error, and mutation callbacks to any consumer via useTasksContext().
 *
 * Placed at the app root so that task-related re-renders are isolated
 * to TasksContext consumers (Kanban, Planning, Calendar, Dashboard).
 */
import { createContext, useContext, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useSprints } from '../hooks/useSprints';

const TasksContext = createContext(null);

export function TasksProvider({ farmId, children }) {
  const {
    tasks, loading: tasksLoading, error: tasksError,
    addTask, editTask, removeTask,
    moveTaskStatus, moveTaskSprint,
    reorderColumnTasks, moveTaskToColumn, moveTaskToSprint,
    reorderBacklog, getFilteredTasks, getSprintTasks,
  } = useTasks(farmId);

  const {
    sprints, selectedSprintId, setSelectedSprintId,
    loading: sprintsLoading, error: sprintsError,
    addSprint, updateSprint,
  } = useSprints(farmId);

  const value = useMemo(() => ({
    // Task data
    tasks, tasksLoading, tasksError,
    addTask, editTask, removeTask,
    moveTaskStatus, moveTaskSprint,
    reorderColumnTasks, moveTaskToColumn, moveTaskToSprint,
    reorderBacklog, getFilteredTasks, getSprintTasks,
    // Sprint data
    sprints, sprintsLoading, sprintsError,
    selectedSprintId, setSelectedSprintId,
    addSprint, updateSprint,
  }), [
    tasks, tasksLoading, tasksError,
    addTask, editTask, removeTask,
    moveTaskStatus, moveTaskSprint,
    reorderColumnTasks, moveTaskToColumn, moveTaskToSprint,
    reorderBacklog, getFilteredTasks, getSprintTasks,
    sprints, sprintsLoading, sprintsError,
    selectedSprintId, setSelectedSprintId,
    addSprint, updateSprint,
  ]);

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasksContext() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasksContext must be used within a TasksProvider');
  return ctx;
}
