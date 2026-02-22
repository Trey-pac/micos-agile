import { useState, useCallback } from 'react';
import { Link2, ShoppingBag, Users, Package, RefreshCw, Trash2, ArrowLeftRight, Tags } from 'lucide-react';
import { getFirebaseAuth } from '../../firebase';
import { cleanDuplicateCustomers, autoCategorizeCustomers } from '../../services/customerCleanupService';
import { migrateLegacyCustomerFields } from '../../services/shopifyCustomerService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const SYNC_ENDPOINTS = [
  { key: 'products',  label: 'Products',  Icon: ShoppingBag, endpoint: '/api/shopify-sync-products' },
  { key: 'customers', label: 'Customers', Icon: Users,       endpoint: '/api/shopify-sync-customers' },
  { key: 'orders',    label: 'Orders',    Icon: Package,     endpoint: '/api/shopify-sync-orders' },
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

export default function ShopifySync({ farmId, user }) {
  const [syncing, setSyncing] = useState({});      // { products: true, ... }
  const [results, setResults] = useState({});       // { products: { count: 47, syncedAt: '...' }, ... }
  const [errors, setErrors] = useState({});         // { products: 'message', ... }
  const [timestamps, setTimestamps] = useState(getTimestamps);

  // Customer cleanup state
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [cleanupError, setCleanupError] = useState(null);

  // Legacy migration state
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);
  const [migrateError, setMigrateError] = useState(null);

  // Auto-categorize state
  const [categorizing, setCategorizing] = useState(false);
  const [categorizeResult, setCategorizeResult] = useState(null);
  const [categorizeError, setCategorizeError] = useState(null);

  const handleSync = useCallback(async (key, endpoint) => {
    setSyncing(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: null }));
    setResults(prev => ({ ...prev, [key]: null }));

    try {
      // Get Firebase ID token for auth
      const currentUser = getFirebaseAuth().currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : null;
      const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};

      const res = await fetch(endpoint, { headers });
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
    // Auto-categorize after all syncs complete
    if (farmId) {
      try {
        setCategorizing(true);
        setCategorizeResult(null);
        setCategorizeError(null);
        const result = await autoCategorizeCustomers(farmId, { forceAll: true });
        setCategorizeResult(result);
      } catch (err) {
        console.error('[ShopifySync] Auto-categorize failed:', err);
        setCategorizeError(err.message);
      } finally {
        setCategorizing(false);
      }
    }
  }, [handleSync, farmId]);

  const anySyncing = Object.values(syncing).some(Boolean);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Link2 className="w-6 h-6" /> Shopify Integration
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pull live data from your Shopify store into the workspace.
        </p>
      </div>

      {/* Connection Status */}
      <Card className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            Connected to micos-micro-farm.myshopify.com
          </span>
        </div>
      </Card>

      {/* Sync All Button */}
      <Button
        onClick={handleSyncAll}
        disabled={anySyncing}
        className="mb-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md hover:shadow-lg"
        size="lg"
      >
        {anySyncing ? (
          <><Spinner /> Syncing…</>
        ) : (
          <><RefreshCw className="w-4 h-4 mr-1" /> Sync Everything</>
        )}
      </Button>

      {/* Individual Sync Cards */}
      <div className="space-y-4">
        {SYNC_ENDPOINTS.map(({ key, label, Icon, endpoint }) => {
          const loading = syncing[key];
          const result = results[key];
          const error = errors[key];
          const lastSync = timestamps[key];

          return (
            <Card key={key} className="p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
                    {lastSync && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Last synced: {formatTimestamp(lastSync)}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleSync(key, endpoint)}
                  disabled={loading || anySyncing}
                  className="min-w-[100px]"
                >
                  {loading ? <Spinner /> : <RefreshCw className="w-4 h-4" />} Sync
                </Button>
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
                      · 🍳{result.segments.chef} 🔄{result.segments.subscriber} 🛒{result.segments.retail} 👤{result.segments.prospect}
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
            </Card>
          );
        })}
      </div>

      {/* Customer Cleanup */}
      <Card className="mt-6 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Clean Duplicate Customers</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Removes shadow records from Draft Orders ($0 spent, 0-1 orders)
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!farmId) return;
              setCleaningUp(true);
              setCleanupResult(null);
              setCleanupError(null);
              try {
                const result = await cleanDuplicateCustomers(farmId);
                setCleanupResult(result);
              } catch (err) {
                setCleanupError(err.message);
              } finally {
                setCleaningUp(false);
              }
            }}
            disabled={cleaningUp || !farmId}
            className="min-w-[140px]"
          >
            {cleaningUp ? <Spinner /> : <Trash2 className="w-4 h-4 mr-1" />} Clean Duplicates
          </Button>
        </div>

        {cleanupResult && (
          <div className="mt-3 space-y-2">
            <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-300">
              ✅ Removed <strong>{cleanupResult.deleted}</strong> duplicates · Kept <strong>{cleanupResult.kept}</strong> of {cleanupResult.total} total
            </div>
            {cleanupResult.log.length > 0 && (
              <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded p-3 space-y-1">
                {cleanupResult.log.map((entry, i) => (
                  <p key={i} className="text-xs text-gray-600 dark:text-gray-400 font-mono">{entry}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {cleanupError && (
          <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
            ❌ {cleanupError}
          </div>
        )}
      </Card>

      {/* Legacy Migration */}
      <Card className="mt-4 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Migrate Legacy Fields</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Copy delivery zone, pricing tier, etc. from old customers → shopifyCustomers
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              if (!farmId) return;
              setMigrating(true);
              setMigrateResult(null);
              setMigrateError(null);
              try {
                const result = await migrateLegacyCustomerFields(farmId);
                setMigrateResult(result);
              } catch (err) {
                setMigrateError(err.message);
              } finally {
                setMigrating(false);
              }
            }}
            disabled={migrating || !farmId}
            className="min-w-[140px]"
          >
            {migrating ? <Spinner /> : <ArrowLeftRight className="w-4 h-4 mr-1" />} Migrate
          </Button>
        </div>

        {migrateResult && (
          <div className="mt-3 space-y-2">
            <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-300">
              ✅ Migrated <strong>{migrateResult.migrated}</strong> · Skipped {migrateResult.skipped} of {migrateResult.total} legacy records
            </div>
            {migrateResult.log.length > 0 && (
              <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded p-3 space-y-1">
                {migrateResult.log.map((entry, i) => (
                  <p key={i} className="text-xs text-gray-600 dark:text-gray-400 font-mono">{entry}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {migrateError && (
          <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
            ❌ {migrateError}
          </div>
        )}
      </Card>

      {/* Auto-Categorize */}
      <Card className="mt-4 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tags className="w-6 h-6 text-purple-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Auto-Categorize Customers</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Chef ($+tags) · Subscriber · Retail ($+orders) · Prospect ($0) — runs auto after Sync All
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!farmId) return;
              setCategorizing(true);
              setCategorizeResult(null);
              setCategorizeError(null);
              try {
                const result = await autoCategorizeCustomers(farmId, { forceAll: true });
                setCategorizeResult(result);
              } catch (err) {
                setCategorizeError(err.message);
              } finally {
                setCategorizing(false);
              }
            }}
            disabled={categorizing || !farmId}
            className="min-w-[140px]"
          >
            {categorizing ? <Spinner /> : <Tags className="w-4 h-4 mr-1" />} Categorize
          </Button>
        </div>

        {categorizeResult && (
          <div className="mt-3 space-y-2">
            <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-300">
              ✅ Updated <strong>{categorizeResult.updated}</strong> · Skipped {categorizeResult.skipped} of {categorizeResult.total}
              <span className="ml-2 text-xs opacity-75">
                🍳{categorizeResult.counts.chef} 🛒{categorizeResult.counts.retail} 🔄{categorizeResult.counts.subscriber} 👤{categorizeResult.counts.prospect} ❓{categorizeResult.counts.unknown}
              </span>
            </div>
            {categorizeResult.log.length > 0 && (
              <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded p-3 space-y-1">
                {categorizeResult.log.map((entry, i) => (
                  <p key={i} className="text-xs text-gray-600 dark:text-gray-400 font-mono">{entry}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {categorizeError && (
          <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
            ❌ {categorizeError}
          </div>
        )}
      </Card>

      {/* Data Preview Note */}
      <Card className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <p className="text-sm text-green-700 dark:text-green-300">
          <strong>Phase 2 Active:</strong> Sync fetches live data from Shopify and writes through to Firestore.
          Products → shopifyProducts, Customers → shopifyCustomers (with segments), Orders → shopifyOrders (with segments).
        </p>
      </Card>
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
