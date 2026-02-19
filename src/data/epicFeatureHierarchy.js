// ============================================================
// MICO'S WORKSPACE — EPIC / FEATURE / TASK HIERARCHY
// ============================================================
//
// AGILE HIERARCHY:
//   Epic    → Large strategic goal (takes multiple sprints)
//   Feature → Deliverable capability within an epic (takes 1-2 sprints)
//   Task    → Individual work item (takes hours to days)
//
// FILTERING:
//   In the Planning board, users can filter by:
//   - Epic (dropdown: all epics)
//   - Feature (dropdown: features within selected epic)
//   - Owner (existing filter)
//   - Priority (existing filter)
//
// DATA MODEL CHANGES:
//   Each task gets two new fields:
//     epicId: "E1"        (references an epic)
//     featureId: "E1-F1"  (references a feature within that epic)
//
// ============================================================

export const epics = [
  {
    id: "E1",
    name: "Facility & Infrastructure",
    description: "Warehouse assessment, electrical upgrades, HVAC, zone planning — physical foundation for all operations",
    color: "#EF4444", // red
  },
  {
    id: "E2",
    name: "Vendor & Partner Management",
    description: "Harvest Today, GreenDuct, Aubergine, OneSeason — all vendor relationships and equipment sourcing",
    color: "#F59E0B", // amber
  },
  {
    id: "E3",
    name: "Financial Modeling & Budget",
    description: "Break-even analysis, revenue projections, COGS, expansion CapEx, and in-app budget tracking",
    color: "#10B981", // emerald
  },
  {
    id: "E4",
    name: "Marketing & Brand",
    description: "Social media, content creation, brand identity, chef collaborations, sales outreach",
    color: "#8B5CF6", // violet
  },
  {
    id: "E5",
    name: "Production Operations",
    description: "Current microgreens production — inventory, metrics, LED research, seed suppliers, scaling",
    color: "#06B6D4", // cyan
  },
  {
    id: "E6",
    name: "App Platform & Foundation",
    description: "Core app architecture — auth, deployment, database, navigation, seed data, PWA",
    color: "#6366F1", // indigo
  },
  {
    id: "E7",
    name: "Production Tracking System",
    description: "Living inventory — batch logging, growth stages, harvest tracking, sowing schedule, demand predictions",
    color: "#22C55E", // green
  },
  {
    id: "E8",
    name: "Chef Ordering System",
    description: "B2B ordering — product catalog, chef accounts, cart, orders, reordering, substitutions",
    color: "#3B82F6", // blue
  },
  {
    id: "E9",
    name: "Order Fulfillment",
    description: "Harvest queue, packing lists, order status management — connecting orders to production",
    color: "#EC4899", // pink
  },
  {
    id: "E10",
    name: "Delivery Management",
    description: "Route optimization, driver view, proof of delivery, delivery-triggered revenue logging",
    color: "#F97316", // orange
  },
  {
    id: "E11",
    name: "App Polish & UX",
    description: "Dark mode, animations, PWA, mobile optimization, loading states, branded login — premium feel",
    color: "#A855F7", // purple
  },
  {
    id: "E12",
    name: "Product Launch & Sales",
    description: "Multi-tenancy, white-label, Stripe billing, onboarding wizard, landing page, demo mode",
    color: "#14B8A6", // teal
  },

  // ── Chef App Epics (E20–E27) ──
  {
    id: "E20",
    name: "Chef App — Auth & Onboarding",
    description: "Separate PWA for chefs: project scaffold, Firebase auth, Shopify client, routing, PWA shell",
    color: "#4F46E5", // indigo
  },
  {
    id: "E21",
    name: "Chef App — Product Catalog",
    description: "Shopify Storefront API integration, product browsing, category tabs, detail popups",
    color: "#059669", // emerald
  },
  {
    id: "E22",
    name: "Chef App — Cart & Ordering",
    description: "Cart with localStorage persistence, delivery date picker, Shopify checkout, Firestore order creation",
    color: "#D97706", // amber
  },
  {
    id: "E23",
    name: "Chef App — Order Management",
    description: "Order history, live status tracking, quick reorder — the killer feature that replaces texting",
    color: "#7C3AED", // violet
  },
  {
    id: "E24",
    name: "Chef App — Delivery & Fulfillment",
    description: "Real-time order status updates, delivery countdown, push notifications, order reminders",
    color: "#DC2626", // red
  },
  {
    id: "E25",
    name: "Chef App — Account & Preferences",
    description: "Chef profile display, substitution preferences, notification settings",
    color: "#0891B2", // cyan
  },
  {
    id: "E26",
    name: "Chef App — Admin Integration",
    description: "Shopify sync webhooks, Firestore security rules, admin tools in Workspace app, harvest queue, packing lists",
    color: "#BE185D", // pink
  },
  {
    id: "E27",
    name: "Chef App — Polish & Launch",
    description: "Dark/light mode, loading skeletons, empty states, toasts, offline banner, mobile optimization, rollout",
    color: "#6366F1", // indigo
  },
];

