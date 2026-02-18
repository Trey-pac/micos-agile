import { useState } from 'react';

function CustomerForm({ customer, onSave, onClose, onDelete }) {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name: customer?.name || '',
    restaurantName: customer?.restaurantName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.restaurantName.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">
            {isEdit ? 'Edit Account' : 'New Chef Account'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Contact name *"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
          />
          <input
            placeholder="Restaurant name *"
            value={form.restaurantName}
            onChange={(e) => set('restaurantName', e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Gmail address"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
          />
        </div>

        <input
          placeholder="Delivery address"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none"
        />

        <textarea
          placeholder="Notes — delivery preferences, order patterns, etc."
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none resize-none"
        />

        {!isEdit && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠️ To give this chef app access, add their Gmail to{' '}
            <code className="font-mono">ALLOWED_EMAILS</code> in{' '}
            <code className="font-mono">useAuth.js</code> and redeploy.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.restaurantName.trim()}
            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Account'}
          </button>
          {isEdit && (
            <button
              onClick={() => onDelete(customer.id)}
              className="px-4 py-3 bg-red-50 text-red-600 font-semibold rounded-xl text-sm hover:bg-red-100 cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomerManager({ customers, onAddCustomer, onEditCustomer, onDeleteCustomer }) {
  const [modal, setModal] = useState(null); // null | { mode:'add' } | { mode:'edit', customer }

  const handleSave = async (formData) => {
    if (modal.mode === 'edit') {
      await onEditCustomer(modal.customer.id, formData);
    } else {
      await onAddCustomer(formData);
    }
    setModal(null);
  };

  const handleDelete = async (customerId) => {
    await onDeleteCustomer(customerId);
    setModal(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Chef Accounts</h2>
          <p className="text-sm text-gray-500">
            {customers.length} registered restaurant{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition-colors cursor-pointer"
        >
          + Add Account
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">👨‍🍳</p>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No chef accounts yet</h3>
          <p className="text-sm text-gray-500 mb-5">Add your first restaurant customer.</p>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-green-700 cursor-pointer"
          >
            + Add First Account
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {customers.map((customer, i) => (
            <div
              key={customer.id}
              className={`flex items-center justify-between p-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 text-sm">{customer.restaurantName}</h3>
                <p className="text-xs text-gray-500 truncate">
                  {customer.name}{customer.email ? ` · ${customer.email}` : ''}
                </p>
                {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
              </div>
              <button
                onClick={() => setModal({ mode: 'edit', customer })}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-50 shrink-0 ml-3"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CustomerForm
          customer={modal.mode === 'edit' ? modal.customer : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
