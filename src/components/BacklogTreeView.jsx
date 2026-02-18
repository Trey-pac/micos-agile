/**
 * BacklogTreeView — rich Epic → Feature → Task hierarchy for the Planning tree view.
 *
 * Features:
 *  - All epics/features visible (future phases collapsed by default)
 *  - Collapse/expand state persisted in localStorage
 *  - Expand All / Collapse All buttons
 *  - Task count badges with done/in-progress/roadblock breakdown
 *  - Progress bars on epic and feature headers
 *  - Task cards: status dropdown, sprint dropdown, priority, owner, size, due date
 *  - Inline epic/feature name editing (double-click)
 *  - Quick-add "+" on feature headers (pre-fills epicId + featureId)
 *  - Search + owner / status / sprint filters
 *  - HTML5 drag-and-drop to move tasks between features
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { teamMembers, ownerColors } from '../data/constants';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  'not-started': { label: 'Not Started', bg: 'bg-gray-100',  text: 'text-gray-600',  border: 'border-gray-300' },
  'in-progress':  { label: 'In Progress', bg: 'bg-blue-100',  text: 'text-blue-700',  border: 'border-blue-200'  },
  'roadblock':    { label: 'Roadblock',   bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-200'   },
  'done':         { label: 'Done',        bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
};
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

// ── InlineEdit ────────────────────────────────────────────────────────────────
function InlineEdit({ value, onSave, className = '' }) {
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
        className={`bg-white/30 border border-white/50 rounded px-1.5 outline-none min-w-0 ${className}`}
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
      <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[150px] max-h-56 overflow-y-auto">
        {children}
      </div>
    </>
  );
}

// ── TaskRow ───────────────────────────────────────────────────────────────────
function TaskRow({ task, sprints, onStatusChange, onSprintChange, onEditTask, dragHandlers }) {
  const [expanded,   setExpanded]   = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);

  const st     = STATUS_CFG[task.status] || STATUS_CFG['not-started'];
  const owner  = teamMembers.find(m => m.id === task.owner);
  const oc     = ownerColors[task.owner] || {};
  const sprint = sprints.find(s => s.id === task.sprintId);
  const today  = new Date().toISOString().split('T')[0];
  const overdue = task.dueDate && task.dueDate < today && task.status !== 'done';
  const sprintCls = sprint
    ? 'bg-sky-100 text-sky-700 border-sky-200'
    : 'bg-orange-100 text-orange-700 border-orange-200';

  return (
    <div {...dragHandlers} draggable className="relative group border-t border-gray-50 last:border-0">
      {/* Hover tooltip */}
      <div className="pointer-events-none absolute bottom-full left-8 z-50 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out">
        <div className="bg-gray-800 text-white px-3 py-2 rounded-xl shadow-2xl text-xs leading-relaxed min-w-[180px] max-w-[220px]">
          <div className="font-semibold text-gray-100 mb-1.5 text-[11px] leading-tight truncate">{task.title}</div>
          <div className="space-y-0.5 text-gray-300">
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">Sprint</span>
              <span>{sprint ? `Sprint ${sprint.number}` : 'Backlog'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">Status</span>
              <span>{st.label}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">Priority</span>
              <span className="capitalize">{task.priority || '—'}</span>
            </div>
            {owner && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400">Owner</span>
                <span>{owner.name}</span>
              </div>
            )}
            {task.size && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400">Size</span>
                <span>{task.size}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400">Due</span>
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

      <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap hover:bg-sky-50/30 cursor-grab active:cursor-grabbing">

        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          className="text-gray-300 hover:text-gray-500 text-[10px] w-3.5 shrink-0 cursor-pointer"
        >{task.notes ? (expanded ? '▼' : '▶') : '·'}</button>

        {/* Title — click to open full edit modal */}
        <span
          className="flex-1 text-sm text-gray-800 truncate hover:text-sky-600 cursor-pointer min-w-0"
          onClick={() => onEditTask?.(task)}
          title={task.title}
        >{task.title}</span>

        {/* Due date */}
        {task.dueDate && (
          <span className={`text-[10px] font-semibold shrink-0 ${overdue ? 'text-red-600' : 'text-gray-400'}`}>
            {overdue ? '⚠️ ' : ''}{task.dueDate}
          </span>
        )}

        {/* Status badge → dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setStatusOpen(v => !v); setSprintOpen(false); }}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer ${st.bg} ${st.text} ${st.border}`}
          >{st.label}</button>
          <MiniDropdown open={statusOpen} onClose={() => setStatusOpen(false)}>
            {Object.entries(STATUS_CFG).map(([val, cfg]) => (
              <button
                key={val}
                onClick={() => { onStatusChange?.(task.id, val); setStatusOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 cursor-pointer ${val === task.status ? 'bg-gray-50 font-bold' : ''}`}
              >{cfg.label}</button>
            ))}
          </MiniDropdown>
        </div>

        {/* Sprint badge → dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setSprintOpen(v => !v); setStatusOpen(false); }}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer ${sprintCls}`}
          >{sprint ? `S${sprint.number}` : 'Backlog'}</button>
          <MiniDropdown open={sprintOpen} onClose={() => setSprintOpen(false)}>
            <button
              onClick={() => { onSprintChange?.(task.id, null); setSprintOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 cursor-pointer ${!task.sprintId ? 'bg-gray-50 font-bold' : ''}`}
            >📋 Backlog</button>
            {sprints.map(s => (
              <button
                key={s.id}
                onClick={() => { onSprintChange?.(task.id, s.id); setSprintOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 cursor-pointer ${task.sprintId === s.id ? 'bg-gray-50 font-bold' : ''}`}
              >Sprint {s.number}</button>
            ))}
          </MiniDropdown>
        </div>

        {/* Priority */}
        <span className="text-[10px] shrink-0">{PRIORITY_DOT[task.priority] || ''}</span>

        {/* Owner */}
        {owner && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 border"
            style={{ background: oc.bg, color: oc.text, borderColor: oc.border }}
          >{owner.name.split(' ')[0]}</span>
        )}

        {/* Size */}
        {task.size && <span className="text-[10px] font-bold text-gray-400 shrink-0">{task.size}</span>}
      </div>

      {/* Inline notes (expanded) */}
      {expanded && task.notes && (
        <div className="px-8 pb-2.5 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{task.notes}</div>
      )}
    </div>
  );
}

