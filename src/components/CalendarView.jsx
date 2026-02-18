import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamMembers, ownerColors } from '../data/constants';

const sizeToDays = { S: 1, M: 3, L: 5 };
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const priorityBadge = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-700',
};

function buildDayMap(activeTasks) {
  const map = {};
  activeTasks.forEach(task => {
    const dueDate = new Date(task.dueDate + 'T00:00:00');
    const duration = sizeToDays[task.size] || 1;
    for (let d = 0; d < duration; d++) {
      const date = new Date(dueDate);
      date.setDate(date.getDate() - (duration - 1 - d));
      const key = date.toISOString().split('T')[0];
      if (!map[key]) map[key] = {};
      const owner = task.owner || 'team';
      if (!map[key][owner]) map[key][owner] = [];
      map[key][owner].push(task);
    }
  });
  return map;
}

function buildSprintStartMap(sprints) {
  const map = {};
  // Sort by startDate so Sprint 1 always wins if two share a date
  [...(sprints || [])].sort((a, b) => {
    const ak = (a.startDate || '').split('T')[0];
    const bk = (b.startDate || '').split('T')[0];
    return ak < bk ? -1 : ak > bk ? 1 : 0;
  }).forEach(s => {
    const key = (s.startDate || '').split('T')[0];
    if (key && !map[key]) map[key] = s; // first (earliest) sprint for this date wins
  });
  return map;
}

