# Mico's Micro Farm Workspace — All-in-One Farm Management + B2B Ordering Platform

## Vision
Mico's Micro Farm Workspace is a unified platform that replaces texting, spreadsheets, and fragmented tools with one sleek app. It serves three audiences: the internal farm team (operations, production, finance), restaurant chefs (ordering), and delivery drivers (routing). The long-term goal is to sell this as a white-label SaaS product to other small farms.

## Design Philosophy
**"Simplicity is king."** Every screen should feel like a $2M app but be usable by someone with wet hands in a dark kitchen. Minimal clicks, large touch targets, smart defaults, dark mode option, smooth animations. Hide complexity behind simple interfaces. If a feature makes the UI harder to use, it doesn't ship.

**All tasks must be completable within one sprint (one week). If a task is too large, break it into smaller tasks.**

## Owner
Trey — Owner/Operator of Micos Micro Farm, Boise Idaho area. Non-developer building with Claude as primary engineer. Moves extremely fast. Has a code engineer friend consulting.

## Tech Stack
- **Frontend:** React 19 with Vite 7 (JavaScript, NOT TypeScript)
- **Styling:** Tailwind CSS v4 (utility classes only, no separate CSS files)
- **Database:** Cloud Firestore (multi-tenant: farms/{farmId}/...)
- **Auth:** Firebase Auth (Google sign-in)
- **Hosting:** Vercel (auto-deploy from GitHub push to `main` branch)
- **API:** Vercel Serverless Functions (api/ directory)
- **Routing:** React Router v6
- **State:** useState/useEffect + custom hooks + React Context
- **Integrations:** Shopify Admin API, Stripe, EasyRoutes, FCM push notifications
- **Future:** Capacitor for native mobile wrapper when needed

## Project Structure
```
src/
├── main.jsx                         ← App entry point
├── App.jsx                          ← Auth guard + Router
├── index.css                        ← Tailwind import
│
├── firebase/
│   ├── app.js                       ← Firebase app init (lazy singleton)
│   ├── auth.js                      ← Firebase Auth instance
│   ├── firestore.js                 ← Firestore instance
│   ├── index.js                     ← Barrel export
│   └── messaging.js                 ← FCM push notifications
│
├── contexts/
│   ├── AlertContext.jsx             ← Learning engine alerts
│   ├── DemoModeContext.jsx          ← Demo/sandbox mode
│   ├── FarmConfigContext.jsx        ← Farm-level settings
│   ├── ThemeContext.jsx             ← Dark/light theme
│   └── ToastContext.jsx             ← Toast notifications
│
├── components/                      ← 79 components total
│   ├── AppRoutes.jsx                ← Route definitions
│   ├── Layout.jsx                   ← Nav, header, user menu
│   ├── Dashboard.jsx                ← Home overview
│   ├── LandingPage.jsx             ← Public landing / login
│   ├── KanbanBoard.jsx             ← Sprint task board
│   ├── PlanningBoard.jsx           ← Backlog + sprint planning
│   ├── OrderManager.jsx            ← Incoming orders
│   ├── CustomerManager.jsx         ← Chef/restaurant accounts
│   ├── BatchLogger.jsx             ← Log plantings
│   ├── GrowthTracker.jsx           ← Batch lifecycle stages
│   ├── HarvestQueue.jsx            ← What to cut today
│   ├── ChefCatalog.jsx             ← Product browse + pricing
│   ├── ChefCart.jsx                 ← Shopping cart
│   ├── DeliveryTracker.jsx         ← Delivery runs + status
│   ├── AdminPanel.jsx              ← Admin controls
│   ├── SmartImport.jsx             ← CSV/Excel data import
│   ├── modals/                      ← 8 modal dialogs
│   ├── orders/                      ← OrderFulfillmentBoard, OrderDetailPanel
│   ├── business/                    ← Reports, CostTracking, Analytics
│   ├── Alerts/                      ← AlertsBadge, AlertsList
│   ├── admin/                       ← ShopifySync
│   └── ui/                          ← Reusable UI primitives
│
├── services/                        ← 30 service files (ALL Firestore ops here)
│   ├── taskService.js               ← Task CRUD
│   ├── orderService.js              ← Order CRUD + Shopify orders
│   ├── batchService.js              ← Production batch CRUD
│   ├── customerService.js           ← Customer CRUD
│   ├── productService.js            ← Catalog CRUD
│   ├── deliveryService.js           ← Delivery management
│   ├── budgetService.js             ← Expenses + revenue
│   ├── inventoryService.js          ← Seed/supply tracking
│   ├── farmService.js               ← Farm config CRUD
│   ├── harvestPlanningService.js    ← Harvest plan generation
│   ├── shopifyCustomerService.js    ← Shopify customer sync
│   ├── cropProfileService.js        ← Crop profile CRUD
│   ├── costService.js               ← COGS calculations
│   ├── notificationService.js       ← FCM push dispatch
│   └── learningEngine/              ← ML stats constants + field maps
│
├── hooks/                           ← 25 custom hooks
│   ├── useAuth.js                   ← Firebase Auth state
│   ├── useAppData.js                ← Top-level data aggregator (16+ subs)
│   ├── useAppHandlers.js            ← Shared event handler factory
│   ├── useTasks.js, useSprints.js, useBatches.js, useProducts.js,
│   │   useOrders.js, useCustomers.js, useBudget.js, useInventory.js,
│   │   useDeliveries.js, useTeam.js, useCropProfiles.js, useCosts.js,
│   │   useReports.js                ← Per-domain Firestore subscriptions
│   ├── useShopifyCustomers.js       ← Shopify customer data
│   ├── useShopifyOrders.js          ← Shopify order data
│   ├── useLearningEngine.js         ← ML stats + alerts
│   └── useDragAndDrop.js            ← DnD state management
│
├── utils/
│   ├── importUtils.js               ← CSV/Excel parsing (xlsx lazy-loaded)
│   ├── sprintUtils.js               ← Sprint date/velocity helpers
│   ├── pipelineUtils.js             ← Production pipeline calcs
│   ├── sowingUtils.js               ← Sowing schedule calcs
│   └── demandUtils.js               ← Demand forecasting
│
└── data/
    ├── constants.js                 ← App-wide constants
    ├── cropConfig.js                ← Crop types, growth days, stages
    ├── planTiers.js                 ← SaaS pricing tiers
    ├── demoData.js                  ← Demo mode sample data
    └── epicFeatureHierarchy.js      ← Epic/feature/task hierarchy

api/                                 ← Vercel Serverless Functions
├── create-checkout.js               ← Stripe checkout session
├── shopify-sync-customers.js        ← Shopify customer sync
├── shopify-sync-orders.js           ← Shopify order sync
├── shopify-sync-products.js         ← Shopify product sync
├── shopifyOrderWebhook.js           ← Shopify order webhook
├── easyRoutesWebhook.js             ← EasyRoutes delivery webhook
├── stripe-webhook.js                ← Stripe event webhook
├── sendNotification.js              ← FCM push sender
├── _lib/
│   ├── authGuard.js                 ← API auth (Firebase token / secrets)
│   ├── firebaseAdmin.js             ← Firebase Admin SDK init
│   └── shopifyFirestoreSync.js      ← Shopify↔Firestore sync logic
└── learning-engine/
    ├── nightly-stats.js             ← Nightly stat aggregation (Vercel cron)
    ├── backfill.js                  ← Backfill historical stats
    ├── on-order-create.js           ← Post-order alert trigger
    ├── on-harvest-create.js         ← Post-harvest alert trigger
    └── dismiss-alert.js             ← Dismiss alert endpoint
```

