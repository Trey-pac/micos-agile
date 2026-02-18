import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import SprintHeader from './SprintHeader';
import { useDragSensors, kanbanCollisionDetection } from '../hooks/useDragAndDrop';
import { KANBAN_COLUMNS } from '../data/constants';
import { getCurrentSprint } from '../utils/sprintUtils';

function DroppableColumn({ id, color, title, count, onAddTask, children }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column' } });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-2xl p-5 min-h-[400px] shadow-md border-t-4 ${color} transition-all duration-300 ${
        isOver ? 'ring-2 ring-sky-400/60 bg-sky-50/30' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-200">
        <div className="text-lg font-semibold flex items-center gap-2">{title}</div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 px-3 py-1 rounded-full text-[13px] text-gray-800 font-semibold">
            {count}
          </span>
          <button
            onClick={() => onAddTask(id)}
            className="bg-sky-500 text-white border-none rounded-md px-2 py-1 text-[13px] font-bold cursor-pointer transition-all duration-200 hover:bg-sky-600 hover:px-3 whitespace-nowrap overflow-hidden leading-tight"
          >+</button>
        </div>
      </div>
      {children}
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
}) {
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [columnItems, setColumnItems] = useState({});
  // Ref always holds the latest columnItems so drag handlers never read stale state
  const columnItemsRef = useRef({});
  // Tracks a cross-column move until Firestore confirms it (prevents phantom snap-back)
  const pendingMoveRef = useRef(null);
  const sensors = useDragSensors();

  const sprint = sprints.find(s => s.id === selectedSprintId);

  // On every visit to Kanban, snap back to the current sprint (runs once when sprints load).
  // Because React Router unmounts this component on navigation, the ref resets each visit.
  const didSnapRef = useRef(false);
  useEffect(() => {
    if (sprints.length === 0 || didSnapRef.current) return;
    didSnapRef.current = true;
    const current = getCurrentSprint(sprints);
    if (current) onSelectSprint(current.id);
  }, [sprints]);

  // Filter tasks for current sprint + view filter, sorted by sortOrder
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        if (selectedSprintId && t.sprintId !== selectedSprintId) return false;
        if (!selectedSprintId && t.sprintId) return false;
        if (viewFilter !== 'all' && t.owner !== viewFilter) return false;
        return true;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [tasks, selectedSprintId, viewFilter]);

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

  return (
    <div>
      {/* Sprint header with selector + team filter */}
      {sprints.length > 0 && sprint && (
        <SprintHeader
          sprint={sprint}
          sprints={sprints}
          selectedSprintId={selectedSprintId}
          onSelectSprint={onSelectSprint}
          viewFilter={viewFilter}
          onViewFilterChange={onViewFilterChange}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
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
    </div>
  );
}
