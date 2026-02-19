import { useNavigate } from 'react-router-dom';
import RefreshBanner from './RefreshBanner';

const STATUS_BADGE = {
  new:        'bg-blue-100 text-blue-700',
  confirmed:  'bg-indigo-100 text-indigo-700',
  harvesting: 'bg-amber-100 text-amber-700',
  packed:     'bg-orange-100 text-orange-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-600',
};

const STATUS_LABEL = {
  new:        'New',
  confirmed:  'Confirmed',
  harvesting: 'Harvesting',
  packed:     'Packed & Ready',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
};

function formatDate(createdAt) {
  if (!createdAt?.seconds) return 'Recent';
  return new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function itemSummary(items) {
  if (!items?.length) return 'No items';
  const preview = items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`).join(', ');
  return items.length > 2 ? `${preview} +${items.length - 2} more` : preview;
}

export default function ChefOrders({ orders, onReorder, refresh }) {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Refresh banner */}
      {refresh && (
        <RefreshBanner
          refreshing={refresh.refreshing}
          returnedFromBg={refresh.returnedFromBg}
          secondsAgo={refresh.secondsAgo}
          onRefresh={refresh.triggerRefresh}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Orders</h2>
          <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/shop')}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 cursor-pointer"
        >
          + New Order
        </button>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">📋</p>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No orders yet</h3>
          <p className="text-sm text-gray-500 mb-5">Place your first order in under 15 seconds.</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-green-700 cursor-pointer"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  {/* Status + date */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                  </div>
                  {/* Items */}
                  <p className="text-sm text-gray-700">{itemSummary(order.items)}</p>
                  {/* Delivery date */}
                  {order.requestedDeliveryDate && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Deliver: {order.requestedDeliveryDate}
                    </p>
                  )}
                </div>
                {/* Total + reorder */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-800">${order.total?.toFixed(2)}</p>
                  <button
                    onClick={() => onReorder(order)}
                    className="text-xs font-semibold text-green-600 hover:text-green-700 cursor-pointer mt-1 block"
                  >
                    Reorder →
                  </button>
                </div>
              </div>

              {/* Special instructions */}
              {order.specialInstructions && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 mt-3">
                  Note: {order.specialInstructions}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
