import React, { useState } from 'react';
import { getSprintDates, formatDateRange } from '../../utils/sprintUtils';

export default function SprintModal({ onClose, onSave, sprintNumber }) {
    const [formData, setFormData] = useState({
        name: `Sprint ${sprintNumber}`,
        goal: ''
    });

    const { startDate, endDate } = getSprintDates(sprintNumber);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Create New Sprint</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Sprint Name</label>
                        <input
                            className="form-input"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Sprint Dates (Auto-calculated)</label>
                        <div style={{ padding: '12px', background: 'var(--earth-tan)', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }}>
                            {formatDateRange(startDate, endDate)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Wednesday to Tuesday, 1-week duration
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Sprint Goal (Optional)</label>
                        <textarea
                            className="form-textarea"
                            value={formData.goal}
                            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                            placeholder="e.g., Complete airflow system installation"
                            rows="3"
                        />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Create Sprint
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
