import { teamMembers, ownerColors } from '../../data/constants';

// ── Status config (shared with BacklogTreeView) ──
const STATUS_CFG = {
  'not-started': { label: 'Not Started', bg: 'bg-gray-100 dark:bg-gray-700',  text: 'text-gray-600 dark:text-gray-300',  border: 'border-gray-300 dark:border-gray-600' },
  'in-progress':  { label: 'In Progress', bg: 'bg-blue-100 dark:bg-blue-900/40',  text: 'text-blue-700 dark:text-blue-300',  border: 'border-blue-200 dark:border-blue-700'  },
  'roadblock':    { label: 'Roadblock',   bg: 'bg-red-100 dark:bg-red-900/40',   text: 'text-red-700 dark:text-red-300',   border: 'border-red-200 dark:border-red-700'   },
  'done':         { label: 'Done',        bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
};
const STATUS_ORDER = ['not-started', 'in-progress', 'roadblock', 'done'];

/**
 * BatchEditPanel — Floating multi-select editor for planning tasks.
 * Extracted from BacklogTreeView Group 7.
 */
export default function BatchEditPanel({
  selectedCount,
  stagedEdits,
  stageEdit,
  unstageEdit,
  stagedCount,
  onSave,
  onDelete,
  onCancel,
  showArchived,
  sprints,
  canDelete,
  batchEditorOpen,
  setBatchEditorOpen,
}) {
  const isStaged = (field, val) => stagedEdits[field] === val;
  const selCls = (field, val, base) =>
    `${base} ${isStaged(field, val) ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-gray-800 scale-[1.04]' : 'opacity-80 hover:opacity-100'}`;

  const editPanel = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="bg-sky-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">{selectedCount}</span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Edit {selectedCount} task{selectedCount > 1 ? 's' : ''}</span>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer text-lg leading-none">✕</button>
      </div>

      {/* Body — all fields */}
      <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

        {/* ── Status ── */}
        <div>
          <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ORDER.map(val => {
              const cfg = STATUS_CFG[val];
              return (
                <button key={val} onClick={() => stageEdit('status', val)}
                  className={selCls('status', val, `${cfg.bg} ${cfg.text} border ${cfg.border} rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer transition-all active:scale-95 text-center`)}
                >{cfg.label}</button>
              );
            })}
          </div>
        </div>

        {/* ── Sprint ── */}
        <div>
          <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">Sprint</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => stageEdit('sprintId', null)}
              className={selCls('sprintId', null, 'px-3 py-2 rounded-xl text-sm font-semibold bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 cursor-pointer transition-all active:scale-95')}
            >📋 Backlog</button>
            {sprints.map(s => (
              <button key={s.id} onClick={() => stageEdit('sprintId', s.id)}
                className={selCls('sprintId', s.id, 'px-3 py-2 rounded-xl text-sm font-semibold bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 cursor-pointer transition-all active:scale-95')}
              >Sprint {s.number}</button>
            ))}
          </div>
        </div>

        {/* ── Owner ── */}
        <div>
          <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">Owner</label>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map(m => {
              const moc = ownerColors[m.id] || {};
              return (
                <button key={m.id} onClick={() => stageEdit('owner', m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-all active:scale-95 ${
                    isStaged('owner', m.id)
                      ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-gray-800 scale-[1.04]'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: moc.bg + '33', color: moc.text, borderColor: moc.border }}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0"
                    style={{ background: moc.bg, color: moc.text, borderColor: moc.border }}
                  >{m.name[0]}</span>
                  {m.name}
                </button>
              );
            })}
            {stagedEdits.owner !== undefined && (
              <button onClick={() => unstageEdit('owner')}
                className="px-2 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >✕</button>
            )}
          </div>
        </div>

        {/* ── Priority ── */}
        <div>
          <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">Priority</label>
          <div className="flex gap-2">
            {[
              { val: 'high',   label: '🔴 High',   cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
              { val: 'medium', label: '🟡 Medium', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
              { val: 'low',    label: '⚪ Low',    cls: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600' },
            ].map(p => (
              <button key={p.val} onClick={() => stageEdit('priority', p.val)}
                className={selCls('priority', p.val, `flex-1 px-3 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-all active:scale-95 text-center ${p.cls}`)}
              >{p.label}</button>
            ))}
            {stagedEdits.priority !== undefined && (
              <button onClick={() => unstageEdit('priority')}
                className="px-2 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >✕</button>
            )}
          </div>
        </div>

        {/* ── Size ── */}
        <div>
          <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">Size</label>
          <div className="flex gap-2">
            {[
              { val: 'S', label: 'S', desc: 'Small',  cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600' },
              { val: 'M', label: 'M', desc: 'Medium', cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-700' },
              { val: 'L', label: 'L', desc: 'Large',  cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-700' },
            ].map(s => (
              <button key={s.val} onClick={() => stageEdit('size', s.val)}
                className={selCls('size', s.val, `flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border font-bold cursor-pointer transition-all active:scale-95 ${s.cls}`)}
              >
                <span className="text-lg">{s.label}</span>
                <span className="text-[10px] font-medium opacity-70">{s.desc}</span>
              </button>
            ))}
            {stagedEdits.size !== undefined && (
              <button onClick={() => unstageEdit('size')}
                className="px-2 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer self-center"
              >✕</button>
            )}
          </div>
        </div>

        {/* ── Due Date ── */}
        <div>
          <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">Due Date</label>
          <input
            type="date"
            value={stagedEdits.dueDate || ''}
            onChange={e => e.target.value ? stageEdit('dueDate', e.target.value) : unstageEdit('dueDate')}
            className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm font-semibold focus:border-sky-400 focus:outline-none"
          />
          <div className="flex gap-2 mt-1.5">
            {[
              { label: 'Today',    offset: 0 },
              { label: 'Tomorrow', offset: 1 },
              { label: '+1 week',  offset: 7 },
              { label: '+2 weeks', offset: 14 },
            ].map(p => {
              const d = new Date(); d.setDate(d.getDate() + p.offset);
              const ds = d.toISOString().split('T')[0];
              return (
                <button key={p.label} onClick={() => stageEdit('dueDate', ds)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${
                    stagedEdits.dueDate === ds
                      ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 ring-1 ring-sky-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-sky-900/20'
                  }`}
                >{p.label}</button>
              );
            })}
            {stagedEdits.dueDate !== undefined && (
              <button onClick={() => unstageEdit('dueDate')}
                className="px-2 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Footer — Save / Delete / Restore */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50">
        {showArchived && (
          <button onClick={() => { stageEdit('status', 'not-started'); setTimeout(onSave, 0); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:brightness-95 cursor-pointer transition-all"
          >↩️ Restore</button>
        )}
        {canDelete && (
          <button onClick={onDelete}
            className="px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-all"
          >🗑️ Delete</button>
        )}
        <div className="flex-1" />
        <button onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
        >Cancel</button>
        <button onClick={onSave}
          disabled={stagedCount === 0}
          className={`px-5 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all ${
            stagedCount > 0
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25 hover:bg-sky-600 active:scale-95'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >Save{stagedCount > 0 ? ` (${stagedCount})` : ''}</button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop: auto-show panel as overlay ── */}
      <div className="hidden md:flex fixed inset-0 z-50 items-end justify-center pb-6 pointer-events-none">
        <div className="pointer-events-auto animate-slide-up w-[95vw] max-w-md">
          {editPanel}
        </div>
      </div>

      {/* ── Mobile: floating "Edit N" button → opens panel ── */}
      <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
        {!batchEditorOpen ? (
          <button
            onClick={() => setBatchEditorOpen(true)}
            className="flex items-center gap-2 bg-sky-500 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-sky-500/30 cursor-pointer transition-all active:scale-95 text-sm font-bold"
          >
            <span className="bg-white/20 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">{selectedCount}</span>
            ✏️ Edit
            <button onClick={e => { e.stopPropagation(); onCancel(); }}
              className="ml-1 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs cursor-pointer"
            >✕</button>
          </button>
        ) : (
          <div className="w-[95vw] max-w-md">
            {editPanel}
          </div>
        )}
      </div>
    </>
  );
}
