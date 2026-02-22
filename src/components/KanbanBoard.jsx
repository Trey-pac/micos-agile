import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { KanbanSkeleton } from './ui/Skeletons';
import {
  DndContext,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import SortableTaskCard from './SortableTaskCard';
import TaskCard from './TaskCard';
import TaskDetailDrawer from './TaskDetailDrawer';
import SprintHeader from './SprintHeader';
import { useDragSensors, kanbanCollisionDetection } from '../hooks/useDragAndDrop';
import { KANBAN_COLUMNS } from '../data/constants';
import { getAutoSelectedSprint } from '../utils/sprintUtils';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Plus } from 'lucide-react';

function DroppableColumn({ id, color, title, count, onAddTask, children }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column' } });

  // Extract the dot color from the border-t color class
  const dotColorMap = {
    'border-t-sky-500': 'bg-sky-500',
    'border-t-lime-500': 'bg-lime-500',
    'border-t-amber-400': 'bg-amber-400',
    'border-t-emerald-500': 'bg-emerald-500',
  };
  const dotColor = dotColorMap[color] || 'bg-gray-400';

  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-50/80 dark:bg-gray-800/60 rounded-xl p-4 min-h-[400px] transition-all duration-300 ${
        isOver ? 'ring-2 ring-sky-400/40 bg-sky-50/40 dark:bg-sky-900/20' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">{title}</span>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {count}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onAddTask(id)}
          className="h-8 w-8"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  tasks,
  sprints,
  selectedSprintId,
  onSelectSprint,
  viewFilter,
  onViewFilterChange,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTaskStatus,
  onMoveTaskToColumn,
  onReorderColumnTasks,
  onCreateSprint,
  onUpdateTask,
  loading = false,
}) {
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [drawerTaskId, setDrawerTaskId] = useState(null);
  const [columnItems, setColumnItems] = useState({});
  // Ref always holds the latest columnItems so drag handlers never read stale state
  const columnItemsRef = useRef({});
  // Tracks a cross-column move until Firestore confirms it (prevents phantom snap-back)
  const pendingMoveRef = useRef(null);
  const sensors = useDragSensors();

  // Resolve the drawer task from the live tasks array so it updates in real-time
  const drawerTask = drawerTaskId ? tasks.find(t => t.id === drawerTaskId) : null;

  const sprint = sprints.find(s => s.id === selectedSprintId);

  // On every visit to Kanban, snap to the auto-selected sprint (runs once per mount).
  // React Router unmounts this on navigation so the ref resets each time you come back.
  const didSnapRef = useRef(false);
  useEffect(() => {
    if (sprints.length === 0 || didSnapRef.current) return;
    didSnapRef.current = true;
    const best = getAutoSelectedSprint(sprints);
    onSelectSprint(best.id);
  // onSelectSprint = setSelectedSprintId (stable setter) — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprints]);

  // Filter tasks for current sprint + view filter + priority + size, sorted by sortOrder
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        if (selectedSprintId && t.sprintId !== selectedSprintId) return false;
        if (!selectedSprintId && t.sprintId) return false;
        if (viewFilter !== 'all') {
          const taskOwners = Array.isArray(t.owners) && t.owners.length > 0 ? t.owners : (t.owner ? [t.owner] : []);
          if (!taskOwners.includes(viewFilter)) return false;
        }
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
        if (filterSize !== 'all' && t.size !== filterSize) return false;
        return true;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [tasks, selectedSprintId, viewFilter, filterPriority, filterSize]);

  // Sync column items from filtered tasks — skip during active drag
  useEffect(() => {
    if (activeId) return;
    const pending = pendingMoveRef.current;
    const items = {};
    KANBAN_COLUMNS.forEach(col => {
      items[col.id] = filteredTasks
        .filter(t => {
          // Keep the moved task in its target column until Firestore confirms
          if (pending && t.id === pending.id) return pending.status === col.id;
          return t.status === col.id;
        })
        .map(t => t.id);
    });
    // Once Firestore confirms the move, clear the pending lock
    if (pending && filteredTasks.find(t => t.id === pending.id && t.status === pending.status)) {
      pendingMoveRef.current = null;
    }
    columnItemsRef.current = items;
    setColumnItems(items);
  }, [filteredTasks, activeId]);

  // Find which column contains an id — reads the ref so it's never stale
  const findContainer = useCallback((id) => {
    const items = columnItemsRef.current;
    if (items[id] != null) return id;
    return Object.keys(items).find(key => items[key]?.includes(id)) || null;
  }, []);

  // Build task array for a column from local columnItems state
  const getColumnTasks = useCallback((colId) => {
    return (columnItems[colId] || [])
      .map(id => filteredTasks.find(t => t.id === id))
      .filter(Boolean);
  }, [columnItems, filteredTasks]);

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
    const task = event.active.data.current?.task;
    if (task) setActiveTask(task);
    setOpenMenuId(null);
  }, []);

  // Transfer items between containers in local state during drag
  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumnItems(prev => {
      const sourceItems = [...(prev[activeContainer] || [])];
      const targetItems = [...(prev[overContainer] || [])];

      const activeIdx = sourceItems.indexOf(active.id);
      if (activeIdx === -1) return prev;

      // Remove from source
      sourceItems.splice(activeIdx, 1);

      // Insert into target at the position of the over item, or at end
      const overIdx = targetItems.indexOf(over.id);
      targetItems.splice(overIdx >= 0 ? overIdx : targetItems.length, 0, active.id);

      const next = {
        ...prev,
        [activeContainer]: sourceItems,
        [overContainer]: targetItems,
      };
      columnItemsRef.current = next;
      return next;
    });
  }, [findContainer]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    const finalContainer = findContainer(active.id);

    setActiveId(null);
    setActiveTask(null);
    if (!over || !finalContainer) return;

    // Handle within-column reorder — read from ref to avoid stale closure
    const items = [...(columnItemsRef.current[finalContainer] || [])];
    const oldIdx = items.indexOf(active.id);
    const overIdx = items.indexOf(over.id);

    let finalItems = items;
    if (oldIdx !== -1 && overIdx !== -1 && oldIdx !== overIdx) {
      finalItems = arrayMove(items, oldIdx, overIdx);
    }

    // Compare against original task status from props
    const task = filteredTasks.find(t => t.id === active.id);
    if (!task) return;

    const statusChanged = finalContainer !== task.status;
    const orderChanged = oldIdx !== overIdx;

    if (statusChanged) {
      // Lock the task in its target column until Firestore confirms
      pendingMoveRef.current = { id: active.id, status: finalContainer };
      // Cross-column move — build target column tasks for batch update
      const targetTasks = finalItems
        .map(id => {
          const t = filteredTasks.find(ft => ft.id === id);
          return t ? { ...t, status: finalContainer } : { id, status: finalContainer };
        });
      if (onMoveTaskToColumn) {
        onMoveTaskToColumn(active.id, finalContainer, targetTasks);
      } else {
        onMoveTaskStatus(active.id, finalContainer);
      }
    } else if (orderChanged) {
      // Same column reorder
      const reorderedTasks = finalItems
        .map(id => filteredTasks.find(t => t.id === id))
        .filter(Boolean);
      if (onReorderColumnTasks) onReorderColumnTasks(reorderedTasks);
    }
  }, [findContainer, filteredTasks, onMoveTaskToColumn, onMoveTaskStatus, onReorderColumnTasks]);

  if (loading) return <KanbanSkeleton />;

  return (
    <div className="relative">
      {/* Sprint header with selector + team/priority/size filter */}
      {sprints.length > 0 && sprint && (
        <SprintHeader
          sprint={sprint}
          sprints={sprints}
          selectedSprintId={selectedSprintId}
          onSelectSprint={onSelectSprint}
          viewFilter={viewFilter}
          onViewFilterChange={onViewFilterChange}
          filterPriority={filterPriority}
          onFilterPriorityChange={setFilterPriority}
          filterSize={filterSize}
          onFilterSizeChange={setFilterSize}
          onCreateSprint={onCreateSprint}
        />
      )}

      {/* Kanban 4-column grid with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.id);
            const colIds = columnItems[col.id] || [];
            return (
              <DroppableColumn
                key={col.id}
                id={col.id}
                color={col.color}
                title={col.title}
                count={colTasks.length}
                onAddTask={onAddTask}
              >
                <SortableContext items={colIds} strategy={verticalListSortingStrategy}>
                  {colTasks.map(task => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      isMenuOpen={openMenuId === task.id}
                      onToggleMenu={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                      onEdit={() => { onEditTask(task); setOpenMenuId(null); }}
                      onDelete={() => { onDeleteTask(task.id); setOpenMenuId(null); }}
                      onMove={(newStatus) => { onMoveTaskStatus(task.id, newStatus); setOpenMenuId(null); }}
                      onCardClick={() => setDrawerTaskId(task.id)}
                    />
                  ))}
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>

        {/* Drag overlay — smooth ghost preview */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <SortableTaskCard task={activeTask} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task detail drawer — inline-editable */}
      {drawerTask && (
        <TaskDetailDrawer
          task={drawerTask}
          sprint={sprint}
          onClose={() => setDrawerTaskId(null)}
          onDelete={() => { onDeleteTask(drawerTask.id); setDrawerTaskId(null); }}
          onUpdateField={(taskId, updates) => {
            if (onUpdateTask) onUpdateTask(taskId, updates);
          }}
        />
      )}
    </div>
  );
}
