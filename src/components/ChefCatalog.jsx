import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

const CATEGORY_COLORS = {
  'Microgreens': 'bg-green-100 text-green-800',
  'Leafy Greens': 'bg-teal-100 text-teal-800',
  'Herbs': 'bg-lime-100 text-lime-800',
  'Mushrooms': 'bg-amber-100 text-amber-800',
  'Other': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
};

function ProductCard({ product, onAdd }) {
  const [qty, setQty] = useState(1);

  const handleAdd = () => {
    onAdd(product, qty);
    setQty(1);
  };

  return (
    <Card className="p-5 flex flex-col">
      {/* Name + category */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 leading-tight">{product.name}</h3>
          <Badge variant="secondary" className={`mt-1 ${CATEGORY_COLORS[product.category] || ''}`}>
            {product.category}
          </Badge>
        </div>
        <p className="text-lg font-bold text-gray-800 dark:text-gray-100 shrink-0 text-right">
          ${product.pricePerUnit?.toFixed(2)}
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 block">per {product.unit}</span>
        </p>
      </div>

      {product.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{product.description}</p>
      )}

      {/* Quantity + Add to Cart */}
      <div className="flex items-center gap-2 mt-auto">
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 text-lg"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >−</Button>
          <span className="w-7 text-center text-sm font-bold text-gray-800 dark:text-gray-100">{qty}</span>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 text-lg"
            onClick={() => setQty((q) => q + 1)}
          >+</Button>
        </div>
        <Button
          onClick={handleAdd}
          className="flex-1"
        >
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}

function CatalogSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div><div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1" /><div className="h-4 w-36 bg-gray-100 dark:bg-gray-700 rounded" /></div>
        <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
      <div className="flex gap-2 mb-4">{[1,2,3].map(i => <div key={i} className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChefCatalog({ loading, products, cart, onAddToCart }) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');

  if (loading) return <CatalogSkeleton />;

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
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Shop</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{products.length} products available</p>
        </div>
        <Button
          onClick={() => navigate('/cart')}
          className="relative"
        >
          <ShoppingCart className="w-4 h-4 mr-1" /> Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {cartCount}
            </span>
          )}
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="whitespace-nowrap"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No products in this category yet.</p>
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
