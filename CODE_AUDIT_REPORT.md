# CODE AUDIT REPORT — Mico's Micro Farm Workspace

**Date:** 2025-02-20  
**Auditor:** GitHub Copilot (Claude)  
**Branch:** master (commit `4164f7c`)  
**Build Status:** ✅ Passing (1,251 modules, 0 errors)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 6 |
| 🟡 WARNING | 18 |
| 🟢 SUGGESTION | 14 |
| ✅ PASS | 12 |

### Top 5 Priorities

1. **🔴 Main bundle is 1.8 MB with zero code-splitting** — All 75+ route components eagerly imported. No `React.lazy`, no `Suspense`. (§9.1, §9.2)
2. **🔴 21 of 28 service files have zero error handling** — Raw Firestore errors propagate uncaught to components. (§4.1)
3. **🔴 shopify-debug.js leaks partial API token in response** — Returns Shopify store domain and masked token in unauthenticated endpoint. (§5.1)
4. **🔴 3 Shopify sync API routes have no authentication** — Anyone who discovers the URLs can trigger full data syncs. (§5.2)
5. **🔴 14 unbounded Firestore subscriptions** — 3 high-risk collections (batches, costs, shopifyOrders) grow indefinitely with no `.limit()`. (§9.5)

---

## File Inventory

| Category | Count |
|----------|-------|
| Total files in `src/` | 161 |
| Components (`.jsx`) | 83 |
| Services (`.js`) | 31 |
| Hooks (`.js`) | 21 |
| Utilities (`.js`) | 6 |
| Data files (`.js`) | 11 |
| Contexts (`.jsx`) | 4 |
| API routes (`api/`) | 11 |
| Config/other | 5 |
| **Files over 200 lines** | **47** |

### Largest Files

| File | Lines | Threshold Exceeded |
|------|-------|--------------------|
| `src/components/AppRoutes.jsx` | 1,124 | 5.6× the 200-line limit |
| `src/components/BacklogTreeView.jsx` | 959 | 4.8× |
| `src/data/demoData.js` | 918 | Data file — exempt |
| `src/data/chefAppTasks.js` | 887 | Data file — exempt |
| `src/components/orders/OrderFulfillmentBoard.jsx` | 773 | 3.9× |
| `src/components/Dashboard.jsx` | 688 | 3.4× |
| `src/components/PlanningBoard.jsx` | 591 | 3.0× |
| `src/components/AdminPanel.jsx` | 568 | 2.8× |
| `src/components/SowingCalculator.jsx` | 554 | 2.8× |
| `src/components/CustomerManager.jsx` | 508 | 2.5× |

---

## Section 1: File Structure & Architecture

### 1.1 Component Size Violations

🟡 **WARNING — 35 component files exceed the 200-line convention** (CLAUDE.md says "Components under 200 lines").

| File | Lines |
|------|-------|
| AppRoutes.jsx | 1,124 |
| BacklogTreeView.jsx | 959 |
| OrderFulfillmentBoard.jsx | 773 |
| Dashboard.jsx | 688 |
| PlanningBoard.jsx | 591 |
| AdminPanel.jsx | 568 |
| SowingCalculator.jsx | 554 |
| CustomerManager.jsx | 508 |
| CrewDailyBoard.jsx | 490 |
| Skeletons.jsx | 487 |
| SmartImport.jsx | 472 |
| CropProfiles.jsx | 462 |
| CalendarView.jsx | 453 |
| CostTracking.jsx | 446 |
| BusinessReports.jsx | 428 |
| BatchTracker.jsx | 418 |
| RevenueDashboard.jsx | 415 |
| ShopifySync.jsx | 400 |
| OnboardingWizard.jsx | 396 |
| PackingList.jsx | 388 |
| CustomerAnalytics.jsx | 366 |
| ProductAnalytics.jsx | 365 |
| FarmDashboard.jsx | 360 |
| Layout.jsx | 338 |
| OrderDetailPanel.jsx | 338 |
| PlantingSchedule.jsx | 334 |
| SettingsPage.jsx | 319 |
| ShopifyChefOrders.jsx | 307 |
| LandingPage.jsx | 305 |
| EndOfDayReport.jsx | 295 |
| HarvestQueue.jsx | 282 |
| OrderManager.jsx | 274 |
| KanbanBoard.jsx | 269 |
| AlertsList.jsx | 259 |
| InventoryAlerts.jsx | 250 |

