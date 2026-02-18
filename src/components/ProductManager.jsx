import { useState } from 'react';
import ProductModal from './modals/ProductModal';

const CATEGORY_COLORS = {
  'Microgreens': 'bg-green-100 text-green-800',
  'Leafy Greens': 'bg-teal-100 text-teal-800',
  'Herbs': 'bg-lime-100 text-lime-800',
  'Mushrooms': 'bg-amber-100 text-amber-800',
  'Other': 'bg-gray-100 text-gray-700',
};

export default function ProductManager({ products, onAddProduct, onEditProduct, onDeleteProduct }) {
  const [modal, setModal] = useState(null); // null | { mode:'add' } | { mode:'edit', product }

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
          <h2 className="text-xl font-bold text-gray-800">Product Catalog</h2>
          <p className="text-sm text-gray-500">
            {products.length} products · {availCount} available to chefs
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition-colors cursor-pointer"
        >
          + Add Product
        </button>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">🛍️</p>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No products yet</h3>
          <p className="text-sm text-gray-500 mb-5">Add your first product to the catalog.</p>
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
              className={`bg-white rounded-2xl border-2 p-4 ${product.available ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70'}`}
            >
              {/* Name + category */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-bold text-gray-800 text-sm truncate">{product.name}</h3>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${CATEGORY_COLORS[product.category] || 'bg-gray-100 text-gray-700'}`}>
                    {product.category}
                  </span>
                </div>
                <button
                  onClick={() => setModal({ mode: 'edit', product })}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                >Edit</button>
              </div>

              {/* Price */}
              <p className="text-lg font-bold text-gray-800">
                ${product.pricePerUnit?.toFixed(2)}
                <span className="text-xs font-normal text-gray-500">/{product.unit}</span>
              </p>

              {product.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
              )}

              {/* Availability toggle */}
              <button
                onClick={() => toggleAvail(product)}
                className={`mt-3 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  product.available
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
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
    </div>
  );
}
