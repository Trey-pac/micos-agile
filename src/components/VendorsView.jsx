export default function VendorsView({ vendors, onAddVendor }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">🤝 Vendor Contacts</h2>
        <button
          onClick={onAddVendor}
          className="bg-sky-500 text-white border-none rounded-lg px-4 py-2 text-sm font-bold cursor-pointer hover:bg-sky-600 transition-colors"
        >+ Add Contact</button>
      </div>

      {(!vendors || vendors.length === 0) ? (
        <div className="bg-white rounded-xl p-8 shadow-md text-center text-gray-500">
          No vendors yet. Add your first contact!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vendors.map(vendor => (
            <div key={vendor.id} className="bg-white rounded-xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="text-lg font-bold text-gray-800 mb-2">{vendor.name}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-gray-600">
                <div><strong className="text-gray-700">Company:</strong> {vendor.company}</div>
                <div><strong className="text-gray-700">Role:</strong> {vendor.role}</div>
                <div><strong className="text-gray-700">Status:</strong> {vendor.status}</div>
                {vendor.email && <div><strong className="text-gray-700">Email:</strong> {vendor.email}</div>}
                {vendor.phone && <div><strong className="text-gray-700">Phone:</strong> {vendor.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