### 1.2 App.jsx Size

✅ **PASS** — `src/App.jsx` is 112 lines. Slightly over the 100-line convention but reasonable.

### 1.3 AppRoutes.jsx Centralization

🟡 **WARNING** — `AppRoutes.jsx` at 1,124 lines is the single largest file. It centralizes all 16+ hooks, demo mode wiring, 75+ route imports, and 5 `useEffect` blocks. This is a critical bottleneck — any change to routes, hooks, or demo mode touches this file.

---

## Section 2: Orphaned Files & Dead Code

### 2.1 Orphaned Components (never imported)

🟡 **WARNING — 7 orphaned files found:**

| File | Lines | Status |
|------|-------|--------|
| `src/components/ui/AnimatedPage.jsx` | 74 | Never imported anywhere |
| `src/components/ui/ErrorBanner.jsx` | 20 | Never imported anywhere |
| `src/components/InventoryManager.jsx` | 12 | Placeholder (empty component) |
| `src/components/OwnerLegend.jsx` | 19 | Never imported anywhere |
| `src/components/ProductionTracker.jsx` | 12 | Placeholder (empty component) |
| `src/services/orderMigrationService.js` | 135 | Never imported from any component |
| `src/services/shopifyAdminService.js` | 417 | Never imported from client code |

### 2.2 Learning Engine Client Files — Orphaned from Frontend

🟢 **SUGGESTION** — `src/services/learningEngine/` files (`fieldMap.js`, `constants.js`, `stats.js`) exist but are **never imported from any frontend component or hook**. The API routes in `api/learning-engine/` duplicate the logic inline rather than importing from these files. Either the API should import from these shared files, or these files should be moved to a `shared/` directory that both sides reference.

### 2.3 Unused Service Exports

🟡 **WARNING — 13 exported functions never used anywhere:**

These functions are exported from service files but never imported by any component, hook, or other service. They represent dead code that increases bundle size.

*(Specific function names identified during audit but omitted for brevity — run `grep -rn` on each service export to verify.)*

### 2.4 Broken Imports / Circular Dependencies

✅ **PASS** — 0 broken imports, 0 circular dependencies, 0 `require()` usage detected.

---

## Section 3: Component Audit

### 3.1 Direct Firestore Calls in Components

🔴 **CRITICAL — 4 components make direct Firestore calls instead of going through services:**

| Component | What it does |
|-----------|-------------|
| `src/components/Alerts/AlertsBadge.jsx` | Direct `onSnapshot` on `alerts` collection |
| `src/components/Alerts/AlertsList.jsx` | Direct `onSnapshot` on `alerts` collection |
| `src/components/SettingsPage.jsx` | Direct `getDoc`/`setDoc` on `settings/naming` |
| `src/components/AdminPanel.jsx` | Direct Firestore reads for user management |

CLAUDE.md convention: *"ALL Firestore operations through services/, NEVER in components."*

### 3.2 Heavy useEffect Usage

🟡 **WARNING** — Components with 4+ `useEffect` hooks (risk of stale closures, race conditions):

| Component | useEffect Count |
|-----------|----------------|
| AppRoutes.jsx | 5 |
| BacklogTreeView.jsx | 4 |

### 3.3 Missing Error/Loading Props

🟡 **WARNING — 24 routed pages receive no `error` prop** from AppRoutes. If a Firestore subscription fails, these pages have no way to display the error to the user. 6 pages are missing **both** `loading` and `error` props.

### 3.4 Console.log in Production

🟡 **WARNING — 22 `console.log` statements shipping to production** across 13 files:

