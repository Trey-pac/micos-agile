/**
 * constants.js — Learning Engine algorithm parameters and defaults.
 *
 * These values come from statistical research specific to microgreens
 * ordering patterns. Do not change without understanding the math.
 */

// ═══════════════════════════════════════════════════════════════
// FIRESTORE PATHS
// ═══════════════════════════════════════════════════════════════
// The Learning Engine uses farms/{farmId}/stats/ as its root.
// It NEVER writes to operational collections (orders, customers, etc.)
export const STATS_ROOT = 'stats';

// Sub-paths under stats/:
//   customerCropStats/{customerId}__{cropId}
//   yieldProfiles/{cropId}
//   dailyBuckets/{YYYY-MM-DD}
//   monthlySummaries/{YYYY-MM}
//   dashboard  (single document)
//   _config    (processing state)

// Actual farm ID (discovered from firebaseAdmin.js)
export const FARM_ID = 'micos-farm-001';

// Collections to read orders from (both Shopify sync + webhook)
export const ORDER_COLLECTIONS = ['shopifyOrders', 'orders'];

// ═══════════════════════════════════════════════════════════════
// DEFAULT DOCUMENT TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Default state for a brand-new customer-crop pair (no history).
 * Used when a customerCropStats doc doesn't exist yet.
 */
export const DEFAULT_STATS = {
  count: 0,
  mean: 0,
  m2: 0,            // Welford's M2 accumulator
  ewma: null,       // null = no prediction yet
  ewmaAlpha: 0.25,  // smoothing factor (0.25 = ~8 week equivalent window)
  // Incremental linear regression state
  sumX: 0,
  sumY: 0,
  sumXY: 0,
  sumX2: 0,
  // Ordering pattern
  lastOrderDate: null,
  lastQuantity: 0,
  avgDaysBetweenOrders: null,
  intervalStddev: null,
  intervalCount: 0,
  intervalM2: 0,
  // Prediction accuracy
  totalPredictions: 0,
  sumAbsPercentError: 0,
  runningBias: 0,
  // Metadata
  customerKey: null,
  cropKey: null,
  cropDisplayName: null,
  customerName: null,
  firstOrderDate: null,
};

/**
 * Default state for a crop yield profile (no harvest history).
 */
export const DEFAULT_YIELD = {
  profileYieldPerTray: 0,      // Will be set from crop profile data
  actualYieldEstimate: null,   // EWMA of actual harvests
  yieldCount: 0,
  yieldMean: 0,
  yieldM2: 0,
  yieldStddev: 0,
  adjustedBufferPercent: 15,   // Start at 15%, auto-adjust as data accumulates
  lastHarvestDate: null,
};

// ═══════════════════════════════════════════════════════════════
// ALGORITHM PARAMETERS
// ═══════════════════════════════════════════════════════════════

// EWMA alpha values by ordering frequency
// Formula: alpha = 2/(N+1) where N = equivalent SMA window in periods
export const EWMA_ALPHA = {
  WEEKLY: 0.25,       // ~8 week window — weekly orderers
  BIWEEKLY: 0.15,     // ~12 week window — biweekly orderers
  NEW_CUSTOMER: 0.40, // ~4 week window — fast adaptation for <5 orders
};

// Z-score thresholds for anomaly detection
export const ANOMALY_THRESHOLDS = {
  FEW_ORDERS: 3.0,     // Use when customer has <10 orders (wider tolerance)
  NORMAL: 2.5,          // Use when customer has 10+ orders
  MIN_ORDERS_FOR_ZSCORE: 5, // Below this, use absolute bounds instead
};

// Absolute bounds for anomaly detection when z-scores aren't reliable
export const ABSOLUTE_BOUNDS = {
  HIGH_MULTIPLIER: 5,  // Flag if > 5x the mean
  LOW_MULTIPLIER: 0.1, // Flag if < 10% of the mean
};

// Confidence scoring weights (each component maxes at 25, total = 100)
export const CONFIDENCE = {
  DATA_THRESHOLD: 20,     // Orders needed for full data score
  DATA_WEIGHT: 25,
  CONSISTENCY_WEIGHT: 25,
  RECENCY_DECAY_DAYS: 84, // 12 weeks
  RECENCY_WEIGHT: 25,
  REGULARITY_WEIGHT: 25,
  HIGH: 70,    // Green badge
  MEDIUM: 40,  // Yellow badge
};

// Trend detection
export const TREND = {
  MIN_ORDERS: 4,
  INCREASING_PCT: 5,
  DECREASING_PCT: -5,
};

// Yield tracking
export const YIELD = {
  OUTLIER_ZSCORE: 3,
  MIN_HARVESTS_FOR_OUTLIER: 5,
  EWMA_ALPHA: 0.3,
};

// Prediction accuracy
export const ACCURACY = {
  EXCELLENT: 15,
  ACCEPTABLE: 25,
  BIAS_ALPHA: 0.3,
};

// Nightly batch job
export const NIGHTLY = {
  SCHEDULE: '0 2 * * *',
  TIMEZONE: 'America/Boise',
  MEMORY: '512MiB',
  TIMEOUT_SECONDS: 540,
  RETRY_COUNT: 3,
};
