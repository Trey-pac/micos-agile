# Learning Engine Build Log

## Phase 1: Data Discovery & Foundation

### Step 1.1 — Field Name Discovery

**Date:** 2026-02-20

#### Orders Collection: `farms/micos-farm-001/shopifyOrders/`

Primary order source is Shopify-synced data. ~4,000+ historical orders.

| Canonical Name | Actual Firestore Field | Notes |
|---|---|---|
| lineItems | `items` | Array of line item objects |
| customerId | `shopifyCustomerId` | Shopify GID (e.g., `gid://shopify/Customer/123`) |
| customerName | `customerName` | `"First Last"` string |
| customerEmail | `customerEmail` | Used as stable fallback key |
| createdAt | `createdAt` | ISO date string from Shopify (not Firestore Timestamp) |
| totalPrice | `total` | Parsed float |
| status | `status` | `new`, `confirmed`, `harvesting`, `packed`, `delivered`, `cancelled` |
| segment | `segment` | `retail`, `chef`, `subscription` |
| source | `source` | `"shopify"` or `"shopify-draft"` |
| orderType | `orderType` | `"regular"` or `"draft"` |

Also found secondary collection: `farms/micos-farm-001/orders/` (webhook-created).
Uses same field names with minor differences:
- Has `customerId` (Firestore doc ID from syncCustomer)
- Has `shopifyOrderId` (numeric string, not GID)
- Has `specialInstructions` instead of `note`
- Has `createdAt` as Firestore serverTimestamp

#### Line Item Fields (within `items[]`)

| Canonical Name | Actual Firestore Field | Notes |
|---|---|---|
| productId | `shopifyProductId` | Shopify GID or numeric string |
| title | `title` | Product title (most reliable identifier) |
| quantity | `quantity` | Number |
| price | `price` | Per-unit price (parsed float) |
| lineTotal | `lineTotal` | Price × quantity |
| sku | `sku` | String |
| variantTitle | `variantTitle` | e.g., `"8oz"` |
| shopifyVariantId | `shopifyVariantId` | Shopify GID |

#### Customers Collection: `farms/micos-farm-001/shopifyCustomers/`

| Canonical Name | Actual Firestore Field | Notes |
|---|---|---|
| name | `name` | `"First Last"` |
| email | `email` | Primary identifier |
| type | `type` | `chef`, `retail`, `subscriber`, `prospect`, `unknown` |
| segment | `segment` | `retail`, `chef`, `subscription` |
| restaurant | `restaurant` | Company/restaurant name |
| ordersCount | `ordersCount` | Total orders placed |
| totalSpent | `totalSpent` | Sum of order totals |

#### Products Collection: `farms/micos-farm-001/shopifyProducts/`

| Canonical Name | Actual Firestore Field | Notes |
|---|---|---|
| title | `title` | Product name |
| handle | `handle` | URL slug — stable crop identifier |
| productType | `productType` | e.g., `"Microgreens"` |
| price | `price` | Primary variant price |
| status | `status` | `"ACTIVE"`, `"DRAFT"`, `"ARCHIVED"` |

#### Harvests Collection: `farms/micos-farm-001/harvests/`

**Does NOT exist yet.** The harvest tracking trigger will create documents as harvests are recorded in the future. The existing `batches` collection tracks production but doesn't have a separate `harvests` collection with yield data.

#### Key Discovery Notes

1. **FARM_ID is `micos-farm-001`** (NOT `default` — that was a placeholder in the prompt)
2. **Two parallel order collections** — `shopifyOrders` (GraphQL sync, primary) and `orders` (webhook). Learning Engine should process BOTH.
3. **Customer identification** — `customerEmail` is the most stable identifier across both order collections. `shopifyCustomerId` uses GIDs which contain slashes.
4. **Crop identification** — `title` on line items is the most reliable crop key. `shopifyProductId` uses GIDs. For stats, we'll normalize title to a slug.
5. **Dates are ISO strings**, not Firestore Timestamps, in shopifyOrders. Webhook orders use serverTimestamp.
6. **No Firebase Cloud Functions infrastructure exists** — project uses Vercel API routes. Cloud Functions will be created as Vercel serverless functions.