// ─── Single-month grid ────────────────────────────────────────────────────────
function MonthGrid({ year, month, dayMap, sprintStartMap, todayStr, currentSprintId, sprints, onDayClick, onGoToSprint }) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });

  const weeks = [];
  let dayNum = 1;
  for (let w = 0; w < 6 && dayNum <= daysInMonth; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push((w === 0 && d < startDow) || dayNum > daysInMonth ? null : dayNum++);
    }
    weeks.push(week);
  }

  const renderDay = (day, key) => {
    if (!day) return <div key={key} className="flex-1 min-h-[78px]" />;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const dayData = dayMap[dateStr] || {};
    const ownerIds = Object.keys(dayData).sort();
    const totalTasks = ownerIds.reduce((s, o) => s + dayData[o].length, 0);
    const hasTasks = totalTasks > 0;

    const inSprint = sprints?.find(s => {
      const start = (s.startDate || '').split('T')[0];
      const end = (s.endDate || '').split('T')[0];
      return dateStr >= start && dateStr <= end;
    });
    const isCurrentDay = inSprint?.id === currentSprintId;

    return (
      <div
        key={key}
        onClick={() => hasTasks && onDayClick?.(dateStr, dayData)}
        className={`relative flex-1 min-h-[78px] border px-1.5 pt-4 pb-1 rounded-lg transition-all ${
          isToday
            ? 'bg-green-50 border-green-300'
            : isCurrentDay
            ? 'bg-sky-50/50 border-sky-100'
            : isPast
            ? 'bg-gray-50 border-gray-100 opacity-55'
            : 'bg-white border-gray-100'
        } ${hasTasks ? 'cursor-pointer hover:ring-2 hover:ring-sky-300 hover:shadow-sm' : ''}`}
      >
        {/* Day number */}
        <div className="absolute top-1 left-1.5">
          <span className={`text-[11px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full ${
            isToday ? 'bg-green-500 text-white font-extrabold' : 'text-gray-400'
          }`}>{day}</span>
        </div>

        {/* Task count */}
        {hasTasks && (
          <div className="absolute top-1 right-1">
            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 rounded px-1 py-px">{totalTasks}</span>
          </div>
        )}

        {/* Owner bars */}
        <div className="flex flex-col gap-px mt-0.5">
          {ownerIds.map(oid => {
            const c = ownerColors[oid] || { bar: '#bdbdbd', text: '#616161', bg: '#f5f5f5' };
            const count = dayData[oid].length;
            const name = teamMembers.find(m => m.id === oid)?.name || oid;
            return (
              <div
                key={oid}
                title={`${name}: ${count} task${count > 1 ? 's' : ''} — click to view`}
                className="flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-bold"
                style={{ background: c.bg, borderLeft: `2px solid ${c.bar}`, color: c.text }}
              >
                <span>{count}</span>
                <span className="opacity-75">{name.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="text-[15px] font-extrabold text-gray-700 mb-3 tracking-tight">{monthName}</div>
      <div className="flex gap-0.5 mb-1">
        {dayNames.map(d => (
          <div key={d} className="flex-1 text-center text-[10px] font-bold text-gray-400 py-0.5">{d}</div>
        ))}
        <div className="w-9 shrink-0" />{/* spacer aligns with right-margin sprint labels */}
      </div>
      {weeks.map((week, wi) => {
        // Find if any day in this week is a sprint start (for the right-margin label)
        const sprintInRow = week.reduce((found, day) => {
          if (found || !day) return found;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return sprintStartMap[ds] || found;
        }, null);
        return (
          <div key={wi} className="flex items-stretch gap-0.5 mb-1">
            {week.map((day, di) => renderDay(day, `${wi}-${di}`))}
            {/* Right-margin sprint label — only rendered for the week a sprint starts */}
            <div className="w-9 shrink-0 flex items-center justify-center">
              {sprintInRow && (
                <button
                  onClick={() => onGoToSprint?.(sprintInRow.id)}
                  title={`Sprint ${sprintInRow.number} — click to open in Planning`}
                  className="text-[9px] font-extrabold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded px-1 py-0.5 cursor-pointer border-solid whitespace-nowrap leading-tight transition-colors"
                >
                  S{sprintInRow.number}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Day task popup ───────────────────────────────────────────────────────────
function DayPopup({ popup, sprints, onClose, onGoToSprint }) {
  const dateLabel = new Date(popup.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Tasks due</div>
              <div className="text-base font-extrabold text-gray-800">{dateLabel}</div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 border-none cursor-pointer text-sm font-bold"
            >✕</button>
          </div>

          <div className="flex flex-col gap-2.5">
            {popup.tasks.map(task => {
              const c = ownerColors[task.owner] || { bar: '#bdbdbd', bg: '#f5f5f5', text: '#333' };
              const owner = teamMembers.find(m => m.id === task.owner);
              const sprint = sprints?.find(s => s.id === task.sprintId);
              return (
                <div
                  key={task.id}
                  className="rounded-xl p-3 bg-gray-50"
                  style={{ borderLeft: `4px solid ${c.bar}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13px] font-semibold text-gray-800 leading-snug flex-1">{task.title}</div>
                    {sprint && (
                      <button
                        onClick={() => { onClose(); onGoToSprint?.(sprint.id); }}
                        className="shrink-0 text-[11px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md px-2 py-0.5 cursor-pointer transition-colors whitespace-nowrap border-solid"
                      >
                        Sprint {sprint.number} →
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {owner && (
                      <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ background: c.bg, color: c.text }}>
                        {owner.name}
                      </span>
                    )}
                    {task.size && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{task.size}</span>
                    )}
                    {task.priority && (
                      <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${priorityBadge[task.priority] || ''}`}>
                        {task.priority}
                      </span>
                    )}
                    {!sprint && (
                      <span className="text-[10px] text-gray-400 italic">Backlog</span>
                    )}
                  </div>
                  {task.notes && (
                    <div className="mt-1.5 text-[11px] text-gray-500 leading-snug">{task.notes}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────
export default function CalendarView({ tasks, sprints, onGoToSprint }) {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [displayMonth, setDisplayMonth] = useState(() =>
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [animKey, setAnimKey] = useState(0);
  const [animClass, setAnimClass] = useState('');
  const [calView, setCalView] = useState('calendar');
  const [dayPopup, setDayPopup] = useState(null); // { dateStr, tasks[] }

  const activeTasks = (tasks || []).filter(t => t.status !== 'done' && t.dueDate);
  const unassignedTasks = (tasks || []).filter(t => t.status !== 'done' && !t.dueDate);
  const dayMap = buildDayMap(activeTasks);
  const sprintStartMap = buildSprintStartMap(sprints);

  const currentSprint = (sprints || []).find(s => {
    const start = (s.startDate || '').split('T')[0];
    const end = (s.endDate || '').split('T')[0];
    return todayStr >= start && todayStr <= end;
  });

  const month1 = displayMonth;
  const month2 = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1);

  const nav = (dir) => {
    setAnimClass(dir === 'forward' ? 'cal-slide-left' : 'cal-slide-right');
    setAnimKey(k => k + 1);
    setDisplayMonth(m => new Date(m.getFullYear(), m.getMonth() + (dir === 'forward' ? 1 : -1), 1));
  };

  const goToday = () => {
    const target = new Date(today.getFullYear(), today.getMonth(), 1);
    if (target.getTime() !== displayMonth.getTime()) {
      setAnimClass(target > displayMonth ? 'cal-slide-left' : 'cal-slide-right');
      setAnimKey(k => k + 1);
      setDisplayMonth(target);
    }
  };

  const handleDayClick = (dateStr, dayData) => {
    const seen = new Set();
    const dayTasks = Object.values(dayData).flat().filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    setDayPopup({ dateStr, tasks: dayTasks });
  };

  const headerLabel = `${month1.toLocaleString('default', { month: 'long' })} – ${month2.toLocaleString('default', { month: 'long', year: 'numeric' })}`;

  // Sprints visible in the current 2-month window
  const m1Start = `${month1.getFullYear()}-${String(month1.getMonth() + 1).padStart(2, '0')}-01`;
  const m2End = new Date(month2.getFullYear(), month2.getMonth() + 1, 0).toISOString().split('T')[0];
  const visibleSprints = (sprints || [])
    .filter(s => {
      const start = (s.startDate || '').split('T')[0];
      const end = (s.endDate || '').split('T')[0];
      return start <= m2End && end >= m1Start;
    })
    .sort((a, b) => (a.number || 0) - (b.number || 0));

  const renderListView = () => {
    const sorted = [...activeTasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    let prevDate = '';
    return (
      <div className="flex flex-col gap-1.5">
        {sorted.map(task => {
          const showDate = task.dueDate !== prevDate;
          prevDate = task.dueDate;
          const c = ownerColors[task.owner] || { bar: '#bdbdbd', bg: '#f5f5f5', text: '#333' };
          const isPast = task.dueDate < todayStr;
          return (
            <div key={task.id}>
              {showDate && (
                <div className={`text-[13px] font-bold mt-2.5 pb-1 border-b border-gray-200 ${isPast ? 'text-red-600' : 'text-gray-800'}`}>
                  {isPast ? '⚠️ ' : '📅 '}
                  {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              )}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white shadow-sm" style={{ borderLeft: `4px solid ${c.bar}` }}>
                <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: c.bg, color: c.text }}>{task.size || 'S'}</span>
                <span className="flex-1 text-[13px] font-medium">{task.title}</span>
                <span className="text-[11px] font-semibold rounded-md px-2 py-0.5" style={{ color: c.text, background: c.bg }}>
                  {teamMembers.find(m => m.id === task.owner)?.name || 'Team'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Nav header */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <button
          onClick={() => nav('backward')}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg cursor-pointer bg-white text-base font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >‹</button>
        <span className="text-lg font-bold min-w-[260px] text-center">{headerLabel}</span>
        <button
          onClick={() => nav('forward')}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg cursor-pointer bg-white text-base font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >›</button>
        <button
          onClick={goToday}
          className="border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer bg-white text-xs font-semibold hover:bg-sky-50 hover:border-sky-300 text-sky-600 transition-colors"
        >Today</button>
        <div className="flex-1" />
        <select
          className="text-[13px] px-3 py-1.5 border-2 border-gray-300 rounded-lg bg-white font-medium cursor-pointer"
          value={calView}
          onChange={e => setCalView(e.target.value)}
        >
          <option value="calendar">📅 Calendar</option>
          <option value="list">📋 List</option>
        </select>
      </div>

      <div className="flex gap-4">
        {/* Main area */}
        <div className="flex-1 overflow-hidden">
          {calView === 'calendar' ? (
            <div key={animKey} className={`flex flex-col gap-4 ${animClass}`}>
              <MonthGrid
                year={month1.getFullYear()} month={month1.getMonth()}
                dayMap={dayMap} sprintStartMap={sprintStartMap}
                todayStr={todayStr} currentSprintId={currentSprint?.id} sprints={sprints}
                onDayClick={handleDayClick} onGoToSprint={onGoToSprint}
              />
              <MonthGrid
                year={month2.getFullYear()} month={month2.getMonth()}
                dayMap={dayMap} sprintStartMap={sprintStartMap}
                todayStr={todayStr} currentSprintId={currentSprint?.id} sprints={sprints}
                onDayClick={handleDayClick} onGoToSprint={onGoToSprint}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 shadow-md">{renderListView()}</div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-[200px] shrink-0 flex flex-col gap-3">
          {/* Sprints in view — clickable */}
          {visibleSprints.length > 0 && (
            <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
              <div className="text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-wide">Sprints in View</div>
              {visibleSprints.map(s => {
                const isCurrent = s.id === currentSprint?.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onGoToSprint?.(s.id)}
                    className={`w-full flex items-center justify-between rounded-lg mb-1 px-2.5 py-1.5 text-[12px] cursor-pointer border-none transition-all duration-150 hover:scale-[1.02] ${
                      isCurrent
                        ? 'bg-sky-100 hover:bg-sky-200 border border-sky-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    <span className={`font-bold ${isCurrent ? 'text-sky-700' : 'text-gray-600'}`}>
                      {isCurrent && <span className="mr-1">✓</span>}Sprint {s.number}
                    </span>
                    <span className={`text-[10px] ${isCurrent ? 'text-sky-500' : 'text-gray-400'}`}>
                      {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Unassigned tasks — owners clickable */}
          <div className={`bg-white rounded-xl p-3.5 shadow-sm border-2 ${unassignedTasks.length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
            <div className={`text-[11px] font-bold mb-2 ${unassignedTasks.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              📌 No Due Date ({unassignedTasks.length})
            </div>
            {unassignedTasks.length === 0 ? (
              <div className="text-[11px] text-gray-400 italic">All tasks have dates! 🎉</div>
            ) : (
              <>
                <div className="text-[10px] text-gray-400 mb-2">Click to view in Planning →</div>
                {teamMembers.map(m => {
                  const count = unassignedTasks.filter(t => t.owner === m.id).length;
                  if (!count) return null;
                  const c = ownerColors[m.id];
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigate('/planning')}
                      title="View unassigned tasks in Planning Board"
                      className="w-full flex items-center gap-1.5 rounded-md mb-1 px-2 py-1 cursor-pointer border-none transition-all duration-150 hover:scale-[1.02] hover:shadow-sm"
                      style={{ background: c.bg, borderLeft: `3px solid ${c.bar}` }}
                    >
                      <span className="text-sm font-extrabold" style={{ color: c.text }}>{count}</span>
                      <span className="text-[11px] font-semibold" style={{ color: c.text }}>{m.name}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Size guide */}
          <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
            <div className="text-[11px] font-bold mb-1.5 text-gray-400 uppercase tracking-wide">Size Guide</div>
            <div className="text-[11px] text-gray-500 flex flex-col gap-0.5">
              <div><strong>S</strong> = 1 day</div>
              <div><strong>M</strong> = 3 days</div>
              <div><strong>L</strong> = 5 days</div>
            </div>
            <div className="text-[10px] text-gray-400 mt-1.5 italic">Counts back from due date</div>
          </div>
        </div>
      </div>

      {/* Day task popup */}
      {dayPopup && (
        <DayPopup
          popup={dayPopup}
          sprints={sprints}
          onClose={() => setDayPopup(null)}
          onGoToSprint={onGoToSprint}
        />
      )}
    </div>
  );
}