## Firestore Data Structure
```
farms/{farmId}/
├── tasks/{taskId}
├── sprints/{sprintId}
├── vendors/{vendorId}
├── products/{productId}           ← Catalog items
│   { name, category, unit, pricePerUnit, available, description, image }
├── orders/{orderId}               ← Chef orders
│   { customerId, items[], status, requestedDelivery, total, createdAt }
├── customers/{customerId}         ← Legacy customers (migrated to shopifyCustomers)
├── shopifyCustomers/{customerId}  ← Source-of-truth customer collection
│   { name, email, phone, restaurant, deliveryZone, pricingTier, totalSpent }
├── shopifyOrders/{orderId}        ← Synced from Shopify
├── batches/{batchId}              ← Living inventory (production)
│   { cropId, variety, quantity, unit(tray/rack), sowDate, stage,
│     estimatedHarvestStart, estimatedHarvestEnd, harvestedAt, harvestYield }
├── inventory/{itemId}             ← Consumables (seeds, soil, packaging)
│   { name, category, currentQty, unit, parLevel, supplier, costPerUnit }
├── expenses/{expenseId}           ← Financial tracking
│   { category, description, amount, date, batchId?, projectId? }
├── revenue/{revenueId}            ← Auto-created from fulfilled orders
│   { orderId, customerId, amount, date }
├── infrastructure/{projectId}     ← Expansion CapEx
│   { name, budget, spent, status, items[], notes }
├── deliveries/{deliveryId}        ← Delivery runs
│   { driverId, date, stops[], status, routeUrl }
├── sowingSchedule/{scheduleId}    ← What to plant when
├── crewTasks/{taskId}             ← Daily crew assignments
├── cropProfiles/{profileId}       ← Crop variety configurations
├── costs/{costId}                 ← COGS tracking
├── activities/{activityId}        ← Activity log / audit trail
├── alerts/{alertId}               ← Learning engine alerts
├── stats/{statId}                 ← Learning engine aggregated stats
│   Prefixes: ccs_ (customer-crop), yp_ (yield profile), dashboard
├── userPrefs/{userId}             ← Per-user preferences (theme, etc.)
├── invites/{inviteId}             ← Team invitations
├── meta/config                    ← Farm settings
│   { name, logo, timezone, cutoffTime, deliveryDays, units, approvedEmails }
└── meta/naming                    ← Epic/feature naming overrides
```

