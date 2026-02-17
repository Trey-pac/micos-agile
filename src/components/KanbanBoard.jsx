import { useState } from 'react';
import TaskCard from './TaskCard';
import SprintHeader from './SprintHeader';

const columns = [
  { id: 'not-started', title: '📝 Not Started', color: 'border-t-sky-500' },
  { id: 'in-progress', title: '🚀 In Progress', color: 'border-t-lime-500' },
  { id: 'roadblock', title: '🚧 Roadblock', color: 'border-t-amber-400' },
  { id: 'done', title: '✅ Done', color: 'border-t-emerald-500' },
];

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
  onCreateSprint,
}) {
  const [draggedTask, setDraggedTask] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const sprint = sprints.find(s => s.id === selectedSprintId);

  // Filter tasks for current sprint + view filter
  const filteredTasks = tasks.filter(t => {
    if (selectedSprintId && t.sprintId !== selectedSprintId) return false;
    if (!selectedSprintId && t.sprintId) return false;
    if (viewFilter !== 'all' && t.owner !== viewFilter) return false;
    return true;
  });

  const handleDrop = (status) => {
    if (draggedTask) {
      onMoveTaskStatus(draggedTask.id, status);
      setDraggedTask(null);
    }
  };

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

      {/* Kanban 4-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
        {columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`bg-white rounded-2xl p-5 min-h-[400px] shadow-md border-t-4 ${col.color} transition-all duration-300`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-200">
                <div className="text-lg font-semibold flex items-center gap-2">{col.title}</div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 px-3 py-1 rounded-full text-[13px] text-gray-800 font-semibold">
                    {colTasks.length}
                  </span>
                  <button
                    onClick={() => onAddTask(col.id)}
                    className="bg-sky-500 text-white border-none rounded-md px-2 py-1 text-[13px] font-bold cursor-pointer transition-all duration-200 hover:bg-sky-600 hover:px-3 whitespace-nowrap overflow-hidden leading-tight"
                  >+</button>
                </div>
              </div>

              {/* Task cards */}
              {colTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={() => setDraggedTask(task)}
                  isMenuOpen={openMenuId === task.id}
                  onToggleMenu={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                  onEdit={() => { onEditTask(task); setOpenMenuId(null); }}
                  onDelete={() => { onDeleteTask(task.id); setOpenMenuId(null); }}
                  onMove={(newStatus) => { onMoveTaskStatus(task.id, newStatus); setOpenMenuId(null); }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