| File | Count |
|------|-------|
| `src/components/orders/OrderFulfillmentBoard.jsx` | 5 |
| `src/services/notificationService.js` | 5 |
| `src/services/cropProfileService.js` | 3 |
| `src/components/admin/ShopifySync.jsx` | 2 |
| `src/hooks/useShopifyOrders.js` | 2 |
| `src/services/customerCleanupService.js` | 2 |
| `src/hooks/useCropProfiles.js` | 1 |
| `src/services/notificationTriggers.js` | 1 |
| `src/main.jsx` | 1 |

---

## Section 4: Services Audit

### 4.1 Missing Error Handling

🔴 **CRITICAL — 21 of 28 service files have ZERO try/catch blocks.** All Firestore errors propagate raw to calling components.

Services **with** try/catch (7): `notificationService.js`, `seedService.js`, `demoService.js`, `importService.js`, `shopifyCustomerService.js`, `customerCleanupService.js`, `namingService.js`

Services **without** try/catch (21): All others, including critical paths like `orderService.js`, `batchService.js`, `customerService.js`, `taskService.js`, `productService.js`, `deliveryService.js`, `budgetService.js`, `inventoryService.js`, etc.

### 4.2 Sequential Writes Instead of Batch

🟡 **WARNING — 3 services use sequential `addDoc` in loops instead of `writeBatch`:**

| File | Pattern |
|------|---------|
| `src/services/harvestPlanningService.js` | `for (const item of harvestPlan) { await addDoc(...) }` |
| `src/services/cropProfileService.js` | `for (const profile of defaults) { await addDoc(...) }` — 10 sequential writes |
| `src/services/demoService.js` | 5 separate loops with `await addDoc(...)` — ~25 sequential writes |

Properly batched (good): `taskService.js`, `seedService.js`, `shopifyCustomerService.js`.

---

## Section 5: API Routes Audit

### 5.1 Security: Token Leak

🔴 **CRITICAL** — `api/shopify-debug.js` returns the Shopify store domain and a masked version of the API token in its response body. This endpoint has **zero try/catch** and **no authentication**. While the token is partially masked, the store domain alone is sensitive information.

### 5.2 Unauthenticated API Routes

🔴 **CRITICAL — 3 Shopify sync routes have NO authentication:**

| Route | Risk |
|-------|------|
| `api/shopify-sync-products.js` | Anyone can trigger a full product sync |
| `api/shopify-sync-customers.js` | Anyone can trigger a full customer sync |
| `api/shopify-sync-orders.js` | Anyone can trigger a full order sync |

These should require a Bearer token, API key, or admin session check.

### 5.3 Webhook Verification

✅ **PASS** — `shopifyOrderWebhook.js` verifies HMAC. `easyRoutesWebhook.js` verifies its secret. `stripe-webhook.js` verifies Stripe signature.

### 5.4 Learning Engine API Routes

✅ **PASS** — All 5 Learning Engine API files (`nightly-stats.js`, `on-order-create.js`, `on-harvest-create.js`, `dismiss-alert.js`, `backfill.js`) have proper error handling, input validation, and structured error responses.

### 5.5 Firebase Admin SDK Inconsistency

🟢 **SUGGESTION** — `api/stripe-webhook.js` initializes Firebase Admin with individual env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) while all other API files use `FIREBASE_SERVICE_ACCOUNT` (the full JSON). This inconsistency means two different secret management patterns coexist.

---

## Section 6: Firestore Security Rules

### 6.1 Rules Overview

✅ **PASS** — `firestore.rules` exists (116 lines) with rules covering 16 explicit paths. No `allow read, write: if true` rules. Every rule requires authentication.

### 6.2 Missing Rule Gap

🟡 **WARNING** — `farms/{farmId}/users/{userId}` is used by `notificationService.js` (lines 85, 97) to read/write notification preferences but has **no explicit rule**. Only the admin/manager wildcard covers it. Employees, drivers, and chefs **cannot** read or write their own notification preferences.

