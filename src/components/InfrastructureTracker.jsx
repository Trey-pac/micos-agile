import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/Dialog';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

const STATUS_BADGE_VARIANT = {
  planned:       'secondary',
  'in-progress': 'info',
  complete:      'success',
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'New CapEx Project'}</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Project name *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          {[['budget', 'Budget ($)'], ['spent', 'Spent ($)']].map(([key, label]) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                type="number" min="0" step="0.01"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(val) => set('status', val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Textarea
          placeholder="Notes (quotes, vendors, ROI estimate…)"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          className="resize-none"
        />

        <DialogFooter className="gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Project'}
          </Button>
          {isEdit && (
            <Button variant="destructive" onClick={() => onDelete(project.id)}>
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        <Button onClick={() => setModal({ mode: 'add' })}>
          + Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No capital projects yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const pct  = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
            const over = p.budget > 0 && p.spent > p.budget;
            return (
              <Card key={p.id}>
                <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{p.name}</p>
                    <Badge variant={STATUS_BADGE_VARIANT[p.status] || 'secondary'}>
                      {p.status}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setModal({ mode: 'edit', project: p })} className="shrink-0">
                    Edit
                  </Button>
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
                </CardContent>
              </Card>
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
