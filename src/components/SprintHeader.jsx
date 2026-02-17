import React, { useState } from 'react';
import { teamMembers, ownerColors } from '../data/constants';
import { formatDateRange, isCurrentSprint, isFutureSprint } from '../utils/sprintUtils';

export default function SprintHeader({ sprint, sprints, selectedSprintId, onSelectSprint, onCreateSprint, viewFilter, onViewFilterChange }) {
    if (!sprint) return null;
    const [createHover, setCreateHover] = useState(false);

    const current = isCurrentSprint(sprint);
    const future = isFutureSprint(sprint);
    const past = !current && !future;
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);

    let alertText = null;
    let alertStyle = {};
    if (future) {
        alertText = "\u26A0\uFE0F Future sprint \u2014 tasks go to Sprint " + sprint.number;
        alertStyle = { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' };
    } else if (past) {
        alertText = "\uD83D\uDCC5 Past sprint \u2014 Sprint " + sprint.number + " completed";
        alertStyle = { background: '#fefce8', color: '#854d0e', border: '1px solid #fde047' };
    }

    return (
        <div style={{
            background: 'white', borderRadius: '14px', padding: '14px 20px', marginBottom: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: `2px solid ${current ? '#10b981' : past ? '#d97706' : '#e2e8f0'}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', whiteSpace: 'nowrap' }}>
                    {current && <span style={{ color: '#10b981', marginRight: '6px' }}>{'\u25CF'}</span>}
                    Sprint {sprint.number}
                </div>
                <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateRange(startDate, endDate)}</span>
                {alertText && (
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: '600', whiteSpace: 'nowrap', ...alertStyle }}>{alertText}</span>
                )}
                <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 2px' }} />
                <button
                    onClick={() => onViewFilterChange('all')}
                    style={{
                        padding: '5px 12px', borderRadius: '8px', border: '2px solid ' + (viewFilter === 'all' ? 'var(--sky-blue)' : '#e2e8f0'),
                        background: viewFilter === 'all' ? 'var(--sky-blue)' : '#f8fafc',
                        color: viewFilter === 'all' ? 'white' : '#64748b',
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                    }}
                >All</button>
                {teamMembers.map(m => {
                    const c = ownerColors[m.id] || { bg: '#f5f5f5', border: '#bdbdbd', text: '#616161' };
                    const isActive = viewFilter === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={() => onViewFilterChange(isActive ? 'all' : m.id)}
                            style={{
                                padding: '5px 12px', borderRadius: '8px',
                                border: '2px solid ' + (isActive ? c.text : c.border),
                                background: isActive ? c.bg : '#fafafa',
                                color: c.text,
                                fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                                opacity: isActive ? 1 : 0.7,
                                transform: isActive ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >{m.name}</button>
                    );
                })}
                <div style={{ flex: '1' }} />
                <select className="sprint-select" value={selectedSprintId} onChange={(e) => onSelectSprint(Number(e.target.value))} style={{ minWidth: '170px', fontSize: '13px' }}>
                    {sprints.map(s => (
                        <option key={s.id} value={s.id}>Sprint {s.number}{isCurrentSprint(s) ? ' (Current)' : ''} - {formatDateRange(new Date(s.startDate), new Date(s.endDate))}</option>
                    ))}
                </select>
                {sprint.goal && (
                    <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }} title={sprint.goal}>{'\uD83C\uDFAF'}</span>
                )}
                <button
                    onMouseEnter={() => setCreateHover(true)}
                    onMouseLeave={() => setCreateHover(false)}
                    onClick={onCreateSprint}
                    style={{
                        background: 'var(--sky-blue)', color: 'white', border: 'none', borderRadius: '8px',
                        padding: createHover ? '8px 16px' : '8px 12px', fontSize: '14px', fontWeight: '700',
                        cursor: 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap', overflow: 'hidden'
                    }}
                >{createHover ? '+ New Sprint' : '+'}</button>
            </div>
        </div>
    );
}
