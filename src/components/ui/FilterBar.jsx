import { useMemo } from 'react';

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
  { value: 'high', label: '🔴 High' },
  { value: 'medium', label: '🟠 Medium' },
  { value: 'low', label: '🟢 Low' },
];

const SIZE_OPTIONS = [
  { value: 'all', label: 'All Sizes' },
  { value: 'S', label: 'S - Small' },
  { value: 'M', label: 'M - Medium' },
  { value: 'L', label: 'L - Large' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not-started', label: '📝 Not Started' },
  { value: 'in-progress', label: '🚀 In Progress' },
  { value: 'roadblock', label: '🚧 Roadblock' },
  { value: 'done', label: '✅ Done' },
];

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
      chips.push({ key: 'owner', label: `Owner: ${m?.name || owner}`, color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' });
    }
    if (priority !== 'all') {
      const p = PRIORITY_OPTIONS.find(o => o.value === priority);
      chips.push({ key: 'priority', label: p?.label || priority, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' });
    }
    if (size !== 'all') {
      chips.push({ key: 'size', label: `Size: ${size}`, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' });
    }
    if (status !== 'all') {
      const s = STATUS_OPTIONS.find(o => o.value === status);
      chips.push({ key: 'status', label: s?.label || status, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' });
    }
    return chips;
  }, [owner, priority, size, status, teamMembers]);

  const hasActive = activeChips.length > 0;

  return (
    <div className={className}>
      {/* Filter controls row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Owner pills */}
        <button
          onClick={() => onFilterChange('owner', 'all')}
          className={`px-3 py-1 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all duration-200 ${
            owner === 'all'
              ? 'border-sky-500 bg-sky-500 text-white'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}
        >All</button>
        {teamMembers.map(m => {
          const c = ownerColors[m.id] || { text: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' };
          const isActive = owner === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onFilterChange('owner', isActive ? 'all' : m.id)}
              className="px-3 py-1 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all duration-200 whitespace-nowrap"
              style={{
                borderColor: isActive ? c.text : c.border,
                background: isActive ? c.bg : undefined,
                color: c.text,
                opacity: isActive ? 1 : 0.7,
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
              }}
            >{m.name}</button>
          );
        })}

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

        {/* Priority filter */}
        {showPriority && (
          <select
            className="min-w-[110px] text-xs px-2 py-1.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium cursor-pointer"
            value={priority}
            onChange={e => onFilterChange('priority', e.target.value)}
          >
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {/* Size filter */}
        {showSize && (
          <select
            className="min-w-[100px] text-xs px-2 py-1.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium cursor-pointer"
            value={size}
            onChange={e => onFilterChange('size', e.target.value)}
          >
            {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {/* Status filter */}
        {showStatus && (
          <select
            className="min-w-[120px] text-xs px-2 py-1.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium cursor-pointer"
            value={status}
            onChange={e => onFilterChange('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {/* Clear button */}
        {hasActive && (
          <button
            className="text-[11px] px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              onFilterChange('owner', 'all');
              onFilterChange('priority', 'all');
              onFilterChange('size', 'all');
              onFilterChange('status', 'all');
            }}
          >✕ Clear</button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActive && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {activeChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => onFilterChange(chip.key, 'all')}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${chip.color}`}
            >
              {chip.label}
              <span className="ml-0.5 text-[9px] opacity-60">✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
