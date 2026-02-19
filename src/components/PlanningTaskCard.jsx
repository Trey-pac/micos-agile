import { teamMembers } from '../data/constants';
import { epics, features } from '../data/epicFeatureHierarchy';

const ownerBg = {
  trey: 'bg-green-200 border-green-400',
  halie: 'bg-teal-200 border-teal-400',
  ricardo: 'bg-orange-200 border-orange-400',
  team: 'bg-purple-200 border-purple-400',
};

const ownerBadge = {
  trey: 'bg-green-900 text-white',
  halie: 'bg-cyan-700 text-white',
  ricardo: 'bg-orange-500 text-white',
  team: 'bg-emerald-600 text-white',
};

const priorityBadge = {
  high: 'bg-red-100 text-red-900',
  medium: 'bg-yellow-100 text-yellow-900',
  low: 'bg-green-100 text-green-800',
};

const priorityBorder = {
  high: 'border-l-red-600',
  medium: 'border-l-lime-500',
  low: 'border-l-sky-500',
};

const sizeBadge = {
  S: 'bg-blue-200 text-blue-900 border-blue-400',
  M: 'bg-amber-200 text-amber-900 border-amber-400',
  L: 'bg-red-200 text-red-900 border-red-400',
};

const STATUS_LABEL = {
  'not-started': 'Not Started',
  'in-progress':  'In Progress',
  'roadblock':    'Roadblock',
  'done':         'Done',
};

const urgencyDot = {
  immediate: 'bg-red-500',
  'end-of-day': 'bg-yellow-400',
  'end-of-sprint': 'bg-blue-400',
};

export default function PlanningTaskCard({ task, sprints = [], isMenuOpen, onToggleMenu, onEdit, onDelete }) {
  const owner   = teamMembers.find(m => m.id === task.owner);
  const epic    = epics.find(e => e.id === task.epicId);
  const feature = features.find(f => f.id === task.featureId);
  const sprint  = sprints.find(s => s.id === task.sprintId);
  const bgClass = ownerBg[task.owner] || 'bg-gray-200 dark:bg-gray-600 border-gray-400';
  const lBorder = priorityBorder[task.priority] || 'border-l-gray-300';

  return (
    <div
      className={`group relative rounded-[10px] p-3 mb-2.5 border-2 border-l-[5px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${bgClass} ${lBorder}`}
    >
      {/* Hover tooltip */}
      <div className="pointer-events-none absolute bottom-full left-0 right-0 z-50 mb-2 opacity-0 scale-95 translate-y-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-150 ease-out">
        <div className="bg-gray-800 text-white px-3 py-2.5 rounded-xl shadow-2xl text-xs leading-relaxed">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-1.5">
            <span className="text-gray-400 dark:text-gray-500">Sprint</span>
            <span>{sprint ? `Sprint ${sprint.number}` : 'Backlog'}</span>
            <span className="text-gray-400 dark:text-gray-500">Status</span>
            <span>{STATUS_LABEL[task.status] || task.status}</span>
            <span className="text-gray-400 dark:text-gray-500">Priority</span>
            <span className="capitalize">{task.priority}</span>
            {owner && <><span className="text-gray-400 dark:text-gray-500">Owner</span><span>{owner.name}</span></>}
            {task.size && <><span className="text-gray-400 dark:text-gray-500">Size</span><span>{task.size}</span></>}
            {task.dueDate && <><span className="text-gray-400 dark:text-gray-500">Due</span><span>{task.dueDate}</span></>}
          </div>
          {epic && (
            <div className={task.notes ? 'mb-1.5 pb-1.5 border-b border-gray-600/60' : ''}>
              <span className="font-bold" style={{ color: epic.color }}>{epic.name}</span>
              {feature && <div className="text-gray-300 text-[11px] mt-0.5">{feature.name}</div>}
            </div>
          )}
          {task.notes && (
            <div className="text-gray-200 leading-snug">
              {task.notes.length > 120 ? task.notes.slice(0, 120) + '…' : task.notes}
            </div>
          )}
        </div>
        {/* Arrow tail */}
        <div className="absolute top-full left-5 border-[5px] border-transparent border-t-gray-800" />
      </div>

      {/* Kebab menu */}
      <button
        className="absolute top-2 right-1.5 bg-transparent border-none cursor-pointer text-base text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded opacity-50 hover:opacity-100 hover:bg-black/10 leading-none"
        onClick={(e) => { e.stopPropagation(); if (onToggleMenu) onToggleMenu(); }}
      >⋮</button>

      {isMenuOpen && (
        <div className="absolute top-7 right-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <button
            className="block w-full text-left px-3.5 py-2.5 text-[13px] text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-none bg-white dark:bg-gray-800"
            onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(); }}
          >✏️ Edit Task</button>
          <button
            className="block w-full text-left px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 cursor-pointer border-none bg-white dark:bg-gray-800"
            onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(); }}
          >🗑️ Delete</button>
        </div>
      )}

      {/* Title */}
      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 pr-6">{task.title}</div>

      {/* Roadblock info */}
      {task.status === 'roadblock' && task.roadblockInfo && (
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          {task.roadblockInfo.urgency && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyDot[task.roadblockInfo.urgency] || 'bg-gray-400'}`} />
          )}
          <span className="text-[11px] text-amber-700 leading-snug">
            🚧 {teamMembers.find(m => m.id === task.roadblockInfo.unblockOwnerId)?.name || 'someone'}
          </span>
          {task.roadblockInfo.timesBlocked > 1 && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-800">
              {task.roadblockInfo.timesBlocked}x
            </span>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {task.size && (
          <span className={`text-[11px] px-2 py-0.5 rounded font-bold border-[1.5px] ${sizeBadge[task.size] || ''}`}>
            {task.size}
          </span>
        )}
        <span className={`text-[11px] px-2.5 py-1 rounded-md font-semibold ${priorityBadge[task.priority] || ''}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className="text-[11px] text-gray-500 dark:text-gray-400">📅 {task.dueDate}</span>
        )}
        {owner && (
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${ownerBadge[owner.id] || 'bg-gray-600 text-white'}`}>
            {owner.name}
          </span>
        )}
        {epic && (
          <span
            className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border"
            style={{ color: epic.color, background: epic.color + '18', borderColor: epic.color + '40' }}
            title={feature ? `${epic.name} › ${feature.name}` : epic.name}
          >
            {feature ? feature.id : epic.id}
          </span>
        )}
      </div>

      {/* Linked task indicator */}
      {task.linkedTaskId && (
        <div className="text-[10px] text-sky-500 mt-1">🔗 Linked task</div>
      )}
    </div>
  );
}
