import { useState } from 'react';
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
          <button
            onClick={() => setShowImport(true)}
            className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-semibold px-4 py-2.5 min-h-[44px] rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            📥 Import CSV
          </button>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="bg-green-600 text-white font-bold px-4 py-2.5 min-h-[44px] rounded-xl text-sm hover:bg-green-700 transition-colors cursor-pointer"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">🛍️</p>
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">No products yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Add your first product to the catalog.</p>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-green-700 cursor-pointer"
          >
            + Add First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((product) => (
            <div
              key={product.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-4 ${product.available ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-70'}`}
            >
              {/* Name + category */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{product.name}</h3>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${CATEGORY_COLORS[product.category] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
                    {product.category}
                  </span>
                </div>
                <button
                  onClick={() => setModal({ mode: 'edit', product })}
                  className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 cursor-pointer shrink-0 p-2.5 min-h-[44px] flex items-center"
                >Edit</button>
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
              <button
                onClick={() => toggleAvail(product)}
                className={`mt-3 w-full py-2.5 min-h-[44px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  product.available
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {product.available ? '✅ Available' : '⏸ Hidden'}
              </button>
            </div>
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
