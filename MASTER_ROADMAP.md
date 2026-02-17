# Mico's Workspace — Master Roadmap

## The Build Sequence
Every phase delivers a working feature. Nothing is theoretical. Ship, test, iterate.

---

## PHASE A: Lock the Foundation (Day 1-2)
**Goal:** Internal workspace fully functional and deployed.

### Tasks
1. Fix Firestore seed button — get all 50 tasks + 4 sprints + 3 vendors into the database
2. Verify every existing feature works: Kanban, Planning Board, Calendar, Vendors
3. Add Dashboard link to nav bar
4. Deploy to Netlify (connect GitHub repo, auto-deploy on push)
5. Set environment variables in Netlify dashboard
6. Test on phone (375px width)
7. Share link with Halie and Ricardo — confirm they can sign in and see tasks

### Done when
- App is live at a real URL
- All 3 team members can log in and manage tasks
- Works on desktop and mobile

---

## PHASE B: Production Tracking + Living Inventory (Day 3-5)
**Goal:** Team can log what they plant and track growth stages.

### New Firestore Collections
- `farms/{farmId}/batches/{batchId}` — production batches
- `farms/{farmId}/config/cropConfig` — crop types and grow parameters

### New Components
- **BatchLogger.jsx** — The money screen for employees
  - Dropdown: select crop variety
  - Dropdown: select quantity (number input OR preset "Full Rack" buttons for bulk)
  - One tap to log. Done.
  - Auto-calculates: estimated harvest window based on crop's growDays
- **GrowthTracker.jsx** — Dashboard showing all active batches
  - Cards grouped by stage: Germination → Blackout → Light → Ready
  - Color-coded progress bars showing days until harvest
  - "Ready to Harvest" section highlighted
- **HarvestLogger.jsx** — Mark batches as harvested
  - Shows "Ready" batches
  - Enter yield (lbs or trays)
  - One tap to mark harvested → updates inventory
- **SowingDashboard.jsx** — What to plant today
  - Shows the sowing schedule
  - Checkboxes for "planted" confirmation
  - Rolls unfinished items to next day

### Services
- `batchService.js` — CRUD for production batches
- `cropConfig` stored in Firestore for easy updates

### Key Logic
- When a batch is logged: auto-set `estimatedHarvestStart` = sowDate + growDays
- When a batch is harvested: auto-update product availability
- Daily view: "X trays in germination, Y trays in light, Z trays ready"

---

## PHASE C: Product Catalog + Chef Ordering (Day 5-9)
**Goal:** Chefs can browse products and place orders through the app instead of texting.

### New Firestore Collections
- `farms/{farmId}/products/{productId}` — what you sell
- `farms/{farmId}/orders/{orderId}` — chef orders
- `farms/{farmId}/customers/{customerId}` — chef accounts

### Admin Side (your workspace)
- **ProductManager.jsx** — Manage your catalog
  - Add/edit products: name, category, price, unit, description
  - Toggle availability on/off
  - Set per-customer pricing (if needed)
- **OrderManager.jsx** — Incoming orders dashboard
  - Real-time feed of new orders
  - Order status: New → Confirmed → Harvesting → Packed → Delivered
  - Click to view order details
  - One-tap confirm or modify
- **HarvestQueue.jsx** — Auto-generated from today's confirmed orders
  - "Cut 5 trays broccoli, 3 trays radish, 2 trays sunflower"
  - Checkboxes as team completes each item
- **PackingList.jsx** — What goes in each delivery
  - Grouped by customer/stop
  - Print-friendly view

### Chef Side (separate clean route: /shop)
- **ChefCatalog.jsx** — Browse available products
  - Clean grid of products with photos, prices, units
  - "Add to Cart" button with quantity selector
  - Shows real-time availability
  - Search and filter by category
- **ChefCart.jsx** — Review and place order
  - Running total
  - Delivery date selector (tomorrow minimum, respects cutoff time)
  - Special instructions / notes field
  - "Place Order" button — one tap, done
  - Order confirmation screen
- **ChefOrders.jsx** — Order history
  - Past orders with status
  - "Reorder" button (copies previous order to cart)
  - This is the killer feature that beats texting
- **ChefAccount.jsx** — Profile
  - Restaurant name, delivery address, contact
  - Substitution preferences per product (sub with X / text me / remove)

### Auth for Chefs
- Chefs sign in with Google (same auth system, different role)
- On first login, admin approves and assigns "chef" role
- Chef role sees ONLY /shop, /cart, /orders, /account routes

### The "15-Second Order" Flow
1. Chef opens app (already signed in)
2. Sees their personalized catalog (favorites at top)
3. Taps quantities on their usual items
4. Hits "Place Order"
5. Done. Under 15 seconds.

---

## PHASE D: Budget + Financial Tracking (Day 9-12)
**Goal:** Real-time view of money in and money out, per-crop profitability.

### New Firestore Collections
- `farms/{farmId}/expenses/{expenseId}`
- `farms/{farmId}/revenue/{revenueId}` (auto-created from fulfilled orders)
- `farms/{farmId}/infrastructure/{projectId}`

### New Components
- **BudgetTracker.jsx** — Financial dashboard
  - Revenue this month (auto from orders)
  - Expenses this month (manual entry + recurring)
  - Net profit
  - Per-crop profitability cards (revenue from basil minus cost to grow basil)
  - Trend sparklines
