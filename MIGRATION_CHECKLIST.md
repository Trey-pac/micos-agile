# Migration Checklist — Fresh Rebuild

## Context
This checklist guides the rebuild of the Micos farm management app from its current state (working Vite + React app with architectural issues) to a production-ready architecture. Read CLAUDE.md first for full project context.

## Current State (What Exists)
- 22 files, 3,122 total lines across src/
- Working features: Kanban, Planning Board, Calendar, Vendors, Task CRUD, Sprint Management
- 50 real tasks across 4 sprints + 4 backlog items
- Firebase Realtime Database (CDN-loaded, hardcoded keys)
- 8 custom CSS files, no Tailwind
- No auth, no router, no services layer, no .env

## What We're Keeping (Port These)
- ALL business logic from App.jsx (task CRUD, sprint management, drag-drop, filtering)
- ALL component UI logic (KanbanBoard, PlanningBoard, CalendarView, VendorsView, modals)
- ALL seed data (initialTasks.js, initialSprints.js, vendors.js, constants.js)
- sprintUtils.js (date calculations)
- The snarky comment generator from App.jsx
- The visual design language (gradients, color scheme, card layouts)

## What We're Replacing
- Firebase CDN scripts → npm firebase package
- Realtime Database → Cloud Firestore
- Hardcoded API keys → .env with import.meta.env
- Direct DB calls in App.jsx → services/ layer
- All state in App.jsx → custom hooks
- 8 CSS files → Tailwind CSS
- Tab switching via state → React Router
- No auth → Firebase Auth

---

## Phase 1: Project Setup (Do First)

### Step 1.1 — Initialize clean Vite + React project
```bash
npm create vite@latest farm-app -- --template react
cd farm-app
npm install
```

