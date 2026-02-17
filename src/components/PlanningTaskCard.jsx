import React from 'react';
import { teamMembers } from '../data/constants';

export default function PlanningTaskCard({ task, onDragStart, isMenuOpen, onToggleMenu, onEdit, onDelete }) {
    const owner = teamMembers.find(m => m.id === task.owner);
    const ownerColorClass = owner ? 'planning-card-' + owner.id : 'planning-card-none';
    const hasDetails = task.notes || task.dueDate || task.urgency;

    return (
        <div
            className={"planning-task-card " + ownerColorClass}
            draggable
            onDragStart={onDragStart}
        >
            {hasDetails && (
                <div className="hover-preview">
                    {task.urgency && <div className="hover-preview-row"><span className="hover-preview-label">Urgency:</span> {task.urgency.replace('-', ' ')}</div>}
                    {task.dueDate && <div className="hover-preview-row"><span className="hover-preview-label">Due:</span> {task.dueDate}</div>}
                    {owner && <div className="hover-preview-row"><span className="hover-preview-label">Owner:</span> {owner.name}</div>}
                    {task.size && <div className="hover-preview-row"><span className="hover-preview-label">Size:</span> {task.size === 'S' ? 'Small' : task.size === 'M' ? 'Medium' : task.size === 'L' ? 'Large' : task.size}</div>}
                    {task.notes && <div className="hover-preview-notes"><span className="hover-preview-label">Notes:</span> {task.notes}</div>}
                </div>
            )}
            <button
                className="planning-menu-button"
                onClick={(e) => { e.stopPropagation(); if (onToggleMenu) onToggleMenu(); }}
            >{'\u22EE'}</button>
            {isMenuOpen && (
                <div className="planning-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button className="planning-menu-item" onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(); }}>{'\u270F\uFE0F'} Edit Task</button>
                    <button className="planning-menu-item delete" onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(); }}>{'\uD83D\uDDD1\uFE0F'} Delete</button>
                </div>
            )}
            <div className="planning-task-title">{task.title}</div>
            <div className="planning-task-meta">
                {task.size && (
                    <span className={"size-badge size-badge-" + task.size}>{task.size}</span>
                )}
                <span className={`priority-badge priority-${task.priority}`}>
                    {task.priority}
                </span>
                {task.dueDate && (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{'\uD83D\uDCC5'} {task.dueDate}</span>
                )}
                {owner && (
                    <div className={`task-owner-badge owner-${owner.id}`}>{owner.name}</div>
                )}
            </div>
        </div>
    );
}
