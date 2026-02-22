import { useState, useMemo, useCallback } from 'react';
import { teamMembers, ownerColors } from '../data/constants';
import { formatDateRange, isCurrentSprint, isFutureSprint } from '../utils/sprintUtils';
import FilterBar from './ui/FilterBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { AlertTriangle, Calendar, Target, Plus } from 'lucide-react';

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
    <div className={`bg-white dark:bg-gray-800/80 rounded-xl px-5 py-3 mb-3 border border-gray-100 dark:border-gray-700/60 shadow-sm`}>
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Sprint number */}
        <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap tracking-tight">
          {current && <span className="text-emerald-500 mr-1.5">●</span>}
          Sprint {sprint.number}
        </div>

        {/* Date range */}
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {formatDateRange(new Date(sprint.startDate), new Date(sprint.endDate))}
        </span>

        {/* Alert badges */}
        {future && (
          <Badge variant="destructive" className="text-[10px] gap-1 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" /> Future — Sprint {sprint.number}
          </Badge>
        )}
        {past && (
          <Badge variant="warning" className="text-[10px] gap-1 whitespace-nowrap">
            <Calendar className="w-3 h-3" /> Past — Sprint {sprint.number}
          </Badge>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

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
        <Select
          value={selectedSprintId || ''}
          onValueChange={(val) => onSelectSprint(val)}
        >
          <SelectTrigger className="min-w-[160px] text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sprints.map(s => (
              <SelectItem key={s.id} value={s.id}>
                Sprint {s.number}{isCurrentSprint(s) ? ' (Current)' : ''} - {formatDateRange(new Date(s.startDate), new Date(s.endDate))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Goal indicator */}
        {sprint.goal && (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic" title={sprint.goal}>
            <Target className="w-4 h-4" />
          </span>
        )}

        {/* Create sprint button */}
        <Button
          variant="ghost"
          size="sm"
          onMouseEnter={() => setCreateHover(true)}
          onMouseLeave={() => setCreateHover(false)}
          onClick={onCreateSprint}
          className="text-xs font-medium transition-all duration-200 whitespace-nowrap overflow-hidden gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {createHover && 'New Sprint'}
        </Button>
      </div>
    </div>
  );
}
