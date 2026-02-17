import React, { useState } from 'react';
import { teamMembers, ownerColors } from '../data/constants';

export default function CalendarView({ tasks }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calView, setCalView] = useState('calendar');

    const sizeToDays = { 'S': 1, 'M': 3, 'L': 5 };

    const activeTasks = tasks.filter(t => t.status !== 'done' && t.dueDate);
    const unassignedTasks = tasks.filter(t => t.status !== 'done' && !t.dueDate);

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

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const renderDayCell = (day) => {
        if (!day) return <div key={Math.random()} style={{ flex: 1, minHeight: '90px' }} />;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const dayData = dayMap[dateStr] || {};
        const ownerIds = Object.keys(dayData).sort();
        const totalTasks = ownerIds.reduce((sum, oid) => sum + dayData[oid].length, 0);
        const isPast = new Date(dateStr) < new Date(todayStr);

        return (
            <div key={day} style={{
                flex: 1, minHeight: '90px', border: '1px solid #e2e8f0', padding: '4px 6px',
                background: isToday ? '#f0fdf4' : isPast ? '#fafafa' : 'white',
                borderRadius: '4px', position: 'relative',
                opacity: isPast ? 0.6 : 1
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{
                        fontSize: '12px', fontWeight: isToday ? '800' : '600',
                        color: isToday ? '#16a34a' : '#64748b',
                        background: isToday ? '#dcfce7' : 'transparent',
                        borderRadius: '50%', width: '22px', height: '22px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{day}</span>
                    {totalTasks > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', borderRadius: '4px', padding: '1px 5px' }}>
                            {totalTasks}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {ownerIds.map(oid => {
                        const c = ownerColors[oid] || { bar: '#bdbdbd', text: '#616161' };
                        const count = dayData[oid].length;
                        const name = teamMembers.find(m => m.id === oid)?.name || oid;
                        return (
                            <div key={oid} title={`${name}: ${count} task${count > 1 ? 's' : ''}`} style={{
                                display: 'flex', alignItems: 'center', gap: '3px',
                                background: c.bg || '#f5f5f5',
                                borderLeft: `3px solid ${c.bar}`,
                                borderRadius: '3px', padding: '1px 5px',
                                fontSize: '10px', fontWeight: '700', color: c.text || '#333'
                            }}>
                                <span style={{ minWidth: '10px' }}>{count}</span>
                                <span style={{ fontSize: '9px', opacity: 0.8 }}>{name.slice(0, 3)}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sorted.map(task => {
                    const showDate = task.dueDate !== currentDate;
                    currentDate = task.dueDate;
                    const c = ownerColors[task.owner] || { bar: '#bdbdbd', bg: '#f5f5f5', text: '#333' };
                    const isPast = new Date(task.dueDate) < new Date(todayStr);
                    return (
                        <React.Fragment key={task.id}>
                            {showDate && (
                                <div style={{ fontSize: '13px', fontWeight: '700', color: isPast ? '#dc2626' : '#1e293b', marginTop: '10px', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                                    {isPast ? '\u26A0\uFE0F ' : '\uD83D\uDCC5 '}{new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                            )}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 12px', borderRadius: '8px', background: 'white',
                                borderLeft: `4px solid ${c.bar}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                            }}>
                                <span style={{ fontSize: '10px', fontWeight: '700', background: c.bg, color: c.text, padding: '2px 6px', borderRadius: '4px' }}>{task.size || 'S'}</span>
                                <span style={{ flex: 1, fontSize: '13px', fontWeight: '500' }}>{task.title}</span>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: c.text, background: c.bg, padding: '2px 8px', borderRadius: '6px' }}>
                                    {teamMembers.find(m => m.id === task.owner)?.name || 'Team'}
                                </span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap'
            }}>
                <button onClick={prevMonth} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', background: 'white', fontSize: '14px' }}>{'\u25C0'}</button>
                <span style={{ fontSize: '18px', fontWeight: '700', minWidth: '180px', textAlign: 'center' }}>
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', background: 'white', fontSize: '14px' }}>{'\u25B6'}</button>
                <div style={{ flex: 1 }} />
                <select className="sprint-select" value={calView} onChange={e => setCalView(e.target.value)} style={{ fontSize: '13px' }}>
                    <option value="calendar">{'\uD83D\uDCC5'} Calendar</option>
                    <option value="list">{'\uD83D\uDCCB'} List</option>
                </select>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                    {calView === 'calendar' ? (
                        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                                {dayNames.map(d => (
                                    <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#64748b', padding: '4px 0' }}>{d}</div>
                                ))}
                            </div>
                            {weeks.map((week, wi) => (
                                <div key={wi} style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                                    {week.map((day, di) => renderDayCell(day))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                            {renderListView()}
                        </div>
                    )}
                </div>

                <div style={{ width: '220px', flexShrink: 0 }}>
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '14px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: unassignedTasks.length > 0 ? '2px solid #fca5a5' : '2px solid #e2e8f0'
                    }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: unassignedTasks.length > 0 ? '#dc2626' : '#64748b' }}>
                            {'\uD83D\uDCCC'} No Due Date ({unassignedTasks.length})
                        </div>
                        {unassignedTasks.length === 0 ? (
                            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>All tasks have dates! {'\uD83C\uDF89'}</div>
                        ) : (
                            <>
                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                                    These need due dates assigned in Planning
                                </div>
                                {teamMembers.map(m => {
                                    const count = unassignedTasks.filter(t => t.owner === m.id).length;
                                    if (count === 0) return null;
                                    const c = ownerColors[m.id];
                                    return (
                                        <div key={m.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '4px 8px', borderRadius: '6px', marginBottom: '4px',
                                            background: c.bg, borderLeft: `3px solid ${c.bar}`
                                        }}>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: c.text }}>{count}</span>
                                            <span style={{ fontSize: '11px', fontWeight: '600', color: c.text }}>{m.name}</span>
                                        </div>
                                    );
                                })}
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                                    Go to Planning to assign dates {'\u2192'}
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '14px', marginTop: '12px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>{'\uD83D\uDCD0'} Size Guide</div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div><strong>S</strong> = 1 day</div>
                            <div><strong>M</strong> = 3 days</div>
                            <div><strong>L</strong> = 5 days</div>
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
                            Multi-day tasks count backwards from due date
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