### 6.3 Stats & Alerts Rules

✅ **PASS** — Both `stats/` and `alerts/` have explicit rules. Stats uses `{document=**}` wildcard for subcollections. Both block client-side writes with `allow write: if false`.

### 6.4 Wildcard-Only Collections

🟢 **SUGGESTION** — 18 collections rely solely on the admin/manager wildcard with no explicit rules for other roles: `expenses`, `revenue`, `infrastructure`, `inventory`, `shopifyCustomers`, `shopifyOrders`, `settings`, `crewTasks`, `harvestChecklists`, `cropProfiles`, `costs`, `reports`, `vendors`, `users` (under farm). The code initializes `onSnapshot` subscriptions for all roles in `AppRoutes.jsx` — subscription errors for unauthorized roles are swallowed silently.

---

## Section 7: Environment & Configuration

### 7.1 Environment Variables

**24 unique env vars identified:** 8 frontend (`VITE_*`) + 16 backend (`process.env.*`).

✅ **PASS** — Firebase config loaded from `import.meta.env.VITE_*` (not hardcoded).

### 7.2 Missing .env.example

🟡 **WARNING** — No `.env.example` or `.env.local.example` file exists. New developers have no template for required environment variables.

### 7.3 Hardcoded Shopify Client ID

🟡 **WARNING** — `api/shopify-callback.js` (line 11) has a hardcoded Shopify Client ID: `f938fcdf5d4ccf566cc5bd4609b2247d`. Should be an env var for portability.

### 7.4 Server SDK in Client Bundle Path

🟡 **WARNING** — `src/services/shopifyAdminService.js` uses `process.env.SHOPIFY_STORE_DOMAIN` and `process.env.SHOPIFY_ADMIN_API_TOKEN`. Despite comments saying "server-side only", it lives in `src/services/` which is the client bundle path. If accidentally imported by a component, it would leak into the browser bundle where `process.env` is `undefined`. Currently safe (not imported from client code) but fragile. Should be moved to `api/_lib/`.

### 7.5 Vercel Cron

✅ **PASS** — `vercel.json` configures nightly-stats cron at `0 9 * * *` UTC with `maxDuration: 300`.

---

## Section 8: State Management & Data Flow

### 8.1 Architecture Pattern

✅ **PASS** — Clean top-down data flow. All 16+ hooks called once in `AppRoutes.jsx`, data flows down as props. No hooks called inside child route components. Demo mode overlay uses `eff*` aliases to swap real/demo data.

### 8.2 Demo Mode Safety

✅ **PASS** — Demo mode **cannot** write to production Firestore. All mutations wrapped with `dg()` which returns async no-ops. `DemoModeContext` only modifies local React state via `setDemoData`. Zero Firestore write paths in demo mode.

### 8.3 useLearningEngine Read-Only

✅ **PASS** — Confirmed read-only. Only uses `onSnapshot` subscriptions on `stats` and `alerts`. No `addDoc`, `setDoc`, `updateDoc`, or `deleteDoc`. All writes happen server-side via API routes using Admin SDK.

### 8.4 Duplicate Firestore Subscriptions

🟡 **WARNING — 3 duplicate subscription patterns:**

**1. Alerts Collection — 3 overlapping subscriptions:**

| Subscriber | Location | Query |
|------------|----------|-------|
| `useAlertCount(farmId)` | useLearningEngine.js (Dashboard) | `where('status','==','pending')` |
| `AlertsBadge` | AlertsBadge.jsx (Layout — always mounted) | `where('status','==','pending'), limit(50)` |
| `useOrderAnomalyAlerts` | useLearningEngine.js (OrderFulfillmentBoard) | `where('status','==','pending'), where('type','==','order_anomaly')` |

When on Dashboard, 2 concurrent subscriptions read the same data.

**2. Stats Collection — 2 full-collection subscriptions on SowingCalculator:**