// ── TaskStats — inline progress summary for epic/feature headers ──────────────
function TaskStats({ tasks, colorClass = 'text-white/70', barBg = 'bg-white/20' }) {
  const total = tasks.length;
  if (!total) return null;
  const done = tasks.filter(t => t.status === 'done').length;
  const inP  = tasks.filter(t => t.status === 'in-progress').length;
  const blk  = tasks.filter(t => t.status === 'roadblock').length;
  const pct  = Math.round((done / total) * 100);
  const parts = [];
  if (done) parts.push(`${done} done`);
  if (inP)  parts.push(`${inP} in prog`);
  if (blk)  parts.push(`🔴 ${blk}`);
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className={`h-1.5 rounded-full overflow-hidden w-16 ${barBg}`}>
        <div className="h-full bg-white/80 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] hidden sm:inline ${colorClass}`}>
        {parts.join(' · ') || `${total} not started`}
      </span>
    </div>
  );
}

// ── Feature-level progress bar (green on gray) ────────────────────────────────
function FeatProgress({ tasks }) {
  const total = tasks.length;
  if (!total) return null;
  const done = tasks.filter(t => t.status === 'done').length;
  return (
    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-14 shrink-0">
      <div
        className="h-full bg-green-500 rounded-full transition-all"
        style={{ width: `${Math.round((done / total) * 100)}%` }}
      />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function BacklogTreeView({
  tasks, epics, features, sprints,
  onEditTask, onMoveTaskStatus, onMoveTaskSprint, onAddTask, onUpdateTask,
  namingOverrides = { epics: {}, features: {} },
  onRenameEpic, onRenameFeature,
}) {
  // ── Collapse state (localStorage-backed) ─────────────────────────────────
  const [expandedEpics, setExpandedEpics] = useState(() =>
    lsLoad(LS_E) ?? defaultExpandedEpics(epics, tasks, sprints)
  );
  const [expandedFeatures, setExpandedFeatures] = useState(() =>
    lsLoad(LS_F) ?? new Set(features.map(f => f.id))
  );

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [filterOwner,  setFilterOwner]  = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSprint, setFilterSprint] = useState('all');

  // ── Drag state ────────────────────────────────────────────────────────────
  const [draggedId,    setDraggedId]    = useState(null);
  const [dragOverFeat, setDragOverFeat] = useState(null);

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

  // ── Filtered tasks ────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tasks.filter(t => {
      if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterSprint !== 'all') {
        const sid = filterSprint === 'backlog' ? null : filterSprint;
        if ((t.sprintId || null) !== sid) return false;
      }
      if (q) {
        const hay = `${t.title} ${t.owner} ${t.notes || ''} ${(t.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, filterOwner, filterStatus, filterSprint]);

  // ── Group: epicId → featureId → tasks[] ──────────────────────────────────
  const grouped = useMemo(() => {
    const res = {};
    filteredTasks.forEach(t => {
      const eid = t.epicId   || '__none__';
      const fid = t.featureId || '__none__';
      if (!res[eid]) res[eid] = {};
      if (!res[eid][fid]) res[eid][fid] = [];
      res[eid][fid].push(t);
    });
    return res;
  }, [filteredTasks]);

  const hasFilter = !!(search || filterOwner !== 'all' || filterStatus !== 'all' || filterSprint !== 'all');
  const clearFilters = () => { setSearch(''); setFilterOwner('all'); setFilterStatus('all'); setFilterSprint('all'); };

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
      if (draggedId && onUpdateTask) onUpdateTask(draggedId, { epicId, featureId });
      setDraggedId(null); setDragOverFeat(null);
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* ── Filter / Search bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-3 pb-3 border-b border-gray-100 shrink-0">
        <input
          type="text"
          placeholder="🔍 Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs px-3 py-1.5 border-2 border-gray-200 rounded-lg bg-white w-40 focus:border-sky-300 focus:outline-none"
        />
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
          className="text-xs px-2 py-1.5 border-2 border-gray-200 rounded-lg bg-white cursor-pointer">
          <option value="all">All Owners</option>
          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-xs px-2 py-1.5 border-2 border-gray-200 rounded-lg bg-white cursor-pointer">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
        </select>
        <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)}
          className="text-xs px-2 py-1.5 border-2 border-gray-200 rounded-lg bg-white cursor-pointer">
          <option value="all">All Sprints</option>
          <option value="backlog">📋 Backlog</option>
          {sprints.map(s => <option key={s.id} value={s.id}>Sprint {s.number}</option>)}
        </select>
        {hasFilter && (
          <button onClick={clearFilters}
            className="text-[11px] px-2.5 py-1 border border-gray-200 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer">
            ✕ Clear
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-400">{filteredTasks.length} tasks</span>
          <button onClick={expandAll} title="Expand all"
            className="text-[11px] px-2 py-1 border border-gray-200 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer">⊞</button>
          <button onClick={collapseAll} title="Collapse all"
            className="text-[11px] px-2 py-1 border border-gray-200 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer">⊟</button>
        </div>
      </div>

      {/* ── Tree ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">

        {epics.map(epic => {
          const epicData  = grouped[epic.id] || {};
          const epicTasks = Object.values(epicData).flat();
          if (hasFilter && epicTasks.length === 0) return null;
          const isOpen   = expandedEpics.has(epic.id);
          const epicName = namingOverrides?.epics?.[epic.id] || epic.name;
          const epicFeats = features.filter(f => f.epicId === epic.id);

          return (
            <div key={epic.id} className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">

              {/* Epic header */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer select-none"
                style={{ background: epic.color }}
                onClick={() => toggleEpic(epic.id)}
              >
                <span className="text-xs text-white/60 shrink-0">{isOpen ? '▼' : '▶'}</span>
                <InlineEdit
                  value={epicName}
                  onSave={name => onRenameEpic?.(epic.id, name)}
                  className="flex-1 font-bold text-sm text-white"
                />
                <TaskStats tasks={epicTasks} colorClass="text-white/70" barBg="bg-white/20" />
                <span className="bg-white/25 text-white text-xs px-2 py-0.5 rounded-full font-bold shrink-0">
                  {epicTasks.length}
                </span>
              </div>

              {isOpen && (
                <div className="bg-gray-50/30 p-2 space-y-1.5">

                  {epicFeats.map(feat => {
                    const featTasks = epicData[feat.id] || [];
                    if (hasFilter && featTasks.length === 0) return null;
                    const isFOpen  = expandedFeatures.has(feat.id);
                    const isDragOn = dragOverFeat === feat.id;
                    const featName = namingOverrides?.features?.[feat.id] || feat.name;
                    const inProg   = featTasks.filter(t => t.status === 'in-progress').length;
                    const blocked  = featTasks.filter(t => t.status === 'roadblock').length;
                    const done     = featTasks.filter(t => t.status === 'done').length;

                    return (
                      <div
                        key={feat.id}
                        className={`rounded-lg overflow-hidden border transition-colors ${
                          isDragOn ? 'border-sky-400 ring-2 ring-sky-300/40 bg-sky-50/60' : 'border-gray-200 bg-white'
                        }`}
                        {...makeDrop(epic.id, feat.id)}
                      >
                        {/* Feature header */}
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none"
                          onClick={() => toggleFeat(feat.id)}
                        >
                          <span className="text-gray-400 text-[10px] shrink-0">{isFOpen ? '▼' : '▶'}</span>
                          <InlineEdit
                            value={featName}
                            onSave={name => onRenameFeature?.(feat.id, name)}
                            className="flex-1 text-xs font-semibold text-gray-700"
                          />
                          {featTasks.length > 0 && <FeatProgress tasks={featTasks} />}
                          {featTasks.length > 0 && (
                            <span className="text-[10px] text-gray-500 shrink-0 font-medium tabular-nums">
                              {done}/{featTasks.length}
                            </span>
                          )}
                          {(inProg > 0 || blocked > 0) && (
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {inProg > 0 && `🔵${inProg} `}{blocked > 0 && `🔴${blocked}`}
                            </span>
                          )}
                          {onAddTask && (
                            <button
                              onClick={e => { e.stopPropagation(); onAddTask({ epicId: epic.id, featureId: feat.id }); }}
                              className="text-gray-400 hover:text-sky-600 text-base leading-none shrink-0 cursor-pointer px-1 font-bold"
                              title="Add task to this feature"
                            >+</button>
                          )}
                        </div>

                        {/* Task rows */}
                        {isFOpen && featTasks.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            sprints={sprints}
                            onStatusChange={onMoveTaskStatus}
                            onSprintChange={onMoveTaskSprint}
                            onEditTask={onEditTask}
                            dragHandlers={makeDrag(task.id)}
                          />
                        ))}
                      </div>
                    );
                  })}

                  {/* Tasks with no feature assignment */}
                  {(epicData['__none__'] || []).length > 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-white">
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400">Unassigned feature</div>
                      {(epicData['__none__'] || []).map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          sprints={sprints}
                          onStatusChange={onMoveTaskStatus}
                          onSprintChange={onMoveTaskSprint}
                          onEditTask={onEditTask}
                          dragHandlers={makeDrag(task.id)}
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
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <div
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-300 cursor-pointer select-none"
              onClick={() => toggleEpic('__none__')}
            >
              <span className="text-gray-500 text-xs">{expandedEpics.has('__none__') ? '▼' : '▶'}</span>
              <span className="font-bold text-sm text-gray-700 flex-1">Uncategorized</span>
              <span className="text-xs text-gray-500">{Object.values(grouped['__none__']).flat().length}</span>
            </div>
            {expandedEpics.has('__none__') && (
              <div className="bg-white">
                {Object.values(grouped['__none__']).flat().map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    sprints={sprints}
                    onStatusChange={onMoveTaskStatus}
                    onSprintChange={onMoveTaskSprint}
                    onEditTask={onEditTask}
                    dragHandlers={makeDrag(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">No tasks match the current filters</div>
          </div>
        )}
      </div>
    </div>
  );
}
