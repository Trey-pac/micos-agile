import { useState, useCallback } from 'react';

const SYNC_ENDPOINTS = [
  { key: 'products',  label: 'Products',  icon: '🛍️', endpoint: '/api/shopify-sync-products' },
  { key: 'customers', label: 'Customers', icon: '👥', endpoint: '/api/shopify-sync-customers' },
  { key: 'orders',    label: 'Orders',    icon: '📦', endpoint: '/api/shopify-sync-orders' },
];

const LS_KEY = 'shopify-sync-timestamps';

function getTimestamps() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}
function setTimestamp(key, ts) {
  const current = getTimestamps();
  current[key] = ts;
  localStorage.setItem(LS_KEY, JSON.stringify(current));
}

export default function ShopifySync() {
  const [syncing, setSyncing] = useState({});      // { products: true, ... }
  const [results, setResults] = useState({});       // { products: { count: 47, syncedAt: '...' }, ... }
  const [errors, setErrors] = useState({});         // { products: 'message', ... }
  const [timestamps, setTimestamps] = useState(getTimestamps);

  const handleSync = useCallback(async (key, endpoint) => {
    setSyncing(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: null }));
    setResults(prev => ({ ...prev, [key]: null }));

    try {
      const res = await fetch(endpoint);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Unknown error');
      }

      setResults(prev => ({
        ...prev,
        [key]: {
          count: json.count,
          syncedAt: json.syncedAt,
          firestoreWritten: json.firestoreWritten || 0,
          segments: json.segments || null,
          draftCount: json.draftCount || 0,
        },
      }));
      setTimestamp(key, json.syncedAt);
      setTimestamps(getTimestamps());
    } catch (err) {
      setErrors(prev => ({ ...prev, [key]: err.message }));
    } finally {
      setSyncing(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  const handleSyncAll = useCallback(async () => {
    for (const { key, endpoint } of SYNC_ENDPOINTS) {
      await handleSync(key, endpoint);
    }
  }, [handleSync]);

  const anySyncing = Object.values(syncing).some(Boolean);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          🔗 Shopify Integration
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pull live data from your Shopify store into the workspace.
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            Connected to micos-micro-farm.myshopify.com
          </span>
        </div>
      </div>

      {/* Sync All Button */}
      <button
        onClick={handleSyncAll}
        disabled={anySyncing}
        className="mb-6 w-full py-3 px-4 rounded-lg font-semibold text-white
          bg-gradient-to-r from-emerald-500 to-green-600
          hover:from-emerald-600 hover:to-green-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all shadow-md hover:shadow-lg
          flex items-center justify-center gap-2"
      >
        {anySyncing ? (
          <>
            <Spinner /> Syncing…
          </>
        ) : (
          <>🔄 Sync Everything</>
        )}
      </button>

      {/* Individual Sync Cards */}
      <div className="space-y-4">
        {SYNC_ENDPOINTS.map(({ key, label, icon, endpoint }) => {
          const loading = syncing[key];
          const result = results[key];
          const error = errors[key];
          const lastSync = timestamps[key];

          return (
            <div
              key={key}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
                    {lastSync && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Last synced: {formatTimestamp(lastSync)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleSync(key, endpoint)}
                  disabled={loading || anySyncing}
                  className="px-4 py-2 rounded-md text-sm font-medium
                    bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200
                    hover:bg-gray-200 dark:hover:bg-gray-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors flex items-center gap-2 min-w-[100px] justify-center"
                >
                  {loading ? <Spinner /> : '🔄'} Sync
                </button>
              </div>

              {/* Result banner */}
              {result && (
                <div className="mt-3 p-2 rounded bg-green-50 dark:bg-green-900/20
                  text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  ✅ Synced <strong>{result.count}</strong> {label.toLowerCase()}
                  {result.firestoreWritten > 0 && (
                    <span className="text-xs opacity-75">
                      · {result.firestoreWritten} written to Firestore
                    </span>
                  )}
                  {result.segments && (
                    <span className="text-xs opacity-75">
                      · 🍳{result.segments.chef} 🔄{result.segments.subscription} 🛒{result.segments.retail}
                    </span>
                  )}
                  {result.draftCount > 0 && (
                    <span className="text-xs opacity-75">
                      · {result.draftCount} draft orders
                    </span>
                  )}
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/20
                  text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  ❌ {error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Data Preview Note */}
      <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-700 dark:text-green-300">
          <strong>Phase 2 Active:</strong> Sync fetches live data from Shopify and writes through to Firestore.
          Products → shopifyProducts, Customers → shopifyCustomers (with segments), Orders → shopifyOrders (with segments).
        </p>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
