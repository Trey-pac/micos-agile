import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export default function ChefCart({ cart, onUpdateQty, onPlaceOrder }) {
  const navigate = useNavigate();
  const [deliveryDate, setDeliveryDate] = useState(tomorrow());
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !deliveryDate) return;
    setPlacing(true);
    try {
      await onPlaceOrder(deliveryDate, specialInstructions);
      setSuccess(true);
      setTimeout(() => navigate('/my-orders'), 2000);
    } finally {
      setPlacing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-24">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Order placed!</h2>
        <p className="text-gray-500 text-sm">Redirecting to your orders…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/shop')}
          className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer"
          aria-label="Back to shop"
        >←</button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Your Cart</h2>
          {cart.length > 0 && <p className="text-sm text-gray-500">{cart.length} item type{cart.length !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">🛒</p>
          <h3 className="text-lg font-bold text-gray-700 mb-1">Cart is empty</h3>
          <p className="text-sm text-gray-500 mb-5">Head back to the shop to add items.</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-green-700 cursor-pointer"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cart items */}
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">${item.pricePerUnit?.toFixed(2)}/{item.unit}</p>
                </div>
                {/* Qty controls */}
                <div className="flex items-center gap-1 bg-gray-50 rounded-xl border border-gray-200">
                  <button
                    onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                    className="w-9 h-9 flex items-center justify-center font-bold text-gray-600 hover:text-red-500 cursor-pointer"
                  >−</button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                  >+</button>
                </div>
                <p className="font-bold text-gray-800 text-sm w-16 text-right shrink-0">
                  ${(item.pricePerUnit * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Delivery + instructions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Delivery date</label>
              <input
                type="date"
                min={tomorrow()}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                Special instructions <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Delivery notes, substitutions, timing…"
                rows={2}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Total + place order */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-gray-700">Order total</span>
              <span className="text-xl font-bold text-gray-800">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={placing || cart.length === 0}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-xl text-base hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait transition-colors cursor-pointer"
            >
              {placing ? 'Placing order…' : '✅ Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
