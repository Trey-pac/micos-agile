import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
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
import { useDragSensors } from '../hooks/useDragAndDrop';
import { KANBAN_COLUMNS } from '../data/constants';

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
  const [activeTask, setActiveTask] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const sensors = useDragSensors();

  const sprint = sprints.find(s => s.id === selectedSprintId);

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

  // Build column task arrays + ID arrays for SortableContext
  const columnData = useMemo(() => {
    const data = {};
    KANBAN_COLUMNS.forEach(col => {
      const colTasks = filteredTasks.filter(t => t.status === col.id);
      data[col.id] = { tasks: colTasks, ids: colTasks.map(t => t.id) };
    });
    return data;
  }, [filteredTasks]);

  const findColumnForTask = useCallback((taskId) => {
    for (const col of KANBAN_COLUMNS) {
      if (columnData[col.id]?.ids.includes(taskId)) return col.id;
    }
    return null;
  }, [columnData]);

  const handleDragStart = useCallback((event) => {
    const task = event.active.data.current?.task;
    if (task) setActiveTask(task);
    setOpenMenuId(null);
  }, []);

  const handleDragOver = useCallback((event) => {
    // No-op — visual feedback handled by DroppableColumn isOver
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Determine source and target columns
    const sourceColumn = findColumnForTask(activeId);
    // overId can be a column ID or a task ID
    const isOverColumn = KANBAN_COLUMNS.some(c => c.id === overId);
    const targetColumn = isOverColumn ? overId : findColumnForTask(overId);

    if (!sourceColumn || !targetColumn) return;

    if (sourceColumn === targetColumn) {
      // Reorder within the same column
      const colTasks = [...columnData[sourceColumn].tasks];
      const oldIndex = colTasks.findIndex(t => t.id === activeId);
      const newIndex = colTasks.findIndex(t => t.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(colTasks, oldIndex, newIndex);
      if (onReorderColumnTasks) onReorderColumnTasks(reordered);
    } else {
      // Move to different column
      const targetTasks = [...columnData[targetColumn].tasks];
      const movedTask = filteredTasks.find(t => t.id === activeId);
      if (!movedTask) return;

      // Insert at the position of the card we dropped on, or end of column
      let insertIdx = targetTasks.length;
      if (!isOverColumn) {
        const overIdx = targetTasks.findIndex(t => t.id === overId);
        if (overIdx !== -1) insertIdx = overIdx;
      }
      targetTasks.splice(insertIdx, 0, { ...movedTask, status: targetColumn });

      if (onMoveTaskToColumn) {
        onMoveTaskToColumn(activeId, targetColumn, targetTasks);
      } else {
        onMoveTaskStatus(activeId, targetColumn);
      }
    }
  }, [findColumnForTask, columnData, filteredTasks, onMoveTaskToColumn, onMoveTaskStatus, onReorderColumnTasks]);

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
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
          {KANBAN_COLUMNS.map(col => {
            const { tasks: colTasks, ids: colIds } = columnData[col.id];
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
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeTask ? (
            <SortableTaskCard task={activeTask} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