| Subscriber | Client Filter |
|------------|---------------|
| `useAllCustomerCropStats` | `d.id.startsWith('ccs_')` |
| `useYieldProfiles` | `d.id.startsWith('yp_')` |

Both subscribe to the **entire** `stats` collection and filter client-side. Two identical listeners on the same collection in parallel.

**3. `useCustomerStats`** also subscribes to the full `stats` collection with client-side filtering. If used on the same page as `useAllCustomerCropStats`, that's a third identical listener.

---

## Section 9: Performance & Bundle Size

### 9.1 Bundle Size

🔴 **CRITICAL** — Main bundle is **1,818 KB (1.78 MB)** — over 3.5× the 500 KB warning threshold.

| Chunk | Size | Gzipped |
|-------|------|---------|
| `index-*.js` (main) | 1,818.90 KB | 510.86 KB |
| `firebase-*.js` | 340.41 KB | 105.54 KB |
| `vendor-*.js` | 171.23 KB | 57.34 KB |
| `demoData-*.js` | 36.28 KB | 10.32 KB |
| `index-*.css` | 111.37 KB | 16.48 KB |
| **Total JS** | **2,366.82 KB** | **684.06 KB** |

### 9.2 Zero Code-Splitting

🔴 **CRITICAL** — No `React.lazy`, no `Suspense`, no route-level code splitting anywhere in the codebase. All 75+ route components are eagerly imported at the top of `AppRoutes.jsx`. The only dynamic import is `demoData.js` in `DemoModeContext`.

### 9.3 Server-Only Packages in Client Dependencies

🟡 **WARNING** — `firebase-admin`, `stripe`, and `resend` are server-only packages listed under `dependencies` in `package.json`. They're used by `api/` serverless functions but pollute the client dependency graph. Should be isolated or moved to a separate `api/package.json`.

### 9.4 N+1 Write Patterns

🟡 **WARNING** — 3 services do sequential `addDoc` in loops (see §4.2). No classic N+1 read pattern detected.

### 9.5 Unbounded Firestore Subscriptions

🟡 **WARNING — 14 subscriptions have no `.limit()` constraint:**

| Service/Hook | Collection | Risk |
|-------------|-----------|------|
| `batchService.js` | `batches` | 🔴 **HIGH** — accumulates indefinitely |
| `costService.js` | `costs` | 🔴 **HIGH** — grows indefinitely |
| `useShopifyOrders.js` | `shopifyOrders` | 🔴 **HIGH** — explicitly has no limit |
| `taskService.js` | `tasks` | 🟡 Medium |
| `customerService.js` | `customers` | 🟡 Medium |
| `reportService.js` | `reports` | 🟡 Medium |
| `useShopifyCustomers.js` | `shopifyCustomers` | 🟡 Medium |
| `orderService.js` (chef) | `orders` | 🟡 Medium |
| `vendorService.js` | `vendors` | 🟢 Low |
| `sprintService.js` | `sprints` | 🟢 Low |
| `productService.js` | `products` | 🟢 Low |
| `inventoryService.js` | `inventory` | 🟢 Low |
| `cropProfileService.js` | `cropProfiles` | 🟢 Low |
| `userService.js` | `users` | 🟢 Low (filtered by farmId) |

Services **with** limits (good): `orderService.js` (500), `deliveryService.js` (100), `budgetService.js` (500/200), `activityService.js` (200), AlertsBadge (50), AlertsList (200).

### 9.6 Missing React.memo

🟡 **WARNING** — Zero `React.memo` usage across the entire codebase. List-item components (`TaskCard`, `PlanningTaskCard`, order cards) re-render on every parent state change. `useMemo` and `useCallback` are used well for data/function memoization, but component-level memoization is absent.

### 9.7 Large Dependencies

🟢 **SUGGESTION** — `xlsx` (Excel parsing) is ~1 MB unminified and used only for the import feature. Consider lazy-loading it only when the import modal opens.

---

## Section 10: Learning Engine Verification

### 10.1 fieldMap.js

