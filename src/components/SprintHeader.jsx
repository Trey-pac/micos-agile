import { useState, useMemo, useCallback } from 'react';
import { teamMembers, ownerColors } from '../data/constants';
import { formatDateRange, isCurrentSprint, isFutureSprint } from '../utils/sprintUtils';
import FilterBar from './ui/FilterBar';

export default function SprintHeader({
  sprint, sprints, selectedSprintId, onSelectSprint, onCreateSprint,
  viewFilter, onViewFilterChange,
  filterPriority = 'all', onFilterPriorityChange,
  filterSize = 'all', onFilterSizeChange,
}) {
  const [createHover, setCreateHover] = useState(false);

  const filters = useMemo(() => ({
    owner: viewFilter, priority: filterPriority, size: filterSize,
  }), [viewFilter, filterPriority, filterSize]);

  const handleFilterChange = useCallback((key, value) => {
    if (key === 'owner') onViewFilterChange(value);
    else if (key === 'priority' && onFilterPriorityChange) onFilterPriorityChange(value);
    else if (key === 'size' && onFilterSizeChange) onFilterSizeChange(value);
  }, [onViewFilterChange, onFilterPriorityChange, onFilterSizeChange]);

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

        {/* Unified FilterBar: owner pills + priority + size + chips */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          teamMembers={teamMembers}
          ownerColors={ownerColors}
          showPriority={!!onFilterPriorityChange}
          showSize={!!onFilterSizeChange}
        />

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
