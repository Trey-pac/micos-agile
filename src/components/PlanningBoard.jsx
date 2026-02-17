import { useState, useEffect, useRef } from 'react';
import { teamMembers, ownerColors } from '../data/constants';
import { formatDateRange, isCurrentSprint } from '../utils/sprintUtils';
import PlanningTaskCard from './PlanningTaskCard';

export default function PlanningBoard({
  tasks,
  sprints,
  onDragStart,
  onDrop,
  onReorderBacklog,
  onCreateSprint,
  onEditTask,
  onDeleteTask,
  onActiveSprintChange,
}) {
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [planMenuOpenId, setPlanMenuOpenId] = useState(null);
  const [activeSprintIdx, setActiveSprintIdx] = useState(0);
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [draggedTask, setDraggedTask] = useState(null);

  const scrollRef = useRef(null);
  const isDraggingScroll = useRef(false);
  const scrollStartX = useRef(0);
  const scrollLeftStart = useRef(0);

  const applyFilters = (taskList) => {
    return taskList.filter(t => {
      if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterSize !== 'all' && t.size !== filterSize) return false;
      return true;
    });
  };

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const backlogTasks = applyFilters(tasks.filter(t => !t.sprintId))
    .sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });

  const getSprintTasks = (sprintId) => applyFilters(tasks.filter(t => t.sprintId === sprintId));

  const updateActiveSprintOnScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const cols = container.querySelectorAll('[data-sprint-col]');
    let bestIdx = 0;
    let bestDist = Infinity;
    cols.forEach((col, idx) => {
      const dist = Math.abs(col.offsetLeft - scrollLeft);
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

  // Click-drag horizontal scroll
  const handleMouseDown = (e) => {
    if (e.target.closest('[data-planning-card]') || e.target.closest('button')) return;
    isDraggingScroll.current = true;
    scrollStartX.current = e.pageX;
    scrollLeftStart.current = scrollRef.current ? scrollRef.current.scrollLeft : 0;
    if (scrollRef.current) scrollRef.current.style.scrollBehavior = 'auto';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingScroll.current || !scrollRef.current) return;
      e.preventDefault();
      scrollRef.current.scrollLeft = scrollLeftStart.current - (e.pageX - scrollStartX.current);
    };
    const handleMouseUp = () => {
      if (isDraggingScroll.current && scrollRef.current) {
        scrollRef.current.style.scrollBehavior = 'smooth';
        setTimeout(updateActiveSprintOnScroll, 350);
      }
      isDraggingScroll.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
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

  const handleMonthJump = (monthKey) => {
    if (!monthKey) return;
    const [year, month] = monthKey.split('-').map(Number);
    const target = sprints.find(s => {
      const d = new Date(s.startDate);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    if (target) {
      const el = scrollRef.current?.querySelector(`[data-sprint-id="${target.id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
      setTimeout(updateActiveSprintOnScroll, 400);
    }
  };

  const handleInternalDrop = (targetSprintId) => {
    if (draggedTask) {
      onDrop(targetSprintId);
    }
    setDragOverColumn(null);
  };

  const handleInternalDragStart = (task) => {
    setDraggedTask(task);
    if (onDragStart) onDragStart(task);
  };

  const hasActiveFilter = filterOwner !== 'all' || filterPriority !== 'all' || filterSize !== 'all';

  return (
    <div className="relative">
      {/* === Header bar with filters === */}
      <div className="bg-white rounded-[14px] px-5 py-3.5 mb-3 shadow-md border-2 border-gray-200">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-lg font-bold whitespace-nowrap">📋 Sprint Planning</span>
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

          {/* Month jump */}
          <select
            className="min-w-[110px] text-xs px-2 py-1.5 border-2 border-gray-300 rounded-lg bg-white font-medium cursor-pointer"
            onChange={(e) => handleMonthJump(e.target.value)}
            defaultValue=""
          >
            <option value="">Jump to Month</option>
            {getMonthsFromSprints().map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
          </select>

          {/* Create sprint */}
          <button
            onClick={onCreateSprint}
            className="bg-sky-500 text-white border-none rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer transition-all duration-200 hover:bg-sky-600 hover:px-4 whitespace-nowrap overflow-hidden"
          >+</button>
        </div>
      </div>

      {/* === Main board: backlog (sticky left) + sprint columns (scrollable right) === */}
      <div className="flex bg-white rounded-2xl shadow-lg h-[80vh] min-h-[600px] overflow-hidden">
        {/* LEFT: Backlog */}
        <div className="shrink-0 w-[280px] overflow-y-auto pr-4 border-r-2 border-gray-200 p-4">
          <div
            className="rounded-xl p-4 border-2 border-gray-200 border-t-4 border-t-orange-500 min-h-[200px] flex flex-col h-full"
            onDragOver={(e) => { e.preventDefault(); setDragOverColumn('backlog'); }}
            onDrop={() => handleInternalDrop(null)}
          >
            <div className="mb-4 pb-3 border-b-2 border-gray-200">
              <div className="text-base font-bold text-gray-800 mb-1">📋 Backlog</div>
              <div className="text-xs text-gray-500">{backlogTasks.length} tasks</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {backlogTasks.length === 0 ? (
                <div className="text-center py-5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-[13px]">
                  No tasks in backlog
                </div>
              ) : (
                backlogTasks.map(task => (
                  <PlanningTaskCard
                    key={task.id}
                    task={task}
                    isMenuOpen={planMenuOpenId === task.id}
                    onToggleMenu={() => setPlanMenuOpenId(planMenuOpenId === task.id ? null : task.id)}
                    onEdit={() => { if (onEditTask) onEditTask(task); setPlanMenuOpenId(null); }}
                    onDelete={() => { if (onDeleteTask) onDeleteTask(task.id); setPlanMenuOpenId(null); }}
                    onDragStart={() => handleInternalDragStart(task)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Sprint columns (horizontally scrollable) */}
        <div className="flex-1 flex flex-col overflow-hidden pl-4">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-scroll overflow-y-auto flex-1 scroll-smooth cursor-grab active:cursor-grabbing select-none pb-3 p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ scrollSnapType: 'x mandatory' }}
            onMouseDown={handleMouseDown}
          >
            {sprints.map((sprint, idx) => {
              const sprintTasks = getSprintTasks(sprint.id);
              const isCurrent = isCurrentSprint(sprint);
              const isActive = idx === activeSprintIdx;

              return (
                <div
                  key={sprint.id}
                  data-sprint-id={sprint.id}
                  data-sprint-col
                  className={`shrink-0 rounded-xl p-4 border-2 border-gray-200 border-t-4 border-t-sky-500 flex flex-col max-h-full overflow-hidden transition-all duration-300 ${
                    isActive ? 'min-w-[400px] w-[400px]' : 'min-w-[280px] w-[280px]'
                  }`}
                  style={{ scrollSnapAlign: 'start' }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColumn(sprint.id); }}
                  onDrop={() => handleInternalDrop(sprint.id)}
                >
                  <div className="mb-4 pb-3 border-b-2 border-gray-200">
                    <div className="text-base font-bold text-gray-800 mb-1">
                      Sprint {sprint.number} {isCurrent && '✓'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateRange(new Date(sprint.startDate), new Date(sprint.endDate))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{sprintTasks.length} tasks</div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {sprintTasks.length === 0 ? (
                      <div className="text-center py-5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-[13px]">
                        Drag tasks here
                      </div>
                    ) : (
                      sprintTasks.map(task => (
                        <PlanningTaskCard
                          key={task.id}
                          task={task}
                          isMenuOpen={planMenuOpenId === task.id}
                          onToggleMenu={() => setPlanMenuOpenId(planMenuOpenId === task.id ? null : task.id)}
                          onEdit={() => { if (onEditTask) onEditTask(task); setPlanMenuOpenId(null); }}
                          onDelete={() => { if (onDeleteTask) onDeleteTask(task.id); setPlanMenuOpenId(null); }}
                          onDragStart={() => handleInternalDragStart(task)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
