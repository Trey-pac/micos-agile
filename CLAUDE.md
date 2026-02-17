# Micos Micro Farm — All-in-One Workspace App

## Overview
Custom all-in-one workspace app for a 3-person microgreens farming team (Trey, Halie, Ricardo). Modules: sprint/task management, inventory, budget tracking, delivery routes, production tracking. Currently used internally — will be sold as SaaS to other small farms in the future.

## Owner
Trey — Owner/Operator of Micos Micro Farm, Boise Idaho area. Non-developer. Claude is the primary development tool.

## Tech Stack (TARGET — migrating to this)
- **Frontend:** React 18 with Vite (JavaScript, NOT TypeScript)
- **Styling:** Tailwind CSS (replacing 8 custom CSS files)
- **Database:** Cloud Firestore (replacing Realtime Database)
- **Auth:** Firebase Auth (email/password)
- **Hosting:** Netlify (auto-deploy from GitHub push)
- **Routing:** React Router v6
- **State:** useState/useEffect (no Redux — keep it simple)

## Tech Stack (CURRENT — being replaced)
- React 18 with Vite (this part stays)
- 8 custom CSS files in src/styles/
- Firebase Realtime Database via CDN `<script>` tags in index.html
- No auth, no router, no .env
- API keys hardcoded in src/config/firebase.js

## Project Structure (TARGET)
```
farm-app/
├── CLAUDE.md              ← You are here
├── index.html             ← Entry point (<div id="root"> only)
├── package.json
├── vite.config.js
├── .env                   ← Firebase keys (NEVER commit)
├── .gitignore             ← Must include .env
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.ico
└── src/
    ├── main.jsx           ← Renders <App />
    ├── App.jsx            ← Root component with React Router
    ├── firebase.js        ← Firebase config (reads from .env)
    ├── components/
    │   ├── Layout.jsx         ← Nav bar, header, shared layout
    │   ├── Dashboard.jsx      ← Home/overview screen
    │   ├── KanbanBoard.jsx    ← Sprint task board
    │   ├── PlanningBoard.jsx  ← Backlog + sprint planning
    │   ├── CalendarView.jsx   ← Monthly calendar with tasks
    │   ├── VendorsView.jsx    ← Vendor contacts
    │   ├── InventoryManager.jsx   ← Future: inventory tracking
    │   ├── BudgetTracker.jsx      ← Future: budget/expenses
    │   ├── ProductionTracker.jsx  ← Future: harvest/yield logs
    │   ├── RouteMapper.jsx        ← Future: delivery routes
    │   ├── TaskCard.jsx
    │   ├── PlanningTaskCard.jsx
    │   ├── SprintHeader.jsx
    │   ├── OwnerLegend.jsx
    │   └── modals/
    │       ├── TaskModal.jsx
    │       ├── VendorModal.jsx
    │       └── SprintModal.jsx
    ├── services/
    │   ├── taskService.js       ← ALL Firestore task operations
    │   ├── sprintService.js     ← ALL Firestore sprint operations
    │   ├── vendorService.js     ← ALL Firestore vendor operations
    │   ├── inventoryService.js  ← Future
    │   └── budgetService.js     ← Future
    ├── hooks/
    │   ├── useAuth.js           ← Auth state + login/logout
    │   ├── useTasks.js          ← Task state + CRUD
    │   └── useSprints.js        ← Sprint state + CRUD
    ├── utils/
    │   └── sprintUtils.js       ← Date calculations (already built)
    └── data/
        ├── constants.js         ← Team members, colors (already built)
        ├── initialTasks.js      ← Seed data for new farms (already built)
        ├── initialSprints.js    ← Seed data (already built)
        └── vendors.js           ← Seed data (already built)
```

## Code Conventions
- Functional components ONLY, no class components
- useState/useEffect hooks for state management
- Tailwind utility classes, NO separate CSS files
- ALL Firestore operations go through service files, NEVER directly in components
- Every Firestore document MUST include farmId for multi-tenancy
- Components should be under 200 lines — split if larger
- App.jsx should be under 100 lines (use hooks to extract logic)

