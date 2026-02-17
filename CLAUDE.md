# Mico's Workspace — All-in-One Farm Management + B2B Ordering Platform

## Vision
Mico's Workspace is a unified platform that replaces texting, spreadsheets, and fragmented tools with one sleek app. It serves three audiences: the internal farm team (operations, production, finance), restaurant chefs (ordering), and delivery drivers (routing). The long-term goal is to sell this as a white-label SaaS product to other small farms.

## Design Philosophy
**"Simplicity is king."** Every screen should feel like a $2M app but be usable by someone with wet hands in a dark kitchen. Minimal clicks, large touch targets, smart defaults, dark mode option, smooth animations. Hide complexity behind simple interfaces. If a feature makes the UI harder to use, it doesn't ship.

## Owner
Trey — Owner/Operator of Micos Micro Farm, Boise Idaho area. Non-developer building with Claude as primary engineer. Moves extremely fast. Has a code engineer friend consulting.

## Tech Stack
- **Frontend:** React 18 with Vite (JavaScript, NOT TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui components for premium feel
- **Database:** Cloud Firestore (multi-tenant: farms/{farmId}/...)
- **Auth:** Firebase Auth (Google sign-in)
- **Hosting:** Netlify (auto-deploy from GitHub push)
- **Routing:** React Router v6
- **State:** useState/useEffect + custom hooks
- **Future:** Capacitor for native mobile wrapper when needed

## Project Structure
```
src/
├── main.jsx
├── App.jsx                    ← Auth guard + Router
├── firebase.js                ← Config from .env
├── index.css                  ← Tailwind import
│
├── components/
│   ├── Layout.jsx             ← Nav, header, snarky comments, user menu
│   ├── LoginScreen.jsx        ← Google sign-in
│   ├── Dashboard.jsx          ← Home overview with module cards
│   │
│   ├── # INTERNAL OPS (Team View)
│   ├── KanbanBoard.jsx        ← Sprint task board
│   ├── PlanningBoard.jsx      ← Backlog + sprint planning
│   ├── CalendarView.jsx       ← Monthly calendar
│   ├── VendorsView.jsx        ← Vendor contacts
│   ├── InventoryManager.jsx   ← Seed/supply inventory + par levels
│   ├── BudgetTracker.jsx      ← Expenses, revenue, CapEx projects
│   ├── ProductionTracker.jsx  ← Living inventory: sow→grow→harvest
│   │
│   ├── # CHEF-FACING (Customer View)
│   ├── ChefCatalog.jsx        ← Product browse + pricing
│   ├── ChefCart.jsx            ← Shopping cart
│   ├── ChefOrders.jsx         ← Order history + reorder
│   ├── ChefAccount.jsx        ← Profile, delivery address, preferences
│   │
│   ├── # ORDER FULFILLMENT (Team View)
│   ├── OrderManager.jsx       ← Incoming orders dashboard
│   ├── HarvestQueue.jsx       ← What to cut/harvest today based on orders
│   ├── PackingList.jsx        ← What goes in each delivery
│   │
│   ├── # DELIVERY (Driver View)
│   ├── DeliveryRoute.jsx      ← Today's stops + Google Maps link
│   ├── DeliveryConfirm.jsx    ← Photo proof of delivery
│   │
│   ├── # PRODUCTION (Harvest Team View)
│   ├── SowingDashboard.jsx    ← What to plant today (schedule)
│   ├── BatchLogger.jsx        ← Log plantings: dropdown crop + quantity
│   ├── GrowthTracker.jsx      ← What stage each batch is in
│   ├── HarvestLogger.jsx      ← Mark batches harvested → updates inventory
│   │
│   ├── # SHARED
│   ├── TaskCard.jsx
│   ├── PlanningTaskCard.jsx
│   ├── SprintHeader.jsx
│   ├── OwnerLegend.jsx
│   └── modals/
│       ├── TaskModal.jsx
│       ├── VendorModal.jsx
│       ├── SprintModal.jsx
│       ├── ProductModal.jsx
│       ├── BatchModal.jsx
│       └── ExpenseModal.jsx
│
├── services/
│   ├── taskService.js
│   ├── sprintService.js
│   ├── vendorService.js
│   ├── productService.js      ← Catalog CRUD
│   ├── orderService.js        ← Chef order CRUD
│   ├── batchService.js        ← Production batch CRUD
│   ├── inventoryService.js    ← Seed/supply tracking
│   ├── deliveryService.js     ← Delivery management
│   ├── budgetService.js       ← Expenses + revenue
│   └── customerService.js     ← Chef accounts
│
├── hooks/
│   ├── useAuth.js
│   ├── useTasks.js
│   ├── useSprints.js
│   ├── useProducts.js
│   ├── useOrders.js
│   ├── useBatches.js
│   ├── useInventory.js
│   └── useBudget.js
│
├── utils/
│   ├── sprintUtils.js
│   ├── harvestUtils.js        ← Growth stage calculations
│   ├── atpUtils.js            ← Available-to-Promise logic
│   └── routeUtils.js          ← Google Maps URL builder
│
└── data/
    ├── constants.js
    ├── cropConfig.js           ← Crop types, growth days, stages
    ├── initialTasks.js
    ├── initialSprints.js
    └── vendors.js
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
├── customers/{customerId}         ← Chef/restaurant accounts
│   { name, restaurant, email, phone, address, priceListId, preferences }
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
│   { date, crop, quantity, reason(demand/restocking), status }
└── config                         ← Farm settings
    { name, logo, timezone, cutoffTime, deliveryDays, units }
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
- `git add . && git commit -m "message" && git push origin main` — Deploy

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
