import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_COLORS = {
  'Microgreens': 'bg-green-100 text-green-800',
  'Leafy Greens': 'bg-teal-100 text-teal-800',
  'Herbs': 'bg-lime-100 text-lime-800',
  'Mushrooms': 'bg-amber-100 text-amber-800',
  'Other': 'bg-gray-100 text-gray-700',
};

function ProductCard({ product, onAdd }) {
  const [qty, setQty] = useState(1);

  const handleAdd = () => {
    onAdd(product, qty);
    setQty(1);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
      {/* Name + category */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-bold text-gray-800 leading-tight">{product.name}</h3>
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${CATEGORY_COLORS[product.category] || 'bg-gray-100 text-gray-700'}`}>
            {product.category}
          </span>
        </div>
        <p className="text-lg font-bold text-gray-800 shrink-0 text-right">
          ${product.pricePerUnit?.toFixed(2)}
          <span className="text-xs font-normal text-gray-500 block">per {product.unit}</span>
        </p>
      </div>

      {product.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
      )}

      {/* Quantity + Add to Cart */}
      <div className="flex items-center gap-2 mt-auto">
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl border border-gray-200">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center font-bold text-gray-600 hover:text-gray-900 cursor-pointer text-lg"
          >−</button>
          <span className="w-7 text-center text-sm font-bold text-gray-800">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="w-10 h-10 flex items-center justify-center font-bold text-gray-600 hover:text-gray-900 cursor-pointer text-lg"
          >+</button>
        </div>
        <button
          onClick={handleAdd}
          className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 active:bg-green-800 transition-colors cursor-pointer"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

export default function ChefCatalog({ products, cart, onAddToCart }) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...new Set(products.map((p) => p.category))];
  const filtered = activeCategory === 'All'
    ? products
    : products.filter((p) => p.category === activeCategory);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Shop</h2>
          <p className="text-sm text-gray-500">{products.length} products available</p>
        </div>
        <button
          onClick={() => navigate('/cart')}
          className="relative bg-green-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-green-700 transition-colors cursor-pointer"
        >
          🛒 Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">No products in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={onAddToCart} />
          ))}
        </div>
      )}
    </div>
  );
}
