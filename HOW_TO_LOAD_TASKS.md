# How to Load the Development Sprint Plan into Firestore

## What You Have
The `devSprintPlan.js` file contains:
- **8 new sprints** (Sprint 5–12, covering Feb 18 – Apr 14, 2026)
- **75 development tasks** across all 8 phases of the Mico's Workspace buildout
- **10 backlog items** for future features (no sprint assigned)

## How It Gets Into Your App

### The Simple Version
Your app already has a "Seed Starter Data" button on the Dashboard that writes initial data to Firestore. We extend that same mechanism to also load these development tasks.

### What Happens Technically
1. The task data in `devSprintPlan.js` is a JavaScript array of objects
2. Each object matches your app's task data model (id, title, status, priority, owner, size, sprintId, etc.)
3. A seed function writes each task to Firestore at `farms/{farmId}/tasks/{taskId}`
4. The sprints get written to `farms/{farmId}/sprints/{sprintId}`
5. Once in Firestore, they appear instantly in your Kanban board, Planning board, and Calendar

### What to Tell Claude Code
Paste this into Claude Code in VS Code:

```
Read the devSprintPlan.js file. It contains 8 new sprints and 75+ development tasks for building out Mico's Workspace.

I need you to:
1. Add these sprints and tasks to the seed data system so they load into Firestore
2. They should be ADDED alongside the existing business operations tasks (Sprints 1-4), not replace them
3. Update the seed function in seedService.js to include these new sprints and tasks
4. After updating, I'll click the seed button on the Dashboard to load everything

The existing Sprint 1-4 tasks cover business operations (warehouse, vendors, marketing).
The new Sprint 5-12 tasks cover app development (production tracking, chef ordering, delivery, etc.).
Both sets of tasks should coexist in the same Kanban and Planning boards.
```

### How Firebase Works (The Education Part)

**Firestore is a cloud database.** Think of it like a filing cabinet in the sky:
- The cabinet = your Firebase project
- Each drawer = a "collection" (tasks, sprints, vendors, etc.)
- Each folder in a drawer = a "document" (one specific task, one specific sprint)
- Each piece of paper in a folder = a "field" (title, status, priority, etc.)

**Your app's data path:** `farms/micos-farm-001/tasks/{taskId}`
- `farms` = top-level drawer
- `micos-farm-001` = your farm's section (multi-tenancy ready)
- `tasks` = the tasks sub-drawer
- `{taskId}` = each individual task document

**When you click "Seed Starter Data":**
1. The app reads the JavaScript arrays (initialTasks, initialSprints, etc.)
2. For each item, it calls `setDoc()` which writes that document to Firestore
3. Firestore stores it in the cloud
4. Your app has a real-time listener (`onSnapshot`) that watches for changes
5. The moment Firestore updates, every open browser tab sees the new data instantly

**That's why it works across devices:** Halie opens the app on her phone → she sees the same tasks you see on your desktop → Ricardo opens it on his laptop → same data. All powered by Firestore real-time sync.

**When Claude Code builds new features** (like production tracking), it:
1. Creates a new "collection" in Firestore (e.g., `farms/micos-farm-001/batches/`)
2. Creates a "service" file that knows how to read/write to that collection
3. Creates a "hook" that your React components use to access the data
4. Creates the visual component that displays the data

The pattern is always: **Firestore collection → Service → Hook → Component**

This same pattern repeats for every feature: products, orders, customers, expenses, deliveries — they're all just different drawers in the same filing cabinet.