## Firebase Project
- Project ID: mico-s-micro-farm-agile
- Current DB: Realtime Database (being migrated to Firestore)
- Cloud Functions URL: https://us-central1-mico-s-micro-farm-agile.cloudfunctions.net
- Google Cloud Project: Mico's Micro Farm Agile

## Firestore Data Structure (TARGET — multi-tenant from day one)
```
farms/{farmId}/tasks/{taskId}
farms/{farmId}/sprints/{sprintId}
farms/{farmId}/vendors/{vendorId}
farms/{farmId}/inventory/{itemId}
farms/{farmId}/transactions/{txnId}
farms/{farmId}/production/{batchId}
farms/{farmId}/routes/{routeId}
farms/{farmId}/config              ← per-farm settings
users/{userId}                     ← auth profiles with farmId reference
```

## Current Task Data Model
```javascript
{
  id: 101,
  title: "Walk warehouse with Ricardo...",
  status: "not-started",        // not-started | in-progress | roadblock | done
  priority: "high",             // high | medium | low
  owner: "trey",                // trey | halie | ricardo | team
  size: "S",                    // S | M | L
  sprintId: 9001,               // Sprint ID or null (backlog)
  dueDate: "2026-02-18",
  notes: "Take photos...",
  backlogPriority: 0,           // Order in backlog
  urgency: "this-week"          // this-week | this-month | future
}
```

## Current Sprint Data Model
```javascript
{
  id: 9001,
  number: 1,
  name: "Sprint 1",
  goal: "Discovery & foundation...",
  startDate: "2026-02-18T07:00:00.000Z",
  endDate: "2026-02-24T07:00:00.000Z"
}
```

## Team Members
- Trey (owner: "trey", color: forest/green) — Operations Lead
- Halie (owner: "halie", color: ocean/teal) — Marketing/Sales Lead
- Ricardo (owner: "ricardo", color: coral/orange) — Production/Logistics Lead
- Team (owner: "team", color: purple) — Shared tasks

## Sprint Structure
- Weekly sprints, Wednesday–Tuesday cycle
- First sprint: Feb 18, 2026
- 4 defined sprints + auto-creation up to 12
- Sprint ceremonies: Monday planning, Tue-Thu standups, Friday retro

## Existing Features to Port (all working in current code)
1. Kanban Board — 4 columns (Not Started, In Progress, Roadblock, Done), drag-and-drop, team filter
2. Planning Board — Sticky backlog + scrollable sprint columns, drag tasks between sprints
3. Calendar View — Monthly view with task dots, color-coded by owner
4. Vendor Contacts — List with add/edit capability
5. Task CRUD — Create, edit, delete tasks with modal forms
6. Sprint Management — Create sprints, auto-populate dates, selector dropdown
7. Snarky Comment Generator — Context-aware jokes in header (keep this!)
8. Firebase Realtime sync — Live updates across devices
9. Data versioning — DATA_VERSION constant for migration control

## Features to Add (priority order)
1. Firebase Auth (email/password login)
2. Services layer (abstract all DB operations)
3. React Router (bookmarkable URLs)
4. Inventory Management module
5. Budget/Expense Tracking module
6. Production/Harvest Logging module
7. Delivery Route Planning module
8. Role-based access (admin/member/viewer)
9. Worker daily checklists (simplified view for farm workers)

## Commands
- `npm run dev` — Start dev server (localhost:5173)
- `npm run build` — Production build to /dist
- `npm run preview` — Preview production build
- `git add . && git commit -m "message" && git push origin main` — Deploy

## Important Rules
- NEVER hardcode farmId — always get from auth context
- NEVER put API keys in component files — use import.meta.env
- Always test on mobile (375px width) after UI changes
- Keep components under 200 lines — split if larger
- When in doubt, ask before making breaking changes
