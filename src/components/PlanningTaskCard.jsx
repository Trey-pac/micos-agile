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

const sizeBadge = {
  S: 'bg-blue-200 text-blue-900 border-blue-400',
  M: 'bg-amber-200 text-amber-900 border-amber-400',
  L: 'bg-red-200 text-red-900 border-red-400',
};

export default function PlanningTaskCard({ task, isMenuOpen, onToggleMenu, onEdit, onDelete }) {
  const owner = teamMembers.find(m => m.id === task.owner);
  const epic = epics.find(e => e.id === task.epicId);
  const feature = features.find(f => f.id === task.featureId);
  const bgClass = ownerBg[task.owner] || 'bg-gray-200 border-gray-400';
  const hasDetails = task.notes || task.dueDate || task.urgency || epic;

  return (
    <div
      className={`group relative rounded-[10px] p-3 mb-2.5 border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${bgClass}`}
    >
      {/* Hover preview tooltip */}
      {hasDetails && (
        <div className="hidden group-hover:block absolute bottom-full left-0 right-0 bg-gray-800 text-white p-3 rounded-[10px] text-xs leading-relaxed z-50 shadow-xl mb-1.5 pointer-events-none">
          {task.urgency && (
            <div className="mb-1"><span className="text-gray-400 font-semibold mr-1.5">Urgency:</span>{task.urgency.replace('-', ' ')}</div>
          )}
          {task.dueDate && (
            <div className="mb-1"><span className="text-gray-400 font-semibold mr-1.5">Due:</span>{task.dueDate}</div>
          )}
          {owner && (
            <div className="mb-1"><span className="text-gray-400 font-semibold mr-1.5">Owner:</span>{owner.name}</div>
          )}
          {task.size && (
            <div className="mb-1"><span className="text-gray-400 font-semibold mr-1.5">Size:</span>{task.size === 'S' ? 'Small' : task.size === 'M' ? 'Medium' : 'Large'}</div>
          )}
          {task.notes && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-600 text-gray-300">
              <span className="text-gray-400 font-semibold mr-1.5">Notes:</span>{task.notes}
            </div>
          )}
          {epic && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-600">
              <span className="font-semibold" style={{ color: epic.color }}>{epic.name}</span>
              {feature && <div className="text-gray-300 text-[10px] mt-0.5">{feature.name}</div>}
            </div>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-5 border-[6px] border-transparent border-t-gray-800" />
        </div>
      )}

      {/* Kebab menu */}
      <button
        className="absolute top-2 right-1.5 bg-transparent border-none cursor-pointer text-base text-gray-500 px-1.5 py-0.5 rounded opacity-50 hover:opacity-100 hover:bg-black/10 leading-none"
        onClick={(e) => { e.stopPropagation(); if (onToggleMenu) onToggleMenu(); }}
      >⋮</button>

      {isMenuOpen && (
        <div className="absolute top-7 right-1.5 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <button
            className="block w-full text-left px-3.5 py-2.5 text-[13px] text-gray-800 hover:bg-gray-100 cursor-pointer border-none bg-white"
            onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(); }}
          >✏️ Edit Task</button>
          <button
            className="block w-full text-left px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 cursor-pointer border-none bg-white"
            onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(); }}
          >🗑️ Delete</button>
        </div>
      )}

      {/* Title */}
      <div className="text-sm font-semibold text-gray-800 mb-2 pr-6">{task.title}</div>

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
          <span className="text-[11px] text-gray-500">📅 {task.dueDate}</span>
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
    </div>
  );
}
