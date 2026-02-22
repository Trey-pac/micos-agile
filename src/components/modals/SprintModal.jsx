import { useState } from 'react';
import { getSprintDates, formatDateRange } from '../../utils/sprintUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import { CalendarDays } from 'lucide-react';

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

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Sprint</DialogTitle>
          <DialogDescription>Set up a new week-long sprint with auto-calculated dates.</DialogDescription>
        </DialogHeader>
        <form id="sprint-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="sprint-name">Sprint Name</Label>
            <Input id="sprint-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Sprint Dates (Auto-calculated)</Label>
            <div className="flex items-center gap-2 px-3 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm font-medium text-foreground">
              <CalendarDays className="h-4 w-4 text-amber-600" />
              {formatDateRange(startDate, endDate)}
            </div>
            <p className="text-xs text-muted-foreground">Wednesday to Tuesday, 1-week duration</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sprint-goal">Sprint Goal (Optional)</Label>
            <Textarea
              id="sprint-goal"
              className="resize-y"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              placeholder="e.g., Complete airflow system installation"
              rows="3"
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="sprint-form">Create Sprint</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
