import React, { useState } from 'react';
import TaskCard from './TaskCard';

export default function KanbanBoard({ tasks, onDragStart, onDragOver, onDrop, onAddTask, openMenuId, onToggleMenu, onEditTask, onDeleteTask, onMoveTask }) {
    const columns = [
        { id: 'not-started', title: '\uD83D\uDCDD Not Started', showAdd: true },
        { id: 'in-progress', title: '\uD83D\uDE80 In Progress', showAdd: true },
        { id: 'roadblock', title: '\uD83D\uDEA7 Roadblock', showAdd: true },
        { id: 'done', title: '\u2705 Done', showAdd: true }
    ];

    function AddTaskBtn({ onClick }) {
        const [hover, setHover] = useState(false);
        return (
            <button
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={onClick}
                style={{
                    background: 'var(--sky-blue)', color: 'white', border: 'none', borderRadius: '6px',
                    padding: hover ? '4px 12px' : '4px 8px', fontSize: '13px', fontWeight: '700',
                    cursor: 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap', overflow: 'hidden',
                    lineHeight: '1.2'
                }}
            >{hover ? '+ Add Task' : '+'}</button>
        );
    }

    return (
        <div className="kanban-board">
            {columns.map(column => (
                <div
                    key={column.id}
                    className={`column ${column.id}`}
                    onDragOver={onDragOver}
                    onDrop={() => onDrop(column.id)}
                >
                    <div className="column-header">
                        <div className="column-title">{column.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="column-count">
                                {tasks.filter(t => t.status === column.id).length}
                            </div>
                            {column.showAdd && (
                                <AddTaskBtn onClick={() => onAddTask(column.id)} />
                            )}
                        </div>
                    </div>
                    {tasks
                        .filter(task => task.status === column.id)
                        .map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onDragStart={() => onDragStart(task)}
                                isMenuOpen={openMenuId === task.id}
                                onToggleMenu={() => onToggleMenu(openMenuId === task.id ? null : task.id)}
                                onEdit={() => onEditTask(task)}
                                onDelete={() => onDeleteTask(task.id)}
                                onMove={(newStatus) => onMoveTask(task.id, newStatus)}
                            />
                        ))}
                </div>
            ))}
        </div>
    );
}
