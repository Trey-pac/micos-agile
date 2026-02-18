/**
 * CompletionModal — shown when a task is dragged/moved to "Done".
 * Lets the user capture what happened before the task is marked complete.
 * Skip is always one tap away and never feels like a burden.
 */
import { useState } from 'react';
import { ACTIVITY_TYPES, inferContactGroup } from '../../services/activityService';

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

  const inputClass = 'w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">

        {/* Header */}
        <div>
          <h3 className="text-lg font-bold text-gray-800">Task Complete ✅</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed truncate">
            <span className="font-semibold text-gray-700">{task?.title}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Any updates to log? Prices, decisions, conversations? Skip if nothing to capture.
          </p>
        </div>

        {/* Note */}
        <textarea
          autoFocus
          placeholder="What happened? What did you learn? (optional)"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />

        {/* Type + Contact row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputClass}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Contact</label>
            <select value={form.contactId} onChange={(e) => handleContactChange(e.target.value)} className={inputClass}>
              <option value="">— None —</option>
              {vendors.length > 0 && (
                <optgroup label="Vendors">
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </optgroup>
              )}
              {customers.length > 0 && (
                <optgroup label="Customers">
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">
            Tags <span className="font-normal text-gray-400">(comma-separated: pricing, lead-time, specs…)</span>
          </label>
          <input
            placeholder="pricing, lead-time, specs, contract…"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {saving ? 'Saving…' : form.note.trim() ? 'Save & Complete' : 'Complete (nothing to log)'}
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2.5 text-gray-400 font-semibold text-sm hover:text-gray-600 cursor-pointer transition-colors"
          >
            Skip — complete without logging
          </button>
        </div>
      </div>
    </div>
  );
}
