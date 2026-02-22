/**
 * WeeklyDigest — auto-generated weekly activity report.
 * Groups the past 7 days of activities by day and type.
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ClipboardList } from 'lucide-react';
import { ACTIVITY_TYPES } from '../services/activityService';
import { toDate, dateKey } from '../utils/dateUtils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST edge
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

const SECTION_TYPES = ['communication', 'decision', 'price_quote', 'commitment'];

export default function WeeklyDigest({ activities = [] }) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = last week, …

  const { start, end, grouped, sectionsByType, total } = useMemo(() => {
    const now = new Date();
    const end   = new Date(now);
    end.setDate(end.getDate() - weekOffset * 7);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const inRange = activities.filter((a) => {
      const d = toDate(a.createdAt);
      return d && d >= start && d <= end;
    });

    // Group by day (YYYY-MM-DD), newest day first
    const byDay = {};
    inRange.forEach((a) => {
      const d = toDate(a.createdAt);
      const key = dateKey(d);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(a);
    });
    const grouped = Object.entries(byDay)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({ date, items }));

    // Sections by type for the summary
    const sectionsByType = {};
    SECTION_TYPES.forEach((t) => {
      sectionsByType[t] = inRange.filter((a) => a.type === t);
    });

    return { start, end, grouped, sectionsByType, total: inRange.length };
  }, [activities, weekOffset]);

  const rangeLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const typeInfo = (id) => ACTIVITY_TYPES.find((t) => t.id === id);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header + week nav */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Last Week' : `${weekOffset} Weeks Ago`}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{rangeLabel} · {total} activities</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronLeft className="w-4 h-4 mr-0.5" /> Previous
          </Button>
          {weekOffset > 0 && (
            <Button size="sm" onClick={() => setWeekOffset(0)}>
              This Week
            </Button>
          )}
        </div>
      </div>

      {total === 0 && (
        <div className="text-center py-16">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No activities logged for this period.</p>
        </div>
      )}

      {total > 0 && (
        <>
          {/* Summary by type */}
          <Card className="p-4 mb-5">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Week Summary</h4>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_TYPES.map((typeId) => {
                const info  = typeInfo(typeId);
                const count = sectionsByType[typeId]?.length || 0;
                return (
                  <div key={typeId} className={`flex items-center gap-2 p-2 rounded-xl ${count > 0 ? 'bg-green-50' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <span className="text-xl">{info?.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{info?.label}</p>
                      <p className={`text-lg font-bold ${count > 0 ? 'text-green-700' : 'text-gray-300'}`}>{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Day-by-day feed */}
          <div className="space-y-5">
            {grouped.map(({ date, items }) => (
              <div key={date}>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{dayLabel(date)}</p>
                <div className="space-y-2">
                  {items.map((activity) => {
                    const info = typeInfo(activity.type);
                    return (
                      <Card key={activity.id} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="text-base mt-0.5">{info?.icon || '📋'}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{info?.label}</span>
                              {activity.contactName && (
                                <span className="text-xs text-sky-600 font-semibold">{activity.contactName}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-100 mt-0.5 leading-relaxed">{activity.note}</p>
                            {activity.taskTitle && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">↳ {activity.taskTitle}</p>
                            )}
                            {(activity.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {activity.tags.map((t) => (
                                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
