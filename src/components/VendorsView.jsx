export default function VendorsView({ vendors, onAddVendor, onViewActivity }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">🤝 Vendor Contacts</h2>
        <button
          onClick={onAddVendor}
          className="bg-sky-500 text-white border-none rounded-lg px-4 py-2.5 min-h-[44px] text-sm font-bold cursor-pointer hover:bg-sky-600 transition-colors"
        >+ Add Contact</button>
      </div>

      {(!vendors || vendors.length === 0) ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md text-center text-gray-500 dark:text-gray-400">
          No vendors yet. Add your first contact!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vendors.map(vendor => (
            <div key={vendor.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 truncate">{vendor.name}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                    <div><strong className="text-gray-700 dark:text-gray-200">Company:</strong> {vendor.company}</div>
                    <div><strong className="text-gray-700 dark:text-gray-200">Role:</strong> {vendor.role}</div>
                    <div><strong className="text-gray-700 dark:text-gray-200">Status:</strong> {vendor.status}</div>
                    {vendor.email && <div><strong className="text-gray-700 dark:text-gray-200">Email:</strong> {vendor.email}</div>}
                    {vendor.phone && <div><strong className="text-gray-700 dark:text-gray-200">Phone:</strong> {vendor.phone}</div>}
                  </div>
                </div>
                {onViewActivity && (
                  <button
                    onClick={() => onViewActivity(vendor.id, vendor.name)}
                    className="shrink-0 px-3 py-2.5 min-h-[44px] bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold hover:bg-sky-100 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    📝 Activity
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
