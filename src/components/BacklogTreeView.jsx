/**
 * BacklogTreeView — rich Epic → Feature → Task hierarchy for the Planning tree view.
 *
 * Features:
 *  - Epic → Feature → Task hierarchy with collapse/expand (localStorage-backed)
 *  - Animated progress bars, chevron rotation, interpunct count badges
 *  - Owner avatar + status pill filters, smart collapse when filtered
 *  - Inline status picker (horizontal pills on click) — 2 taps to change
 *  - Inline owner avatar picker (tap to reassign)
 *  - Sprint dividers within feature task groups
 *  - Overdue task red glow + OVERDUE badge
 *  - Keyboard navigation + shortcut overlay
 *  - Multi-select with floating batch action bar
 *  - Stats summary header (total / done / in-progress / roadblock)
 *  - HTML5 drag-and-drop between features (physical feel)
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { teamMembers, ownerColors } from '../data/constants';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  'not-started': { label: 'Not Started', bg: 'bg-gray-100 dark:bg-gray-700',  text: 'text-gray-600 dark:text-gray-300',  border: 'border-gray-300 dark:border-gray-600' },
  'in-progress':  { label: 'In Progress', bg: 'bg-blue-100 dark:bg-blue-900/40',  text: 'text-blue-700 dark:text-blue-300',  border: 'border-blue-200 dark:border-blue-700'  },
  'roadblock':    { label: 'Roadblock',   bg: 'bg-red-100 dark:bg-red-900/40',   text: 'text-red-700 dark:text-red-300',   border: 'border-red-200 dark:border-red-700'   },
  'done':         { label: 'Done',        bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
};
const STATUS_ORDER = ['not-started', 'in-progress', 'roadblock', 'done'];
const PRIORITY_DOT = { high: '🔴', medium: '🟡', low: '⚪' };

// ── LocalStorage helpers ──────────────────────────────────────────────────────
const LS_E = 'mico_tree_epics';
const LS_F = 'mico_tree_features';

function lsLoad(key) {
  try { const v = localStorage.getItem(key); return v ? new Set(JSON.parse(v)) : null; }
  catch { return null; }
}
function lsSave(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
}

// Default: expand epics whose tasks are in the current or latest sprint
function defaultExpandedEpics(epics, tasks, sprints) {
  if (!sprints.length) return new Set(epics.slice(0, 3).map(e => e.id));
  const now = new Date();
  const current = sprints.find(s => now >= new Date(s.startDate) && now <= new Date(s.endDate));
  const target  = current ?? sprints[sprints.length - 1];
  const ids = new Set(tasks.filter(t => t.sprintId === target?.id && t.epicId).map(t => t.epicId));
  return ids.size ? ids : new Set(epics.slice(0, 2).map(e => e.id));
}

// Group tasks by sprint order (preserving first-seen order)
function groupBySprintOrder(tasks) {
  const order = [];
  const map = {};
  tasks.forEach(t => {
    const key = t.sprintId || '__backlog__';
    if (!map[key]) { map[key] = []; order.push(key); }
    map[key].push(t);
  });
  return order.map(key => ({ key, tasks: map[key] }));
}

// ── InlineEdit ────────────────────────────────────────────────────────────────
function InlineEdit({ value, onSave, className = '', inputClassName = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const inputRef = useRef(null);

  const start  = (e) => { e.stopPropagation(); setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commit = ()  => { if (draft.trim() && draft.trim() !== value) onSave(draft.trim()); setEditing(false); };
  const cancel = ()  => setEditing(false);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') cancel(); }}
        className={`border-0 border-b-2 rounded-none bg-transparent focus:ring-0 focus:outline-none min-w-0 ${inputClassName || 'border-white/60'} ${className}`}
        onClick={e => e.stopPropagation()}
      />
    );
  }
  return (
    <span onDoubleClick={start} title="Double-click to rename" className={`cursor-text ${className}`}>
      {value}
    </span>
  );
}

// ── MiniDropdown (floating menu) ──────────────────────────────────────────────
function MiniDropdown({ open, onClose, children }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[150px] max-h-56 overflow-y-auto">
        {children}
      </div>
    </>
  );
}

// ── TaskRow ───────────────────────────────────────────────────────────────────
function TaskRow({
  task, sprints,
  onStatusChange, onSprintChange, onEditTask, onUpdateTask,
  dragHandlers, isDragging,
  isSelected, onToggleSelect,
  isFocused,
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [ownerOpen,  setOwnerOpen]  = useState(false);

  const st     = STATUS_CFG[task.status] || STATUS_CFG['not-started'];
  const owner  = teamMembers.find(m => m.id === task.owner);
  const oc     = ownerColors[task.owner] || {};
  const sprint = sprints.find(s => s.id === task.sprintId);
  const today  = new Date().toISOString().split('T')[0];
  const overdue = task.dueDate && task.dueDate < today && task.status !== 'done';
  const sprintCls = sprint
    ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700'
    : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700';

  const closeAll = () => { setStatusOpen(false); setSprintOpen(false); setOwnerOpen(false); };

  return (
    <div
      {...dragHandlers}
      draggable
      className={`relative group border-t border-gray-50 dark:border-gray-800 last:border-0 transition-all duration-150 ${
        isDragging  ? 'rotate-1 shadow-xl opacity-70 scale-[1.01] z-50' : ''
      } ${isSelected ? 'bg-sky-50 dark:bg-sky-900/20' : ''} ${
        isFocused ? 'ring-1 ring-inset ring-sky-300' : ''
      }`}
      style={overdue && !isDragging ? { boxShadow: 'inset 3px 0 0 #ef4444' } : undefined}
    >
      {/* Hover tooltip */}
      <div className="pointer-events-none absolute bottom-full left-8 z-50 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out">
        <div className="bg-gray-800 text-white px-3 py-2 rounded-xl shadow-2xl text-xs leading-relaxed min-w-[180px] max-w-[220px]">
          <div className="font-semibold text-gray-100 mb-1.5 text-[11px] leading-tight truncate">{task.title}</div>
          <div className="space-y-0.5 text-gray-300">
            <div className="flex justify-between gap-3">
              <span className="text-gray-400 dark:text-gray-500">Sprint</span>
              <span>{sprint ? `Sprint ${sprint.number}` : 'Backlog'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400 dark:text-gray-500">Status</span>
              <span>{st.label}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400 dark:text-gray-500">Priority</span>
              <span className="capitalize">{task.priority || '—'}</span>
            </div>
            {owner && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400 dark:text-gray-500">Owner</span>
                <span>{owner.name}</span>
              </div>
            )}
            {task.size && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400 dark:text-gray-500">Size</span>
                <span>{task.size}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400 dark:text-gray-500">Due</span>
                <span className={overdue ? 'text-red-400' : ''}>{task.dueDate}</span>
              </div>
            )}
          </div>
          {task.notes && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-600/60 text-gray-200 leading-snug text-[11px]">
              {task.notes.length > 100 ? task.notes.slice(0, 100) + '…' : task.notes}
            </div>
          )}
        </div>
        <div className="absolute top-full left-5 border-[5px] border-transparent border-t-gray-800" />
      </div>

      <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap cursor-grab active:cursor-grabbing">

        {/* Multi-select checkbox — hidden until hover or selected */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect?.(task.id); }}
          className={`shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-opacity duration-150 cursor-pointer ${
            isSelected
              ? 'bg-sky-500 border-sky-500 text-white opacity-100'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-0 group-hover:opacity-70'
          }`}
          title="Select task"
        >{isSelected ? '✓' : ''}</button>

        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-[10px] w-3 shrink-0 cursor-pointer"
        >{task.notes ? (expanded ? '▼' : '▶') : '·'}</button>

        {/* Title — click to open full edit modal */}
        <span
          className="flex-1 text-sm text-gray-800 dark:text-gray-100 truncate hover:text-sky-600 cursor-pointer min-w-0"
          onClick={() => onEditTask?.(task)}
          title={task.title}
        >{task.title}</span>

        {/* Roadblock indicator */}
        {task.status === 'roadblock' && task.roadblockInfo && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0">
            🚧 {teamMembers.find(m => m.id === task.roadblockInfo.unblockOwnerId)?.name || ''}
            {task.roadblockInfo.timesBlocked > 1 ? ` (${task.roadblockInfo.timesBlocked}x)` : ''}
          </span>
        )}

        {/* Linked task badge */}
        {task.linkedTaskId && (
          <span className="text-[9px] text-sky-500 shrink-0" title="Linked to another task">🔗</span>
        )}

        {/* Due date + overdue badge */}
        {task.dueDate && (
          <span className={`text-[10px] font-semibold shrink-0 flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`}>
            {overdue && <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[9px] font-bold px-1 py-0.5 rounded">OVERDUE</span>}
            {overdue ? '⚠️ ' : ''}{task.dueDate}
          </span>
        )}

        {/* Status — inline pill picker (2-tap: tap badge → tap option) */}
        {statusOpen ? (
          <div className="flex items-center gap-1 shrink-0 flex-wrap" onClick={e => e.stopPropagation()}>
            {STATUS_ORDER.map(val => {
              const cfg = STATUS_CFG[val];
              return (
                <button
                  key={val}
                  onClick={() => { onStatusChange?.(task.id, val); setStatusOpen(false); }}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                    val === task.status
                      ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:opacity-100 opacity-60'
                  }`}
                >{cfg.label}</button>
              );
            })}
            <button onClick={e => { e.stopPropagation(); setStatusOpen(false); }} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer text-[10px]">✕</button>
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setStatusOpen(true); setSprintOpen(false); setOwnerOpen(false); }}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer shrink-0 hover:brightness-95 transition-all ${st.bg} ${st.text} ${st.border}`}
          >{st.label}</button>
        )}

        {/* Sprint badge → dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setSprintOpen(v => !v); setStatusOpen(false); setOwnerOpen(false); }}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer ${sprintCls}`}
          >{sprint ? `S${sprint.number}` : 'Backlog'}</button>
          <MiniDropdown open={sprintOpen} onClose={() => setSprintOpen(false)}>
            <button
              onClick={() => { onSprintChange?.(task.id, null); setSprintOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!task.sprintId ? 'bg-gray-50 dark:bg-gray-800 font-bold' : ''}`}
            >📋 Backlog</button>
            {sprints.map(s => (
              <button
                key={s.id}
                onClick={() => { onSprintChange?.(task.id, s.id); setSprintOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${task.sprintId === s.id ? 'bg-gray-50 dark:bg-gray-800 font-bold' : ''}`}
              >Sprint {s.number}</button>
            ))}
          </MiniDropdown>
        </div>

        {/* Priority */}
        <span className="text-[10px] shrink-0">{PRIORITY_DOT[task.priority] || ''}</span>

        {/* Owner — inline avatar picker (2-tap: tap chip → tap avatar) */}
        {ownerOpen ? (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            {teamMembers.map(m => {
              const moc = ownerColors[m.id] || {};
              const isMe = m.id === task.owner;
              return (
                <button
                  key={m.id}
                  onClick={() => { onUpdateTask?.(task.id, { owner: m.id }); setOwnerOpen(false); }}
                  title={m.name}
                  className={`w-6 h-6 rounded-full text-[9px] font-bold border-2 cursor-pointer transition-all ${isMe ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'}`}
                  style={{
                    background: moc.bg, color: moc.text, borderColor: moc.border,
                    boxShadow: isMe ? `0 0 0 2px #fff, 0 0 0 3px ${moc.border}` : 'none',
                  }}
                >{m.name[0]}</button>
              );
            })}
            <button onClick={e => { e.stopPropagation(); setOwnerOpen(false); }} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer text-[10px]">✕</button>
          </div>
        ) : owner ? (
          <span
            onClick={e => { e.stopPropagation(); setOwnerOpen(true); closeAll(); setOwnerOpen(true); }}
            title={`${owner.name} — click to reassign`}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 border cursor-pointer hover:ring-1 hover:ring-gray-300 transition-all select-none"
            style={{ background: oc.bg, color: oc.text, borderColor: oc.border }}
          >{owner.name.split(' ')[0]}</span>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setOwnerOpen(true); }}
            className="text-[10px] text-gray-300 dark:text-gray-600 shrink-0 cursor-pointer hover:text-gray-500 dark:hover:text-gray-400"
          >+ owner</button>
        )}

        {/* Size badge */}
        {task.size && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
            task.size === 'L' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' :
            task.size === 'M' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300' :
            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>{task.size}</span>
        )}

        {/* Task age indicator — shows how many days since creation (stale tasks glow) */}
        {task.createdAt && task.status !== 'done' && (() => {
          const created = typeof task.createdAt === 'string' ? new Date(task.createdAt) : task.createdAt?.toDate ? task.createdAt.toDate() : null;
          if (!created) return null;
          const days = Math.floor((Date.now() - created.getTime()) / 86400000);
          if (days < 7) return null;
          const stale = days >= 30;
          const aging = days >= 14;
          return (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
              stale ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300' :
              aging ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300' :
              'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`} title={`Created ${created.toLocaleDateString()}`}>{days}d</span>
          );
        })()}
      </div>

      {/* Inline notes (expanded) */}
      {expanded && task.notes && (
        <div className="px-8 pb-2.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{task.notes}</div>
      )}
    </div>
  );
}

