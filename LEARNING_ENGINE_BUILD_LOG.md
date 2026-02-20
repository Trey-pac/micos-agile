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