export const features = [
  // ── E1: Facility & Infrastructure ──
  { id: "E1-F1", epicId: "E1", name: "Warehouse Assessment", description: "Document current facility — layout, electrical, HVAC, utilities" },
  { id: "E1-F2", epicId: "E1", name: "Electrical Upgrade", description: "Utility contact, capacity assessment, upgrade initiation" },
  { id: "E1-F3", epicId: "E1", name: "Zone Planning", description: "Warehouse zone map — grow, germination, packing, cold storage, mechanical" },
  { id: "E1-F4", epicId: "E1", name: "HVAC & Airflow", description: "Fabric ducting vendor selection, RFP, installation planning" },

  // ── E2: Vendor & Partner Management ──
  { id: "E2-F1", epicId: "E2", name: "Harvest Today Evaluation", description: "Specs, pricing, lead times for vertical wall grow systems" },
  { id: "E2-F2", epicId: "E2", name: "Alternative Vendor Research", description: "Compare 5+ vertical rack vendors beyond Harvest Today" },
  { id: "E2-F3", epicId: "E2", name: "Aubergine Partnership", description: "Meeting prep, volume validation, pricing negotiation, supply agreement" },
  { id: "E2-F4", epicId: "E2", name: "Fabric Ducting Vendors", description: "GreenDuct, DuctSox, Prihoda — consultations, RFP, selection" },

  // ── E3: Financial Modeling & Budget ──
  { id: "E3-F1", epicId: "E3", name: "Revenue Modeling", description: "Harvest Today financial model, Aubergine revenue projections" },
  { id: "E3-F2", epicId: "E3", name: "Break-Even Analysis", description: "Master break-even model — conservative, moderate, aggressive scenarios" },
  { id: "E3-F3", epicId: "E3", name: "In-App Budget Tracker", description: "Expense logging, revenue tracking, per-crop profitability, infrastructure CapEx" },
  { id: "E3-F4", epicId: "E3", name: "Expansion Financial Planning", description: "90-day master timeline, go/no-go financial models" },

  // ── E4: Marketing & Brand ──
  { id: "E4-F1", epicId: "E4", name: "Social Media Foundation", description: "Audit, competitor analysis, scheduling tools, content pillars" },
  { id: "E4-F2", epicId: "E4", name: "Brand Identity", description: "Logo, colors, voice, messaging framework" },
  { id: "E4-F3", epicId: "E4", name: "Content Creation", description: "Reels, content calendar, publishing, analytics" },
  { id: "E4-F4", epicId: "E4", name: "Sales Outreach", description: "Prospect lists, CRM, cold outreach, chef collaborations, sample packs" },

  // ── E5: Production Operations ──
  { id: "E5-F1", epicId: "E5", name: "Inventory & Equipment", description: "Equipment inventory, supply audit, condition documentation" },
  { id: "E5-F2", epicId: "E5", name: "Production Metrics", description: "Current yield data, cycle times, loss rates per variety" },
  { id: "E5-F3", epicId: "E5", name: "Research & Optimization", description: "LED lights, seed suppliers, growing parameters, scaling models" },
  { id: "E5-F4", epicId: "E5", name: "COGS Analysis", description: "Per-variety cost breakdown — seeds, medium, labor, electricity, packaging" },

  // ── E6: App Platform & Foundation ──
  { id: "E6-F1", epicId: "E6", name: "Core Infrastructure", description: "Vite + React + Firebase setup, auth, deployment, seed data" },
  { id: "E6-F2", epicId: "E6", name: "Sprint Management", description: "Kanban board, planning board, calendar, task management" },
  { id: "E6-F3", epicId: "E6", name: "Role-Based Access", description: "Admin, employee, chef, driver roles — route guards, view restrictions" },

  // ── E7: Production Tracking System ──
  { id: "E7-F1", epicId: "E7", name: "Batch Logging", description: "Log new plantings — crop, quantity, auto-calculate harvest window" },
  { id: "E7-F2", epicId: "E7", name: "Growth Stage Tracking", description: "Dashboard showing batches by stage, progress bars, stage advancement" },
  { id: "E7-F3", epicId: "E7", name: "Harvest Management", description: "Mark batches harvested, record yield, update product availability" },
  { id: "E7-F4", epicId: "E7", name: "Sowing Schedule", description: "Daily planting recommendations, confirm-to-plant, schedule management" },
  { id: "E7-F5", epicId: "E7", name: "Demand Prediction", description: "Analyze order trends, calculate pipeline health, generate sowing alerts" },
  { id: "E7-F6", epicId: "E7", name: "Consumable Inventory", description: "Seed/soil/packaging tracking, par levels, low-stock alerts" },

  // ── E8: Chef Ordering System ──
  { id: "E8-F1", epicId: "E8", name: "Product Catalog", description: "Admin catalog management — products, pricing, availability toggles" },
  { id: "E8-F2", epicId: "E8", name: "Customer Management", description: "Chef/restaurant accounts, delivery preferences, substitution settings" },
  { id: "E8-F3", epicId: "E8", name: "Chef Storefront", description: "Product browsing, search, filtering — the /shop experience" },
  { id: "E8-F4", epicId: "E8", name: "Cart & Checkout", description: "Shopping cart, delivery date selection, order placement" },
  { id: "E8-F5", epicId: "E8", name: "Order History & Reorder", description: "Past orders, status tracking, one-tap reorder — the killer feature" },
  { id: "E8-F6", epicId: "E8", name: "Order Notifications", description: "Admin alerts for new orders, cutoff time logic, chef confirmations" },

  // ── E9: Order Fulfillment ──
  { id: "E9-F1", epicId: "E9", name: "Order Management", description: "Admin order dashboard — confirm, process, track status through fulfillment" },
  { id: "E9-F2", epicId: "E9", name: "Harvest Queue", description: "Auto-generated harvest list from confirmed orders, checkbox completion" },
  { id: "E9-F3", epicId: "E9", name: "Packing Lists", description: "Per-customer packing lists, print-friendly, order grouping" },
  { id: "E9-F4", epicId: "E9", name: "Production-Inventory Sync", description: "Harvested batches update catalog stock, order placement decrements availability" },

  // ── E10: Delivery Management ──
  { id: "E10-F1", epicId: "E10", name: "Delivery Planning", description: "Create delivery runs, assign stops, generate optimized routes" },
  { id: "E10-F2", epicId: "E10", name: "Driver Interface", description: "Today's route, stop details, Google Maps integration, one-handed operation" },
  { id: "E10-F3", epicId: "E10", name: "Proof of Delivery", description: "Photo capture, timestamp, GPS, auto-trigger delivered status and revenue" },

  // ── E11: App Polish & UX ──
  { id: "E11-F1", epicId: "E11", name: "PWA Setup", description: "Service worker, manifest, icons, Add to Home Screen — app-like experience" },
  { id: "E11-F2", epicId: "E11", name: "Dark Mode", description: "System-wide dark theme, per-role defaults, toggle in settings" },
  { id: "E11-F3", epicId: "E11", name: "Animations & Transitions", description: "Framer Motion page transitions, micro-interactions, skeleton loading" },
  { id: "E11-F4", epicId: "E11", name: "Component Library Upgrade", description: "shadcn/ui integration — polished buttons, inputs, modals, toasts" },
  { id: "E11-F5", epicId: "E11", name: "Mobile Optimization", description: "Bottom nav, touch targets, swipe gestures, responsive modals" },
  { id: "E11-F6", epicId: "E11", name: "Branding & Empty States", description: "Branded login, loading skeletons, helpful empty states, error boundaries" },

  // ── E12: Product Launch & Sales ──
  { id: "E12-F1", epicId: "E12", name: "Multi-Tenancy", description: "Farm signup, isolated data per farm, Firestore security rules" },
  { id: "E12-F2", epicId: "E12", name: "White-Label Config", description: "Per-farm branding — logo, colors, farm name applied throughout" },
  { id: "E12-F3", epicId: "E12", name: "Subscription Billing", description: "Stripe integration, pricing tiers, plan gating, webhooks" },
  { id: "E12-F4", epicId: "E12", name: "Onboarding & Demo", description: "Setup wizard, sample data, demo mode for prospects" },
  { id: "E12-F5", epicId: "E12", name: "Marketing & Launch", description: "Landing page, screenshots, copy, social assets, product announcement" },

  // ── E20: Chef App — Auth & Onboarding ──
  { id: "E20-F1", epicId: "E20", name: "Project Scaffold & Setup", description: "GitHub repo, Vite + React + Tailwind, Firebase SDK, Shopify client, routing, folder structure, Vercel deploy" },
  { id: "E20-F2", epicId: "E20", name: "Authentication System", description: "useAuth hook, LoginScreen, AuthGuard, Firebase UID → Firestore customer mapping" },
  { id: "E20-F3", epicId: "E20", name: "App Shell & Navigation", description: "Bottom tab bar layout, PWA manifest, service worker, app icons" },

  // ── E21: Chef App — Product Catalog ──
  { id: "E21-F1", epicId: "E21", name: "Product Data Service", description: "Shopify Storefront API — fetch all products, fetch by handle, useProducts hook" },
  { id: "E21-F2", epicId: "E21", name: "Catalog UI", description: "Category tabs, two-column product grid, product detail popup with quantity selector, search/filter" },

  // ── E22: Chef App — Cart & Ordering ──
  { id: "E22-F1", epicId: "E22", name: "Cart Management", description: "useCart hook with localStorage persistence, Cart page with quantity adjusters" },
  { id: "E22-F2", epicId: "E22", name: "Checkout Flow", description: "Delivery date picker, special instructions, Shopify checkout creation, Place Order flow, confirmation" },

  // ── E23: Chef App — Order Management ──
  { id: "E23-F1", epicId: "E23", name: "Order History", description: "orderService.js, useOrders hook, Orders list page" },
  { id: "E23-F2", epicId: "E23", name: "Order Tracking", description: "OrderDetail page with live Firestore status timeline" },
  { id: "E23-F3", epicId: "E23", name: "Quick Reorder", description: "Reorder functionality, Home page with prominent reorder button" },

  // ── E24: Chef App — Delivery & Fulfillment ──
  { id: "E24-F1", epicId: "E24", name: "Real-time Status Updates", description: "Live order status listener on Home, delivery countdown on OrderDetail" },
  { id: "E24-F2", epicId: "E24", name: "Notifications", description: "FCM push notifications for status changes, scheduled order reminders" },

  // ── E25: Chef App — Account & Preferences ──
  { id: "E25-F1", epicId: "E25", name: "Profile Display", description: "Account page with read-only profile, useCustomer hook" },
  { id: "E25-F2", epicId: "E25", name: "Preferences Management", description: "Substitution preferences, notification toggle settings" },

  // ── E26: Chef App — Admin Integration ──
  { id: "E26-F1", epicId: "E26", name: "Shopify Sync", description: "Order sync webhook, Firestore-to-Shopify draft order push for invoice customers" },
  { id: "E26-F2", epicId: "E26", name: "Security & Permissions", description: "Firestore security rules — chef read/write scoped to own data" },
  { id: "E26-F3", epicId: "E26", name: "Admin Tools (Workspace App)", description: "Chef account creation, OrderManager with status updates" },
  { id: "E26-F4", epicId: "E26", name: "Operations Automation", description: "HarvestQueue auto-generation, PackingList per-customer checklist" },

  // ── E27: Chef App — Polish & Launch ──
  { id: "E27-F1", epicId: "E27", name: "UI Polish", description: "Dark/light mode, loading skeletons, empty states, toasts, formatters utility" },
  { id: "E27-F2", epicId: "E27", name: "Reliability", description: "Offline awareness banner, error handling" },
  { id: "E27-F3", epicId: "E27", name: "Mobile Optimization", description: "Touch targets, spacing, biometric login testing" },
  { id: "E27-F4", epicId: "E27", name: "Testing & Launch Prep", description: "Seed data in Shopify + Firestore, end-to-end order flow test" },
  { id: "E27-F5", epicId: "E27", name: "Rollout", description: "Pilot chef onboarding, full rollout to all customers" },
];

