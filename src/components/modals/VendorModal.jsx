import { useState } from 'react';

export default function VendorModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '', company: '', role: '', status: '', email: '', phone: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass = 'w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all';
  const labelClass = 'block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-5">Add New Contact</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input className={inputClass} type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input className={inputClass} type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>Role / Purpose</label>
              <input className={inputClass} type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="e.g., Supplier, Partner, Client" />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <input className={inputClass} type="text" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} placeholder="e.g., Active, Awaiting response" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors border-none">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 cursor-pointer transition-colors border-none">
                Add Contact
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
