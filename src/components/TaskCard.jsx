import { useState } from 'react';
import { teamMembers, KANBAN_COLUMNS } from '../data/constants';

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

const priorityBorder = {
  high: 'border-l-red-600',
  medium: 'border-l-lime-500',
  low: 'border-l-sky-500',
};

const priorityBadge = {
  high: 'bg-red-100 text-red-900',
  medium: 'bg-yellow-100 text-yellow-900',
  low: 'bg-green-100 text-green-800',
};

const urgencyBadge = {
  'this-week': 'bg-red-100 text-red-900',
  'next-week': 'bg-amber-100 text-amber-900',
  'this-month': 'bg-sky-100 text-sky-800',
  'future': 'bg-gray-100 text-gray-500',
};

export default function TaskCard({ task, isMenuOpen, onToggleMenu, onEdit, onDelete, onMove }) {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const owner = teamMembers.find(m => m.id === task.owner);

  const statusOptions = KANBAN_COLUMNS.map(col => ({ id: col.id, label: col.title }));

  const bgClass = ownerBg[task.owner] || 'bg-gray-200 border-gray-400';

  return (
    <div
      className={`relative rounded-xl p-4 mb-3 border-2 border-l-[5px] shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ${bgClass} ${priorityBorder[task.priority] || ''}`}
    >
      {/* Kebab menu button */}
      <button
        className="absolute top-1/2 right-2 -translate-y-1/2 bg-transparent border-none text-xl text-gray-500 cursor-pointer px-2 py-1 rounded hover:bg-gray-300/50 hover:text-gray-800 z-5 leading-none"
        onClick={(e) => { e.stopPropagation(); onToggleMenu(); setShowSubmenu(false); }}
      >⋮</button>

      {/* Dropdown menu */}
      {isMenuOpen && (
        <div className="absolute top-9 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-sky-100 rounded-t-lg cursor-pointer border-none bg-white"
            onClick={(e) => { e.stopPropagation(); onEdit(); onToggleMenu(); }}
          >✏️ Edit</button>
          <button
            className="relative w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-sky-100 cursor-pointer border-none bg-white"
            onMouseEnter={() => setShowSubmenu(true)}
            onMouseLeave={() => setShowSubmenu(false)}
            onClick={(e) => { e.stopPropagation(); setShowSubmenu(!showSubmenu); }}
          >
            ➡️ Move to...
            {showSubmenu && (
              <div className="absolute right-full top-0 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[140px]">
                {statusOptions
                  .filter(opt => opt.id !== task.status)
                  .map(opt => (
                    <button
                      key={opt.id}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-sky-100 cursor-pointer border-none bg-white first:rounded-t-lg last:rounded-b-lg"
                      onClick={(e) => { e.stopPropagation(); onMove(opt.id); setShowSubmenu(false); }}
                    >{opt.label}</button>
                  ))}
              </div>
            )}
          </button>
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-red-800 hover:bg-red-50 rounded-b-lg cursor-pointer border-none bg-white"
            onClick={(e) => { e.stopPropagation(); onDelete(); onToggleMenu(); }}
          >🗑️ Delete</button>
        </div>
      )}

      {/* Title + Owner badge */}
      <div className="flex items-start justify-between mb-3 pr-6">
        <div className="text-[15px] font-semibold text-gray-800 flex-1 leading-snug">{task.title}</div>
        {owner && (
          <span className={`ml-2 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${ownerBadge[owner.id] || 'bg-gray-600 text-white'}`}>
            {owner.name}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.urgency && (
          <span className={`text-[11px] px-2.5 py-1 rounded-md font-semibold ${urgencyBadge[task.urgency] || 'bg-gray-100 text-gray-500'}`}>
            {task.urgency.replace('-', ' ')}
          </span>
        )}
        <span className={`text-[11px] px-2.5 py-1 rounded-md font-semibold ${priorityBadge[task.priority] || ''}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className="text-xs text-gray-500 flex items-center gap-1">📅 {task.dueDate}</span>
        )}
      </div>

      {/* Notes */}
      {task.notes && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-300/50 text-[13px] text-gray-600 leading-relaxed">
          {task.notes}
        </div>
      )}
    </div>
  );
}
