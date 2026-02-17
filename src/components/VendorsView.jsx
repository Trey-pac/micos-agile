import React from 'react';

export default function VendorsView({ vendors, onAddVendor }) {
    return (
        <div className="vendors-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '700' }}>{'\uD83E\uDD1D'} Vendor Contacts</h2>
                <button className="btn btn-primary" onClick={onAddVendor}>
                    + Add Contact
                </button>
            </div>
            {vendors.map(vendor => (
                <div key={vendor.id} className="vendor-card">
                    <div className="vendor-name">{vendor.name}</div>
                    <div className="vendor-info">
                        <div><strong>Company:</strong> {vendor.company}</div>
                        <div><strong>Role:</strong> {vendor.role}</div>
                        <div><strong>Status:</strong> {vendor.status}</div>
                        {vendor.email && <div><strong>Email:</strong> {vendor.email}</div>}
                        {vendor.phone && <div><strong>Phone:</strong> {vendor.phone}</div>}
                    </div>
                </div>
            ))}
        </div>
    );
}
