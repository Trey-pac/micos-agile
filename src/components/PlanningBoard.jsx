import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { teamMembers, ownerColors } from '../data/constants';
import { formatDateRange, isCurrentSprint, getAutoSelectedSprint } from '../utils/sprintUtils';
import SortablePlanningCard from './SortablePlanningCard';
import { useDragSensors, kanbanCollisionDetection } from '../hooks/useDragAndDrop';
import BacklogTreeView from './BacklogTreeView';
import { epics, features } from '../data/epicFeatureHierarchy';

function DroppableSprintColumn({ id, children, isOver: externalIsOver, ...props }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'sprint-column' } });
  const highlighted = isOver || externalIsOver;

  return (
    <div ref={setNodeRef} {...props} className={`${props.className || ''} ${highlighted ? 'ring-2 ring-sky-400/60 bg-sky-50/30' : ''}`}>
      {children}
    </div>
  );
}

export default function PlanningBoard({
  tasks,
  sprints,
  onMoveTaskToSprint,
  onMoveTaskSprint,
  onCreateSprint,
  onEditTask,
  onDeleteTask,
  onActiveSprintChange,
  onAddTask,
  targetSprintId,
}) {
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'tree'
  const [planMenuOpenId, setPlanMenuOpenId] = useState(null);
  const [activeSprintIdx, setActiveSprintIdx] = useState(0);
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [columnItems, setColumnItems] = useState({});
  // Ref always holds the latest columnItems so drag handlers never read stale state
  const columnItemsRef = useRef({});
  // Tracks a cross-column move until Firestore confirms it (prevents phantom snap-back)
  const pendingMoveRef = useRef(null);

  const sensors = useDragSensors();
  const scrollRef = useRef(null);

  const addBtnClass = 'bg-sky-500 text-white border-none rounded-md px-2 py-1 text-[13px] font-bold cursor-pointer transition-all duration-200 hover:bg-sky-600 hover:px-3 whitespace-nowrap overflow-hidden leading-tight';

  const applyFilters = useCallback((taskList) => {
    return taskList.filter(t => {
      if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterSize !== 'all' && t.size !== filterSize) return false;
      return true;
    });
  }, [filterOwner, filterPriority, filterSize]);

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const filteredTasks = useMemo(() => {
    return applyFilters(tasks).sort((a, b) => {
      if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
  }, [tasks, applyFilters]);

  // Sync column items from filtered tasks — skip during active drag
  useEffect(() => {
    if (activeId) return;
    const pending = pendingMoveRef.current;
    const items = { backlog: [] };
    sprints.forEach(s => { items[s.id] = []; });
    filteredTasks.forEach(t => {
      let col;
      if (pending && t.id === pending.id) {
        // Keep the moved task in its target sprint until Firestore confirms
        col = pending.sprintId || 'backlog';
      } else {
        col = t.sprintId || 'backlog';
      }
      if (items[col]) items[col].push(t.id);
    });
    // Once Firestore confirms the move, clear the pending lock
    if (pending) {
      const confirmed = filteredTasks.find(
        t => t.id === pending.id && (t.sprintId || null) === pending.sprintId
      );
      if (confirmed) pendingMoveRef.current = null;
    }
    columnItemsRef.current = items;
    setColumnItems(items);
  }, [filteredTasks, sprints, activeId]);

  // Find which container contains an id — reads the ref so it's never stale
  const findContainer = useCallback((id) => {
    const items = columnItemsRef.current;
    if (items[id] != null) return id;
    return Object.keys(items).find(key => items[key]?.includes(id)) || null;
  }, []);

  // Build task array for a column from local columnItems state
  const getColumnTasksFromState = useCallback((colId) => {
    return (columnItems[colId] || [])
      .map(id => filteredTasks.find(t => t.id === id))
      .filter(Boolean);
  }, [columnItems, filteredTasks]);

  // === DnD handlers ===
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
    const task = event.active.data.current?.task;
    if (task) setActiveTask(task);
    setPlanMenuOpenId(null);
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

      sourceItems.splice(activeIdx, 1);

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

    // Compare against original task data from props
    const task = tasks.find(t => t.id === active.id);
    if (!task) return;

    const originalContainer = task.sprintId || 'backlog';
    const containerChanged = finalContainer !== originalContainer;
    const orderChanged = oldIdx !== overIdx;

    const targetSprintId = finalContainer === 'backlog' ? null : finalContainer;

    if (containerChanged || orderChanged) {
      // Lock the task in its target sprint until Firestore confirms
      if (containerChanged) {
        pendingMoveRef.current = { id: active.id, sprintId: targetSprintId };
      }
      const targetTasks = finalItems
        .map(id => {
          const t = filteredTasks.find(ft => ft.id === id);
          return t ? { ...t, sprintId: targetSprintId } : { id, sprintId: targetSprintId };
        });
      if (onMoveTaskToSprint) {
        onMoveTaskToSprint(active.id, targetSprintId, targetTasks);
      } else if (onMoveTaskSprint) {
        onMoveTaskSprint(active.id, targetSprintId);
      }
    }
  }, [findContainer, tasks, filteredTasks, onMoveTaskToSprint, onMoveTaskSprint]);

  // === Scroll tracking ===
  const updateActiveSprintOnScroll = () => {
    if (!scrollRef.current) return;
    const containerLeft = scrollRef.current.getBoundingClientRect().left;
    const cols = scrollRef.current.querySelectorAll('[data-sprint-col]');
    let bestIdx = 0;
    let bestDist = Infinity;
    cols.forEach((col, idx) => {
      const dist = Math.abs(col.getBoundingClientRect().left - containerLeft);
      if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
    });
    setActiveSprintIdx(bestIdx);
    if (onActiveSprintChange) onActiveSprintChange(bestIdx);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateActiveSprintOnScroll);
    updateActiveSprintOnScroll();
    return () => el.removeEventListener('scroll', updateActiveSprintOnScroll);
  }, []);

  const getMonthsFromSprints = () => {
    const months = new Map();
    sprints.forEach(sprint => {
      const date = new Date(sprint.startDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const name = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!months.has(key)) months.set(key, { key, name, sprintId: sprint.id });
    });
    return Array.from(months.values());
  };

  const scrollToSprintIdx = (idx) => {
    const clamped = Math.max(0, Math.min(sprints.length - 1, idx));
    if (!scrollRef.current) return;
    const cols = scrollRef.current.querySelectorAll('[data-sprint-col]');
    const el = cols[clamped];
    if (el) {
      scrollRef.current.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
    }
    setTimeout(updateActiveSprintOnScroll, 400);
  };

  // Auto-scroll to targetSprintId (from Calendar nav) or the current/upcoming sprint
  const didAutoScrollRef = useRef(false);
  useEffect(() => {
    if (sprints.length === 0 || !scrollRef.current || viewMode !== 'board' || didAutoScrollRef.current) return;
    didAutoScrollRef.current = true;
    const scrollTarget = targetSprintId
      ? sprints.find(s => s.id === targetSprintId)
      : getAutoSelectedSprint(sprints);
    const idx = scrollTarget ? sprints.findIndex(s => s.id === scrollTarget.id) : -1;
    if (idx > 0) {
      setTimeout(() => {
        const cols = scrollRef.current?.querySelectorAll('[data-sprint-col]');
        const el = cols?.[idx];
        if (el && scrollRef.current) {
          scrollRef.current.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
          setTimeout(updateActiveSprintOnScroll, 400);
        }
      }, 150);
    }
  }, [sprints, viewMode, targetSprintId]);

  const handleMonthJump = (monthKey) => {
    if (!monthKey) return;
    const [year, month] = monthKey.split('-').map(Number);
    const target = sprints.find(s => {
      const d = new Date(s.startDate);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    if (target) {
      const idx = sprints.findIndex(s => s.id === target.id);
      if (idx >= 0) scrollToSprintIdx(idx);
    }
  };

  const hasActiveFilter = filterOwner !== 'all' || filterPriority !== 'all' || filterSize !== 'all';

  return (
    <div className="relative">
      {/* === Header bar with filters === */}
      <div className="bg-white rounded-[14px] px-5 py-3.5 mb-3 shadow-md border-2 border-gray-200">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-lg font-bold whitespace-nowrap">📋 Sprint Planning</span>
          <div className="w-px h-6 bg-gray-200" />

          {/* Board / Tree toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer border-none transition-all duration-150 ${
                viewMode === 'board' ? 'bg-white text-sky-600 shadow-sm' : 'bg-transparent text-gray-500'
              }`}
            >📐 Board</button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer border-none transition-all duration-150 ${
                viewMode === 'tree' ? 'bg-white text-sky-600 shadow-sm' : 'bg-transparent text-gray-500'
              }`}
            >🗂 Tree</button>
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* Owner filter */}
          <button
            onClick={() => setFilterOwner('all')}
            className={`px-3 py-1 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all duration-200 ${
              filterOwner === 'all' ? 'border-sky-500 bg-sky-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}
          >All</button>
          {teamMembers.map(m => {
            const c = ownerColors[m.id];
            const isActive = filterOwner === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setFilterOwner(isActive ? 'all' : m.id)}
                className="px-3 py-1 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all duration-200"
                style={{
                  borderColor: isActive ? c.text : c.border,
                  background: isActive ? c.bg : '#fafafa',
                  color: c.text,
                  opacity: isActive ? 1 : 0.7,
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                }}
              >{m.name}</button>
            );
          })}

          <div className="w-px h-6 bg-gray-200" />

          {/* Priority + size filters */}
          <select
            className="min-w-[110px] text-xs px-2 py-1.5 border-2 border-gray-300 rounded-lg bg-white font-medium cursor-pointer"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟠 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          <select
            className="min-w-[100px] text-xs px-2 py-1.5 border-2 border-gray-300 rounded-lg bg-white font-medium cursor-pointer"
            value={filterSize}
            onChange={e => setFilterSize(e.target.value)}
          >
            <option value="all">All Sizes</option>
            <option value="S">S - Small</option>
            <option value="M">M - Medium</option>
            <option value="L">L - Large</option>
          </select>

          {hasActiveFilter && (
            <button
              className="text-[11px] px-2.5 py-1 border border-gray-200 rounded-md bg-gray-50 cursor-pointer text-gray-500 hover:bg-gray-100"
              onClick={() => { setFilterOwner('all'); setFilterPriority('all'); setFilterSize('all'); }}
            >✕ Clear</button>
          )}

          <div className="flex-1" />

          {/* Sprint nav arrows + month jump (board mode only) */}
          {viewMode === 'board' && (
            <>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollToSprintIdx(activeSprintIdx - 1)}
                  disabled={activeSprintIdx === 0}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 text-sm font-bold cursor-pointer hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed border-solid"
                >‹</button>
                <span className="text-[11px] text-gray-500 font-medium min-w-[60px] text-center">
                  Sprint {sprints[activeSprintIdx]?.number ?? '—'}
                </span>
                <button
                  onClick={() => scrollToSprintIdx(activeSprintIdx + 1)}
                  disabled={activeSprintIdx >= sprints.length - 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 text-sm font-bold cursor-pointer hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed border-solid"
                >›</button>
              </div>
              <select
                className="min-w-[110px] text-xs px-2 py-1.5 border-2 border-gray-300 rounded-lg bg-white font-medium cursor-pointer"
                onChange={(e) => handleMonthJump(e.target.value)}
                defaultValue=""
              >
                <option value="">Jump to Month</option>
                {getMonthsFromSprints().map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
              </select>
            </>
          )}

          {/* Create sprint */}
          <button
            onClick={onCreateSprint}
            className="bg-sky-500 text-white border-none rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer transition-all duration-200 hover:bg-sky-600 hover:px-4 whitespace-nowrap overflow-hidden"
          >+ Sprint</button>
        </div>
      </div>

      {/* === Tree view === */}
      {viewMode === 'tree' && (
        <div className="bg-white rounded-2xl shadow-lg p-5 h-[80vh] min-h-[600px] overflow-hidden flex flex-col">
          <BacklogTreeView
            tasks={filteredTasks}
            epics={epics}
            features={features}
            sprints={sprints}
            onEditTask={onEditTask}
          />
        </div>
      )}

      {/* === Board view === */}
      {viewMode === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex bg-white rounded-2xl shadow-lg h-[80vh] min-h-[600px] overflow-hidden">
            {/* LEFT: Backlog */}
            <div className="shrink-0 w-[280px] overflow-y-auto pr-4 border-r-2 border-gray-200 p-4">
              <DroppableSprintColumn
                id="backlog"
                className="rounded-xl p-4 border-2 border-gray-200 border-t-4 border-t-orange-500 min-h-[200px] flex flex-col h-full"
              >
                <div className="mb-4 pb-3 border-b-2 border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-base font-bold text-gray-800">📋 Backlog</div>
                    {onAddTask && (
                      <button onClick={() => onAddTask(null)} className={addBtnClass}>+</button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{getColumnTasksFromState('backlog').length} tasks</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SortableContext items={columnItems['backlog'] || []} strategy={verticalListSortingStrategy}>
                    {(columnItems['backlog'] || []).length === 0 ? (
                      <div className="text-center py-5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-[13px]">
                        No tasks in backlog
                      </div>
                    ) : (
                      getColumnTasksFromState('backlog').map(task => (
                        <SortablePlanningCard
                          key={task.id}
                          task={task}
                          isMenuOpen={planMenuOpenId === task.id}
                          onToggleMenu={() => setPlanMenuOpenId(planMenuOpenId === task.id ? null : task.id)}
                          onEdit={() => { if (onEditTask) onEditTask(task); setPlanMenuOpenId(null); }}
                          onDelete={() => { if (onDeleteTask) onDeleteTask(task.id); setPlanMenuOpenId(null); }}
                        />
                      ))
                    )}
                  </SortableContext>
                </div>
              </DroppableSprintColumn>
            </div>

            {/* RIGHT: Sprint columns (horizontally scrollable) */}
            <div className="flex-1 flex flex-col overflow-hidden pl-4">
              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-scroll overflow-y-auto flex-1 scroll-smooth pb-3 p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {sprints.map((sprint, idx) => {
                  const sprintTasks = getColumnTasksFromState(sprint.id);
                  const sprintIds = columnItems[sprint.id] || [];
                  const isCurrent = isCurrentSprint(sprint);
                  const isActive = idx === activeSprintIdx;

                  return (
                    <DroppableSprintColumn
                      key={sprint.id}
                      id={sprint.id}
                      data-sprint-id={sprint.id}
                      data-sprint-col
                      className={`shrink-0 rounded-xl p-4 border-2 border-gray-200 border-t-4 border-t-sky-500 flex flex-col max-h-full overflow-hidden transition-all duration-300 ${
                        isActive ? 'min-w-[560px] w-[560px]' : 'min-w-[280px] w-[280px]'
                      }`}
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="mb-4 pb-3 border-b-2 border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-base font-bold text-gray-800">
                            Sprint {sprint.number} {isCurrent && '✓'}
                          </div>
                          {onAddTask && (
                            <button onClick={() => onAddTask(sprint.id)} className={addBtnClass}>+</button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateRange(new Date(sprint.startDate), new Date(sprint.endDate))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{sprintTasks.length} tasks</div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <SortableContext items={sprintIds} strategy={verticalListSortingStrategy}>
                          {sprintTasks.length === 0 ? (
                            <div className="text-center py-5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-[13px]">
                              Drag tasks here
                            </div>
                          ) : (
                            sprintTasks.map(task => (
                              <SortablePlanningCard
                                key={task.id}
                                task={task}
                                isMenuOpen={planMenuOpenId === task.id}
                                onToggleMenu={() => setPlanMenuOpenId(planMenuOpenId === task.id ? null : task.id)}
                                onEdit={() => { if (onEditTask) onEditTask(task); setPlanMenuOpenId(null); }}
                                onDelete={() => { if (onDeleteTask) onDeleteTask(task.id); setPlanMenuOpenId(null); }}
                              />
                            ))
                          )}
                        </SortableContext>
                      </div>
                    </DroppableSprintColumn>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drag overlay — smooth ghost preview */}
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <SortablePlanningCard task={activeTask} isDragOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
