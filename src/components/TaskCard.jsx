import React from 'react';
import { teamMembers } from '../data/constants';

export default function TaskCard({ task, onDragStart, isMenuOpen, onToggleMenu, onEdit, onDelete, onMove }) {
    const [showSubmenu, setShowSubmenu] = React.useState(false);
    const owner = teamMembers.find(m => m.id === task.owner);

    const statusOptions = [
        { id: 'not-started', label: '\uD83D\uDCDD Not Started' },
        { id: 'in-progress', label: '\uD83D\uDE80 In Progress' },
        { id: 'done', label: '\u2705 Done' }
    ];

    return (
        <div
            className={`task-card priority-${task.priority} kanban-card-${owner ? owner.id : 'none'}`}
            draggable
            onDragStart={onDragStart}
        >
            <button
                className="task-menu-button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleMenu();
                    setShowSubmenu(false);
                }}
            >{'\u22EE'}</button>

            {isMenuOpen && (
                <div className="task-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button
                        className="task-menu-item"
                        onClick={(e) => { e.stopPropagation(); onEdit(); onToggleMenu(); }}
                    >{'\u270F\uFE0F'} Edit</button>
                    <button
                        className="task-menu-item move"
                        onMouseEnter={() => setShowSubmenu(true)}
                        onMouseLeave={() => setShowSubmenu(false)}
                        onClick={(e) => { e.stopPropagation(); setShowSubmenu(!showSubmenu); }}
                    >
                        {'\u27A1\uFE0F'} Move to...
                        {showSubmenu && (
                            <div className="task-submenu">
                                {statusOptions
                                    .filter(option => option.id !== task.status)
                                    .map(option => (
                                        <button
                                            key={option.id}
                                            className="task-submenu-item"
                                            onClick={(e) => { e.stopPropagation(); onMove(option.id); setShowSubmenu(false); }}
                                        >{option.label}</button>
                                    ))}
                            </div>
                        )}
                    </button>
                    <button
                        className="task-menu-item delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(); onToggleMenu(); }}
                    >{'\uD83D\uDDD1\uFE0F'} Delete</button>
                </div>
            )}

            <div className="task-header">
                <div className="task-title">{task.title}</div>
                {owner && (
                    <div className={`task-owner-badge owner-${owner.id}`}>{owner.name}</div>
                )}
            </div>
            <div className="task-meta">
                <span className={`task-badge urgency-${task.urgency}`}>
                    {task.urgency ? task.urgency.replace('-', ' ') : ''}
                </span>
                <span className={`priority-badge priority-${task.priority}`}>
                    {task.priority}
                </span>
                {task.dueDate && (
                    <span className="task-date">{'\uD83D\uDCC5'} {task.dueDate}</span>
                )}
            </div>
            {task.notes && (
                <div className="task-notes">{task.notes}</div>
            )}
        </div>
    );
}
