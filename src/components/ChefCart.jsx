import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';

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
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Order placed!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting to your orders…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/shop')}
          aria-label="Back to shop"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Your Cart</h2>
          {cart.length > 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{cart.length} item type{cart.length !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">Cart is empty</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Head back to the shop to add items.</p>
          <Button
            onClick={() => navigate('/shop')}
          >
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cart items */}
          <Card className="divide-y divide-gray-100 dark:divide-gray-700">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">${item.pricePerUnit?.toFixed(2)}/{item.unit}</p>
                </div>
                {/* Qty controls */}
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9"
                    onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                  >−</Button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9"
                    onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                  >+</Button>
                </div>
                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm w-16 text-right shrink-0">
                  ${(item.pricePerUnit * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </Card>

          {/* Delivery + instructions */}
          <Card className="p-4 space-y-4">
            <div>
              <Label className="mb-1">Delivery date</Label>
              <Input
                type="date"
                min={tomorrow()}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1">
                Special instructions <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
              </Label>
              <Textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Delivery notes, substitutions, timing…"
                rows={2}
              />
            </div>
          </Card>

          {/* Total + place order */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-gray-700 dark:text-gray-200">Order total</span>
              <span className="text-xl font-bold text-gray-800 dark:text-gray-100">${total.toFixed(2)}</span>
            </div>
            <Button
              onClick={handlePlaceOrder}
              disabled={placing || cart.length === 0}
              className="w-full py-4 h-auto text-base"
            >
              {placing ? 'Placing order…' : <><CheckCircle className="w-4 h-4 mr-1" /> Place Order</>}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