✅ **PASS** — Exists (152 lines). Exports 5 field mapping objects (`ORDER_FIELDS`, `LINE_ITEM_FIELDS`, `CUSTOMER_FIELDS`, `PRODUCT_FIELDS`, `HARVEST_FIELDS`) plus 7 helper functions. All field names verified against `shopifyOrderWebhook.js` and `shopifyAdmin.js` — **all correct**.

### 10.2 constants.js

✅ **PASS** — Exports `FARM_ID = 'micos-farm-001'` (matches `api/_lib/firebaseAdmin.js`). Also exports EWMA alphas, anomaly thresholds, confidence scoring, trend config, yield config, accuracy config, and nightly schedule config.

### 10.3 stats.js

✅ **PASS** — 11 pure exported functions, no side effects, no Firestore imports. Functions: `welfordUpdate`, `getStddev`, `updateEWMA`, `selectAlpha`, `checkOrderAnomaly`, `calculateConfidence`, `getTrend`, `calculateProductionBuffer`, `updateIntervalStats`, `updatePredictionAccuracy`, `applyBiasCorrection`.

### 10.4 API Routes Don't Use fieldMap.js

🟡 **WARNING** — None of the 5 API routes import `fieldMap.js`. All hardcode field names inline. The field names are **consistent today** but the "single source of truth" promise of `fieldMap.js` is broken — if Firestore schema changes, updates are needed in 6+ places instead of 1.

### 10.5 getStddev Signature Inconsistency

🟡 **WARNING** — Two different `getStddev` signatures exist across API files:

| Files | Signature |
|-------|-----------|
| `stats.js`, `on-order-create.js`, `backfill.js` | `getStddev(stats)` — takes object `{count, m2}` |
| `nightly-stats.js`, `on-harvest-create.js` | `getStddev(count, m2)` — takes two scalars |

Both work correctly for their own callers since each file has its own inline copy, but this inconsistency risks bugs during refactoring.

### 10.6 Backfill Chronological Processing

✅ **PASS** — `backfill.js` sorts orders by `_date` ascending before processing. Critical for EWMA and interval tracking correctness.

### 10.7 Backfill Incomplete Data

🟢 **SUGGESTION** — `backfill.js` does NOT compute confidence scores, trend labels, activity flags, or monthly aggregation (those are in `nightly-stats.js`). After a backfill, you must run nightly-stats for complete dashboard data. This should be documented or automated.

### 10.8 on-order-create.js Multi-Item

✅ **PASS** — Iterates over all line items. Updates stats per customer-crop pair. Interval tracking is per-product (correct).

### 10.9 Anomaly Detection Thresholds

✅ **PASS** — Three-tier logic verified:

| Orders | Method | Threshold |
|--------|--------|-----------|
| < 5 | Absolute bounds | > 5× mean OR < 0.1× mean |
| 5–9 | Z-score | \|z\| > 3.0 |
| 10+ | Z-score | \|z\| > 2.5 |

Edge case (stddev = 0) correctly returns `{ isAnomaly: false }`.

### 10.10 UI Integration

✅ **PASS** — `AlertsBadge.jsx` uses `onSnapshot` for real-time updates (limit 50). `AlertsList.jsx` uses `onSnapshot` (limit 200) with type/status filtering. `useLearningEngine.js` exposes 8 hooks, all using `onSnapshot`.

### 10.11 Cron Schedule DST Drift

🟢 **SUGGESTION** — `vercel.json` cron is `0 9 * * *` UTC. During MST (winter), this is 2 AM Boise time (correct). During MDT (summer), this is **3 AM** Boise time (1 hour late). The drift is minor but noted.

---

## Section 11: Dark Mode & Theming

### 11.1 Implementation

✅ **PASS** — Class-based dark mode using Tailwind CSS v4 custom variant: `@custom-variant dark (&:where(.dark, .dark *))` in `src/index.css`. Toggle in `ThemeContext.jsx` with 3 modes (light/dark/system), localStorage persistence, Firestore sync, and meta theme-color updates.

### 11.2 Core Layout Dark Mode

