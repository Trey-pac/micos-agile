import React, { useState, useEffect, useRef } from 'react';
import { teamMembers, ownerColors } from '../data/constants';
import { formatDateRange, isCurrentSprint } from '../utils/sprintUtils';
import PlanningTaskCard from './PlanningTaskCard';

export default function PlanningBoard({ tasks, sprints, onDragStart, onDrop, onReorderBacklog, onCreateSprint, onEditTask, onDeleteTask, onActiveSprintChange }) {
    const [dragOverColumn, setDragOverColumn] = useState(null);
    const [planMenuOpenId, setPlanMenuOpenId] = useState(null);
    const [activeSprintIdx, setActiveSprintIdx] = useState(0);
    const [filterOwner, setFilterOwner] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterSize, setFilterSize] = useState('all');
    const [createSprintHover, setCreateSprintHover] = useState(false);
    const scrollRef = useRef(null);
    const isDraggingScroll = useRef(false);
    const scrollStartX = useRef(0);
    const scrollLeftStart = useRef(0);

    const applyFilters = (taskList) => {
        return taskList.filter(t => {
            if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
            if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
            if (filterSize !== 'all' && t.size !== filterSize) return false;
            return true;
        });
    };

    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };

    const backlogTasks = applyFilters(tasks.filter(t => !t.sprintId))
        .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        });

    const getSprintTasks = (sprintId) => applyFilters(tasks.filter(t => t.sprintId === sprintId));

    const updateActiveSprintOnScroll = () => {
        if (!scrollRef.current) return;
        const container = scrollRef.current;
        const scrollLeft = container.scrollLeft;
        const columns = container.querySelectorAll('.planning-column.sprint');
        let bestIdx = 0;
        let bestDist = Infinity;
        columns.forEach((col, idx) => {
            const dist = Math.abs(col.offsetLeft - scrollLeft);
            if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
        });
        setActiveSprintIdx(bestIdx);
        if (onActiveSprintChange) onActiveSprintChange(bestIdx);
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateActiveSprintOnScroll);
        updateActiveSprintOnScroll();
        return () => el.removeEventListener('scroll', updateActiveSprintOnScroll);
    }, []);

    const handleMouseDown = (e) => {
        if (e.target.closest('.planning-task-card') || e.target.closest('button')) return;
        isDraggingScroll.current = true;
        scrollStartX.current = e.pageX;
        scrollLeftStart.current = scrollRef.current ? scrollRef.current.scrollLeft : 0;
        if (scrollRef.current) scrollRef.current.style.scrollBehavior = 'auto';
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDraggingScroll.current || !scrollRef.current) return;
            e.preventDefault();
            const dx = e.pageX - scrollStartX.current;
            scrollRef.current.scrollLeft = scrollLeftStart.current - dx;
        };
        const handleMouseUp = () => {
            if (isDraggingScroll.current && scrollRef.current) {
                scrollRef.current.style.scrollBehavior = 'smooth';
                setTimeout(updateActiveSprintOnScroll, 350);
            }
            isDraggingScroll.current = false;
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const getMonthsFromSprints = () => {
        const months = new Map();
        sprints.forEach(sprint => {
            const date = new Date(sprint.startDate);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (!months.has(monthKey)) months.set(monthKey, { key: monthKey, name: monthName, sprintId: sprint.id });
        });
        return Array.from(months.values());
    };

    const handleMonthJump = (monthKey) => {
        if (!monthKey) return;
        const [year, month] = monthKey.split('-').map(Number);
        const targetSprint = sprints.find(s => {
            const d = new Date(s.startDate);
            return d.getFullYear() === year && d.getMonth() === month;
        });
        if (targetSprint) {
            const el = scrollRef.current?.querySelector(`[data-sprint-id="${targetSprint.id}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
            setTimeout(updateActiveSprintOnScroll, 400);
        }
    };

    const hasActiveFilter = filterOwner !== 'all' || filterPriority !== 'all' || filterSize !== 'all';

    return (
        <div style={{ position: 'relative' }}>
            {/* Header bubble */}
            <div style={{
                background: 'white', borderRadius: '14px', padding: '14px 20px', marginBottom: '12px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '2px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', whiteSpace: 'nowrap' }}>{'\uD83D\uDCCB'} Sprint Planning</span>
                    <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                    <button
                        onClick={() => setFilterOwner('all')}
                        style={{
                            padding: '5px 12px', borderRadius: '8px',
                            border: '2px solid ' + (filterOwner === 'all' ? 'var(--sky-blue)' : '#e2e8f0'),
                            background: filterOwner === 'all' ? 'var(--sky-blue)' : '#f8fafc',
                            color: filterOwner === 'all' ? 'white' : '#64748b',
                            fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >All</button>
                    {teamMembers.map(m => {
                        const c = ownerColors[m.id] || { bg: '#f5f5f5', border: '#bdbdbd', text: '#616161' };
                        const isActive = filterOwner === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => setFilterOwner(isActive ? 'all' : m.id)}
                                style={{
                                    padding: '5px 12px', borderRadius: '8px',
                                    border: '2px solid ' + (isActive ? c.text : c.border),
                                    background: isActive ? c.bg : '#fafafa', color: c.text,
                                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                                    opacity: isActive ? 1 : 0.7, transform: isActive ? 'scale(1.05)' : 'scale(1)'
                                }}
                            >{m.name}</button>
                        );
                    })}
                    <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                    <select className="sprint-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ minWidth: '110px', fontSize: '12px' }}>
                        <option value="all">All Priorities</option>
                        <option value="high">{'\uD83D\uDD34'} High</option>
                        <option value="medium">{'\uD83D\uDFE0'} Medium</option>
                        <option value="low">{'\uD83D\uDFE2'} Low</option>
                    </select>
                    <select className="sprint-select" value={filterSize} onChange={e => setFilterSize(e.target.value)} style={{ minWidth: '100px', fontSize: '12px' }}>
                        <option value="all">All Sizes</option>
                        <option value="S">S - Small</option>
                        <option value="M">M - Medium</option>
                        <option value="L">L - Large</option>
                    </select>
                    {hasActiveFilter && (
                        <button
                            style={{ fontSize: '11px', padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', cursor: 'pointer', color: '#64748b' }}
                            onClick={() => { setFilterOwner('all'); setFilterPriority('all'); setFilterSize('all'); }}
                        >{'\u2715'} Clear</button>
                    )}
                    <div style={{ flex: '1' }} />
                    <select className="sprint-select" onChange={(e) => handleMonthJump(e.target.value)} defaultValue="" style={{ minWidth: '110px', fontSize: '12px' }}>
                        <option value="">Jump to Month</option>
                        {getMonthsFromSprints().map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
                    </select>
                    <button
                        onMouseEnter={() => setCreateSprintHover(true)}
                        onMouseLeave={() => setCreateSprintHover(false)}
                        onClick={onCreateSprint}
                        style={{
                            background: 'var(--sky-blue)', color: 'white', border: 'none', borderRadius: '8px',
                            padding: createSprintHover ? '7px 16px' : '7px 11px', fontSize: '14px', fontWeight: '700',
                            cursor: 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap', overflow: 'hidden'
                        }}
                    >{createSprintHover ? '+ Create Sprint' : '+'}</button>
                </div>
            </div>

            {/* Main board */}
            <div className="planning-board-container">
                {/* LEFT: Backlog */}
                <div className="planning-backlog-fixed">
                    <div
                        className="planning-column backlog"
                        style={{ minHeight: 'auto', height: '100%', overflow: 'auto' }}
                        onDragOver={(e) => { e.preventDefault(); setDragOverColumn('backlog'); }}
                        onDrop={() => { onDrop(null); setDragOverColumn(null); }}
                    >
                        <div className="planning-column-header">
                            <div className="planning-column-title">{'\uD83D\uDCCB'} Backlog</div>
                            <div className="planning-column-subtitle">{backlogTasks.length} tasks</div>
                        </div>
                        {backlogTasks.length === 0 ? (
                            <div className="drag-indicator">No tasks in backlog</div>
                        ) : (
                            backlogTasks.map(task => (
                                <PlanningTaskCard
                                    key={task.id} task={task}
                                    isMenuOpen={planMenuOpenId === task.id}
                                    onToggleMenu={() => setPlanMenuOpenId(planMenuOpenId === task.id ? null : task.id)}
                                    onEdit={() => { if (onEditTask) onEditTask(task); setPlanMenuOpenId(null); }}
                                    onDelete={() => { if (onDeleteTask) onDeleteTask(task.id); setPlanMenuOpenId(null); }}
                                    onDragStart={() => onDragStart(task)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: Sprint area */}
                <div className="planning-sprints-wrapper">
                    <div
                        className="planning-sprints-scroll"
                        ref={scrollRef}
                        onMouseDown={handleMouseDown}
                    >
                        {sprints.map((sprint, idx) => {
                            const sprintTasks = getSprintTasks(sprint.id);
                            const isCurrent = isCurrentSprint(sprint);
                            const isActive = idx === activeSprintIdx;

                            return (
                                <div
                                    key={sprint.id}
                                    data-sprint-id={sprint.id}
                                    className={"planning-column sprint" + (isActive ? " active-sprint-col" : "")}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverColumn(sprint.id); }}
                                    onDrop={() => { onDrop(sprint.id); setDragOverColumn(null); }}
                                >
                                    <div className="planning-column-header">
                                        <div className="planning-column-title">Sprint {sprint.number} {isCurrent && '\u2713'}</div>
                                        <div className="planning-column-subtitle">{formatDateRange(new Date(sprint.startDate), new Date(sprint.endDate))}</div>
                                        <div className="planning-column-subtitle" style={{ marginTop: '4px' }}>{sprintTasks.length} tasks</div>
                                    </div>
                                    <div style={{ overflowY: 'auto', flex: 1 }}>
                                        {sprintTasks.length === 0 ? (
                                            <div className="drag-indicator">Drag tasks here</div>
                                        ) : (
                                            sprintTasks.map(task => (
                                                <PlanningTaskCard
                                                    key={task.id} task={task}
                                                    isMenuOpen={planMenuOpenId === task.id}
                                                    onToggleMenu={() => setPlanMenuOpenId(planMenuOpenId === task.id ? null : task.id)}
                                                    onEdit={() => { if (onEditTask) onEditTask(task); setPlanMenuOpenId(null); }}
                                                    onDelete={() => { if (onDeleteTask) onDeleteTask(task.id); setPlanMenuOpenId(null); }}
                                                    onDragStart={() => onDragStart(task)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
