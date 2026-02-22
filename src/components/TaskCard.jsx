import { useState, useEffect } from 'react';
import { teamMembers, KANBAN_COLUMNS } from '../data/constants';
import { epics, features } from '../data/epicFeatureHierarchy';
import { Badge } from './ui/Badge';
import { Popover, PopoverTrigger, PopoverContent } from './ui/Popover';
import { Pencil, MoveRight, Trash2, Construction, Calendar, Link, MoreHorizontal } from 'lucide-react';

const ownerAvatarColors = {
  trey: 'bg-emerald-600',
  halie: 'bg-cyan-600',
  ricardo: 'bg-orange-500',
  team: 'bg-violet-600',
};

const priorityAccent = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-400',
  low: 'border-l-sky-400',
};

const priorityBadge = {
  high: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
};

const urgencyBadge = {
  'this-week': 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'next-week': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'this-month': 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
  'future': 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400',
};

const urgencyDot = {
  immediate: 'bg-red-500',
  'end-of-day': 'bg-yellow-400',
  'end-of-sprint': 'bg-blue-400',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

/** Resolve owners array — backward-compatible with single `owner` field */
function getTaskOwners(task) {
  if (Array.isArray(task.owners) && task.owners.length > 0) return task.owners;
  if (task.owner) return [task.owner];
  return [];
}

export default function TaskCard({ task, isMenuOpen, onToggleMenu, onEdit, onDelete, onMove, onNavigateToTask, onCardClick }) {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const ownerIds = getTaskOwners(task);
  const owners = ownerIds.map(id => teamMembers.find(m => m.id === id)).filter(Boolean);

  // Close the kebab menu when the user scrolls any ancestor container
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleScroll = () => { onToggleMenu(); setShowSubmenu(false); };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isMenuOpen, onToggleMenu]);

  const epic = epics.find(e => e.id === task.epicId);
  const feature = features.find(f => f.id === task.featureId);
  const statusOptions = KANBAN_COLUMNS.map(col => ({ id: col.id, label: col.title }));

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 border-l-2 ${priorityAccent[task.priority] || 'border-l-gray-200'} p-3.5 flex flex-col gap-2.5 hover:shadow-md transition-shadow duration-200 cursor-pointer group`}
      onClick={() => onCardClick?.()}
    >
      {/* Kebab menu button — visible on hover */}
      <Popover open={isMenuOpen} onOpenChange={(open) => { if (open !== isMenuOpen) onToggleMenu(); setShowSubmenu(false); }}>
        <PopoverTrigger asChild>
          <button
            className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 bg-transparent border-none text-gray-400 dark:text-gray-500 cursor-pointer p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 z-10 transition-opacity duration-150"
            onClick={(e) => { e.stopPropagation(); }}
          ><MoreHorizontal className="w-4 h-4" /></button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[150px] p-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-none bg-transparent flex items-center gap-2 rounded-md"
            onClick={(e) => { e.stopPropagation(); onEdit(); onToggleMenu(); }}
          ><Pencil className="w-3.5 h-3.5" /> Edit</button>
          <button
            className="relative w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-none bg-transparent flex items-center gap-2 rounded-md"
            onMouseEnter={() => setShowSubmenu(true)}
            onMouseLeave={() => setShowSubmenu(false)}
            onClick={(e) => { e.stopPropagation(); setShowSubmenu(!showSubmenu); }}
          >
            <MoveRight className="w-3.5 h-3.5" /> Move to…
            {showSubmenu && (
              <div className="absolute right-full top-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl min-w-[140px] py-1">
                {statusOptions
                  .filter(opt => opt.id !== task.status)
                  .map(opt => (
                    <button
                      key={opt.id}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-none bg-transparent"
                      onClick={(e) => { e.stopPropagation(); onMove(opt.id); setShowSubmenu(false); }}
                    >{opt.label}</button>
                  ))}
              </div>
            )}
          </button>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          <button
            className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer border-none bg-transparent flex items-center gap-2 rounded-md"
            onClick={(e) => { e.stopPropagation(); onDelete(); onToggleMenu(); }}
          ><Trash2 className="w-3.5 h-3.5" /> Delete</button>
        </PopoverContent>
      </Popover>

      {/* Top row: badges */}
      <div className="flex items-center gap-1.5 flex-wrap pr-6">
        {task.priority && (
          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'warning' : 'info'} className="text-[10px] uppercase tracking-wide">
            {task.priority}
          </Badge>
        )}
        {task.urgency && (
          <Badge variant={task.urgency === 'this-week' ? 'destructive' : task.urgency === 'next-week' ? 'warning' : 'secondary'} className="text-[10px]">
            {task.urgency.replace('-', ' ')}
          </Badge>
        )}
        {task.size && (
          <Badge className="text-[10px] bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
            {task.size}
          </Badge>
        )}
        {epic && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border"
            style={{ color: epic.color, background: epic.color + '12', borderColor: epic.color + '30' }}
            title={feature ? `${epic.name} › ${feature.name}` : epic.name}
          >
            {feature ? feature.id : epic.id}
          </span>
        )}
      </div>

      {/* Title — 2 lines max */}
      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 tracking-tight">
        {task.title}
      </h3>

      {/* Notes preview — 1 line */}
      {task.notes && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-relaxed">
          {task.notes}
        </p>
      )}

      {/* Roadblock info */}
      {task.status === 'roadblock' && task.roadblockInfo && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-900/20 rounded-lg px-2 py-1.5">
          {task.roadblockInfo.urgency && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyDot[task.roadblockInfo.urgency] || 'bg-gray-400'}`} />
          )}
          <span className="truncate">
            <Construction className="w-3.5 h-3.5 inline mr-1" />Waiting on {teamMembers.find(m => m.id === task.roadblockInfo.unblockOwnerId)?.name || 'someone'}
          </span>
          {task.roadblockInfo.timesBlocked > 1 && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shrink-0">
              {task.roadblockInfo.timesBlocked}×
            </span>
          )}
        </div>
      )}

      {/* Bottom row: date + avatar */}
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {task.dueDate}
            </span>
          )}
          {task.linkedTaskId && (
            <button
              className="text-sky-500 hover:text-sky-600 cursor-pointer bg-transparent border-none p-0"
              onClick={(e) => { e.stopPropagation(); if (onNavigateToTask) onNavigateToTask(task.linkedTaskId); }}
              title="Linked task"
            >
              <Link className="w-3 h-3" />
            </button>
          )}
        </div>

        {owners.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {owners.slice(0, 3).map(o => (
              <div
                key={o.id}
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white dark:ring-gray-800 ${ownerAvatarColors[o.id] || 'bg-gray-500'}`}
                title={o.name}
              >
                {getInitials(o.name)}
              </div>
            ))}
            {owners.length > 3 && (
              <div className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] text-gray-500 font-bold ring-2 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-gray-600">
                +{owners.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