- **ExpenseLogger.jsx** — Log costs
  - Categories: Seeds, Soil/Media, Labor, Utilities, Packaging, Equipment, Other
  - Link to batch or infrastructure project (optional)
  - Recurring expense support (monthly rent, utilities)
- **InfrastructureTracker.jsx** — Expansion CapEx
  - Track quotes and costs for grow rooms, HVAC, electrical
  - Budget vs actual spend per project
  - Simple ROI calc: project cost / monthly revenue from that capacity

### Auto-Revenue
- When an order status changes to "Delivered", auto-create revenue entry
- Links back to order and customer for reporting

---

## PHASE E: Sowing Schedule + Demand Prediction (Day 12-15)
**Goal:** App tells your team what to plant based on demand trends.

### Logic (No ML needed — simple math)
1. Look at last 4 weeks of orders per crop
2. Calculate average weekly demand
3. Add buffer (configurable, default 20%)
4. Work backward: if broccoli takes 10 days and you need 50 trays/week, you should have ~70 trays entering germination every 7 days
5. Compare to current pipeline (active batches not yet harvested)
6. If pipeline < demand + buffer → generate sowing alert

### New Components
- **SowingSchedule.jsx** — Auto-generated planting recommendations
  - "Plant 30 trays Broccoli today" with reasoning
  - "You have 4 days of Sunflower supply remaining"
  - Confirm button → creates batch entry
- **InventoryAlerts.jsx** — Seed/supply monitoring
  - Par level tracking for consumables
  - "Radish seeds below par — order needed"
  - Optional: one-tap to draft purchase order

---

## PHASE F: Delivery Management (Day 15-18)
**Goal:** Driver gets an optimized route and confirms deliveries.

### New Components
- **DeliveryManager.jsx** (admin) — Create delivery runs
  - Assign packed orders to a delivery date
  - Auto-generate Google Maps multi-stop URL from customer addresses
  - View all stops with order summaries
- **DeliveryRoute.jsx** (driver view) — Today's deliveries
  - Ordered list of stops
  - "Open in Google Maps" button (pre-loaded with all stops in order)
  - Per-stop: customer name, items, special instructions
  - "Mark Delivered" button with optional photo capture
- **DeliveryConfirm.jsx** — Proof of delivery
  - Photo upload
  - Timestamp + GPS (from browser)
  - Auto-triggers: order status → "Delivered", revenue entry created

### Route Optimization (V1 — simple)
- Google Maps Directions API with waypoint optimization
- Pass all delivery addresses as waypoints, Google returns optimal order
- No custom solver needed for 5-15 stops

### Route Optimization (V2 — future, when needed)
- Google OR-Tools for complex constraints (time windows, vehicle capacity)
- Only build this when you have 30+ daily stops

---

## PHASE G: Polish + Premium Feel (Day 18-22)
**Goal:** Make it look and feel like a $2M app.

### Design Upgrades
- Dark mode toggle (default dark for kitchen users)
- Smooth page transitions (React Transition Group or Framer Motion)
- Loading skeletons instead of spinners
- Micro-animations on buttons and cards
- Custom branded login screen with Micos logo
- Consistent color system across all modules
- Empty states with helpful illustrations

### Mobile Optimization
- Bottom navigation bar on mobile (thumb-friendly)
- Swipe gestures for common actions
- Pull-to-refresh on lists
- Full-screen modals on mobile (slide up from bottom)

### Notifications
- In-app notification center
- Email notifications for new orders (Firebase Cloud Functions)
- Optional SMS via Twilio (low cost, pay per message)

---

## PHASE H: Make It Sellable (Day 22-30)
**Goal:** Other farms can sign up and use this.

### Multi-Tenancy (already built into data structure)
- New farm signup flow
- Auto-create farms/{newFarmId}/ collections
- Isolated data per farm (Firestore security rules)

### White-Label
- Per-farm branding (logo, colors, farm name)
- Custom subdomain or path: farmname.micosworkspace.com

### Billing
- Stripe integration for monthly subscriptions
- Tiers: Free (1 user, basic), Pro ($49/mo, 5 users, all features), Business ($149/mo, unlimited)
- Usage tracking for billing purposes

### Onboarding
- Guided setup wizard for new farms
- Pre-loaded crop configurations
- Sample data option (like our seed button)

### Marketing
- Landing page showcasing the product
- Demo mode (browse without signing up)
- Case study: Micos Micro Farm (your own story)

---

## What We Intentionally Defer
These are real features from the Gemini research that we build ONLY when there's demand:
- IoT sensor integration (temperature, humidity, CO2)
- AI-powered demand forecasting (XGBoost/Prophet)
- Biometric login (Google sign-in is fast enough)
- Custom route solver (Google Maps handles it)
- Native mobile apps (PWA or Capacitor wrapper when needed)
- Multi-flush mushroom tracking (build when mushroom production starts)
- ERP integration (QuickBooks/Xero sync when accounting complexity demands it)
- Offline-first with local DB (Firebase already has offline persistence)

---

## Cost Structure
| Item | Cost | Notes |
|------|------|-------|
| Firebase | Free | Spark plan covers early usage |
| Netlify | Free | Starter plan, auto-deploy |
| GitHub | Free | Public or private repos |
| Claude Pro | $20/mo | Your dev team |
| Domain | ~$12/yr | micosworkspace.com |
| Google Maps API | Free tier | $200/mo credit covers ~40K requests |
| Stripe | 2.9% + $0.30 | Per transaction, only when billing |
| **Total** | **~$22/mo** | Until you have paying customers |
