import { useMemo } from 'react';
import { CircleDot, Circle, Rocket, Construction, CheckCircle2, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/**
 * FilterBar — Reusable filter bar with active filter chips.
 *
 * Renders a horizontal bar of filter controls (owner pills, priority/size selects)
 * with active filter chips displayed below when any filter is active.
 *
 * Props:
 *   filters        — { owner: 'all', priority: 'all', size: 'all', status: 'all' }
 *   onFilterChange — (key, value) => void
 *   teamMembers    — [{ id, name, color }] from constants
 *   ownerColors    — { trey: { text, bg, border } } from constants
 *   showPriority   — bool (default true)
 *   showSize       — bool (default true)
 *   showStatus     — bool (default false)
 *   className      — additional wrapper classes
 */

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SIZE_OPTIONS = [
  { value: 'all', label: 'All Sizes' },
  { value: 'S', label: 'S - Small' },
  { value: 'M', label: 'M - Medium' },
  { value: 'L', label: 'L - Large' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'roadblock', label: 'Roadblock' },
  { value: 'done', label: 'Done' },
];

const ownerAvatarColors = {
  trey: 'bg-emerald-600',
  halie: 'bg-cyan-600',
  ricardo: 'bg-orange-500',
  team: 'bg-violet-600',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function FilterBar({
  filters = {},
  onFilterChange,
  teamMembers = [],
  ownerColors = {},
  showPriority = true,
  showSize = true,
  showStatus = false,
  className = '',
}) {
  const { owner = 'all', priority = 'all', size = 'all', status = 'all' } = filters;

  const activeChips = useMemo(() => {
    const chips = [];
    if (owner !== 'all') {
      const m = teamMembers.find(t => t.id === owner);
      chips.push({ key: 'owner', label: m?.name || owner, color: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300' });
    }
    if (priority !== 'all') {
      const p = PRIORITY_OPTIONS.find(o => o.value === priority);
      chips.push({ key: 'priority', label: p?.label || priority, color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300' });
    }
    if (size !== 'all') {
      chips.push({ key: 'size', label: `Size: ${size}`, color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300' });
    }
    if (status !== 'all') {
      const s = STATUS_OPTIONS.find(o => o.value === status);
      chips.push({ key: 'status', label: s?.label || status, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300' });
    }
    return chips;
  }, [owner, priority, size, status, teamMembers]);

  const hasActive = activeChips.length > 0;

  return (
    <div className={className}>
      {/* Filter controls row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Owner avatar toggles */}
        <button
          onClick={() => onFilterChange('owner', 'all')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-150 border ${
            owner === 'all'
              ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              : 'border-transparent bg-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >All</button>
        {teamMembers.map(m => {
          const isActive = owner === m.id;
          const avatarBg = ownerAvatarColors[m.id] || 'bg-gray-500';
          return (
            <button
              key={m.id}
              onClick={() => onFilterChange('owner', isActive ? 'all' : m.id)}
              className={`flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-150 border ${
                isActive
                  ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  : 'border-transparent bg-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title={m.name}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold ${avatarBg} ${isActive ? '' : 'opacity-60'}`}>
                {getInitials(m.name)}
              </span>
              <span className="hidden sm:inline pr-1">{m.name}</span>
            </button>
          );
        })}

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />

        {/* Priority filter */}
        {showPriority && (
          <Select value={priority} onValueChange={(val) => onFilterChange('priority', val)}>
            <SelectTrigger className="min-w-[100px] h-7 text-[11px] font-medium">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Size filter */}
        {showSize && (
          <Select value={size} onValueChange={(val) => onFilterChange('size', val)}>
            <SelectTrigger className="min-w-[90px] h-7 text-[11px] font-medium">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status filter */}
        {showStatus && (
          <Select value={status} onValueChange={(val) => onFilterChange('status', val)}>
            <SelectTrigger className="min-w-[110px] h-7 text-[11px] font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear button */}
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onFilterChange('owner', 'all');
              onFilterChange('priority', 'all');
              onFilterChange('size', 'all');
              onFilterChange('status', 'all');
            }}
          >
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActive && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {activeChips.map(chip => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="cursor-pointer text-[10px] gap-1 hover:bg-muted/80"
              onClick={() => onFilterChange(chip.key, 'all')}
            >
              {chip.label}
              <X className="h-2.5 w-2.5 opacity-50" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
