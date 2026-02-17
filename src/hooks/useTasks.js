import { useState, useEffect, useCallback } from 'react';
import {
  subscribeTasks,
  addTask as addTaskService,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
  batchUpdateTasks,
} from '../services/taskService';

/**
 * Task state hook — subscribes to Firestore, provides CRUD + drag-drop + filtering.
 *
 * Requires a farmId (from useAuth). Returns null-safe defaults while loading.
 */
export function useTasks(farmId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time subscription
  useEffect(() => {
    if (!farmId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeTasks(
      farmId,
      (taskList) => {
        setTasks(taskList);
        setLoading(false);
      },
      (err) => {
        console.error('Task subscription error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [farmId]);

  // Add a new task
  const addTask = useCallback(
    async (taskData) => {
      if (!farmId) return;
      try {
        await addTaskService(farmId, taskData);
      } catch (err) {
        console.error('Add task error:', err);
        setError(err.message);
      }
    },
    [farmId]
  );

  // Edit an existing task (full replace of fields)
  const editTask = useCallback(
    async (taskId, updates) => {
      if (!farmId) return;
      try {
        await updateTaskService(farmId, taskId, updates);
      } catch (err) {
        console.error('Edit task error:', err);
        setError(err.message);
      }
    },
    [farmId]
  );

  // Delete a task
  const removeTask = useCallback(
    async (taskId) => {
      if (!farmId) return;
      try {
        await deleteTaskService(farmId, taskId);
      } catch (err) {
        console.error('Delete task error:', err);
        setError(err.message);
      }
    },
    [farmId]
  );

  // Kanban drag-drop: move a task to a new status column
  const moveTaskStatus = useCallback(
    async (taskId, newStatus) => {
      if (!farmId) return;
      try {
        await updateTaskService(farmId, taskId, { status: newStatus });
      } catch (err) {
        console.error('Move task error:', err);
        setError(err.message);
      }
    },
    [farmId]
  );

  // Planning drag-drop: move a task to a different sprint
  const moveTaskSprint = useCallback(
    async (taskId, newSprintId) => {
      if (!farmId) return;
      try {
        await updateTaskService(farmId, taskId, {
          sprintId: newSprintId || null,
        });
      } catch (err) {
        console.error('Move task sprint error:', err);
        setError(err.message);
      }
    },
    [farmId]
  );

  // Reorder backlog tasks (batch update backlogPriority)
  const reorderBacklog = useCallback(
    async (taskId, newIndex) => {
      if (!farmId) return;

      const backlogTasks = tasks
        .filter((t) => !t.sprintId)
        .sort((a, b) => (a.backlogPriority || 0) - (b.backlogPriority || 0));

      const taskIndex = backlogTasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return;

      const [movedTask] = backlogTasks.splice(taskIndex, 1);
      backlogTasks.splice(newIndex, 0, movedTask);

      const updates = backlogTasks.map((task, idx) => ({
        id: task.id,
        backlogPriority: idx,
      }));

      try {
        await batchUpdateTasks(farmId, updates);
      } catch (err) {
        console.error('Reorder backlog error:', err);
        setError(err.message);
      }
    },
    [farmId, tasks]
  );

  // Filter helpers
  const getFilteredTasks = useCallback(
    (viewFilter) => {
      if (viewFilter === 'all') return tasks;
      return tasks.filter((task) => task.owner === viewFilter);
    },
    [tasks]
  );

  const getSprintTasks = useCallback(
    (sprintId, viewFilter) => {
      const filtered = getFilteredTasks(viewFilter);
      if (!sprintId) {
        return filtered.filter((task) => !task.sprintId);
      }
      return filtered.filter((task) => task.sprintId === sprintId);
    },
    [getFilteredTasks]
  );

  return {
    tasks,
    loading,
    error,
    addTask,
    editTask,
    removeTask,
    moveTaskStatus,
    moveTaskSprint,
    reorderBacklog,
    getFilteredTasks,
    getSprintTasks,
  };
}
