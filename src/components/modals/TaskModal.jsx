import React, { useState } from 'react';
import { teamMembers } from '../../data/constants';

export default function TaskModal({ task, onClose, onSave, onDelete }) {
    const isEditing = !!task;
    const [formData, setFormData] = useState(task || {
        title: '',
        urgency: 'this-week',
        priority: 'medium',
        dueDate: '',
        notes: '',
        owner: 'trey',
        status: 'not-started'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Task Title</label>
                        <input
                            className="form-input"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Task Owner</label>
                        <select
                            className="form-select"
                            value={formData.owner}
                            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                        >
                            {teamMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Urgency</label>
                        <select
                            className="form-select"
                            value={formData.urgency}
                            onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                        >
                            <option value="this-week">This Week</option>
                            <option value="next-week">Next Week</option>
                            <option value="this-month">This Month</option>
                            <option value="future">Future</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Priority</label>
                        <select
                            className="form-select"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Size</label>
                        <select
                            className="form-select"
                            value={formData.size || ''}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        >
                            <option value="">Not sized</option>
                            <option value="S">S - Small (1 day or less)</option>
                            <option value="M">M - Medium (1-2 days)</option>
                            <option value="L">L - Large (3+ days)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Due Date</label>
                        <input
                            className="form-input"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-textarea"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add any additional details..."
                        />
                    </div>
                    <div className="form-actions" style={{ justifyContent: isEditing ? 'space-between' : 'flex-end' }}>
                        {isEditing && (
                            <button
                                type="button"
                                className="btn"
                                onClick={() => onDelete(task.id)}
                                style={{ background: '#fee2e2', color: '#991b1b' }}
                            >
                                {'\uD83D\uDDD1\uFE0F'} Delete
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEditing ? 'Save Changes' : 'Add Task'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
