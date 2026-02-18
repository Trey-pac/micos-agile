/**
 * ContactTimeline — chronological conversation history for one vendor or customer.
 * Your farm's CRM: "What did we discuss with Harvest Today?" answered in one screen.
 */
import { useMemo, useState } from 'react';
import { ACTIVITY_TYPES } from '../services/activityService';

function typeIcon(typeId) {
  return ACTIVITY_TYPES.find((t) => t.id === typeId)?.icon || '📋';
}

function formatDate(val) {
  if (!val) return '';
  const d = val.toDate ? val.toDate() : new Date(val.seconds ? val.seconds * 1000 : val);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ContactTimeline({ activities = [], vendors = [], customers = [], initialContactId = '' }) {
  const [contactId, setContactId] = useState(initialContactId);

  const contacts = [
    ...vendors.map((v)  => ({ id: v.id, name: v.name,  label: v.company ? `${v.name} (${v.company})` : v.name })),
    ...customers.map((c) => ({ id: c.id, name: c.name, label: c.restaurant ? `${c.name} — ${c.restaurant}` : c.name })),
  ];

  const selected = contacts.find((c) => c.id === contactId);

  // Filter activities to this contact, in chronological order (oldest first for timeline)
  const timeline = useMemo(() =>
    [...activities]
      .filter((a) => a.contactId === contactId)
      .sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date((a.createdAt?.seconds || 0) * 1000);
        const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date((b.createdAt?.seconds || 0) * 1000);
        return da - db;
      }),
  [activities, contactId]);

  const firstDate = timeline[0]?.createdAt;
  const lastDate  = timeline[timeline.length - 1]?.createdAt;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Contact selector */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Select Contact</label>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none"
        >
          <option value="">— Choose a vendor or customer —</option>
          {vendors.length > 0 && (
            <optgroup label="Vendors">
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>)}
            </optgroup>
          )}
          {customers.length > 0 && (
            <optgroup label="Customers">
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.restaurant ? ` — ${c.restaurant}` : ''}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      {/* No contact selected */}
      {!contactId && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-gray-500 text-sm">Select a contact above to view their full interaction history.</p>
        </div>
      )}

      {/* Contact selected but no activities */}
      {contactId && timeline.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-gray-700 font-semibold">{selected?.name}</p>
          <p className="text-gray-400 text-sm mt-1">No logged interactions yet. Activities are captured when tasks are completed.</p>
        </div>
      )}

      {/* Timeline */}
      {contactId && timeline.length > 0 && (
        <>
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
            <p className="font-bold text-gray-800">{selected?.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {timeline.length} interaction{timeline.length !== 1 ? 's' : ''}
              {firstDate ? ` · Since ${formatDate(firstDate)}` : ''}
              {lastDate  ? ` · Last contact: ${formatDate(lastDate)}` : ''}
            </p>
          </div>

          {/* Chronological entries */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {timeline.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  {/* Icon dot */}
                  <div className="w-11 h-11 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 relative z-10 text-lg">
                    {typeIcon(activity.type)}
                  </div>
                  {/* Card */}
                  <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-500">
                        {ACTIVITY_TYPES.find((t) => t.id === activity.type)?.label || activity.type}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(activity.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{activity.note}</p>
                    {activity.taskTitle && (
                      <p className="text-xs text-gray-400 mt-1.5">Task: {activity.taskTitle}</p>
                    )}
                    {(activity.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
