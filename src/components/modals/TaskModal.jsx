import { useState } from 'react';
import { teamMembers } from '../../data/constants';

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
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass = 'w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1';

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