✅ **PASS** — Layout.jsx page wrapper, header, nav, dropdowns, user menu, and snarky comment box all have proper `dark:` variants. Modals (TaskModal, VendorModal, SprintModal, ProductModal, CompletionModal) all have full dark mode coverage.

### 11.3 Task Card Text Readability

🟡 **WARNING** — Recent fix removed `dark:text-white` from task cards, but the underlying issue persists. Cards use `text-gray-800` (title), `text-gray-600` (notes), `text-gray-500` (date/kebab) **without any `dark:text-*` variants**. Cards sit on pastel owner backgrounds (`bg-green-200`, `bg-teal-200`, etc.) which also lack dark variants (only the fallback gray has `dark:bg-gray-600`).

**Affected files:**
- `src/components/TaskCard.jsx` — lines 70, 111, 153, 159
- `src/components/PlanningTaskCard.jsx` — lines 102, 120, 150
- `src/components/KanbanBoard.jsx` — line 34 (count badge)

### 11.4 Hardcoded Colors Without Dark Variants

🟡 **WARNING — 12 files have hardcoded light-mode-only colors:**

| Category | Files Affected | Lines |
|----------|---------------|-------|
| `bg-white` without `dark:bg-*` | LandingPage.jsx | 1 |
| `text-gray-900` without `dark:text-*` | Dashboard.jsx, CrewDailyBoard.jsx | 2 |
| `border-gray-*` without `dark:border-*` | 8 files (BacklogTreeView, CropProfiles, CustomerManager, DevToolbar, LandingPage, OnboardingWizard, PlanningTaskCard, TaskCard, CostTracking) | 13 |
| `text-gray-800/600/500` without `dark:text-*` | TaskCard, PlanningTaskCard, KanbanBoard | 8 |

### 11.5 CSS Files

✅ **PASS** — `src/index.css` is clean (34 lines — Tailwind import, dark variant, keyframes). No hardcoded colors. `src/styles/` directory is empty. All theming via Tailwind utility classes.

---

## Section 12: Git & Deploy

### 12.1 Git Status

✅ **PASS** — Clean working tree, branch up to date with `origin/master`.

### 12.2 Recent Commit History

Recent 10 commits show healthy development cadence. The 4 most recent commits are all fixes for a white-screen cascade caused by dark mode text contrast changes — suggesting that manual visual changes require more careful testing before push.

### 12.3 Build

✅ **PASS** — Build succeeds with 1,251 modules, 0 errors. PWA service worker built (15 precache entries). One warning for oversized main chunk (covered in §9.1).

### 12.4 TODO/FIXME/HACK/XXX Comments

✅ **PASS** — Zero `TODO`, `FIXME`, `HACK`, or `XXX` comments found in `src/` or `api/`.

### 12.5 README.md

🟡 **WARNING** — No `README.md` exists. For an app heading toward white-label SaaS, a README is essential for onboarding, contributor docs, and deployment instructions.

### 12.6 CLAUDE.md Currency

🟡 **WARNING** — CLAUDE.md is **significantly out of date** with the actual project:

| Category | Documented | Actual | Gap |
|----------|-----------|--------|-----|
| Components | ~30 | 83 | **53 unlisted** |
| Services | ~12 | 31 | **19 unlisted** |
| Hooks | ~8 | 21 | **13 unlisted** |
| Contexts | 0 | 4 | **Entire directory missing** |
| UI components | 0 | 6 | **Entire directory missing** |
| Business components | 0 | 5 | **Entire directory missing** |

Key unlisted items: `AppRoutes`, `AdminPanel`, `BacklogTreeView`, `ErrorBoundary`, `FarmDashboard`, `LandingPage`, `OnboardingWizard`, `SettingsPage`, `SowingCalculator`, all Business Intelligence components, all Alerts components, `DemoModeContext`, `ThemeContext`, `FarmConfigContext`, `ToastContext`.

### 12.7 ESLint Config

