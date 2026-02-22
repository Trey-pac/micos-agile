/**
 * CompletionModal — shown when a task is dragged/moved to "Done".
 * Lets the user capture what happened before the task is marked complete.
 * Skip is always one tap away and never feels like a burden.
 */
import { useState } from 'react';
import { ACTIVITY_TYPES, inferContactGroup } from '../../services/activityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { CheckCircle2 } from 'lucide-react';

const COMM_KEYWORDS = /contact|call|email|meet|talk|spoke|discuss|reply|respond|reach/i;

function detectType(title = '') {
  return COMM_KEYWORDS.test(title) ? 'communication' : 'completion_note';
}

function parseTags(raw) {
  return raw.split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export default function CompletionModal({ task, vendors = [], customers = [], onSave, onSkip }) {
  const [form, setForm] = useState({
    type:        detectType(task?.title),
    note:        '',
    contactId:   '',
    contactName: '',
    tags:        '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Merge vendors + customers into one list for the contact dropdown
  const contacts = [
    ...vendors.map((v)  => ({ id: v.id,  name: v.name,  type: 'vendor',   company: v.company || '' })),
    ...customers.map((c) => ({ id: c.id, name: c.name,  type: 'customer', company: c.restaurant || '' })),
  ];

  const handleContactChange = (contactId) => {
    const contact = contacts.find((c) => c.id === contactId);
    set('contactId', contactId);
    set('contactName', contact?.name || '');
  };

  const handleSave = async () => {
    if (!form.note.trim()) { onSkip(); return; } // no note = treat as skip
    setSaving(true);
    try {
      const contact = contacts.find((c) => c.id === form.contactId);
      await onSave({
        type:         form.type,
        note:         form.note.trim(),
        contactId:    form.contactId || null,
        contactName:  form.contactName || null,
        contactGroup: contact
          ? (contact.type === 'customer' ? 'customer' : inferContactGroup(contact.name + ' ' + contact.company))
          : null,
        tags:         parseTags(form.tags),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Task Complete
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="font-semibold text-foreground block truncate">{task?.title}</span>
            <span className="block">Any updates to log? Prices, decisions, conversations? Skip if nothing to capture.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Note */}
          <Textarea
            autoFocus
            placeholder="What happened? What did you learn? (optional)"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            rows={3}
            className="resize-none"
          />

          {/* Type + Contact row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(val) => set('type', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={form.contactId || '_none'} onValueChange={(val) => handleContactChange(val === '_none' ? '' : val)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {vendors.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Vendors</SelectLabel>
                      {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectGroup>
                  )}
                  {customers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Customers</SelectLabel>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>
              Tags <span className="font-normal text-muted-foreground">(comma-separated: pricing, lead-time, specs…)</span>
            </Label>
            <Input
              placeholder="pricing, lead-time, specs, contract…"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : form.note.trim() ? 'Save & Complete' : 'Complete (nothing to log)'}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onSkip}
          >
            Skip — complete without logging
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
