import { useState } from 'react';
import { teamMembers, ownerColors } from '../data/constants';

const sizeToDays = { S: 1, M: 3, L: 5 };
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ tasks }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calView, setCalView] = useState('calendar');

  const activeTasks = (tasks || []).filter(t => t.status !== 'done' && t.dueDate);
  const unassignedTasks = (tasks || []).filter(t => t.status !== 'done' && !t.dueDate);

  // Build map: dateStr -> { ownerId: [tasks] }
  const buildDayMap = () => {
    const dayMap = {};
    activeTasks.forEach(task => {
      const dueDate = new Date(task.dueDate + 'T00:00:00');
      const duration = sizeToDays[task.size] || 1;
      for (let d = 0; d < duration; d++) {
        const date = new Date(dueDate);
        date.setDate(date.getDate() - (duration - 1 - d));
        const key = date.toISOString().split('T')[0];
        if (!dayMap[key]) dayMap[key] = {};
        const owner = task.owner || 'team';
        if (!dayMap[key][owner]) dayMap[key][owner] = [];
        dayMap[key][owner].push(task);
      }
    });
    return dayMap;
  };

  const dayMap = buildDayMap();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const weeks = [];
  let dayNum = 1;
  for (let w = 0; w < 6 && dayNum <= daysInMonth; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if ((w === 0 && d < startDow) || dayNum > daysInMonth) {
        week.push(null);
      } else {
        week.push(dayNum);
        dayNum++;
      }
    }
    weeks.push(week);
  }

  const renderDayCell = (day, idx) => {
    if (!day) return <div key={`empty-${idx}`} className="flex-1 min-h-[90px]" />;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const dayData = dayMap[dateStr] || {};
    const ownerIds = Object.keys(dayData).sort();
    const totalTasks = ownerIds.reduce((sum, oid) => sum + dayData[oid].length, 0);
    const isPast = new Date(dateStr) < new Date(todayStr);

    return (
      <div
        key={day}
        className={`flex-1 min-h-[90px] border border-gray-200 px-1.5 py-1 rounded ${
          isToday ? 'bg-green-50' : isPast ? 'bg-gray-50' : 'bg-white'
        } ${isPast ? 'opacity-60' : ''} relative`}
      >
        <div className="flex justify-between mb-1">
          <span className={`text-xs font-semibold w-[22px] h-[22px] flex items-center justify-center rounded-full ${
            isToday ? 'font-extrabold text-green-600 bg-green-100' : 'text-gray-500'
          }`}>{day}</span>
          {totalTasks > 0 && (
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              {totalTasks}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {ownerIds.map(oid => {
            const c = ownerColors[oid] || { bar: '#bdbdbd', text: '#616161', bg: '#f5f5f5' };
            const count = dayData[oid].length;
            const name = teamMembers.find(m => m.id === oid)?.name || oid;
            return (
              <div
                key={oid}
                title={`${name}: ${count} task${count > 1 ? 's' : ''}`}
                className="flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-bold"
                style={{ background: c.bg, borderLeft: `3px solid ${c.bar}`, color: c.text }}
              >
                <span className="min-w-[10px]">{count}</span>
                <span className="text-[9px] opacity-80">{name.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const sorted = [...activeTasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    let currentDate = '';
    return (
      <div className="flex flex-col gap-1.5">
        {sorted.map(task => {
          const showDate = task.dueDate !== currentDate;
          currentDate = task.dueDate;
          const c = ownerColors[task.owner] || { bar: '#bdbdbd', bg: '#f5f5f5', text: '#333' };
          const isPast = new Date(task.dueDate) < new Date(todayStr);
          return (
            <div key={task.id}>
              {showDate && (
                <div className={`text-[13px] font-bold mt-2.5 pb-1 border-b border-gray-200 ${isPast ? 'text-red-600' : 'text-gray-800'}`}>
                  {isPast ? '⚠️ ' : '📅 '}
                  {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              )}
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white shadow-sm"
                style={{ borderLeft: `4px solid ${c.bar}` }}
              >
                <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: c.bg, color: c.text }}>
                  {task.size || 'S'}
                </span>
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
      {/* Month nav + view toggle */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button onClick={prevMonth} className="border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer bg-white text-sm hover:bg-gray-50">◀</button>
        <span className="text-lg font-bold min-w-[180px] text-center">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} className="border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer bg-white text-sm hover:bg-gray-50">▶</button>
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
        {/* Main calendar / list */}
        <div className="flex-1">
          {calView === 'calendar' ? (
            <div className="bg-white rounded-xl p-4 shadow-md">
              <div className="flex gap-0.5 mb-1">
                {dayNames.map(d => (
                  <div key={d} className="flex-1 text-center text-[11px] font-bold text-gray-500 py-1">{d}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex gap-0.5 mb-0.5">
                  {week.map((day, di) => renderDayCell(day, `${wi}-${di}`))}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 shadow-md">
              {renderListView()}
            </div>
          )}
        </div>

        {/* Sidebar: unassigned tasks + size guide */}
        <div className="w-[220px] shrink-0">
          <div className={`bg-white rounded-xl p-3.5 shadow-md border-2 ${unassignedTasks.length > 0 ? 'border-red-300' : 'border-gray-200'}`}>
            <div className={`text-sm font-bold mb-2 ${unassignedTasks.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              📌 No Due Date ({unassignedTasks.length})
            </div>
            {unassignedTasks.length === 0 ? (
              <div className="text-xs text-gray-400 italic">All tasks have dates! 🎉</div>
            ) : (
              <>
                <div className="text-[11px] text-gray-500 mb-2">These need due dates assigned in Planning</div>
                {teamMembers.map(m => {
                  const count = unassignedTasks.filter(t => t.owner === m.id).length;
                  if (count === 0) return null;
                  const c = ownerColors[m.id];
                  return (
                    <div key={m.id} className="flex items-center gap-1.5 rounded-md mb-1 px-2 py-1" style={{ background: c.bg, borderLeft: `3px solid ${c.bar}` }}>
                      <span className="text-sm font-extrabold" style={{ color: c.text }}>{count}</span>
                      <span className="text-[11px] font-semibold" style={{ color: c.text }}>{m.name}</span>
                    </div>
                  );
                })}
                <div className="text-[10px] text-gray-400 mt-2 italic">Go to Planning to assign dates →</div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl p-3.5 shadow-md mt-3">
            <div className="text-xs font-bold mb-1.5 text-gray-500">📐 Size Guide</div>
            <div className="text-[11px] text-gray-500 flex flex-col gap-0.5">
              <div><strong>S</strong> = 1 day</div>
              <div><strong>M</strong> = 3 days</div>
              <div><strong>L</strong> = 5 days</div>
            </div>
            <div className="text-[10px] text-gray-400 mt-1.5 italic">
              Multi-day tasks count backwards from due date
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
