/**
 * ActivityLog — tabbed shell for the institutional knowledge layer.
 * Tabs: Feed (filterable activity list) | Contacts (timeline) | Weekly Digest.
 *
 * Reads navigation state to pre-select a contact and open the Contacts tab
 * when navigating from VendorsView.
 */
import { useState, useMemo } from 'react';
import { FileText, Handshake, CalendarDays, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ActivitySkeleton } from './ui/Skeletons';
import { ACTIVITY_TYPES, CONTACT_GROUPS } from '../services/activityService';
import ContactTimeline from './ContactTimeline';
import WeeklyDigest from './WeeklyDigest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

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
    <Card className="p-4 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-all"
      onClick={() => setExpanded((e) => !e)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="text-lg mt-0.5 shrink-0">{typeInfo?.icon || '📋'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{typeInfo?.label}</span>
              {activity.contactName && (
                <span className="text-xs font-semibold text-sky-600">{activity.contactName}</span>
              )}
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
              {expanded ? activity.note : preview}
            </p>
            {activity.taskTitle && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">↳ {activity.taskTitle}</p>
            )}
            {(activity.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activity.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(activity.createdAt)}</p>
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
              className="text-xs text-red-400 hover:text-red-600 mt-1 cursor-pointer flex items-center gap-1"
            ><Trash2 className="w-3 h-3" /> Delete</button>
          )}
        </div>
      </div>
    </Card>
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

  const TAB_ICONS = { feed: FileText, contacts: Handshake, digest: CalendarDays };

  if (loading) return <ActivitySkeleton />;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Activity Log</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Farm institutional memory — searchable, filterable.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          {tabs.map((t) => {
            const Icon = TAB_ICONS[t.key];
            return (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                <Icon className="w-4 h-4" /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── Feed tab ── */}
        <TabsContent value="feed">
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Input
              placeholder="Search notes, contacts, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[160px]"
            />
            <Select value={typeF || '__all__'} onValueChange={(val) => setTypeF(val === '__all__' ? '' : val)}>
              <SelectTrigger className="w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                {ACTIVITY_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={groupF || '__all__'} onValueChange={(val) => setGroupF(val === '__all__' ? '' : val)}>
              <SelectTrigger className="w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All contacts</SelectItem>
                {CONTACT_GROUPS.map((g) => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Activity list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
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
        </TabsContent>

        {/* ── Contacts tab ── */}
        <TabsContent value="contacts">
          <ContactTimeline
            activities={activities}
            vendors={vendors}
            customers={customers}
            initialContactId={initContactId}
          />
        </TabsContent>

        {/* ── Weekly Digest tab ── */}
        <TabsContent value="digest">
          <WeeklyDigest activities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
