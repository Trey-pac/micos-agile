import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Construction, Clock, User, AlertTriangle, Zap, Maximize2, Calendar, Trash2 } from 'lucide-react';
import { teamMembers, KANBAN_COLUMNS } from '../data/constants';
import { epics, features } from '../data/epicFeatureHierarchy';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

const ownerAvatarColors = {
  trey: 'bg-emerald-600',
  halie: 'bg-cyan-600',
  ricardo: 'bg-orange-500',
  team: 'bg-violet-600',
};

const priorityBadge = {
  high: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
};

const statusBadge = {
  'not-started': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  'in-progress': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'roadblock': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'done': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
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

// ── Inline-editable field wrapper ──────────────────────────────────────────
function InlineSelect({ value, options, onChange, renderValue, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="cursor-pointer bg-transparent border-none p-0 text-left hover:opacity-80 transition-opacity"
      >
        {renderValue}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[140px] py-1 max-h-48 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-medium cursor-pointer border-none transition-colors ${
                opt.value === value
                  ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                  : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskDetailDrawer({ task, sprint, onClose, onDelete, onUpdateField }) {
  const [closing, setClosing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [notesDraft, setNotesDraft] = useState(task.notes || '');
  const titleRef = useRef(null);
  const notesRef = useRef(null);

  const ownerIds = getTaskOwners(task);
  const epic = epics.find(e => e.id === task.epicId);
  const feature = features.find(f => f.id === task.featureId);
  const statusLabel = KANBAN_COLUMNS.find(c => c.id === task.status)?.title || task.status;

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // ESC key to close
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  // Sync drafts when task prop changes (e.g. from Firestore update)
  useEffect(() => { if (!editingTitle) setTitleDraft(task.title); }, [task.title, editingTitle]);
  useEffect(() => { if (!editingNotes) setNotesDraft(task.notes || ''); }, [task.notes, editingNotes]);

  // Auto-focus title input when entering edit mode
  useEffect(() => { if (editingTitle && titleRef.current) titleRef.current.focus(); }, [editingTitle]);
  useEffect(() => { if (editingNotes && notesRef.current) notesRef.current.focus(); }, [editingNotes]);

  const saveTitle = () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) onUpdateField(task.id, { title: trimmed });
  };

  const saveNotes = () => {
    setEditingNotes(false);
    if (notesDraft !== (task.notes || '')) onUpdateField(task.id, { notes: notesDraft });
  };

  const toggleOwner = (ownerId) => {
    const current = [...ownerIds];
    const idx = current.indexOf(ownerId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(ownerId);
    }
    // Keep backward compat: set both `owner` (first) and `owners` (array)
    onUpdateField(task.id, {
      owners: current,
      owner: current[0] || null,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col ${closing ? 'drawer-exit' : 'drawer-enter'}`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            {sprint && <span>Sprint {sprint.number}</span>}
            {sprint && <span>›</span>}
            <span>{statusLabel}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Main content area */}
          <div className="px-6 py-5">
            {/* Title — click to edit */}
            {editingTitle ? (
              <input
                ref={titleRef}
                className="w-full text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug tracking-tight mb-4 bg-transparent border-none outline-none border-b-2 border-sky-400 pb-1 caret-sky-500"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleDraft(task.title); setEditingTitle(false); } }}
              />
            ) : (
              <h2
                className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug tracking-tight mb-4 cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-colors rounded-lg -mx-1 px-1"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                {task.title}
              </h2>
            )}

            {/* Description / Notes — click to edit */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Description
              </h4>
              {editingNotes ? (
                <textarea
                  ref={notesRef}
                  className="w-full text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 border border-sky-300 dark:border-sky-600 outline-none resize-y min-h-[100px] caret-sky-500"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={saveNotes}
                  rows={4}
                />
              ) : (
                <div
                  className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 transition-colors min-h-[60px]"
                  onClick={() => setEditingNotes(true)}
                  title="Click to edit"
                >
                  {task.notes || <span className="text-gray-400 dark:text-gray-500 italic">Click to add a description…</span>}
                </div>
              )}
            </div>

            {/* Roadblock info */}
            {task.status === 'roadblock' && task.roadblockInfo && (
              <div className="mb-6 bg-amber-50/80 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200/60 dark:border-amber-700/40">
                <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                  <Construction className="w-4 h-4" /> Roadblock
                </h4>
                <div className="space-y-2 text-sm">
                  {task.roadblockInfo.reason && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Reason: </span>
                      <span className="text-gray-700 dark:text-gray-300">{task.roadblockInfo.reason}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Assigned to: </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {teamMembers.find(m => m.id === task.roadblockInfo.unblockOwnerId)?.name || 'Someone'}
                    </span>
                  </div>
                  {task.roadblockInfo.urgency && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Urgency: </span>
                      <span className="text-gray-700 dark:text-gray-300">{task.roadblockInfo.urgency}</span>
                    </div>
                  )}
                  {task.roadblockInfo.timesBlocked > 1 && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Times blocked: </span>
                      <span className="text-red-600 dark:text-red-400 font-semibold">{task.roadblockInfo.timesBlocked}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Epic / Feature */}
            {epic && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Epic / Feature
                </h4>
                <div
                  className="rounded-lg p-3 border text-sm"
                  style={{ borderColor: epic.color + '40', background: epic.color + '08' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded border"
                      style={{ color: epic.color, background: '#fff', borderColor: epic.color + '50' }}
                    >{epic.id}</span>
                    <span className="font-semibold text-sm" style={{ color: epic.color }}>{epic.name}</span>
                  </div>
                  {feature && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium mr-1">{feature.id}</span>
                      {feature.name}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Properties panel — all inline-editable */}
          <div className="px-6 pb-6">
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Properties
              </h4>
              <div className="space-y-3">
                {/* Status — click to change */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Status
                  </span>
                  <InlineSelect
                    value={task.status}
                    options={KANBAN_COLUMNS.map(c => ({ value: c.id, label: c.title }))}
                    onChange={(val) => onUpdateField(task.id, { status: val })}
                    renderValue={
                      <Badge className={statusBadge[task.status] || ''}>
                        {statusLabel}
                      </Badge>
                    }
                  />
                </div>

                {/* Assignees — multi-select toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Assignees
                  </span>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {teamMembers.map(m => {
                      const isAssigned = ownerIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleOwner(m.id)}
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all duration-150 border-2 ${
                            isAssigned
                              ? `${ownerAvatarColors[m.id] || 'bg-gray-500'} text-white border-transparent ring-2 ring-sky-400/50`
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                          title={isAssigned ? `Remove ${m.name}` : `Assign ${m.name}`}
                        >
                          {getInitials(m.name)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority — click to change */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Priority
                  </span>
                  <InlineSelect
                    value={task.priority}
                    options={[
                      { value: 'high', label: '🔴 High' },
                      { value: 'medium', label: '🟠 Medium' },
                      { value: 'low', label: '🟢 Low' },
                    ]}
                    onChange={(val) => onUpdateField(task.id, { priority: val })}
                    renderValue={
                      <Badge className={priorityBadge[task.priority] || ''}>
                        {task.priority}
                      </Badge>
                    }
                  />
                </div>

                {/* Urgency — click to change */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Urgency
                  </span>
                  <InlineSelect
                    value={task.urgency || 'future'}
                    options={[
                      { value: 'this-week', label: 'This Week' },
                      { value: 'next-week', label: 'Next Week' },
                      { value: 'this-month', label: 'This Month' },
                      { value: 'future', label: 'Future' },
                    ]}
                    onChange={(val) => onUpdateField(task.id, { urgency: val })}
                    renderValue={
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium capitalize">
                        {(task.urgency || 'future').replace('-', ' ')}
                      </span>
                    }
                  />
                </div>

                {/* Size — click to change */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" />
                    Size
                  </span>
                  <InlineSelect
                    value={task.size || ''}
                    options={[
                      { value: '', label: 'Not sized' },
                      { value: 'S', label: 'S — Small' },
                      { value: 'M', label: 'M — Medium' },
                      { value: 'L', label: 'L — Large' },
                    ]}
                    onChange={(val) => onUpdateField(task.id, { size: val || null })}
                    renderValue={
                      task.size
                        ? <Badge variant="secondary">{task.size}</Badge>
                        : <span className="text-xs text-gray-400 italic">None</span>
                    }
                  />
                </div>

                {/* Due date — click to change */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Due Date
                  </span>
                  <input
                    type="date"
                    className="text-xs text-gray-700 dark:text-gray-300 font-medium bg-transparent border-none outline-none cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                    value={task.dueDate || ''}
                    onChange={(e) => onUpdateField(task.id, { dueDate: e.target.value || null })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick-move actions */}
          <div className="px-6 pb-6">
            <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Move to
            </h4>
            <div className="flex flex-wrap gap-2">
              {KANBAN_COLUMNS
                .filter(col => col.id !== task.status)
                .map(col => (
                  <Button
                    key={col.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdateField(task.id, { status: col.id })}
                    className={statusBadge[col.id] || ''}
                  >
                    {col.title}
                  </Button>
                ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete Task
          </Button>
        </div>
      </div>
    </>
  );
}