// ============================================================
// TASK → EPIC/FEATURE MAPPING
// ============================================================
// This maps every existing task ID to its epic and feature.
// Apply these as fields on each task: { epicId: "E1", featureId: "E1-F1" }

export const taskEpicMapping = {
  // ── SPRINT 1-4: Business Operations Tasks ──

  // E1: Facility & Infrastructure
  101: { epicId: "E1", featureId: "E1-F1" }, // Warehouse walkthrough
  102: { epicId: "E1", featureId: "E1-F2" }, // Call electrical utility
  103: { epicId: "E1", featureId: "E1-F3" }, // Draft warehouse zone map

  // E2: Vendor & Partner Management
  104: { epicId: "E2", featureId: "E2-F2" }, // Research 5 vertical rack vendors
  105: { epicId: "E2", featureId: "E2-F1" }, // Contact Harvest Today sales
  106: { epicId: "E2", featureId: "E2-F3" }, // Compile Aubergine question bank

  // E4: Marketing & Brand (Halie Sprint 1)
  107: { epicId: "E4", featureId: "E4-F1" }, // Social media audit
  108: { epicId: "E4", featureId: "E4-F1" }, // Audit 5 competitor accounts
  109: { epicId: "E4", featureId: "E4-F1" }, // Set up Later + Linktree
  110: { epicId: "E4", featureId: "E4-F1" }, // Define 5 content pillars

  // E5: Production Operations (Ricardo Sprint 1)
  111: { epicId: "E5", featureId: "E5-F1" }, // Equipment inventory
  112: { epicId: "E5", featureId: "E5-F2" }, // Document production metrics
  113: { epicId: "E5", featureId: "E5-F3" }, // Research LED grow lights
  114: { epicId: "E5", featureId: "E5-F3" }, // Research herb & leafy green varieties

  // Sprint 2: E2/E3 — Vendor & Financial
  201: { epicId: "E2", featureId: "E2-F4" }, // Contact DuctSox and Prihoda
  202: { epicId: "E2", featureId: "E2-F4" }, // Draft fabric duct RFP
  203: { epicId: "E3", featureId: "E3-F1" }, // Build Harvest Today financial model
  204: { epicId: "E3", featureId: "E3-F2" }, // Build master break-even model

  // Sprint 2: E4 Marketing (Halie)
  205: { epicId: "E4", featureId: "E4-F2" }, // Develop brand identity brief
  206: { epicId: "E4", featureId: "E4-F3" }, // Create first content calendar
  207: { epicId: "E4", featureId: "E4-F3" }, // Film 3 BTS Reels

  // Sprint 2: E5 Production (Ricardo)
  208: { epicId: "E5", featureId: "E5-F4" }, // COGS spreadsheet
  209: { epicId: "E5", featureId: "E5-F3" }, // Research phased buildout
  210: { epicId: "E5", featureId: "E5-F3" }, // Seed supplier comparison
  211: { epicId: "E5", featureId: "E5-F3" }, // Baby kale growing parameters

  // Sprint 3: E2/E3/E4 — Validation
  301: { epicId: "E2", featureId: "E2-F3" }, // Meet Aubergine
  302: { epicId: "E4", featureId: "E4-F4" }, // Set up CRM
  303: { epicId: "E4", featureId: "E4-F4" }, // Build prospect list of 30 buyers
  304: { epicId: "E2", featureId: "E2-F4" }, // Review HVAC vendor proposals

  // Sprint 3: E4 Marketing (Halie)
  305: { epicId: "E4", featureId: "E4-F3" }, // Publish first week content
  306: { epicId: "E4", featureId: "E4-F4" }, // Pre-engage 20 prospects on Instagram
  307: { epicId: "E4", featureId: "E4-F4" }, // Create fresh sheet template
  308: { epicId: "E4", featureId: "E4-F4" }, // Design sample pack materials

  // Sprint 3: E5 Production (Ricardo)
  309: { epicId: "E5", featureId: "E5-F2" }, // Production scaling model
  310: { epicId: "E5", featureId: "E5-F1" }, // Equipment procurement list

  // Sprint 4: E1/E2/E3/E4 — Decisions
  401: { epicId: "E1", featureId: "E1-F4" }, // Finalize HVAC vendor
  402: { epicId: "E3", featureId: "E3-F4" }, // Update financial model with validated data
  403: { epicId: "E4", featureId: "E4-F4" }, // Send first 10 cold outreach
  404: { epicId: "E3", featureId: "E3-F4" }, // Create 90-day expansion timeline

  // Sprint 4: E4 Marketing (Halie)
  405: { epicId: "E4", featureId: "E4-F3" }, // Publish week 2 content
  406: { epicId: "E4", featureId: "E4-F3" }, // Create expansion story series
  407: { epicId: "E4", featureId: "E4-F3" }, // Set up Google Analytics
  408: { epicId: "E4", featureId: "E4-F4" }, // Research chef collaborations

  // Sprint 4: E5 Production (Ricardo)
  409: { epicId: "E5", featureId: "E5-F2" }, // Production transition plan
  410: { epicId: "E5", featureId: "E5-F1" }, // Prepare 10 sample packs

  // ── SPRINT 5-12: Development Tasks ──

  // Sprint 5: E7 Production Tracking
  5001: { epicId: "E7", featureId: "E7-F1" }, // Create batchService.js
  5002: { epicId: "E7", featureId: "E7-F1" }, // Create useBatches hook
  5003: { epicId: "E7", featureId: "E7-F1" }, // Verify cropConfig.js
  5004: { epicId: "E7", featureId: "E7-F1" }, // Build BatchLogger.jsx
  5005: { epicId: "E7", featureId: "E7-F2" }, // Build GrowthTracker.jsx
  5006: { epicId: "E7", featureId: "E7-F3" }, // Build HarvestLogger.jsx
  5007: { epicId: "E7", featureId: "E7-F2" }, // Add Production nav + route
  5008: { epicId: "E7", featureId: "E7-F2" }, // Build stage advancement logic
  5009: { epicId: "E7", featureId: "E7-F2" }, // Test production flow end-to-end
  5010: { epicId: "E7", featureId: "E7-F2" }, // Ricardo: Review production UX

  // Sprint 6: E7 completion + E8 start
  6001: { epicId: "E7", featureId: "E7-F4" }, // Build SowingDashboard.jsx
  6002: { epicId: "E7", featureId: "E7-F2" }, // Fix Phase B bugs
  6003: { epicId: "E8", featureId: "E8-F1" }, // Create productService.js
  6004: { epicId: "E8", featureId: "E8-F1" }, // Create orderService.js
  6005: { epicId: "E8", featureId: "E8-F2" }, // Create customerService.js
  6006: { epicId: "E8", featureId: "E8-F1" }, // Create hooks (products/orders/customers)
  6007: { epicId: "E8", featureId: "E8-F1" }, // Build ProductManager.jsx
  6008: { epicId: "E8", featureId: "E8-F2" }, // Build CustomerManager.jsx
  6009: { epicId: "E8", featureId: "E8-F2" }, // Halie: Compile chef customer list

  // Sprint 7: E8 Chef Ordering + E9 Fulfillment
  7001: { epicId: "E8", featureId: "E8-F3" }, // Build ChefCatalog.jsx
  7002: { epicId: "E8", featureId: "E8-F4" }, // Build ChefCart.jsx
  7003: { epicId: "E8", featureId: "E8-F5" }, // Build ChefOrders.jsx
  7004: { epicId: "E8", featureId: "E8-F2" }, // Build ChefAccount.jsx
  7005: { epicId: "E9", featureId: "E9-F1" }, // Build OrderManager.jsx
  7006: { epicId: "E9", featureId: "E9-F2" }, // Build HarvestQueue.jsx
  7007: { epicId: "E9", featureId: "E9-F3" }, // Build PackingList.jsx
  7008: { epicId: "E6", featureId: "E6-F3" }, // Implement RBAC
  7009: { epicId: "E8", featureId: "E8-F4" }, // Test chef ordering flow

  // Sprint 8: E8/E9 polish + E3 Budget
  8001: { epicId: "E8", featureId: "E8-F6" }, // Order notifications
  8002: { epicId: "E8", featureId: "E8-F6" }, // Order cutoff time logic
  8003: { epicId: "E9", featureId: "E9-F4" }, // Connect production to availability
  8004: { epicId: "E3", featureId: "E3-F3" }, // Create budgetService.js
  8005: { epicId: "E3", featureId: "E3-F3" }, // Create useBudget hook
  8006: { epicId: "E3", featureId: "E3-F3" }, // Build BudgetTracker.jsx
  8007: { epicId: "E3", featureId: "E3-F3" }, // Build ExpenseLogger.jsx
  8008: { epicId: "E3", featureId: "E3-F3" }, // Build InfrastructureTracker.jsx
  8009: { epicId: "E3", featureId: "E3-F3" }, // Auto-generate revenue on delivery

  // Sprint 9: E3 test + E7 Demand/Sowing
  9101: { epicId: "E3", featureId: "E3-F3" }, // Test budget end-to-end
  9102: { epicId: "E3", featureId: "E3-F3" }, // Recurring expense support
  9103: { epicId: "E7", featureId: "E7-F5" }, // Build demand calculation logic
  9104: { epicId: "E7", featureId: "E7-F5" }, // Build sowing recommendation engine
  9105: { epicId: "E7", featureId: "E7-F4" }, // Build SowingSchedule.jsx
  9106: { epicId: "E7", featureId: "E7-F5" }, // Supply pipeline visualization
  9107: { epicId: "E7", featureId: "E7-F6" }, // Build InventoryAlerts.jsx
  9108: { epicId: "E7", featureId: "E7-F6" }, // Ricardo: Seed consumable inventory

  // Sprint 10: E10 Delivery
  10001: { epicId: "E10", featureId: "E10-F1" }, // Create deliveryService.js
  10002: { epicId: "E10", featureId: "E10-F1" }, // Build DeliveryManager.jsx
  10003: { epicId: "E10", featureId: "E10-F1" }, // Build routeUtils.js
  10004: { epicId: "E10", featureId: "E10-F2" }, // Build DeliveryRoute.jsx
  10005: { epicId: "E10", featureId: "E10-F3" }, // Build DeliveryConfirm.jsx
  10006: { epicId: "E10", featureId: "E10-F2" }, // Add driver role to RBAC
  10007: { epicId: "E10", featureId: "E10-F3" }, // Test order-to-delivery flow

  // Sprint 11: E11 Polish
  11001: { epicId: "E11", featureId: "E11-F1" }, // PWA setup
  11002: { epicId: "E11", featureId: "E11-F1" }, // Create app icons
  11003: { epicId: "E11", featureId: "E11-F2" }, // Dark mode
  11004: { epicId: "E11", featureId: "E11-F3" }, // Framer Motion animations
  11005: { epicId: "E11", featureId: "E11-F4" }, // shadcn/ui components
  11006: { epicId: "E11", featureId: "E11-F5" }, // Mobile optimization pass
  11007: { epicId: "E11", featureId: "E11-F6" }, // Loading skeletons + empty states
  11008: { epicId: "E11", featureId: "E11-F6" }, // Branded login screen

  // Sprint 12: E12 Launch
  12001: { epicId: "E12", featureId: "E12-F1" }, // Farm signup flow
  12002: { epicId: "E12", featureId: "E12-F1" }, // Firestore security rules
  12003: { epicId: "E12", featureId: "E12-F2" }, // White-label config
  12004: { epicId: "E12", featureId: "E12-F3" }, // Stripe billing
  12005: { epicId: "E12", featureId: "E12-F4" }, // Onboarding wizard
  12006: { epicId: "E12", featureId: "E12-F5" }, // Landing page
  12007: { epicId: "E12", featureId: "E12-F5" }, // Halie: Marketing content
  12008: { epicId: "E12", featureId: "E12-F4" }, // Demo mode
  12009: { epicId: "E12", featureId: "E12-F1" }, // Final QA pass

  // Backlog items
  99001: { epicId: "E7", featureId: "E7-F2" },  // IoT sensor integration
  99002: { epicId: "E7", featureId: "E7-F5" },  // AI demand forecasting
  99003: { epicId: "E11", featureId: "E11-F1" }, // Native mobile wrapper
  99004: { epicId: "E7", featureId: "E7-F3" },  // Mushroom flush tracking
  99005: { epicId: "E3", featureId: "E3-F3" },  // QuickBooks integration
  99006: { epicId: "E10", featureId: "E10-F1" }, // OR-Tools routing
  99007: { epicId: "E8", featureId: "E8-F6" },  // In-app chat
  99008: { epicId: "E6", featureId: "E6-F1" },  // Offline-first local DB
  99009: { epicId: "E9", featureId: "E9-F3" },  // Scan-to-pack barcodes
  99010: { epicId: "E9", featureId: "E9-F4" },  // Available-to-Promise logic

  // ── CHEF APP TASKS (IDs 2000000001–2000000064) ──

  // E20: Auth & Onboarding — Project Scaffold
  2000000001: { epicId: "E20", featureId: "E20-F1" }, // Create GitHub repo
  2000000002: { epicId: "E20", featureId: "E20-F1" }, // Scaffold Vite + React + Tailwind
  2000000003: { epicId: "E20", featureId: "E20-F1" }, // Install Firebase SDK
  2000000004: { epicId: "E20", featureId: "E20-F1" }, // Configure Shopify Storefront API
  2000000005: { epicId: "E20", featureId: "E20-F1" }, // Install React Router v6
  2000000006: { epicId: "E20", featureId: "E20-F1" }, // Set up folder structure
  2000000007: { epicId: "E20", featureId: "E20-F1" }, // Deploy to Vercel
  2000000008: { epicId: "E20", featureId: "E20-F1" }, // Point micos.shop domain

  // E20: Auth & Onboarding — Authentication System
  2000000009: { epicId: "E20", featureId: "E20-F2" }, // Build useAuth hook
  2000000010: { epicId: "E20", featureId: "E20-F2" }, // Build LoginScreen
  2000000011: { epicId: "E20", featureId: "E20-F2" }, // Build AuthGuard
  2000000012: { epicId: "E20", featureId: "E20-F2" }, // Map Firebase UID to customer doc

  // E20: Auth & Onboarding — App Shell & Navigation
  2000000013: { epicId: "E20", featureId: "E20-F3" }, // Build Layout with bottom tab bar
  2000000014: { epicId: "E20", featureId: "E20-F3" }, // Set up PWA manifest
  2000000015: { epicId: "E20", featureId: "E20-F3" }, // Create service worker shell
  2000000016: { epicId: "E20", featureId: "E20-F3" }, // Create app icon set

  // E21: Product Catalog — Product Data Service
  2000000017: { epicId: "E21", featureId: "E21-F1" }, // shopifyService — fetch all products
  2000000018: { epicId: "E21", featureId: "E21-F1" }, // shopifyService — fetch by handle
  2000000019: { epicId: "E21", featureId: "E21-F1" }, // Build useProducts hook

  // E21: Product Catalog — Catalog UI
  2000000020: { epicId: "E21", featureId: "E21-F2" }, // Catalog — category tabs
  2000000021: { epicId: "E21", featureId: "E21-F2" }, // Catalog — product grid
  2000000022: { epicId: "E21", featureId: "E21-F2" }, // Product detail popup
  2000000023: { epicId: "E21", featureId: "E21-F2" }, // Search/filter bar

  // E22: Cart & Ordering — Cart Management
  2000000024: { epicId: "E22", featureId: "E22-F1" }, // useCart hook with localStorage
  2000000025: { epicId: "E22", featureId: "E22-F1" }, // Cart page with quantity adjusters

  // E22: Cart & Ordering — Checkout Flow
  2000000026: { epicId: "E22", featureId: "E22-F2" }, // Delivery date picker
  2000000027: { epicId: "E22", featureId: "E22-F2" }, // Special instructions field
  2000000028: { epicId: "E22", featureId: "E22-F2" }, // shopifyService — create checkout
  2000000029: { epicId: "E22", featureId: "E22-F2" }, // Place Order flow
  2000000030: { epicId: "E22", featureId: "E22-F2" }, // Order confirmation screen

  // E23: Order Management — Order History
  2000000031: { epicId: "E23", featureId: "E23-F1" }, // orderService — read orders
  2000000032: { epicId: "E23", featureId: "E23-F1" }, // useOrders hook
  2000000033: { epicId: "E23", featureId: "E23-F1" }, // Orders list page

  // E23: Order Management — Order Tracking
  2000000034: { epicId: "E23", featureId: "E23-F2" }, // OrderDetail with live status

  // E23: Order Management — Quick Reorder
  2000000035: { epicId: "E23", featureId: "E23-F3" }, // Reorder functionality
  2000000036: { epicId: "E23", featureId: "E23-F3" }, // Home page with reorder button

  // E24: Delivery & Fulfillment — Real-time Status Updates
  2000000037: { epicId: "E24", featureId: "E24-F1" }, // Order status update listener
  2000000038: { epicId: "E24", featureId: "E24-F1" }, // Delivery countdown

  // E24: Delivery & Fulfillment — Notifications
  2000000039: { epicId: "E24", featureId: "E24-F2" }, // Push notification setup
  2000000040: { epicId: "E24", featureId: "E24-F2" }, // Order reminder system

  // E25: Account & Preferences — Profile Display
  2000000041: { epicId: "E25", featureId: "E25-F1" }, // Account page
  2000000042: { epicId: "E25", featureId: "E25-F1" }, // useCustomer hook

  // E25: Account & Preferences — Preferences Management
  2000000043: { epicId: "E25", featureId: "E25-F2" }, // Substitution preferences
  2000000044: { epicId: "E25", featureId: "E25-F2" }, // Notification preferences

  // E26: Admin Integration — Shopify Sync
  2000000045: { epicId: "E26", featureId: "E26-F1" }, // Shopify order sync webhook
  2000000046: { epicId: "E26", featureId: "E26-F1" }, // Firestore-to-Shopify push

  // E26: Admin Integration — Security & Permissions
  2000000047: { epicId: "E26", featureId: "E26-F2" }, // Firestore security rules

  // E26: Admin Integration — Admin Tools
  2000000048: { epicId: "E26", featureId: "E26-F3" }, // Chef account creation flow
  2000000049: { epicId: "E26", featureId: "E26-F3" }, // OrderManager in Workspace app

  // E26: Admin Integration — Operations Automation
  2000000050: { epicId: "E26", featureId: "E26-F4" }, // HarvestQueue auto-generation
  2000000051: { epicId: "E26", featureId: "E26-F4" }, // PackingList per-customer

  // E27: Polish & Launch — UI Polish
  2000000052: { epicId: "E27", featureId: "E27-F1" }, // Dark/light mode toggle
  2000000053: { epicId: "E27", featureId: "E27-F1" }, // Loading states (skeletons)
  2000000054: { epicId: "E27", featureId: "E27-F1" }, // Empty states
  2000000055: { epicId: "E27", featureId: "E27-F1" }, // Error handling + toasts
  2000000059: { epicId: "E27", featureId: "E27-F1" }, // Formatters utility

  // E27: Polish & Launch — Reliability
  2000000056: { epicId: "E27", featureId: "E27-F2" }, // Offline awareness banner

  // E27: Polish & Launch — Mobile Optimization
  2000000057: { epicId: "E27", featureId: "E27-F3" }, // Touch targets + spacing pass
  2000000058: { epicId: "E27", featureId: "E27-F3" }, // Biometric/Face ID testing

  // E27: Polish & Launch — Testing & Launch Prep
  2000000060: { epicId: "E27", featureId: "E27-F4" }, // Seed data — Shopify products
  2000000061: { epicId: "E27", featureId: "E27-F4" }, // Seed data — Firestore customer
  2000000062: { epicId: "E27", featureId: "E27-F4" }, // End-to-end test

  // E27: Polish & Launch — Rollout
  2000000063: { epicId: "E27", featureId: "E27-F5" }, // Onboard pilot chef
  2000000064: { epicId: "E27", featureId: "E27-F5" }, // Roll out to all chefs
};