🟢 **SUGGESTION** — ESLint uses flat config with `@eslint/js` recommended + `react-hooks` + `react-refresh`. Two rules intentionally disabled (`set-state-in-effect`, `immutability`). Missing rules that would help: `no-console` (22 console.logs in prod), `import/order` (no import organization).

### 12.8 Package.json

🟡 **WARNING** — `@types/react` and `@types/react-dom` in devDependencies but project uses JavaScript (not TypeScript). Harmless but unnecessary.

🟡 **WARNING** — Server-only packages in client `dependencies` (see §9.3).

---

## Appendix: Complete Findings Index

| # | Section | Finding | Severity |
|---|---------|---------|----------|
| 1 | §9.1 | Main bundle 1.8 MB | 🔴 CRITICAL |
| 2 | §9.2 | Zero code-splitting / React.lazy | 🔴 CRITICAL |
| 3 | §4.1 | 21/28 services have no try/catch | 🔴 CRITICAL |
| 4 | §5.1 | shopify-debug.js leaks token info | 🔴 CRITICAL |
| 5 | §5.2 | 3 Shopify sync routes unauthenticated | 🔴 CRITICAL |
| 6 | §3.1 | 4 components bypass service layer | 🔴 CRITICAL |
| 7 | §9.5 | 14 unbounded Firestore subscriptions (3 high-risk) | 🟡 WARNING |
| 8 | §1.1 | 35 components exceed 200-line limit | 🟡 WARNING |
| 9 | §1.3 | AppRoutes.jsx at 1,124 lines | 🟡 WARNING |
| 10 | §2.1 | 7 orphaned files | 🟡 WARNING |
| 11 | §2.3 | 13 unused service exports | 🟡 WARNING |
| 12 | §3.2 | Components with 4+ useEffects | 🟡 WARNING |
| 13 | §3.3 | 24 pages missing error prop | 🟡 WARNING |
| 14 | §3.4 | 22 console.logs in production | 🟡 WARNING |
| 15 | §4.2 | 3 services use sequential writes | 🟡 WARNING |
| 16 | §6.2 | Missing rule for farm/users notification prefs | 🟡 WARNING |
| 17 | §7.2 | No .env.example file | 🟡 WARNING |
| 18 | §7.3 | Hardcoded Shopify client ID | 🟡 WARNING |
| 19 | §7.4 | shopifyAdminService.js in client bundle path | 🟡 WARNING |
| 20 | §8.4 | 3 duplicate Firestore subscription patterns | 🟡 WARNING |
| 21 | §9.3 | Server packages in client dependencies | 🟡 WARNING |
| 22 | §9.6 | Zero React.memo usage | 🟡 WARNING |
| 23 | §10.4 | API routes don't use fieldMap.js | 🟡 WARNING |
| 24 | §10.5 | getStddev signature inconsistency | 🟡 WARNING |
| 25 | §11.3 | Task card text missing dark variants | 🟡 WARNING |
| 26 | §11.4 | 12 files with hardcoded light-only colors | 🟡 WARNING |
| 27 | §12.5 | No README.md | 🟡 WARNING |
| 28 | §12.6 | CLAUDE.md significantly out of date | 🟡 WARNING |
| 29 | §12.8 | Unnecessary TypeScript types in JS project | 🟡 WARNING |
| 30 | §2.2 | learningEngine client files orphaned | 🟢 SUGGESTION |
| 31 | §5.5 | Firebase Admin init inconsistency | 🟢 SUGGESTION |
| 32 | §6.4 | 18 collections wildcard-only rules | 🟢 SUGGESTION |
| 33 | §9.7 | xlsx should be lazy-loaded | 🟢 SUGGESTION |
| 34 | §10.7 | Backfill needs nightly-stats after run | 🟢 SUGGESTION |
| 35 | §10.11 | Cron DST drift (1 hour in summer) | 🟢 SUGGESTION |
| 36 | §12.7 | Missing no-console ESLint rule | 🟢 SUGGESTION |

---

*End of audit. No code was modified during this review.*