### Step 1.2 — Install all dependencies
```bash
npm install firebase react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

### Step 1.3 — Configure Tailwind
In vite.config.js:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

In src/index.css (replace contents):
```css
@import "tailwindcss";
```

### Step 1.4 — Create .env file (DO NOT COMMIT)
```
VITE_FIREBASE_API_KEY=AIzaSyDXTytDXonkcj9A3XuzCeV1F4V-Sfa51Ug
VITE_FIREBASE_AUTH_DOMAIN=mico-s-micro-farm-agile.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mico-s-micro-farm-agile
VITE_FIREBASE_STORAGE_BUCKET=mico-s-micro-farm-agile.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=899003989851
VITE_FIREBASE_APP_ID=1:899003989851:web:e47df3198e73640e22647e
VITE_FIREBASE_MEASUREMENT_ID=G-L3WMNTCW9G
```

### Step 1.5 — Update .gitignore
Add these lines:
```
.env
.env.local
.env.production
```

### Step 1.6 — Create src/firebase.js
```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
```

### Step 1.7 — Copy CLAUDE.md to project root

### Step 1.8 — Copy data files
Copy these as-is from the current project:
- src/data/constants.js
- src/data/initialTasks.js
- src/data/initialSprints.js
- src/data/vendors.js
- src/utils/sprintUtils.js

### Step 1.9 — Remove CDN Firebase scripts from index.html
The index.html should contain ONLY:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mico's Micro Farm Agile</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

---

## Phase 2: Services Layer (Do Second)

### Step 2.1 — Create src/services/taskService.js
Abstract ALL task database operations:
- getTasks(farmId) — listen to tasks collection
- addTask(farmId, taskData)
- updateTask(farmId, taskId, updates)
- deleteTask(farmId, taskId)
- batchUpdateTasks(farmId, updates)

Use Firestore path: `farms/{farmId}/tasks/{taskId}`

### Step 2.2 — Create src/services/sprintService.js
- getSprints(farmId)
- addSprint(farmId, sprintData)
- updateSprint(farmId, sprintId, updates)

Use Firestore path: `farms/{farmId}/sprints/{sprintId}`

### Step 2.3 — Create src/services/vendorService.js
- getVendors(farmId)
- addVendor(farmId, vendorData)
- updateVendor(farmId, vendorId, updates)
- deleteVendor(farmId, vendorId)

Use Firestore path: `farms/{farmId}/vendors/{vendorId}`

---

## Phase 3: Custom Hooks (Do Third)

### Step 3.1 — Create src/hooks/useAuth.js
- Login, logout, current user state
- Provide farmId from user's custom claims or profile doc

### Step 3.2 — Create src/hooks/useTasks.js
- Consume taskService
- Manage task state (list, add, edit, delete, drag-drop, filter)
- Handle loading/error states
- This extracts ~200 lines from current App.jsx

### Step 3.3 — Create src/hooks/useSprints.js
- Consume sprintService
- Sprint state, selection, auto-creation logic
- This extracts ~50 lines from current App.jsx

---

## Phase 4: React Router + Layout (Do Fourth)

### Step 4.1 — Set up routes in App.jsx
```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Routes:
// /          → Dashboard (or redirect to /kanban)
// /kanban    → KanbanBoard
// /planning  → PlanningBoard
// /calendar  → CalendarView
// /vendors   → VendorsView
// /inventory → InventoryManager (future)
// /budget    → BudgetTracker (future)
// /login     → Login page
```

### Step 4.2 — Create Layout.jsx
- Navigation bar (replaces current tab buttons)
- Header with snarky comment generator
- Sync status indicator
- Shared layout wrapping all routes

---

## Phase 5: Port Components (Do Fifth)

Port each component one at a time. For each:
1. Copy the JSX structure from the existing component
2. Replace CSS class names with Tailwind utility classes
3. Replace direct Firebase calls with service/hook calls
4. Test that it works before moving to the next

### Port order (by dependency):
1. TaskCard.jsx (no dependencies on other components)
2. PlanningTaskCard.jsx (similar to TaskCard)
3. OwnerLegend.jsx (simple, standalone)
4. SprintHeader.jsx (uses constants + sprintUtils)
5. KanbanBoard.jsx (uses TaskCard)
6. PlanningBoard.jsx (uses PlanningTaskCard — most complex component)
7. CalendarView.jsx (standalone)
8. VendorsView.jsx (standalone)
9. All modals (TaskModal, VendorModal, SprintModal)

---

## Phase 6: Enable Firestore + Auth in Firebase Console

### Step 6.1 — Enable Cloud Firestore
- Firebase Console → Build → Firestore Database → Create Database
- Start in test mode (open rules), tighten later

### Step 6.2 — Enable Authentication
- Firebase Console → Build → Authentication → Get Started
- Enable Email/Password provider

### Step 6.3 — Seed initial data
Write a one-time script or use the Firebase console to populate:
- farms/micos-farm-001/tasks/... (from initialTasks.js)
- farms/micos-farm-001/sprints/... (from initialSprints.js)
- farms/micos-farm-001/vendors/... (from vendors.js)

### Step 6.4 — Set Firestore security rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /farms/{farmId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
(Tighten to farmId-based rules after custom claims are set up)

---

## Phase 7: Deploy

### Step 7.1 — Push to GitHub
```bash
git init
git add .
git commit -m "fresh rebuild with proper architecture"
git remote add origin https://github.com/trey-pacweb/farm-app.git
git push -u origin main
```

### Step 7.2 — Connect Netlify
- app.netlify.com → Add New Site → Import from GitHub
- Build command: `npm run build`
- Publish directory: `dist`
- Add environment variables in Netlify dashboard (same as .env)

---

## Verification Checklist
After each phase, verify:
- [ ] `npm run dev` starts without errors
- [ ] No Firebase keys visible in source code or Git history
- [ ] Components render correctly
- [ ] Task CRUD works (add, edit, delete, drag-drop)
- [ ] Sprint selection and filtering works
- [ ] Mobile view (375px) is usable
- [ ] Data persists across page refreshes
- [ ] Live sync works across two browser tabs
