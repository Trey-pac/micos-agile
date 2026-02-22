# Mico's Workspace — Comprehensive Code Audit & Refactor Plan

**Date:** 2026-02-21
**Auditor:** Automated deep analysis (Claude)
**Codebase:** 165 source files · ~26,000 lines · React 19 + Vite 7 + Tailwind v4 + Firebase

---

## Table of Contents

1. [Architecture Analysis](#1-architecture-analysis)
2. [Technical Debt Inventory](#2-technical-debt-inventory)
3. [Performance Issues](#3-performance-issues)
4. [Security Gaps](#4-security-gaps)
5. [Refactoring Priorities (Ranked)](#5-refactoring-priorities)
6. [Three-Phase Refactoring Plan](#6-three-phase-refactoring-plan)

---

## 1. Architecture Analysis

### 1.1 Codebase Stats

| Layer | Files | Lines | Avg Lines/File |
|-------|-------|-------|----------------|
| Components | 68 | ~16,800 | 247 |
| Hooks | 25 | ~2,470 | 99 |
| Services | 30 | ~3,400 | 113 |
| Utils | 6 | 777 | 130 |
| Data | 11 | 3,560 | 324 |
| Contexts | 5 | 268 | 54 |
| Firebase init | 5 | 59 | 12 |
| API endpoints | 18 | ~2,500 | 139 |
| **TOTAL** | **165+** | **~26,000** | |

### 1.2 Duplicate Patterns

| Pattern | Occurrences | Impact |
|---------|-------------|--------|
| `toDate()` Firestore timestamp parser | **6+ independent implementations** | Maintenance burden — fix one, miss five |
| `formatDate()` date formatter | **5+ implementations** | Same issue |
| `findVariety()` crop lookup | 2 (sowingUtils + pipelineUtils) | Divergence risk |
| `col()`/`dref()` naming vs `tasksCollection`/`taskDoc` | 50/50 split across services | Inconsistency, not critical |
| Cost tracking (`costService` vs `budgetService.expenses`) | 2 separate Firestore collections | Business logic confusion |
| Customer management (legacy `customers` vs `shopifyCustomers`) | 3 services for one domain | Migration debt |
| AdminPanel settings ↔ SettingsPage billing/branding | Heavily duplicated UI | DRY violation across 2 files |

**Complexity Score: 6/10** — The service layer is clean and consistent; the component layer is where complexity lives.

### 1.3 Files/Folders with Unclear Purposes

| Path | Issue |
|------|-------|
| `src/sw.js` (96 lines) | **Dead.** PWA disabled in vite.config; main.jsx actively unregisters service workers |
| `src/styles/` | **Empty directory.** All styling is Tailwind. Can delete |
| `current-src-backup/` | Full source backup from earlier era — unused |
| `src/components/LoginScreen.jsx` | **Never imported.** Replaced by LandingPage |
| `src/components/OwnerLegend.jsx` | **Never imported.** Legacy dead code |
| `src/components/PWAInstallPrompt.jsx` | **Commented out** in App.jsx. Fully disabled |
| `src/data/planTiers.js` | Feature-gating code for billing plans — **none of the gate functions are called** |
| `src/services/costService.js` vs `budgetService.js` | Overlapping financial tracking with separate collections |

### 1.4 Complexity Scores (Key Files)

| File | Lines | Complexity | Why |
|------|-------|-----------|-----|
| BacklogTreeView.jsx | **1,284** | 🔴 Very High | 16 useState, keyboard shortcuts, DnD, batch edit, archive, inline IIFE renders |
| OrderFulfillmentBoard.jsx | **850** | 🔴 High | Multi-source orders, Kanban DnD, migration panel, history table, inline sub-components |
| PlanningBoard.jsx | **747** | 🔴 High | 14 useState, 6 useRef, duplicate mobile/desktop rendering, scroll management |
| Dashboard.jsx | **737** | 🟡 Medium | Well-memoized, but 8+ card sections inlined in one file |
| AppRoutes.jsx | **698** | 🟡 Medium | Structural — route definitions, prop drilling hub. Complexity is inherent. |
| useAppData.js | **248** | 🔴 Very High | Aggregates 16+ Firestore subscriptions into one god-hook. Single-point re-render bottleneck |
| useAppHandlers.js | **343** | 🟡 Medium | Pure callback factory. Every handler is useCallback. Large but not complex |
| harvestPlanningService.js | **260** | 🟡 Medium | Complex business logic (harvest planning, fuzzy matching), but cohesive |

---

## 2. Technical Debt Inventory

### 2.1 Unused / Dead Code

#### Components (delete)
| File | Lines | Evidence |
|------|-------|---------|
| `LoginScreen.jsx` | 57 | Never imported anywhere — LandingPage handles login |
| `OwnerLegend.jsx` | 24 | Never imported — legacy |
| `PWAInstallPrompt.jsx` | 73 | Commented out in App.jsx |

#### Dead Files (delete)
| File | Lines | Evidence |
|------|-------|---------|
| `src/sw.js` | 96 | VitePWA disabled; main.jsx unregisters all service workers |
| `src/styles/` | 0 | Empty directory |
| `current-src-backup/` | ~2,000+ | Full backup — not referenced |

#### Dead Exports (6+ functions that are exported but never imported)
| Export | File | Evidence |
|--------|------|---------|
| `createFarm()` | farmService.js | Never imported — farm creation not wired up |
| `checkInviteForEmail()` | farmService.js | Never imported |
| `importCustomers()` | importService.js | Never imported |
| `getOutForDeliveryNotification()` | notificationTriggers.js | Never imported |
| `getUserFCMTokens()` | notificationService.js | Never imported |
| `ORDER_STATUSES` | orderService.js | Never imported (though `FULFILLMENT_COLUMNS` is) |
| `getActualAverages()` | pipelineUtils.js | Never imported |
| `getCurrentSprint()` | sprintUtils.js | Replaced by `getAutoSelectedSprint` |
| `DATA_VERSION` | constants.js | Never imported |
| `hasFeature()`, `checkLimit()` | planTiers.js | Never called — billing gates not wired |
| `ALL_IMPORT_CONFIGS` | importConfigs.js | Never imported |

### 2.2 Inconsistent Patterns

#### Firebase Access
| Pattern | Where | Count |
|---------|-------|-------|
| `getDb()` via service layer ✅ | All 27 Firestore-touching services | 27 |
| Direct `onSnapshot` in hook (bypasses service) ❌ | `useShopifyCustomers.js`, `useShopifyOrders.js` | 2 |
| Direct Firestore call in component ❌ | AdminPanel, SettingsPage, CustomerManager | 3 |
| `fetch('/api/...')` in component ❌ | OrderFulfillmentBoard, SettingsPage | 2 |

#### Collection Ref Naming
| Style | Files Using It |
|-------|---------------|
| Terse: `col()`, `dref()` | costService, cropProfileService, customerService, deliveryService, orderService, productService, shopifyCustomerService |
| Descriptive: `tasksCollection`, `vendorDoc` | activityService, batchService, budgetService, inventoryService, sprintService, taskService, vendorService |

#### Error Handling
| Pattern | Services | Hooks | Components |
|---------|----------|-------|-----------|
| try/catch ✅ | **27/27** | **25/25** | Partial |
| Error state exposed to user | N/A | **21/25** | **6/12 large** missing |
| Retry logic | N/A | **12/25** (up to 3×) | None |
| `console.error` only (no user feedback) | 2 | 4 | **8 of 12 large** |

### 2.3 Missing Input Validation

**Zero services validate Firestore write inputs.** Common missing checks:
- Required field validation (`farmId` checked in only 2 of 27 services)
- Type checking (numbers as numbers, dates as dates)
- String length bounds
- Array size bounds (e.g., `stageHistory` in batchService grows unbounded per batch)

### 2.4 Bugs Found

| Bug | File | Severity |
|-----|------|----------|
| **Batch reuse after commit** | `shopifyCustomerService.js` `migrateLegacyCustomerFields` | 🔴 HIGH — Firestore batches are single-use. After `batch.commit()` at 500 docs, the same batch obj continues to be used. Will throw on farms with 500+ customers |
| **Delivery stop index update** | `deliveryService.js` `updateDeliveryStop` | 🟡 MEDIUM — Uses `stops.${stopIndex}` syntax which replaces the entire array element, not a partial merge. Firestore doesn't support array index updates this way |
| **Race condition in naming** | `namingService.js` `setEpicName`/`setFeatureName` | 🟡 MEDIUM — Read-then-write is not atomic. Two simultaneous renames can overwrite each other |

### 2.5 Over-Complicated Logic That Could Be Simplified

| Where | Issue | Simplification |
|-------|-------|---------------|
| `PlanningBoard.jsx` | 200+ lines of duplicated desktop/mobile Kanban | Extract shared `SprintColumn` component; render differently via CSS or a `variant` prop |
| `useAppData.js` | 16 hooks + 4 side-effects in one hook | Split into domain contexts (OrdersContext, TasksContext, etc.) |
| `BacklogTreeView.jsx` | BatchEditPanel (140 lines) inlined | Extract to `modals/BatchEditPanel.jsx` |
| `Dashboard.jsx` | 8 card sections (40-80 lines each) inlined | Extract each to `dashboard/SprintCard.jsx`, `dashboard/ShopifyCard.jsx`, etc. |
| `cropProfileService.js` | ~100 lines of seed data inside the service | Move to `data/defaultCropProfiles.js` |

---

## 3. Performance Issues

### 3.1 Re-Render Cascade (THE #1 PERFORMANCE ISSUE)

**`useAppData.js` is a god-hook that aggregates 16+ Firestore subscriptions into a single return object.** Called once in AppRoutes, its 60+ property object is recreated on EVERY state change from ANY subscription. A single Firestore doc update (one task drag, one order status change) triggers a full re-render of the entire component tree.

**Impact:** Every Firestore write → useAppData return object changes → AppRoutes re-renders → every routed page and child re-renders.

### 3.2 Unstable Derived Arrays (7 hooks)

These hooks compute `.filter()` or `.sort()` on EVERY render, creating new array references even when source data hasn't changed:

| Hook | Unstable Property | Fix |
|------|-------------------|-----|
| `useBatches.js` | `activeBatches`, `readyBatches` | Wrap in `useMemo` |
| `useOrders.js` | `orders` (sorted copy) | Wrap in `useMemo` |
| `useProducts.js` | `availableProducts` | Wrap in `useMemo` |
| `useDeliveries.js` | `todayDeliveries`, `activeDeliveries` | Wrap in `useMemo` |
| `useInventory.js` | `alertItems` | Wrap in `useMemo` |
| `useCropProfiles.js` | `activeProfiles` | Wrap in `useMemo` |
| `useDemoOverlay.js` | entire return object (25 props) | Wrap in `useMemo` |

### 3.3 Context Provider Values Not Memoized (3 contexts)

| Context | Impact |
|---------|--------|
| `FarmConfigContext.jsx` | `{ config, loading, setConfig }` — new object every render → all consumers re-render |
| `ThemeContext.jsx` | `{ theme, setTheme, isDark }` — `isDark` recomputed inline → new object every render |
| `ToastContext.jsx` | `{ addToast }` — wrapping object unstable even though `addToast` is useCallback |

### 3.4 Unbounded Queries

| Service | Function | Risk |
|---------|----------|------|
| `customerCleanupService` | `cleanDuplicateCustomers` | Fetches ALL shopifyCustomers — OOM risk at scale |
| `customerCleanupService` | `autoCategorizeCustomers` | Fetches ALL customers + ALL orders into memory |
| `shopifyCustomerService` | `migrateLegacyCustomerFields` | Fetches ALL customers + ALL shopifyCustomers |
| `harvestPlanningService` | `autoCreateProductionTasks` | Fetches ALL sowingSchedule + ALL crewTasks for dedup |
| `notificationService` | `getUserFCMTokens` | No limit — grows if tokens aren't cleaned |
| `taskService` | `subscribeTasks` | `limit(1000)` — highest in codebase |

### 3.5 Bundle Size

**Current build output (production):**
| Chunk | Size | Gzipped |
|-------|------|---------|
| `firebase-vendor` | 360 KB | 112 KB |
| `charts` (Recharts+D3) | 379 KB | 111 KB |
| `react-vendor` | 235 KB | 75 KB |
| `importService` (xlsx+papa) | 370 KB | 126 KB |
| `index` (main app) | 198 KB | 54 KB |
| `framer-motion` | 123 KB | 40 KB |

**Optimization opportunities:**
| Action | Savings |
|--------|---------|
| Dynamic `import('xlsx')` in importUtils.js | ~1MB from eager bundle (xlsx only used in admin import feature) |
| Add `papaparse` + `xlsx` chunk to manualChunks | Isolates import-only deps |
| Lazy-load `chefAppTasks.js` + `devSprintPlan.js` in seedService | ~62KB from eager bundle |
| Code-split admin routes (AdminPanel, ShopifySync, SmartImport) | ~150KB deferred from initial load |
| `sw.js` deletion | No bundle impact (already excluded) but cleaner repo |

### 3.6 Inline JSX Functions (Top Offenders)

Components creating new function references on every render in `.map()` loops:

| Component | Example | Instance Count |
|-----------|---------|---------------|
| Dashboard.jsx | `onClick={() => navigate('/kanban')}` | 15+ |
| BacklogTreeView.jsx | `onClick={e => { e.stopPropagation(); onAddTask(...) }}` per feature | Dozens |
| PlanningBoard.jsx | `onClick={() => setViewMode('board')}` | 6+ |
| AdminPanel.jsx | `onChange={(e) => handleRoleChange(...)}` | 10+ |

---

## 4. Security Gaps

### 4.1 CRITICAL — Unauthenticated API Endpoints

**9 of 15 API endpoints have ZERO authentication.** Anyone on the internet can call them.

| Endpoint | Risk | What an attacker can do |
|----------|------|------------------------|
| `POST /api/sendNotification` | 🔴 CRITICAL | Send push notifications to ANY customer (phishing vector) |
| `GET/POST /api/migrate-order-statuses` | 🔴 CRITICAL | Mass-modify ALL order statuses in Firestore |
| `GET /api/learning-engine/backfill` | 🔴 CRITICAL | Delete and rebuild ALL analytics data (destructive) |
| `GET /api/shopifySync` | 🔴 CRITICAL | Trigger Shopify→Firestore sync; DoS via repeated calls. Also has `Access-Control-Allow-Origin: *` |
| `POST /api/create-checkout` | 🟡 HIGH | Generate unlimited Stripe checkout sessions |
| `GET /api/shopify-debug` | 🟡 HIGH | Information disclosure (env var lengths, shop name, farm ID) |
| `GET /api/learning-engine/nightly-stats` | 🟡 HIGH | Trigger resource-intensive nightly computation (DoS) |
| `POST /api/learning-engine/dismiss-alert` | 🟡 HIGH | Dismiss all system alerts |
| `POST /api/learning-engine/on-order-create` | 🟡 MEDIUM | Trigger reprocessing of any order |
| `POST /api/learning-engine/on-harvest-create` | 🟡 MEDIUM | Trigger reprocessing of any harvest |

**Properly secured endpoints (3):** `shopify-sync-customers`, `shopify-sync-orders`, `shopify-sync-products` — all check `SYNC_API_SECRET` or Firebase ID token.

### 4.2 CRITICAL — Privilege Escalation

`useAuth.js` exports `updateOwnRole()` which calls `updateDoc` on the user's own profile. Firestore rule `allow write: if isOwner(userId)` permits this without field restrictions. **Any approved employee or driver can promote themselves to admin.**

**Fix:** Restrict self-writes in Firestore rules:
```
allow write: if isOwner(userId)
  && !('role' in request.resource.data.diff(resource.data))
  && !('farmId' in request.resource.data.diff(resource.data));
```

### 4.3 CRITICAL — Webhook Signature Bypass

Both `easyRoutesWebhook.js` and `shopifyOrderWebhook.js` silently skip HMAC signature verification when the respective env var (`EASYROUTES_WEBHOOK_SECRET`, `SHOPIFY_WEBHOOK_SECRET`) is missing. They return `true` (valid) instead of rejecting.

**Fix:** Fail closed — return `false` and reject the request if the secret is not configured.

### 4.4 CRITICAL — Shopify Access Token Exposure

`shopify-callback.js` returns the Shopify Admin API access token **in plaintext** in the HTTP response body. This token grants full Shopify store access.

**Fix:** Store the token server-side only. Never return it to the browser. Delete this endpoint or rewrite to store in env/Firestore.

### 4.5 HIGH — No Rate Limiting

Zero endpoints have rate limiting. Combined with the unauthenticated endpoints above, this means:
- `backfill` (takes 30-300s of compute) can be called in a loop
- `sendNotification` can spam customers
- `shopifySync` can hammer the Shopify API (rate-limited by Shopify, but creates FireStore write storms)

### 4.6 MEDIUM — Overly Broad Firestore Wildcard

```
match /{document=**} {
  allow read: if isFarmMember(farmId);
  allow write: if hasRole(farmId, ['admin', 'manager']);
}
```
This gives all farm members read access to ALL subcollections, including `stats/`, `meta/`, `config/`, and any future sensitive subcollections. Fine for now but limits future data isolation.

### 4.7 LOW — Missing CSRF on OAuth

`shopify-callback.js` doesn't validate a `state` parameter in the OAuth flow, making it vulnerable to CSRF attacks during Shopify app authorization.

---

## 5. Refactoring Priorities (Ranked)

Each issue scored on three dimensions:
- **Risk** (1-5): How likely to cause a production incident or security breach
- **Velocity** (1-5): How much it slows down daily development
- **Effort** (1-5): How hard/long to fix (1=quick, 5=major refactor)

### Tier 1 — Fix Now (Week 1)

| # | Issue | Risk | Velocity | Effort | Score |
|---|-------|------|----------|--------|-------|
| 1 | **Add auth to 9 open API endpoints** | 5 | 1 | 2 | 🔴 8 |
| 2 | **Fix privilege escalation** (field-restrict self-writes in Firestore rules) | 5 | 1 | 1 | 🔴 7 |
| 3 | **Fix webhook signature bypass** (fail closed when secret missing) | 5 | 1 | 1 | 🔴 7 |
| 4 | **Delete/rewrite shopify-callback.js** (token exposure) | 5 | 1 | 1 | 🔴 7 |
| 5 | **Fix shopifyCustomerService batch bug** (create new batch after commit) | 4 | 1 | 1 | 🟡 6 |

### Tier 2 — Fix This Sprint (Week 2)

| # | Issue | Risk | Velocity | Effort | Score |
|---|-------|------|----------|--------|-------|
| 6 | **Memoize 7 hook derived arrays** (useMemo wraps) | 2 | 4 | 1 | 🟡 7 |
| 7 | **Memoize 3 context provider values** | 2 | 3 | 1 | 🟡 6 |
| 8 | **Extract shared dateUtils.js** (kill 6+ toDate/formatDate dupes) | 1 | 3 | 2 | 🟡 6 |
| 9 | **Delete dead code** (3 components, sw.js, dead exports) | 1 | 2 | 1 | 🟢 4 |
| 10 | **Dynamic import xlsx** in importUtils | 1 | 1 | 1 | 🟢 3 |

### Tier 3 — Planned Refactors (Weeks 3-6)

| # | Issue | Risk | Velocity | Effort | Score |
|---|-------|------|----------|--------|-------|
| 11 | **Split useAppData god-hook** into domain contexts | 2 | 5 | 4 | 🟡 11 |
| 12 | **Split BacklogTreeView** (1284→~400 lines) | 1 | 4 | 3 | 🟡 8 |
| 13 | **Split Dashboard** into card sub-components | 1 | 3 | 2 | 🟡 6 |
| 14 | **Split PlanningBoard** (eliminate mobile/desktop dupe) | 1 | 3 | 3 | 🟡 7 |
| 15 | **Consolidate costService + budgetService** | 2 | 2 | 3 | 🟡 7 |
| 16 | **Add input validation to services** | 2 | 2 | 3 | 🟡 7 |
| 17 | **Code-split admin routes** | 1 | 1 | 2 | 🟢 4 |
| 18 | **Split AdminPanel + SettingsPage** (DRY merge) | 1 | 2 | 3 | 🟢 6 |

---

## 6. Three-Phase Refactoring Plan

### Phase 1: Security Hardening (Week 1) 🔴

**Goal:** Eliminate all CRITICAL security vulnerabilities. Zero new features.

| Task | Files Touched | Time Est |
|------|--------------|----------|
| Add `SYNC_API_SECRET` or Firebase token auth to 9 open endpoints | 9 files in `api/` | 3-4 hours |
| Fix Firestore rules — restrict self-write of `role`/`farmId` fields | `firestore.rules` | 30 min |
| Fix webhook handlers — fail closed on missing secret | `easyRoutesWebhook.js`, `shopifyOrderWebhook.js` | 30 min |
| Delete or rewrite `shopify-callback.js` | 1 file | 30 min |
| Remove `shopify-debug.js` from production (or add auth) | 1 file | 15 min |
| Fix `shopifySync.js` — add auth + remove wildcard CORS | 1 file | 30 min |
| Fix `shopifyCustomerService.js` batch reuse bug | 1 file | 30 min |
| Test all endpoints manually | — | 2-3 hours |

**Deliverable:** All API endpoints require authentication. No privilege escalation possible. Webhooks reject unsigned requests.

---

### Phase 2: Performance & Cleanup (Weeks 2-3) 🟡

**Goal:** Eliminate unnecessary re-renders, delete dead code, reduce bundle size.

#### Week 2: Quick Performance Wins

| Task | Files Touched | Time Est |
|------|--------------|----------|
| Add `useMemo` to 7 hooks with unstable derived arrays | 7 hook files | 1-2 hours |
| Add `useMemo` to 3 context provider values | 3 context files | 30 min |
| Extract `src/utils/dateUtils.js` — shared `toDate()` + `formatDate()` | New file + 6-8 consumer updates | 2 hours |
| Delete dead code: `LoginScreen.jsx`, `OwnerLegend.jsx`, `PWAInstallPrompt.jsx`, `sw.js`, `styles/` | 5 deletions | 15 min |
| Remove dead exports from 6+ files | 6 files | 30 min |
| Dynamic `import('xlsx')` in importUtils.js | 1 file | 30 min |
| Lazy-load `chefAppTasks.js` + `devSprintPlan.js` in seedService | 1 file | 30 min |
| Move `useShopifyCustomers`/`useShopifyOrders` Firestore calls into service layer | 2 hooks + 2 services | 1 hour |

#### Week 3: Component Splits (Largest First)

| Task | Before → After | Time Est |
|------|----------------|----------|
| Split Dashboard.jsx into 8 card components in `components/dashboard/` | 737 → ~150 lines | 3 hours |
| Split AdminPanel.jsx — extract tabs to `components/admin/` | 621 → ~60 lines | 2 hours |
| Merge SettingsPage overlaps with AdminPanel shared components | 491 → ~120 lines | 2 hours |
| Extract BatchEditPanel from BacklogTreeView | 1284 → ~1140 lines | 1 hour |
| Wrap `TaskRow` in BacklogTreeView with `React.memo` | Same file | 30 min |

**Deliverable:** All hooks return stable references. Bundle ~1MB lighter. 3 dead components gone. No duplicate `toDate()` implementations. Largest components broken into maintainable pieces.

---

### Phase 3: Architecture Refactors (Weeks 4-6) 🟢

**Goal:** Restructure the data flow layer and eliminate the god-hook pattern.

#### Week 4: Split useAppData into Domain Contexts

| Task | Details | Time Est |
|------|---------|----------|
| Create `TasksContext` | Wraps `useTasks` + `useSprints` data. Subscribe at app root, consume in TaskCard, PlanningBoard, BacklogTreeView, KanbanBoard | 3 hours |
| Create `OrdersContext` | Wraps `useOrders` + `useShopifyOrders` + order-related handlers | 3 hours |
| Create `ProductionContext` | Wraps `useBatches` + `useCropProfiles` + `useInventory` | 2 hours |
| Create `FinanceContext` | Wraps `useBudget` + `useCosts` + revenue data | 2 hours |
| Slim down `useAppData` to just aggregate the contexts + vendorSub + misc | 2 hours |
| Update AppRoutes to provide contexts instead of prop-drilling | 3 hours |

**Key benefit:** A task drag only re-renders `TasksContext` consumers (Kanban, Planning Board), NOT Dashboard, Orders, Batches, etc.

#### Week 5: Component Architecture

| Task | Details | Time Est |
|------|---------|----------|
| Split BacklogTreeView (1284 lines) — extract `StatsHeader`, `KeyboardOverlay`, `FilterBarConfig` | → ~400 lines | 4 hours |
| Split PlanningBoard — shared `SprintColumn`, extract `useScrollSnap` hook | → ~250 lines. Eliminates mobile/desktop duplication | 4 hours |
| Split OrderFulfillmentBoard — `KanbanColumn`, `OrderBoardFilters` to`orders/` | → ~300 lines | 3 hours |
| Split SowingCalculator — extract calculation engine to utils | → ~350 lines | 2 hours |

#### Week 6: Service Layer Cleanup

| Task | Details | Time Est |
|------|---------|----------|
| Consolidate `costService` + `budgetService.expenses` | Merge into one financial service, one Firestore collection | 3 hours |
| Consolidate `customerService` + `shopifyCustomerService` | Single customer service with source-tagging | 3 hours |
| Add basic input validation to top 5 most-written services | `batchService`, `taskService`, `orderService`, `activityService`, `budgetService` | 4 hours |
| Standardize collection ref naming across all services | Pick `col()`/`dref()` pattern, apply to all 27 services | 2 hours |
| Move `cropProfileService` seed data to `data/defaultCropProfiles.js` | 1 file split | 30 min |

**Deliverable:** Component tree only re-renders what changed. No component over 400 lines. Service layer consistent and validated. Cost/customer confusion eliminated.

---

## Appendix A: Complete Dead Code Inventory

### Files to Delete
```
src/sw.js                              (96 lines)
src/styles/                            (empty directory)
src/components/LoginScreen.jsx         (57 lines)
src/components/OwnerLegend.jsx         (24 lines)
src/components/PWAInstallPrompt.jsx    (73 lines, or keep for future PWA)
current-src-backup/                    (~2,000+ lines)
```

### Exports to Remove
```
farmService.js          → createFarm(), checkInviteForEmail()
importService.js        → importCustomers()
notificationTriggers.js → getOutForDeliveryNotification()
notificationService.js  → getUserFCMTokens()
orderService.js         → ORDER_STATUSES
pipelineUtils.js        → getActualAverages()
sprintUtils.js          → getCurrentSprint() (keep getNextWednesday & formatDate for internal use)
constants.js            → DATA_VERSION
planTiers.js            → hasFeature(), checkLimit() (placeholder for billing)
importConfigs.js        → ALL_IMPORT_CONFIGS
```

---

## Appendix B: Subscription Cleanup Report ✅

**All 16 Firestore-subscribing hooks properly clean up.** Every hook returns an `unsubscribe()` function and clears retry timers. No leaked subscriptions found. This is one of the strongest patterns in the codebase.

---

## Appendix C: Firebase Init Pattern ✅

All 4 Firebase modules (`app.js`, `auth.js`, `firestore.js`, `messaging.js`) use a consistent lazy-singleton pattern:
```js
let _instance;
export function getXxx() {
  if (!_instance) _instance = createXxx(getFirebaseApp());
  return _instance;
}
```
This is clean and correct. No action needed.

---

## Appendix D: Bundle Chunk Map

```
Chunk                    Raw Size    Gzipped
charts (Recharts+D3)     379 KB      111 KB
importService (xlsx)     370 KB      126 KB   ← lazy-load candidate
firebase-vendor          360 KB      112 KB
react-vendor             235 KB       75 KB
index (main app)         198 KB       54 KB
framer-motion            123 KB       40 KB
Dashboard                119 KB       35 KB
PlanningBoard             64 KB       15 KB
useDragAndDrop            50 KB       17 KB
```

**Total gzipped main bundle: ~478 KB** (excluding deferred chunks like charts, import, framer-motion).

---

## Appendix E: API Authentication Matrix

| Endpoint | Method | Auth | Recommendation |
|----------|--------|------|---------------|
| `/api/create-checkout` | POST | ❌ None | Add Firebase token |
| `/api/easyRoutesWebhook` | POST | ⚠️ HMAC (fails open) | Fail closed |
| `/api/migrate-order-statuses` | GET/POST | ❌ None | Add SYNC_API_SECRET |
| `/api/sendNotification` | POST | ❌ None | Add Firebase token |
| `/api/shopify-callback` | GET | ❌ None | Delete or secure |
| `/api/shopify-debug` | GET | ❌ None | Delete from prod |
| `/api/shopify-sync-customers` | GET | ✅ Secret/Token | OK |
| `/api/shopify-sync-orders` | GET | ✅ Secret/Token | OK |
| `/api/shopify-sync-products` | GET | ✅ Secret/Token | OK |
| `/api/shopifyOrderWebhook` | POST | ⚠️ HMAC (fails open) | Fail closed |
| `/api/shopifySync` | GET | ❌ None + CORS `*` | Add auth, remove CORS |
| `/api/stripe-webhook` | POST | ✅ Stripe sig | OK |
| `/api/learning-engine/backfill` | GET | ❌ None | Add SYNC_API_SECRET |
| `/api/learning-engine/dismiss-alert` | POST | ❌ None | Add Firebase token |
| `/api/learning-engine/nightly-stats` | GET | ❌ None | Add cron secret |
| `/api/learning-engine/on-harvest-create` | POST | ❌ None | Add internal secret |
| `/api/learning-engine/on-order-create` | POST | ❌ None | Add internal secret |
