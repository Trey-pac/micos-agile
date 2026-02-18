import { useState } from 'react';
import { teamMembers } from '../../data/constants';
import { epics, features } from '../../data/epicFeatureHierarchy';

export default function TaskModal({ task, defaultStatus, onClose, onSave, onDelete }) {
  const isEditing = !!task?.id;
  const [formData, setFormData] = useState(task || {
    title: '',
    urgency: 'this-week',
    priority: 'medium',
    dueDate: '',
    notes: '',
    owner: 'trey',
    status: defaultStatus || 'not-started',
    size: '',
    epicId: '',
    featureId: '',
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
                  {epics.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
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
                    {epicFeatures.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              {selectedEpic && (
                <div
                  className="p-3 rounded-xl border-2 text-sm"
                  style={{ borderColor: selectedEpic.color + '50', background: selectedEpic.color + '12' }}
                >
                  <div className="font-bold mb-0.5" style={{ color: selectedEpic.color }}>{selectedEpic.name}</div>
                  {selectedFeature
                    ? <div className="text-gray-600 text-xs">{selectedFeature.name} — {selectedFeature.description}</div>
                    : <div className="text-gray-500 text-xs">{selectedEpic.description}</div>
                  }
                </div>
              )}
            </div>

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
