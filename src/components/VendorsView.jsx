import { useState } from 'react';
import { Handshake, Download, FileText, Plus } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import SmartImport from './SmartImport';
import { vendorImportConfig } from '../data/importConfigs';
import { importVendors } from '../services/importService';

function VendorsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="flex justify-between items-center mb-7">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-11 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 mb-3">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-4 w-32 bg-gray-100 dark:bg-gray-700 rounded" />
            <div className="h-4 w-28 bg-gray-100 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VendorsView({ loading, vendors, onAddVendor, onViewActivity, farmId }) {
  const [showImport, setShowImport] = useState(false);
  if (loading) return <VendorsSkeleton />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Handshake className="w-6 h-6" /> Vendor Contacts</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Download className="w-4 h-4 mr-1.5" /> Import CSV
          </Button>
          <Button onClick={onAddVendor}>
            <Plus className="w-4 h-4 mr-1" /> Add Contact
          </Button>
        </div>
      </div>

      {(!vendors || vendors.length === 0) ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
            No vendors yet. Add your first contact!
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {vendors.map(vendor => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="flex items-start justify-between gap-3">
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
                  <Button variant="outline" size="sm" onClick={() => onViewActivity(vendor.id, vendor.name)} className="shrink-0 whitespace-nowrap">
                    <FileText className="w-3.5 h-3.5 mr-1" /> Activity
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SmartImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        config={vendorImportConfig}
        onImport={(rows) => importVendors(farmId, rows)}
        existingCount={vendors?.length || 0}
      />
    </div>
  );
}
