import { useState } from 'react';
import { teamMembers as fallbackTeamMembers } from '../../data/constants';
import { epics, features } from '../../data/epicFeatureHierarchy';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Trash2, Link, Construction } from 'lucide-react';

export default function TaskModal({ task, defaultValues = {}, sprints = [], allTasks = [], teamMembers: teamMembersProp, onClose, onSave, onDelete, onNavigateToTask }) {
  const teamMembers = teamMembersProp || fallbackTeamMembers;
  const isEditing = !!task?.id;

  // Resolve initial owners from task or defaults
  const initOwners = task
    ? (Array.isArray(task.owners) && task.owners.length > 0 ? task.owners : (task.owner ? [task.owner] : ['trey']))
    : (defaultValues.owners || (defaultValues.owner ? [defaultValues.owner] : ['trey']));

  const [formData, setFormData] = useState({
    title: '',
    urgency: 'this-week',
    priority: 'medium',
    dueDate: '',
    notes: '',
    owner: 'trey',
    owners: ['trey'],
    status: 'not-started',
    size: '',
    epicId: '',
    featureId: '',
    ...defaultValues,
    ...(task || {}),
    owners: initOwners,
    owner: initOwners[0] || 'trey',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const selectedEpic = epics.find(e => e.id === formData.epicId);
  const epicFeatures = features.filter(f => f.epicId === formData.epicId);
  const selectedFeature = features.find(f => f.id === formData.featureId);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-6 pb-2">
          <DialogHeader className="mb-5">
            <DialogTitle>{isEditing ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update task details, status, and assignments.' : 'Create a new task and assign it to a sprint.'}
            </DialogDescription>
          </DialogHeader>
          <form id="task-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input id="task-title" type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'not-started', label: 'Not Started', bg: 'bg-gray-100 dark:bg-gray-700',  text: 'text-gray-600 dark:text-gray-300',  border: 'border-gray-300 dark:border-gray-600' },
                  { val: 'in-progress', label: 'In Progress', bg: 'bg-blue-100 dark:bg-blue-900/40',  text: 'text-blue-700 dark:text-blue-300',  border: 'border-blue-200 dark:border-blue-700' },
                  { val: 'roadblock',   label: 'Roadblock',   bg: 'bg-red-100 dark:bg-red-900/40',   text: 'text-red-700 dark:text-red-300',   border: 'border-red-200 dark:border-red-700' },
                  { val: 'done',        label: 'Done',        bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
                ].map(s => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: s.val })}
                    className={`${s.bg} ${s.text} border-2 ${formData.status === s.val ? 'ring-2 ring-ring ring-offset-1 dark:ring-offset-gray-800 ' + s.border : 'border-transparent opacity-70 hover:opacity-100'} rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer transition-all text-center`}
                  >{s.label}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assignees</Label>
              <div className="flex gap-2 flex-wrap">
                {teamMembers.map(m => {
                  const colors = { trey: 'bg-sky-100 text-sky-700 border-sky-300', halie: 'bg-violet-100 text-violet-700 border-violet-300', ricardo: 'bg-amber-100 text-amber-700 border-amber-300', team: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
                  const isSelected = (formData.owners || []).includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const current = formData.owners || [];
                        const next = isSelected ? current.filter(id => id !== m.id) : [...current, m.id];
                        if (next.length === 0) return; // must have at least one
                        setFormData({ ...formData, owners: next, owner: next[0] });
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border-2 cursor-pointer transition-all ${isSelected ? (colors[m.id] || 'bg-gray-100 text-gray-700 border-gray-300') + ' ring-2 ring-ring ring-offset-1 dark:ring-offset-gray-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isSelected ? (colors[m.id] || 'bg-gray-200 text-gray-700') : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'}`}>
                        {m.name.charAt(0)}
                      </span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={formData.urgency} onValueChange={(val) => setFormData({ ...formData, urgency: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="next-week">Next Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="future">Future</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={formData.size || '_none'} onValueChange={(val) => setFormData({ ...formData, size: val === '_none' ? '' : val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Not sized</SelectItem>
                  <SelectItem value="S">S - Small (1 day or less)</SelectItem>
                  <SelectItem value="M">M - Medium (1-2 days)</SelectItem>
                  <SelectItem value="L">L - Large (3+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due Date</Label>
              <Input id="task-due" type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sprint</Label>
              <Select value={formData.sprintId || '_backlog'} onValueChange={(val) => setFormData({ ...formData, sprintId: val === '_backlog' ? null : val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_backlog">Backlog</SelectItem>
                  {sprints.map(s => (
                    <SelectItem key={s.id} value={s.id}>Sprint {s.number}{s.name ? ` — ${s.name}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-notes">Notes</Label>
              <Textarea
                id="task-notes"
                className="resize-y"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional details..."
              />
            </div>

            {/* Epic & Feature */}
            <div className="border-t border-border pt-4 flex flex-col gap-3">
              <div className="space-y-2">
                <Label>Epic</Label>
                <Select value={formData.epicId || '_none'} onValueChange={(val) => setFormData({ ...formData, epicId: val === '_none' ? '' : val, featureId: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— No Epic —</SelectItem>
                    {epics.map(e => <SelectItem key={e.id} value={e.id}>{e.id} — {e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {formData.epicId && (
                <div className="space-y-2">
                  <Label>Feature</Label>
                  <Select value={formData.featureId || '_none'} onValueChange={(val) => setFormData({ ...formData, featureId: val === '_none' ? '' : val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— No Feature —</SelectItem>
                      {epicFeatures.map(f => <SelectItem key={f.id} value={f.id}>{f.id} — {f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                    <div className="text-muted-foreground text-xs">
                      <span className="font-semibold mr-1">{selectedFeature.id}</span>
                      {selectedFeature.name} — {selectedFeature.description}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs">{selectedEpic.description}</div>
                  )}
                </div>
              )}
            </div>

            {/* Linked task */}
            {isEditing && task?.linkedTaskId && (() => {
              const linked = allTasks.find(t => t.id === task.linkedTaskId);
              return (
                <div className="border-t border-border pt-3 mt-1 space-y-2">
                  <Label>Linked Task</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => {
                      if (onNavigateToTask) {
                        onClose();
                        onNavigateToTask(task.linkedTaskId);
                      }
                    }}
                  >
                    <Link className="h-4 w-4 mr-2 text-sky-500" />
                    {linked ? linked.title : `Task ${task.linkedTaskId}`}
                  </Button>
                </div>
              );
            })()}

            {/* Roadblock info (read-only display) */}
            {isEditing && task?.roadblockInfo && (
              <div className="border-t border-amber-200 dark:border-amber-800 pt-3 mt-1 bg-amber-50/50 dark:bg-amber-900/20 -mx-6 px-6 pb-3 rounded-lg">
                <Label className="flex items-center gap-1.5 mb-2">
                  <Construction className="h-4 w-4 text-amber-500" />
                  Roadblock Info
                </Label>
                <div className="text-sm text-foreground space-y-1">
                  <div><span className="font-semibold text-muted-foreground">Reason:</span> {task.roadblockInfo.reason}</div>
                  <div><span className="font-semibold text-muted-foreground">Assigned to:</span> {teamMembers.find(m => m.id === task.roadblockInfo.unblockOwnerId)?.name || task.roadblockInfo.unblockOwnerId}</div>
                  <div><span className="font-semibold text-muted-foreground">Urgency:</span> {task.roadblockInfo.urgency}</div>
                  <div><span className="font-semibold text-muted-foreground">Blocked on:</span> {task.roadblockInfo.roadblockedAt}</div>
                  {task.roadblockInfo.timesBlocked > 1 && (
                    <div><span className="font-semibold text-destructive">Times blocked:</span> {task.roadblockInfo.timesBlocked}</div>
                  )}
                </div>
              </div>
            )}

            {/* End of scrollable form fields — footer buttons are outside scroll area */}
          </form>
        </div>

        {/* ── Sticky footer ── */}
        <DialogFooter className={`shrink-0 border-t border-border px-6 py-3 ${isEditing ? 'justify-between' : 'justify-end'} flex-row`}>
          {isEditing && (
            <Button variant="destructive" size="sm" type="button" onClick={() => onDelete(task.id)} className="mr-auto">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="task-modal-form">
              {isEditing ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
