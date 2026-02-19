import { useNavigate } from 'react-router-dom';
import RefreshBanner from './RefreshBanner';

const STATUS_BADGE = {
  new:        'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  confirmed:  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  harvesting: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  packed:     'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  delivered:  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  cancelled:  'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300',
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

function OrdersSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div><div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-1" /><div className="h-4 w-20 bg-gray-100 dark:bg-gray-700 rounded" /></div>
        <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2"><div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" /><div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded" /></div>
            <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChefOrders({ loading, orders, onReorder, refresh }) {
  const navigate = useNavigate();

  if (loading) return <OrdersSkeleton />;

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
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Orders</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
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
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">No orders yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Place your first order in under 15 seconds.</p>
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
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  {/* Status + date */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[order.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(order.createdAt)}</span>
                  </div>
                  {/* Items */}
                  <p className="text-sm text-gray-700 dark:text-gray-200">{itemSummary(order.items)}</p>
                  {/* Delivery date */}
                  {order.requestedDeliveryDate && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Deliver: {order.requestedDeliveryDate}
                    </p>
                  )}
                </div>
                {/* Total + reorder */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-800 dark:text-gray-100">${order.total?.toFixed(2)}</p>
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
                <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 mt-3">
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
