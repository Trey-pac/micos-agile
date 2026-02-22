import { useState } from 'react';
import { ShoppingBag, Download, Plus, Check, Pause } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import ProductModal from './modals/ProductModal';
import { ProductManagerSkeleton } from './ui/Skeletons';
import SmartImport from './SmartImport';
import { productImportConfig } from '../data/importConfigs';
import { importProducts } from '../services/importService';

const CATEGORY_COLORS = {
  'Microgreens': 'bg-green-100 text-green-800',
  'Leafy Greens': 'bg-teal-100 text-teal-800',
  'Herbs': 'bg-lime-100 text-lime-800',
  'Mushrooms': 'bg-amber-100 text-amber-800',
  'Other': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
};

export default function ProductManager({ products, onAddProduct, onEditProduct, onDeleteProduct, loading = false, farmId }) {
  const [modal, setModal] = useState(null);
  const [showImport, setShowImport] = useState(false);
  if (loading) return <ProductManagerSkeleton />; // null | { mode:'add' } | { mode:'edit', product }

  const handleSave = async (formData) => {
    if (modal.mode === 'edit') {
      await onEditProduct(modal.product.id, formData);
    } else {
      await onAddProduct(formData);
    }
    setModal(null);
  };

  const handleDelete = async (productId) => {
    await onDeleteProduct(productId);
    setModal(null);
  };

  const toggleAvail = (product) =>
    onEditProduct(product.id, { available: !product.available });

  const sorted = [...products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const availCount = products.filter((p) => p.available).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Product Catalog</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {products.length} products · {availCount} available to chefs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Download className="w-4 h-4 mr-1.5" /> Import CSV
          </Button>
          <Button onClick={() => setModal({ mode: 'add' })}>
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">No products yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Add your first product to the catalog.</p>
          <Button onClick={() => setModal({ mode: 'add' })}>
            <Plus className="w-4 h-4 mr-1" /> Add First Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((product) => (
            <Card
              key={product.id}
              className={`${!product.available ? 'border-dashed opacity-70' : ''}`}
            >
              <CardContent>
              {/* Name + category */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{product.name}</h3>
                  <Badge variant="outline" className={CATEGORY_COLORS[product.category] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}>
                    {product.category}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setModal({ mode: 'edit', product })} className="shrink-0">
                  Edit
                </Button>
              </div>

              {/* Price */}
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                ${product.pricePerUnit?.toFixed(2)}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/{product.unit}</span>
              </p>

              {product.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{product.description}</p>
              )}

              {/* Availability toggle */}
              <Button
                variant="ghost"
                onClick={() => toggleAvail(product)}
                className={`mt-3 w-full ${product.available ? 'text-green-700 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                {product.available ? <><Check className="w-4 h-4 mr-1.5" /> Available</> : <><Pause className="w-4 h-4 mr-1.5" /> Hidden</>}
              </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <ProductModal
          product={modal.mode === 'edit' ? modal.product : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      <SmartImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        config={productImportConfig}
        onImport={(rows) => importProducts(farmId, rows)}
        existingCount={products.length}
      />
    </div>
  );
}
