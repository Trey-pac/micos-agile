import { useState } from 'react';
import { getSprintDates, formatDateRange } from '../../utils/sprintUtils';

export default function SprintModal({ onClose, onSave, sprintNumber }) {
  const [formData, setFormData] = useState({
    name: `Sprint ${sprintNumber}`,
    goal: '',
  });

  const { startDate, endDate } = getSprintDates(sprintNumber);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass = 'w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5">Create New Sprint</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Sprint Name</label>
              <input className={inputClass} type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>Sprint Dates (Auto-calculated)</label>
              <div className="px-3 py-3 bg-amber-50 rounded-lg text-sm font-medium">
                {formatDateRange(startDate, endDate)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Wednesday to Tuesday, 1-week duration
              </div>
            </div>
            <div>
              <label className={labelClass}>Sprint Goal (Optional)</label>
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="e.g., Complete airflow system installation"
                rows="3"
              />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors border-none">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 cursor-pointer transition-colors border-none">
                Create Sprint
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
