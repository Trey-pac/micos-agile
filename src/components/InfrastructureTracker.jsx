import { useState } from 'react';

const STATUS_COLORS = {
  planned:     'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  'in-progress': 'bg-blue-100 text-blue-700',
  complete:    'bg-green-100 text-green-700',
};

function ProjectForm({ project, onSave, onClose, onDelete }) {
  const isEdit = !!project;
  const [form, setForm] = useState({
    name:   project?.name   || '',
    budget: project?.budget ?? '',
    spent:  project?.spent  ?? '',
    status: project?.status || 'planned',
    notes:  project?.notes  || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        budget: parseFloat(form.budget) || 0,
        spent:  parseFloat(form.spent)  || 0,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {isEdit ? 'Edit Project' : 'New CapEx Project'}
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 text-2xl leading-none cursor-pointer">×</button>
        </div>

        <input
          placeholder="Project name *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-3">
          {[['budget', 'Budget ($)'], ['spent', 'Spent ($)']].map(([key, label]) => (
            <div key={key}>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">{label}</label>
              <input
                type="number" min="0" step="0.01"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none"
          >
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>

        <textarea
          placeholder="Notes (quotes, vendors, ROI estimate…)"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none resize-none"
        />

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Project'}
          </button>
          {isEdit && (
            <button
              onClick={() => onDelete(project.id)}
              className="px-4 py-3 bg-red-50 text-red-600 font-semibold rounded-xl text-sm hover:bg-red-100 cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InfrastructureTracker({ projects = [], onAdd, onEdit, onDelete }) {
  const [modal, setModal] = useState(null);

  const handleSave = async (data) => {
    if (modal.mode === 'edit') {
      await onEdit(modal.project.id, data);
    } else {
      await onAdd(data);
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    await onDelete(id);
    setModal(null);
  };

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent  = projects.reduce((s, p) => s + (p.spent  || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">Capital Projects</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ${totalSpent.toFixed(0)} spent · ${totalBudget.toFixed(0)} total budget
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 cursor-pointer"
        >
          + Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🏗️</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No capital projects yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const pct  = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
            const over = p.budget > 0 && p.spent > p.budget;
            return (
              <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{p.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      {p.status}
                    </span>
                  </div>
                  <button
                    onClick={() => setModal({ mode: 'edit', project: p })}
                    className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 cursor-pointer shrink-0"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>${(p.spent || 0).toFixed(0)} spent</span>
                  <span className={over ? 'text-red-500 font-semibold' : ''}>
                    ${(p.budget || 0).toFixed(0)} budget{over ? ' ⚠️' : ''}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {p.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 truncate">{p.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ProjectForm
          project={modal.mode === 'edit' ? modal.project : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
