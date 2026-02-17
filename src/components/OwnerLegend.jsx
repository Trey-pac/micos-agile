import React from 'react';
import { teamMembers } from '../data/constants';

export default function OwnerLegend() {
    return (
        <div className="legend">
            {teamMembers.map(member => (
                <div key={member.id} className="legend-item">
                    <div className={`legend-color owner-${member.id}`}></div>
                    <span>{member.name}</span>
                </div>
            ))}
        </div>
    );
}
