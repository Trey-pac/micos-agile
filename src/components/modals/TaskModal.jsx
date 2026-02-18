import { useState } from 'react';
import { teamMembers } from '../../data/constants';
import { epics, features } from '../../data/epicFeatureHierarchy';

export default function TaskModal({ task, defaultValues = {}, sprints = [], allTasks = [], onClose, onSave, onDelete, onNavigateToTask }) {
  const isEditing = !!task?.id;
  const [formData, setFormData] = useState(task || {
    title: '',
    urgency: 'this-week',
    priority: 'medium',
    dueDate: '',
    notes: '',
    owner: 'trey',
    status: 'not-started',
    size: '',
    epicId: '',
    featureId: '',
    ...defaultValues,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass = 'w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1';

  const selectedEpic = epics.find(e => e.id === formData.epicId);
  const epicFeatures = features.filter(f => f.epicId === formData.epicId);
  const selectedFeature = features.find(f => f.id === formData.featureId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5">{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Task Title</label>
              <input className={inputClass} type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>Task Owner</label>
              <select className={inputClass} value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })}>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Urgency</label>
              <select className={inputClass} value={formData.urgency} onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}>
                <option value="this-week">This Week</option>
                <option value="next-week">Next Week</option>
                <option value="this-month">This Month</option>
                <option value="future">Future</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select className={inputClass} value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Size</label>
              <select className={inputClass} value={formData.size || ''} onChange={(e) => setFormData({ ...formData, size: e.target.value })}>
                <option value="">Not sized</option>
                <option value="S">S - Small (1 day or less)</option>
                <option value="M">M - Medium (1-2 days)</option>
                <option value="L">L - Large (3+ days)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input className={inputClass} type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Sprint</label>
              <select
                className={inputClass}
                value={formData.sprintId || ''}
                onChange={(e) => setFormData({ ...formData, sprintId: e.target.value || null })}
              >
                <option value="">📋 Backlog</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>Sprint {s.number}{s.name ? ` — ${s.name}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea className={`${inputClass} min-h-[80px] resize-y`} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Add any additional details..." />
            </div>

            {/* Epic & Feature */}
            <div className="border-t-2 border-gray-100 pt-4 flex flex-col gap-3">
              <div>
                <label className={labelClass}>Epic</label>
                <select
                  className={inputClass}
                  value={formData.epicId || ''}
                  onChange={(e) => setFormData({ ...formData, epicId: e.target.value, featureId: '' })}
                >
                  <option value="">— No Epic —</option>
                  {epics.map(e => <option key={e.id} value={e.id}>{e.id} — {e.name}</option>)}
                </select>
              </div>
              {formData.epicId && (
                <div>
                  <label className={labelClass}>Feature</label>
                  <select
                    className={inputClass}
                    value={formData.featureId || ''}
                    onChange={(e) => setFormData({ ...formData, featureId: e.target.value })}
                  >
                    <option value="">— No Feature —</option>
                    {epicFeatures.map(f => <option key={f.id} value={f.id}>{f.id} — {f.name}</option>)}
                  </select>
                </div>
              )}
              {selectedEpic && (
                <div
                  className="p-3 rounded-xl border-2 text-sm"
                  style={{ borderColor: selectedEpic.color + '50', background: selectedEpic.color + '12' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-black px-2 py-0.5 rounded border"
                      style={{ color: selectedEpic.color, background: '#fff', borderColor: selectedEpic.color + '60' }}
                    >{selectedEpic.id}</span>
                    <span className="font-bold" style={{ color: selectedEpic.color }}>{selectedEpic.name}</span>
                  </div>
                  {selectedFeature ? (
                    <div className="text-gray-600 text-xs">
                      <span className="font-semibold text-gray-500 mr-1">{selectedFeature.id}</span>
                      {selectedFeature.name} — {selectedFeature.description}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs">{selectedEpic.description}</div>
                  )}
                </div>
              )}
            </div>

            {/* Linked task */}
            {isEditing && task?.linkedTaskId && (() => {
              const linked = allTasks.find(t => t.id === task.linkedTaskId);
              return (
                <div className="border-t-2 border-gray-100 pt-3 mt-1">
                  <label className={labelClass}>Linked Task</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToTask) {
                        onClose();
                        onNavigateToTask(task.linkedTaskId);
                      }
                    }}
                    className="w-full text-left px-3 py-2.5 bg-sky-50 border-2 border-sky-200 rounded-lg text-sm text-sky-700 hover:bg-sky-100 cursor-pointer transition-colors"
                  >
                    🔗 {linked ? linked.title : `Task ${task.linkedTaskId}`}
                  </button>
                </div>
              );
            })()}

            {/* Roadblock info (read-only display) */}
            {isEditing && task?.roadblockInfo && (
              <div className="border-t-2 border-amber-100 pt-3 mt-1 bg-amber-50/50 -mx-6 px-6 pb-3">
                <label className={labelClass}>🚧 Roadblock Info</label>
                <div className="text-sm text-gray-700 space-y-1">
                  <div><span className="font-semibold text-gray-500">Reason:</span> {task.roadblockInfo.reason}</div>
                  <div><span className="font-semibold text-gray-500">Assigned to:</span> {teamMembers.find(m => m.id === task.roadblockInfo.unblockOwnerId)?.name || task.roadblockInfo.unblockOwnerId}</div>
                  <div><span className="font-semibold text-gray-500">Urgency:</span> {task.roadblockInfo.urgency}</div>
                  <div><span className="font-semibold text-gray-500">Blocked on:</span> {task.roadblockInfo.roadblockedAt}</div>
                  {task.roadblockInfo.timesBlocked > 1 && (
                    <div><span className="font-semibold text-red-600">Times blocked:</span> {task.roadblockInfo.timesBlocked}</div>
                  )}
                </div>
              </div>
            )}

            <div className={`flex mt-2 ${isEditing ? 'justify-between' : 'justify-end'}`}>
              {isEditing && (
                <button type="button" onClick={() => onDelete(task.id)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-800 hover:bg-red-100 cursor-pointer transition-colors border-none">
                  🗑️ Delete
                </button>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors border-none">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 cursor-pointer transition-colors border-none">
                  {isEditing ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
