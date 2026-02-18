/**
 * ActivityLog — tabbed shell for the institutional knowledge layer.
 * Tabs: Feed (filterable activity list) | Contacts (timeline) | Weekly Digest.
 *
 * Reads navigation state to pre-select a contact and open the Contacts tab
 * when navigating from VendorsView.
 */
import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ActivitySkeleton } from './ui/Skeletons';
import { ACTIVITY_TYPES, CONTACT_GROUPS } from '../services/activityService';
import ContactTimeline from './ContactTimeline';
import WeeklyDigest from './WeeklyDigest';

function toDate(val) {
  if (!val) return null;
  if (val.toDate)  return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
}

function formatDate(val) {
  const d = toDate(val);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ActivityCard({ activity, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = ACTIVITY_TYPES.find((t) => t.id === activity.type);
  const preview  = activity.note?.slice(0, 120) + (activity.note?.length > 120 ? '…' : '');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 cursor-pointer hover:border-gray-300 transition-all"
      onClick={() => setExpanded((e) => !e)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="text-lg mt-0.5 shrink-0">{typeInfo?.icon || '📋'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{typeInfo?.label}</span>
              {activity.contactName && (
                <span className="text-xs font-semibold text-sky-600">{activity.contactName}</span>
              )}
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">
              {expanded ? activity.note : preview}
            </p>
            {activity.taskTitle && (
              <p className="text-xs text-gray-400 mt-1">↳ {activity.taskTitle}</p>
            )}
            {(activity.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activity.tags.map((t) => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="text-xs text-gray-400">{formatDate(activity.createdAt)}</p>
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
              className="text-xs text-red-400 hover:text-red-600 mt-1 cursor-pointer"
            >Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivityLog({ activities = [], vendors = [], customers = [], onDeleteActivity, loading = false }) {
  const location = useLocation();
  const initContactId = location.state?.contactId || '';

  const [tab,     setTab]     = useState(initContactId ? 'contacts' : 'feed');
  const [search,  setSearch]  = useState('');
  const [typeF,   setTypeF]   = useState('');
  const [groupF,  setGroupF]  = useState('');

  const filtered = useMemo(() => {
    let list = activities;
    if (typeF)   list = list.filter((a) => a.type === typeF);
    if (groupF)  list = list.filter((a) => a.contactGroup === groupF);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.note?.toLowerCase().includes(q) ||
        a.taskTitle?.toLowerCase().includes(q) ||
        a.contactName?.toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activities, typeF, groupF, search]);

  const tabs = [
    { key: 'feed',     label: `📝 Feed (${activities.length})` },
    { key: 'contacts', label: '🤝 Contacts' },
    { key: 'digest',   label: '📆 Weekly Digest' },
  ];

  if (loading) return <ActivitySkeleton />;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Activity Log</h2>
          <p className="text-sm text-gray-500">Farm institutional memory — searchable, filterable.</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all ${tab === t.key ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Feed tab ── */}
      {tab === 'feed' && (
        <>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <input
              placeholder="Search notes, contacts, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[160px] border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
            />
            <select value={typeF} onChange={(e) => setTypeF(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:outline-none">
              <option value="">All types</option>
              {ACTIVITY_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <select value={groupF} onChange={(e) => setGroupF(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:outline-none">
              <option value="">All contacts</option>
              {CONTACT_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>

          {/* Activity list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">✍️</p>
              <p className="text-gray-500 text-sm">
                {activities.length === 0
                  ? 'No activities yet. Complete a task to capture your first knowledge entry.'
                  : 'No activities match your filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <ActivityCard key={a.id} activity={a} onDelete={onDeleteActivity} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Contacts tab ── */}
      {tab === 'contacts' && (
        <ContactTimeline
          activities={activities}
          vendors={vendors}
          customers={customers}
          initialContactId={initContactId}
        />
      )}

      {/* ── Weekly Digest tab ── */}
      {tab === 'digest' && (
        <WeeklyDigest activities={activities} />
      )}
    </div>
  );
}