### Step 1.6 — Backfill Status

**BLOCKER:** `FIREBASE_SERVICE_ACCOUNT` env var is not configured locally — only available in Vercel deployment. The backfill API route at `/api/learning-engine/backfill` is ready but must be triggered after deployment.

**To run the backfill:**
1. Push to GitHub (auto-deploys to Vercel)
2. Visit: `https://your-vercel-url.vercel.app/api/learning-engine/backfill`
3. The response will contain the full processing summary

**Backfill is idempotent** — it clears all stats before rebuilding, so it's safe to run multiple times.

---

## Build Summary

### Commits
1. `52bf92c` — Phase 1: data model, field mapping, stats utilities, historical backfill
2. `9dfb1b3` — Phase 2: real-time Cloud Functions + alerts UI
3. `7ec6cfe` — Phase 3: nightly batch job, dashboard, UI integration
4. `0e43d6e` — Phase 4: feedback loop, bias correction, trust tiers

### Health Check Results

**Date:** 2025-02-20
**Result:** 66/66 PASSED (0 failures)

```
Phase 1: Foundation Files ...... 11/11 ✅
Phase 2: API Routes ............ 9/9  ✅
Phase 2: Alert UI .............. 4/4  ✅
Phase 3: Nightly + Hooks + UI . 21/21 ✅
Phase 4: Feedback Loop ......... 7/7  ✅
Infrastructure ................. 5/5  ✅
No TODOs/FIXMEs ................ 9/9  ✅
```

### Files Created (16 new files)
- `src/services/learningEngine/fieldMap.js` — Firestore field mapping
- `src/services/learningEngine/constants.js` — Algorithm parameters
- `src/services/learningEngine/stats.js` — Pure stat functions (Welford, EWMA, z-score, regression)
- `api/learning-engine/backfill.js` — One-time historical processing
- `api/learning-engine/on-order-create.js` — Real-time order processing
- `api/learning-engine/on-harvest-create.js` — Harvest yield tracking
- `api/learning-engine/dismiss-alert.js` — Alert dismissal
- `api/learning-engine/nightly-stats.js` — Nightly batch computation (Vercel cron)
- `src/components/Alerts/AlertsBadge.jsx` — Nav bar alert badge
- `src/components/Alerts/AlertsList.jsx` — Full alert management page
- `src/hooks/useLearningEngine.js` — 7 React hooks for reading stats
- `src/components/ui/TrustBadge.jsx` — Trust tier badge component
- `scripts/learning-engine-health-check.js` — Build verification script

### Files Modified (7 existing files)
- `firestore.rules` — Added stats/ and alerts/ security rules
- `vercel.json` — Added cron config + maxDuration
- `src/components/Layout.jsx` — AlertsBadge integration
- `src/components/AppRoutes.jsx` — /alerts route
- `src/components/orders/OrderFulfillmentBoard.jsx` — Anomaly warnings on order cards
- `src/components/SowingCalculator.jsx` — EWMA suggestions, buffer auto-adjust, prediction tracking
- `src/components/CustomerManager.jsx` — Ordering intelligence, trust badges
- `src/components/Dashboard.jsx` — Learning Engine card

### Post-Deploy Steps Required
1. **Run backfill** — `GET /api/learning-engine/backfill` (processes all historical orders)
2. **Verify cron** — Vercel cron runs nightly-stats at 9:00 UTC (2:00 AM Mountain)
3. **Test real-time** — Place a test order and verify `/api/learning-engine/on-order-create` processes it
4. **Check alerts** — Navigate to /alerts page to see any anomalies from backfill