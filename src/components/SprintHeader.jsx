import { useState } from 'react';
import { teamMembers, ownerColors } from '../data/constants';
import { formatDateRange, isCurrentSprint, isFutureSprint } from '../utils/sprintUtils';

export default function SprintHeader({ sprint, sprints, selectedSprintId, onSelectSprint, onCreateSprint, viewFilter, onViewFilterChange }) {
  const [createHover, setCreateHover] = useState(false);

  if (!sprint) return null;

  const current = isCurrentSprint(sprint);
  const future = isFutureSprint(sprint);
  const past = !current && !future;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-[14px] px-5 py-3.5 mb-3 shadow-md border-2 ${current ? 'border-emerald-500' : past ? 'border-amber-500' : 'border-gray-200 dark:border-gray-700'}`}>
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Sprint number */}
        <div className="font-bold text-[17px] whitespace-nowrap">
          {current && <span className="text-emerald-500 mr-1.5">●</span>}
          Sprint {sprint.number}
        </div>

        {/* Date range */}
        <span className="text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDateRange(new Date(sprint.startDate), new Date(sprint.endDate))}
        </span>

        {/* Alert badges */}
        {future && (
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-semibold whitespace-nowrap bg-red-50 text-red-800 border border-red-300">
            ⚠️ Future sprint — tasks go to Sprint {sprint.number}
          </span>
        )}
        {past && (
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-semibold whitespace-nowrap bg-yellow-50 text-yellow-800 border border-yellow-300">
            📅 Past sprint — Sprint {sprint.number} completed
          </span>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-0.5" />

        {/* Team filter: All */}
        <button
          onClick={() => onViewFilterChange('all')}
          className={`px-3 py-1 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all duration-200 ${
            viewFilter === 'all'
              ? 'border-sky-500 bg-sky-500 text-white'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}
        >All</button>

        {/* Team filter: per member */}
        {teamMembers.map(m => {
          const c = ownerColors[m.id];
          const isActive = viewFilter === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onViewFilterChange(isActive ? 'all' : m.id)}
              className="px-3 py-1 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all duration-200 whitespace-nowrap"
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sprint selector */}
        <select
          className="min-w-[170px] text-[13px] px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-medium text-gray-800 dark:text-gray-100 cursor-pointer"
          value={selectedSprintId || ''}
          onChange={(e) => onSelectSprint(e.target.value)}
        >
          {sprints.map(s => (
            <option key={s.id} value={s.id}>
              Sprint {s.number}{isCurrentSprint(s) ? ' (Current)' : ''} - {formatDateRange(new Date(s.startDate), new Date(s.endDate))}
            </option>
          ))}
        </select>

        {/* Goal indicator */}
        {sprint.goal && (
          <span className="text-xs text-gray-500 dark:text-gray-400 italic" title={sprint.goal}>🎯</span>
        )}

        {/* Create sprint button */}
        <button
          onMouseEnter={() => setCreateHover(true)}
          onMouseLeave={() => setCreateHover(false)}
          onClick={onCreateSprint}
          className="bg-sky-500 text-white border-none rounded-lg text-sm font-bold cursor-pointer transition-all duration-200 whitespace-nowrap overflow-hidden"
          style={{ padding: createHover ? '8px 16px' : '8px 12px' }}
        >{createHover ? '+ New Sprint' : '+'}</button>
      </div>
    </div>
  );
}