// ── TaskStats — animated progress summary for epic headers ────────────────────
function TaskStats({ tasks, colorClass = 'text-white/70', barBg = 'bg-white/20' }) {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.status === 'done').length;
  const inP     = tasks.filter(t => t.status === 'in-progress').length;
  const blk     = tasks.filter(t => t.status === 'roadblock').length;
  const realPct = total ? Math.round((done / total) * 100) : 0;

  const [barPct, setBarPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarPct(realPct), 80);
    return () => clearTimeout(t);
  }, [realPct]);

  if (!total) return null;
  const parts = [];
  if (done) parts.push(`${done} done`);
  if (inP)  parts.push(`${inP} in prog`);
  if (blk)  parts.push(`🔴 ${blk}`);
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className={`h-1.5 rounded-full overflow-hidden w-16 ${barBg}`}>
        <div className="h-full bg-white/80 rounded-full transition-[width] duration-[400ms] ease-out" style={{ width: `${barPct}%` }} />
      </div>
      <span className={`text-[10px] hidden sm:inline ${colorClass}`}>
        {parts.join(' · ') || `${total} not started`}
      </span>
    </div>
  );
}

// ── Feature-level animated progress bar ───────────────────────────────────────
function FeatProgress({ tasks }) {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.status === 'done').length;
  const realPct = total ? Math.round((done / total) * 100) : 0;

  const [barPct, setBarPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarPct(realPct), 120);
    return () => clearTimeout(t);
  }, [realPct]);

  if (!total) return null;
  return (
    <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden w-14 shrink-0">
      <div className="h-full bg-green-500 rounded-full transition-[width] duration-[400ms] ease-out" style={{ width: `${barPct}%` }} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function BacklogTreeView({
  tasks, epics, features, sprints,
  onEditTask, onMoveTaskStatus, onMoveTaskSprint, onAddTask, onUpdateTask, onDeleteTask,
  namingOverrides = { epics: {}, features: {} },
  onRenameEpic, onRenameFeature,
}) {
  // ── Collapse state ────────────────────────────────────────────────────────
  const [expandedEpics, setExpandedEpics] = useState(() =>
    lsLoad(LS_E) ?? defaultExpandedEpics(epics, tasks, sprints)
  );
  const [expandedFeatures, setExpandedFeatures] = useState(() =>
    lsLoad(LS_F) ?? new Set(features.map(f => f.id))
  );

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,            setSearch]            = useState('');
  const [filterOwner,       setFilterOwner]       = useState('all');
  const [filterStatus,      setFilterStatus]      = useState('all');
  const [filterSprint,      setFilterSprint]      = useState('all');
  const [filterDevRequests, setFilterDevRequests] = useState(false);
  const [showArchived,      setShowArchived]      = useState(false);

  // ── Drag state ────────────────────────────────────────────────────────────
  const [draggedId,    setDraggedId]    = useState(null);
  const [dragOverFeat, setDragOverFeat] = useState(null);

  // ── Multi-select (Group 7) ────────────────────────────────────────────────
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [batchStatus, setBatchStatus] = useState(false);
  const [batchSprint, setBatchSprint] = useState(false);

  const toggleSelect = useCallback((taskId) => {
    setSelectedTaskIds(prev => {
      const n = new Set(prev);
      n.has(taskId) ? n.delete(taskId) : n.add(taskId);
      return n;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
    setBatchStatus(false);
    setBatchSprint(false);
  }, []);

  // ── Keyboard navigation (Group 6) ─────────────────────────────────────────
  const [focusedTaskId, setFocusedTaskId]   = useState(null);
  const [showShortcuts, setShowShortcuts]   = useState(false);

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleEpic = useCallback((id) => {
    setExpandedEpics(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      lsSave(LS_E, n);
      return n;
    });
  }, []);

  const toggleFeat = useCallback((id) => {
    setExpandedFeatures(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      lsSave(LS_F, n);
      return n;
    });
  }, []);

  const expandAll = () => {
    const e = new Set(epics.map(ep => ep.id));
    const f = new Set(features.map(ft => ft.id));
    setExpandedEpics(e); lsSave(LS_E, e);
    setExpandedFeatures(f); lsSave(LS_F, f);
  };
  const collapseAll = () => {
    setExpandedEpics(new Set()); lsSave(LS_E, new Set());
    setExpandedFeatures(new Set()); lsSave(LS_F, new Set());
  };

  // ── Separate archived vs active tasks ─────────────────────────────────────
  const archivedTasks = useMemo(() => tasks.filter(t => t.archived || (t.status === 'done' && t.archived !== false)), [tasks]);
  const activeTasks   = useMemo(() => tasks.filter(t => !t.archived && !(t.status === 'done' && t.archived !== false)), [tasks]);
  const archiveCount  = archivedTasks.length;

  // ── Filtered tasks (from active or archived depending on toggle) ──────────
  const baseTasks = showArchived ? archivedTasks : activeTasks;
  const filteredTasks = useMemo(() => {
    const q = search.toLowerCase().trim();
    return baseTasks.filter(t => {
      if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterSprint !== 'all') {
        const sid = filterSprint === 'backlog' ? null : filterSprint;
        if ((t.sprintId || null) !== sid) return false;
      }
      if (filterDevRequests && !(t.tags || []).includes('dev-request')) return false;
      if (q) {
        const hay = `${t.title} ${t.owner} ${t.notes || ''} ${(t.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [baseTasks, search, filterOwner, filterStatus, filterSprint, filterDevRequests]);

  // ── Stats (Group 8) ───────────────────────────────────────────────────────
  const totalDone    = filteredTasks.filter(t => t.status === 'done').length;
  const totalInProg  = filteredTasks.filter(t => t.status === 'in-progress').length;
  const totalBlocked = filteredTasks.filter(t => t.status === 'roadblock').length;
  const overallPct   = filteredTasks.length ? Math.round((totalDone / filteredTasks.length) * 100) : 0;
  const overdueCount = filteredTasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.dueDate && t.dueDate < today && t.status !== 'done';
  }).length;
  const [statBarPct, setStatBarPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStatBarPct(overallPct), 60);
    return () => clearTimeout(t);
  }, [overallPct]);

  // ── Group: epicId → featureId → tasks[] ──────────────────────────────────
  const grouped = useMemo(() => {
    const res = {};
    filteredTasks.forEach(t => {
      const eid = t.epicId    || '__none__';
      const fid = t.featureId || '__none__';
      if (!res[eid]) res[eid] = {};
      if (!res[eid][fid]) res[eid][fid] = [];
      res[eid][fid].push(t);
    });
    return res;
  }, [filteredTasks]);

  const hasFilter = !!(search || filterOwner !== 'all' || filterStatus !== 'all' || filterSprint !== 'all' || filterDevRequests);
  const clearFilters = () => { setSearch(''); setFilterOwner('all'); setFilterStatus('all'); setFilterSprint('all'); setFilterDevRequests(false); setShowArchived(false); };

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const makeDrag = (taskId) => ({
    onDragStart: (e) => { setDraggedId(taskId); e.dataTransfer.effectAllowed = 'move'; },
    onDragEnd:   ()  => { setDraggedId(null); setDragOverFeat(null); },
  });

  const makeDrop = (epicId, featureId) => ({
    onDragOver:  (e) => { e.preventDefault(); setDragOverFeat(featureId); },
    onDragLeave: ()  => setDragOverFeat(null),
    onDrop:      (e) => {
      e.preventDefault();
      if (draggedId) {
        // If dragging a selected task, batch-move all selected; else single move
        const ids = selectedTaskIds.has(draggedId) ? [...selectedTaskIds] : [draggedId];
        ids.forEach(id => onUpdateTask?.(id, { epicId, featureId }));
      }
      setDraggedId(null); setDragOverFeat(null);
    },
  });

  // ── Keyboard shortcuts (Group 6) ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setShowShortcuts(v => !v);
        return;
      }
      if (e.key === 'Escape') {
        clearSelection();
        setFocusedTaskId(null);
        setShowShortcuts(false);
        return;
      }

      const idx = filteredTasks.findIndex(t => t.id === focusedTaskId);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = filteredTasks[Math.min(filteredTasks.length - 1, idx + 1)];
        if (next) setFocusedTaskId(next.id);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = filteredTasks[Math.max(0, idx - 1)];
        if (prev) setFocusedTaskId(prev.id);
      }
      if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && focusedTaskId) {
        const t = filteredTasks.find(t => t.id === focusedTaskId);
        if (t) onEditTask?.(t);
      }
      if ((e.key === 's' || e.key === 'S') && focusedTaskId) {
        const t = filteredTasks.find(t => t.id === focusedTaskId);
        if (t) {
          const cur = STATUS_ORDER.indexOf(t.status || 'not-started');
          const next = STATUS_ORDER[(cur + 1) % STATUS_ORDER.length];
          onMoveTaskStatus?.(t.id, next);
        }
      }
      if (e.key === ' ' && focusedTaskId) {
        e.preventDefault();
        toggleSelect(focusedTaskId);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [filteredTasks, focusedTaskId, clearSelection, toggleSelect, onEditTask, onMoveTaskStatus]);

  // ── Batch actions (Group 7) ───────────────────────────────────────────────
  const batchApplyStatus = (newStatus) => {
    [...selectedTaskIds].forEach(id => onMoveTaskStatus?.(id, newStatus));
    setBatchStatus(false);
    clearSelection();
  };
  const batchApplySprint = (sprintId) => {
    [...selectedTaskIds].forEach(id => onMoveTaskSprint?.(id, sprintId));
    setBatchSprint(false);
    clearSelection();
  };
  const batchDelete = () => {
    if (!onDeleteTask) return;
    if (window.confirm(`Delete ${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''}? This cannot be undone.`)) {
      [...selectedTaskIds].forEach(id => onDeleteTask(id));
      clearSelection();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* ── Stats header (Group 8) ─────────────────────────────────────── */}
      <div className="mb-2 shrink-0">
        <div className="flex items-center gap-3 flex-wrap text-xs mb-1.5">
          <span className="text-gray-500 dark:text-gray-400">Total <strong className="text-gray-800 dark:text-gray-100">{filteredTasks.length}</strong></span>
          <span className="text-green-600">Done <strong>{totalDone}</strong></span>
          <span className="text-blue-600">In Progress <strong>{totalInProg}</strong></span>
          {totalBlocked > 0 && <span className="text-red-600">Roadblock <strong>{totalBlocked}</strong></span>}
          {overdueCount > 0 && (
            <span className="animate-pulse text-red-500 font-bold">{overdueCount} overdue</span>
          )}
          {hasFilter && <span className="text-gray-400 dark:text-gray-500 ml-auto">— filtered</span>}
        </div>
        <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${statBarPct}%` }}
          />
        </div>
      </div>

      {/* ── Filter / Search bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 shrink-0">

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs px-3 py-1.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 w-36 focus:border-sky-300 focus:outline-none"
        />

        {/* Owner — avatar circle toggles */}
        <div className="flex items-center gap-1">
          {[{ id: 'all', name: 'All' }, ...teamMembers].map(m => {
            const oc = m.id !== 'all' ? ownerColors[m.id] : null;
            const isSelected = filterOwner === m.id;
            const label = m.id === 'all' ? 'All' : m.name[0];
            return (
              <button
                key={m.id}
                onClick={() => setFilterOwner(m.id)}
                title={m.name}
                className={`w-7 h-7 rounded-full text-[10px] font-bold border-2 transition-all duration-150 cursor-pointer select-none ${
                  isSelected ? 'opacity-100' : 'opacity-35 hover:opacity-70'
                }`}
                style={oc ? {
                  background: oc.bg, color: oc.text, borderColor: oc.border,
                  boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px ${oc.border}` : 'none',
                } : {
                  background: isSelected ? '#dbeafe' : '#f3f4f6',
                  color: '#374151',
                  borderColor: isSelected ? '#93c5fd' : '#e5e7eb',
                  boxShadow: isSelected ? '0 0 0 2px #fff, 0 0 0 4px #60a5fa' : 'none',
                }}
              >{label}</button>
            );
          })}
        </div>

        {/* Status — pill button toggles */}
        <div className="flex items-center gap-1 flex-wrap">
          {[['all', 'All'], ...Object.entries(STATUS_CFG).map(([v, c]) => [v, c.label])].map(([val, label]) => {
            const cfg = STATUS_CFG[val];
            const isSelected = filterStatus === val;
            return (
              <button
                key={val}
                onClick={() => setFilterStatus(val)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-150 cursor-pointer select-none ${
                  isSelected
                    ? cfg
                      ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-90'
                }`}
              >{label}</button>
            );
          })}
        </div>

        {/* Dev Requests quick-filter */}
        <button
          onClick={() => setFilterDevRequests(v => !v)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-150 cursor-pointer select-none ${
            filterDevRequests
              ? 'bg-violet-600 text-white border-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.4)]'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-90'
          }`}
        >
          🛠️ Requests
        </button>

        {/* Archive toggle */}
        <button
          onClick={() => setShowArchived(v => !v)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-150 cursor-pointer select-none ${
            showArchived
              ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-90'
          }`}
        >
          📦 Archive{archiveCount > 0 ? ` (${archiveCount})` : ''}
        </button>

        {/* Sprint */}
        <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)}
          className="text-xs px-2 py-1.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 cursor-pointer">
          <option value="all">All Sprints</option>
          <option value="backlog">📋 Backlog</option>
          {sprints.map(s => <option key={s.id} value={s.id}>Sprint {s.number}</option>)}
        </select>

        {hasFilter && (
          <button onClick={clearFilters}
            className="text-[11px] px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            ✕ Clear
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-400 dark:text-gray-500">{filteredTasks.length} tasks</span>
          <button onClick={expandAll} title="Expand all"
            className="text-[11px] px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">⊞</button>
          <button onClick={collapseAll} title="Collapse all"
            className="text-[11px] px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">⊟</button>
        </div>
      </div>

      {/* ── Tree ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">

        {/* Archive mode banner */}
        {showArchived && (
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <span className="text-lg">📦</span>
            <div className="flex-1">
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Viewing Archive
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">
                {filteredTasks.length} completed task{filteredTasks.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowArchived(false)}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors cursor-pointer font-medium"
            >
              ← Back to Active
            </button>
          </div>
        )}

        {epics.map(epic => {
          const epicData  = grouped[epic.id] || {};
          const epicTasks = Object.values(epicData).flat();
          if (hasFilter && epicTasks.length === 0) return null;
          const isOpen    = expandedEpics.has(epic.id);
          const epicName  = namingOverrides?.epics?.[epic.id] || epic.name;
          const epicFeats = features.filter(f => f.epicId === epic.id);
          const epicDone  = epicTasks.filter(t => t.status === 'done').length;

          return (
            <div
              key={epic.id}
              className="rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 border-l-[3px]"
              style={{ borderLeftColor: epic.color }}
            >
              {/* Epic header */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer select-none"
                style={{ background: epic.color }}
                onClick={() => toggleEpic(epic.id)}
              >
                <span className={`text-[10px] text-white/70 shrink-0 transition-transform duration-200 inline-block ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                <InlineEdit
                  value={epicName}
                  onSave={name => onRenameEpic?.(epic.id, name)}
                  className="flex-1 font-bold text-sm text-white"
                  inputClassName="border-white/60"
                />
                <span className="text-white/60 text-[11px] shrink-0 hidden sm:inline whitespace-nowrap">
                  {epicTasks.length} tasks{epicDone > 0 && <> · <span className="text-green-200">{epicDone} done</span></>}
                </span>
                <TaskStats tasks={epicTasks} colorClass="text-white/70" barBg="bg-white/20" />
              </div>

              {isOpen && (
                <div className="p-2 space-y-1.5" style={{ background: epic.color + '08' }}>

                  {epicFeats.map(feat => {
                    const featTasks = epicData[feat.id] || [];
                    if (hasFilter && featTasks.length === 0) return null;
                    const isFOpen  = expandedFeatures.has(feat.id);
                    const isDragOn = dragOverFeat === feat.id;
                    const featName = namingOverrides?.features?.[feat.id] || feat.name;
                    const inProg   = featTasks.filter(t => t.status === 'in-progress').length;
                    const blocked  = featTasks.filter(t => t.status === 'roadblock').length;
                    const done     = featTasks.filter(t => t.status === 'done').length;
                    const sprintGroups = groupBySprintOrder(featTasks);

                    return (
                      <div
                        key={feat.id}
                        className={`rounded-lg overflow-hidden border transition-all duration-150 ${
                          isDragOn ? 'border-sky-400 ring-2 ring-sky-400/50 ring-offset-1 bg-sky-50/60' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                        {...makeDrop(epic.id, feat.id)}
                      >
                        {/* Feature header */}
                        <div
                          className="group flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer select-none"
                          onClick={() => toggleFeat(feat.id)}
                        >
                          <span className={`text-gray-400 dark:text-gray-500 text-[10px] shrink-0 transition-transform duration-200 inline-block ${isFOpen ? 'rotate-90' : ''}`}>▶</span>
                          <InlineEdit
                            value={featName}
                            onSave={name => onRenameFeature?.(feat.id, name)}
                            className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-200"
                            inputClassName="border-sky-400"
                          />
                          {featTasks.length > 0 && <FeatProgress tasks={featTasks} />}
                          {featTasks.length > 0 && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 shrink-0 font-medium tabular-nums">{done}/{featTasks.length}</span>
                          )}
                          {(inProg > 0 || blocked > 0) && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                              {inProg > 0 && `🔵${inProg} `}{blocked > 0 && `🔴${blocked}`}
                            </span>
                          )}
                          {onAddTask && (
                            <button
                              onClick={e => { e.stopPropagation(); onAddTask({ epicId: epic.id, featureId: feat.id }); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-gray-400 dark:text-gray-500 hover:text-sky-600 text-base leading-none shrink-0 cursor-pointer px-1 font-bold"
                              title="Add task to this feature"
                            >+</button>
                          )}
                        </div>

                        {/* Task rows — grouped by sprint with dividers (Group 6) */}
                        {isFOpen && sprintGroups.map(({ key, tasks: groupTasks }, gi) => (
                          <div key={key}>
                            {sprintGroups.length > 1 && (
                              <div className="flex items-center gap-2 my-1 mx-3">
                                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                                  {key === '__backlog__' ? 'Backlog' : `Sprint ${sprints.find(s => s.id === key)?.number || ''}`}
                                </span>
                                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                              </div>
                            )}
                            {groupTasks.map(task => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                sprints={sprints}
                                onStatusChange={onMoveTaskStatus}
                                onSprintChange={onMoveTaskSprint}
                                onEditTask={onEditTask}
                                onUpdateTask={onUpdateTask}
                                dragHandlers={makeDrag(task.id)}
                                isDragging={draggedId === task.id}
                                isSelected={selectedTaskIds.has(task.id)}
                                onToggleSelect={toggleSelect}
                                isFocused={focusedTaskId === task.id}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Tasks with no feature assignment */}
                  {(epicData['__none__'] || []).length > 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500">Unassigned feature</div>
                      {(epicData['__none__'] || []).map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          sprints={sprints}
                          onStatusChange={onMoveTaskStatus}
                          onSprintChange={onMoveTaskSprint}
                          onEditTask={onEditTask}
                          onUpdateTask={onUpdateTask}
                          dragHandlers={makeDrag(task.id)}
                          isDragging={draggedId === task.id}
                          isSelected={selectedTaskIds.has(task.id)}
                          onToggleSelect={toggleSelect}
                          isFocused={focusedTaskId === task.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Tasks with no epic */}
        {Object.values(grouped['__none__'] || {}).flat().length > 0 && (
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-300 dark:bg-gray-700 cursor-pointer select-none"
              onClick={() => toggleEpic('__none__')}
            >
              <span className={`text-gray-500 dark:text-gray-400 text-[10px] transition-transform duration-200 inline-block ${expandedEpics.has('__none__') ? 'rotate-90' : ''}`}>▶</span>
              <span className="font-bold text-sm text-gray-700 dark:text-gray-200 flex-1">Uncategorized</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{Object.values(grouped['__none__']).flat().length}</span>
            </div>
            {expandedEpics.has('__none__') && (
              <div className="bg-white dark:bg-gray-800">
                {Object.values(grouped['__none__']).flat().map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    sprints={sprints}
                    onStatusChange={onMoveTaskStatus}
                    onSprintChange={onMoveTaskSprint}
                    onEditTask={onEditTask}
                    onUpdateTask={onUpdateTask}
                    dragHandlers={makeDrag(task.id)}
                    isDragging={draggedId === task.id}
                    isSelected={selectedTaskIds.has(task.id)}
                    onToggleSelect={toggleSelect}
                    isFocused={focusedTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-2">{showArchived ? '📦' : '🔍'}</div>
            <div className="text-sm font-medium">
              {showArchived ? 'No archived tasks' : 'No tasks match your filters'}
            </div>
            <div className="text-xs mt-1 text-gray-300 dark:text-gray-600">
              {showArchived ? 'Tasks moved to Done will appear here' : "Clear 'em and start fresh"}
            </div>
          </div>
        )}
      </div>

      {/* ── Floating batch action bar (Group 7) ───────────────────────────── */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gray-900 text-white rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 whitespace-nowrap">
            <span className="text-sm font-semibold">{selectedTaskIds.size} selected</span>

            {/* Status action */}
            <div className="relative">
              <button
                onClick={() => { setBatchStatus(v => !v); setBatchSprint(false); }}
                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >Status</button>
              {batchStatus && (
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[150px]">
                  {STATUS_ORDER.map(val => {
                    const cfg = STATUS_CFG[val];
                    return (
                      <button
                        key={val}
                        onClick={() => batchApplyStatus(val)}
                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${cfg.text}`}
                      >{cfg.label}</button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sprint action */}
            <div className="relative">
              <button
                onClick={() => { setBatchSprint(v => !v); setBatchStatus(false); }}
                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >Sprint</button>
              {batchSprint && (
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[150px]">
                  <button onClick={() => batchApplySprint(null)} className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200">📋 Backlog</button>
                  {sprints.map(s => (
                    <button key={s.id} onClick={() => batchApplySprint(s.id)} className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200">Sprint {s.number}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Delete action */}
            {onDeleteTask && (
              <button
                onClick={batchDelete}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >🗑️ Delete</button>
            )}

            {/* Restore from archive (only visible in archive view) */}
            {showArchived && (
              <button
                onClick={() => batchApplyStatus('not-started')}
                className="text-xs text-amber-400 hover:text-amber-300 hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >↩️ Restore</button>
            )}

            {/* Close */}
            <button onClick={clearSelection} className="text-gray-400 dark:text-gray-500 hover:text-white cursor-pointer ml-1 text-sm">✕</button>
          </div>
        </div>
      )}

      {/* ── Keyboard shortcut button (Group 6) ────────────────────────────── */}
      <button
        onClick={() => setShowShortcuts(true)}
        className={`fixed z-40 w-8 h-8 rounded-full bg-gray-700/80 text-white text-xs font-bold shadow-lg hover:bg-gray-600 cursor-pointer transition-all ${
          selectedTaskIds.size > 0 ? 'bottom-24 right-4' : 'bottom-6 right-4'
        }`}
        title="Keyboard shortcuts (?)"
      >?</button>

      {/* ── Shortcuts overlay ──────────────────────────────────────────────── */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-100">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 cursor-pointer text-lg leading-none">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['↑ / ↓', 'Navigate tasks'],
                ['Enter / E', 'Edit focused task'],
                ['S', 'Cycle status'],
                ['Space', 'Select / deselect'],
                ['Esc', 'Clear & close'],
                ['?', 'This overlay'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border border-gray-300 dark:border-gray-600 shrink-0">{key}</kbd>
                  <span className="text-gray-600 dark:text-gray-300 text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