## Role-Based Access Control (RBAC)
```
admin    → Full access to everything (Trey)
manager  → All internal views, no billing/settings
employee → Production views only (BatchLogger, SowingDashboard, HarvestLogger)
driver   → Delivery views only (DeliveryRoute, DeliveryConfirm)
chef     → Customer views only (Catalog, Cart, Orders, Account)
```
Implemented via Firebase custom claims. Each role sees only their nav items.

## Crop Configuration (data/cropConfig.js)
```javascript
{
  microgreens: {
    varieties: [
      { id: 'broccoli', name: 'Broccoli', growDays: 10, harvestWindow: 3 },
      { id: 'radish', name: 'Radish', growDays: 8, harvestWindow: 2 },
      { id: 'sunflower', name: 'Sunflower', growDays: 12, harvestWindow: 3 },
      { id: 'pea', name: 'Pea Shoots', growDays: 10, harvestWindow: 3 },
      // ... more varieties
    ],
    stages: ['germination', 'blackout', 'light', 'ready', 'harvested']
  },
  leafyGreens: {
    varieties: [
      { id: 'baby-kale', name: 'Baby Kale', growDays: 30, harvestWindow: 5 },
      { id: 'romaine', name: 'Romaine', growDays: 35, harvestWindow: 5 },
      // ...
    ],
    stages: ['seedling', 'transplant', 'growing', 'ready', 'harvested']
  },
  mushrooms: {
    varieties: [
      { id: 'oyster', name: 'Oyster', growDays: 21, flushes: 3 },
      { id: 'lions-mane', name: "Lion's Mane", growDays: 28, flushes: 2 },
    ],
    stages: ['inoculation', 'incubation', 'pinning', 'fruiting', 'harvested']
  }
}
```

## Key Business Logic

### Available to Promise (ATP)
When a chef views the catalog, show not just current inventory but what WILL be available by their delivery date. Query batches where estimatedHarvestStart <= deliveryDate AND stage != 'harvested'.

### Sowing Schedule
Work backward from demand: if order trends show 50 trays of broccoli/week, and broccoli takes 10 days to grow, always have 50+ trays at day 7+ in the pipeline. Alert when pipeline falls below demand.

### Order → Harvest → Delivery Flow
1. Chef places order (cutoff: day before, configurable)
2. Order appears in OrderManager
3. System generates HarvestQueue (what to cut today)
4. Harvest team marks items as harvested
5. PackingList generated per delivery stop
6. Driver gets optimized route (Google Maps multi-stop URL)
7. Driver confirms delivery (photo)
8. Invoice auto-generated, revenue logged

### Substitution Handling
Each chef sets preferences per product: "If OOS → substitute with X / text me / remove from order". No more phone tag.

## Commands
- `npm run dev` — localhost:5173
- `npm run build` — Production build to /dist
- `git add . && git commit -m "message" && git push origin master && git push origin master:main` — Deploy (Vercel watches `main`)

## Code Conventions
- Functional components ONLY
- ALL Firestore operations through services/, NEVER in components
- Components under 200 lines
- App.jsx under 100 lines
- Tailwind utility classes, NO separate CSS files
- Every Firestore doc includes farmId path
- Dark mode support on all new components
- Mobile-first design (375px minimum)
- Large touch targets (min 44x44px) for kitchen use
- All onSnapshot listeners must have error callbacks
- All getDocs queries must have limit() to prevent unbounded reads
- All async service functions must have try/catch
- All mutation callbacks in hooks wrapped in useCallback
- All derived data in hooks wrapped in useMemo
- Context provider values wrapped in useMemo
- xlsx imported dynamically (only loaded when user uploads Excel)
- console.log only in DEV mode; use console.error/warn for production logging

## Security
- All API endpoints protected via authGuard.js (Firebase token or SYNC_API_SECRET)
- Webhooks verify HMAC signatures (fail closed when secret missing)
- Vercel cron authenticates via CRON_SECRET env var
- Firestore rules enforce RBAC with noPrivilegeEscalation()
- No secrets in client-side code; all in Vercel env vars

## Reference Documents
- docs/FILE_MANAGEMENT_STRATEGY.md — File management strategy
- CODE_REFACTOR_PLAN.md — Comprehensive audit and refactoring roadmap
