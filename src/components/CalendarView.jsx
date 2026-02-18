import { useState } from 'react';
import { teamMembers, ownerColors } from '../data/constants';

const sizeToDays = { S: 1, M: 3, L: 5 };
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  (sprints || []).forEach(s => {
    const key = (s.startDate || '').split('T')[0];
    if (key) map[key] = s;
  });
  return map;
}

// ─── Single-month grid ────────────────────────────────────────────────────────
function MonthGrid({ year, month, dayMap, sprintStartMap, todayStr, currentSprintId, sprints }) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Build weeks
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
    const sprintStart = sprintStartMap[dateStr];

    const inSprint = sprints?.find(s => {
      const start = (s.startDate || '').split('T')[0];
      const end = (s.endDate || '').split('T')[0];
      return dateStr >= start && dateStr <= end;
    });
    const isCurrentDay = inSprint?.id === currentSprintId;

    return (
      <div
        key={key}
        className={`relative flex-1 min-h-[78px] border px-1.5 pt-4 pb-1 rounded-lg transition-colors ${
          isToday
            ? 'bg-green-50 border-green-300'
            : isCurrentDay
            ? 'bg-sky-50/50 border-sky-100'
            : isPast
            ? 'bg-gray-50 border-gray-100 opacity-55'
            : 'bg-white border-gray-100'
        }`}
      >
        {/* Sprint start ribbon */}
        {sprintStart && (
          <div className="absolute top-0 left-0 right-0 flex justify-center -translate-y-1/2 z-10">
            <span className="text-[8.5px] font-black px-1.5 py-px bg-sky-500 text-white rounded-full shadow whitespace-nowrap">
              Sprint {sprintStart.number}
            </span>
          </div>
        )}

        {/* Day number */}
        <div className="absolute top-1 left-1.5">
          <span className={`text-[11px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full ${
            isToday ? 'bg-green-500 text-white font-extrabold' : 'text-gray-400'
          }`}>{day}</span>
        </div>

        {/* Task count bubble */}
        {totalTasks > 0 && (
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
                title={`${name}: ${count} task${count > 1 ? 's' : ''}`}
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
      {/* Day-of-week headers */}
      <div className="flex gap-0.5 mb-1">
        {dayNames.map(d => (
          <div key={d} className="flex-1 text-center text-[10px] font-bold text-gray-400 py-0.5">{d}</div>
        ))}
      </div>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-0.5 mb-1">
          {week.map((day, di) => renderDay(day, `${wi}-${di}`))}
        </div>
      ))}
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────
export default function CalendarView({ tasks, sprints }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [displayMonth, setDisplayMonth] = useState(() =>
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [animKey, setAnimKey] = useState(0);
  const [animClass, setAnimClass] = useState('');
  const [calView, setCalView] = useState('calendar');

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

  const navigate = (dir) => {
    setAnimClass(dir === 'forward' ? 'cal-slide-left' : 'cal-slide-right');
    setAnimKey(k => k + 1);
    setDisplayMonth(m => new Date(m.getFullYear(), m.getMonth() + (dir === 'forward' ? 1 : -1), 1));
  };

  const goToday = () => {
    const target = new Date(today.getFullYear(), today.getMonth(), 1);
    const dir = target > displayMonth ? 'forward' : 'backward';
    if (target.getTime() !== displayMonth.getTime()) {
      setAnimClass(dir === 'forward' ? 'cal-slide-left' : 'cal-slide-right');
      setAnimKey(k => k + 1);
      setDisplayMonth(target);
    }
  };

  const headerLabel = `${month1.toLocaleString('default', { month: 'long' })} – ${month2.toLocaleString('default', { month: 'long', year: 'numeric' })}`;

  // Sprints visible in the current 2-month window
  const m1Start = `${month1.getFullYear()}-${String(month1.getMonth() + 1).padStart(2, '0')}-01`;
  const m2End = new Date(month2.getFullYear(), month2.getMonth() + 1, 0).toISOString().split('T')[0];
  const visibleSprints = (sprints || []).filter(s => {
    const start = (s.startDate || '').split('T')[0];
    const end = (s.endDate || '').split('T')[0];
    return start <= m2End && end >= m1Start;
  });

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
          onClick={() => navigate('backward')}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg cursor-pointer bg-white text-base font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >‹</button>
        <span className="text-lg font-bold min-w-[260px] text-center">{headerLabel}</span>
        <button
          onClick={() => navigate('forward')}
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
              />
              <MonthGrid
                year={month2.getFullYear()} month={month2.getMonth()}
                dayMap={dayMap} sprintStartMap={sprintStartMap}
                todayStr={todayStr} currentSprintId={currentSprint?.id} sprints={sprints}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 shadow-md">{renderListView()}</div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-[200px] shrink-0 flex flex-col gap-3">
          {/* Sprints in view */}
          {visibleSprints.length > 0 && (
            <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
              <div className="text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-wide">Sprints in View</div>
              {visibleSprints.map(s => {
                const isCurrent = s.id === currentSprint?.id;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between rounded-lg mb-1 px-2.5 py-1.5 text-[12px] ${
                      isCurrent ? 'bg-sky-100 border border-sky-200' : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <span className={`font-bold ${isCurrent ? 'text-sky-700' : 'text-gray-600'}`}>
                      {isCurrent && <span className="mr-1">✓</span>}Sprint {s.number}
                    </span>
                    <span className={`text-[10px] ${isCurrent ? 'text-sky-500' : 'text-gray-400'}`}>
                      {new Date((s.startDate || '') + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unassigned tasks */}
          <div className={`bg-white rounded-xl p-3.5 shadow-sm border-2 ${unassignedTasks.length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
            <div className={`text-[11px] font-bold mb-2 ${unassignedTasks.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              📌 No Due Date ({unassignedTasks.length})
            </div>
            {unassignedTasks.length === 0 ? (
              <div className="text-[11px] text-gray-400 italic">All tasks have dates! 🎉</div>
            ) : (
              <>
                <div className="text-[10px] text-gray-400 mb-2">Assign dates in Planning →</div>
                {teamMembers.map(m => {
                  const count = unassignedTasks.filter(t => t.owner === m.id).length;
                  if (!count) return null;
                  const c = ownerColors[m.id];
                  return (
                    <div key={m.id} className="flex items-center gap-1.5 rounded-md mb-1 px-2 py-1" style={{ background: c.bg, borderLeft: `3px solid ${c.bar}` }}>
                      <span className="text-sm font-extrabold" style={{ color: c.text }}>{count}</span>
                      <span className="text-[11px] font-semibold" style={{ color: c.text }}>{m.name}</span>
                    </div>
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
    </div>
  );
}
