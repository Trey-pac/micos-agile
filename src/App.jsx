import React, { useState, useEffect } from 'react';
import { database, useFirebase } from './config/firebase';
import { DATA_VERSION, teamMembers } from './data/constants';
import { initialSprints } from './data/initialSprints';
import { initialTasks } from './data/initialTasks';
import { vendors } from './data/vendors';
import { getSprintDates, getCurrentSprint, isCurrentSprint, isFutureSprint } from './utils/sprintUtils';

import SprintHeader from './components/SprintHeader';
import KanbanBoard from './components/KanbanBoard';
import PlanningBoard from './components/PlanningBoard';
import CalendarView from './components/CalendarView';
import VendorsView from './components/VendorsView';
import TaskModal from './components/modals/TaskModal';
import VendorModal from './components/modals/VendorModal';
import SprintModal from './components/modals/SprintModal';

export default function App() {
    const [activeTab, setActiveTab] = useState('kanban');
    const [tasks, setTasks] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [draggedTask, setDraggedTask] = useState(null);
    const [synced, setSynced] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [addToColumn, setAddToColumn] = useState('not-started');
    const [viewFilter, setViewFilter] = useState('all');
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [vendorsList, setVendorsList] = useState(() => {
        const saved = localStorage.getItem('micosVendors');
        return saved ? JSON.parse(saved) : vendors;
    });
    const [sprints, setSprints] = useState(() => {
        const savedVersion = localStorage.getItem('micosDataVersion');
        if (savedVersion && Number(savedVersion) >= DATA_VERSION) {
            const saved = localStorage.getItem('micosSprints');
            return saved ? JSON.parse(saved) : initialSprints;
        }
        return initialSprints;
    });
    const [selectedSprintId, setSelectedSprintId] = useState(null);
    const [showSprintModal, setShowSprintModal] = useState(false);
    const [planningActiveSprintIdx, setPlanningActiveSprintIdx] = useState(0);
    const [googleAccessToken, setGoogleAccessToken] = useState(() => {
        return localStorage.getItem('googleAccessToken') || null;
    });
    const [lastSyncTime, setLastSyncTime] = useState(() => {
        return localStorage.getItem('lastSyncTime') || null;
    });
    const [syncStatus, setSyncStatus] = useState('');

    // Load tasks on mount
    useEffect(() => {
        const savedVersion = localStorage.getItem('micosDataVersion');
        const needsMigration = !savedVersion || Number(savedVersion) < DATA_VERSION;

        if (useFirebase && database) {
            const tasksRef = database.ref('tasks');

            if (needsMigration) {
                const taskMap = {};
                initialTasks.forEach(t => { taskMap[t.id] = t; });
                tasksRef.set(taskMap).then(() => {
                    localStorage.setItem('micosDataVersion', String(DATA_VERSION));
                    localStorage.setItem('micosSprints', JSON.stringify(initialSprints));
                    setSprints(initialSprints);
                });
            }

            tasksRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setTasks(Object.values(data));
                    setSynced(true);
                }
            });
            return () => tasksRef.off();
        } else {
            if (needsMigration) {
                localStorage.setItem('micosTasks', JSON.stringify(initialTasks));
                localStorage.setItem('micosSprints', JSON.stringify(initialSprints));
                localStorage.setItem('micosDataVersion', String(DATA_VERSION));
                setTasks(initialTasks);
                setSprints(initialSprints);
            } else {
                const saved = localStorage.getItem('micosTasks');
                setTasks(saved ? JSON.parse(saved) : initialTasks);
            }
        }
    }, []);

    // Auto-select current sprint and ensure 12 sprints exist
    useEffect(() => {
        if (sprints.length < 12) {
            const newSprints = [...sprints];
            const startNumber = sprints.length + 1;

            for (let i = startNumber; i <= 12; i++) {
                const { startDate, endDate } = getSprintDates(i);
                newSprints.push({
                    id: Date.now() + i,
                    number: i,
                    name: `Sprint ${i}`,
                    goal: '',
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                });
            }
            setSprints(newSprints);
        }

        if (sprints.length > 0 && !selectedSprintId) {
            const current = getCurrentSprint(sprints);
            const targetSprint = current || sprints[0];
            setSelectedSprintId(targetSprint.id);
        }
    }, [sprints.length]);

    // Save sprints to localStorage
    useEffect(() => {
        localStorage.setItem('micosSprints', JSON.stringify(sprints));
    }, [sprints]);

    // Save to Firebase or localStorage
    const saveTasks = (updatedTasks) => {
        if (useFirebase && database) {
            updatedTasks.forEach(task => {
                database.ref('tasks/' + task.id).set(task);
            });
        } else {
            localStorage.setItem('micosTasks', JSON.stringify(updatedTasks));
        }
        setTasks(updatedTasks);
    };

    const handleDragStart = (task) => {
        setDraggedTask(task);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (status) => {
        if (draggedTask) {
            const updatedTasks = tasks.map(task =>
                task.id === draggedTask.id ? { ...task, status } : task
            );
            saveTasks(updatedTasks);
            setDraggedTask(null);
        }
    };

    const handlePlanningDrop = (targetSprintId) => {
        if (draggedTask) {
            const updatedTasks = tasks.map(task =>
                task.id === draggedTask.id ? { ...task, sprintId: targetSprintId } : task
            );
            saveTasks(updatedTasks);
            setDraggedTask(null);
        }
    };

    const reorderBacklog = (taskId, newIndex) => {
        const backlogTasks = tasks.filter(t => !t.sprintId);
        const taskIndex = backlogTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const [movedTask] = backlogTasks.splice(taskIndex, 1);
        backlogTasks.splice(newIndex, 0, movedTask);

        const updatedTasks = tasks.map(task => {
            const backlogIndex = backlogTasks.findIndex(t => t.id === task.id);
            if (backlogIndex !== -1) {
                return { ...task, backlogPriority: backlogIndex };
            }
            return task;
        });

        saveTasks(updatedTasks);
    };

    const getFilteredTasks = () => {
        if (viewFilter === 'all') return tasks;
        return tasks.filter(task => task.owner === viewFilter);
    };

    const getSprintTasks = () => {
        const filtered = getFilteredTasks();
        if (!selectedSprintId) {
            return filtered.filter(task => !task.sprintId);
        }
        return filtered.filter(task => task.sprintId === selectedSprintId);
    };

    const addTask = (taskData) => {
        const newTask = {
            ...taskData,
            id: Date.now(),
            status: addToColumn,
            sprintId: selectedSprintId
        };
        saveTasks([...tasks, newTask]);
        setShowModal(false);
    };

    const addSprint = (sprintData) => {
        const { startDate, endDate } = getSprintDates(sprints.length + 1);
        const newSprint = {
            id: Date.now(),
            number: sprints.length + 1,
            name: sprintData.name || `Sprint ${sprints.length + 1}`,
            goal: sprintData.goal || '',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
        setSprints([...sprints, newSprint]);
        setShowSprintModal(false);
        setSelectedSprintId(newSprint.id);
    };

    const editTask = (taskData) => {
        const updatedTasks = tasks.map(task =>
            task.id === taskData.id ? taskData : task
        );
        saveTasks(updatedTasks);
        setEditingTask(null);
        setOpenMenuId(null);
    };

    const deleteTask = (taskId) => {
        if (confirm('Are you sure you want to delete this task?')) {
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            saveTasks(updatedTasks);
            if (useFirebase && database) {
                database.ref('tasks/' + taskId).remove();
            }
            setEditingTask(null);
            setOpenMenuId(null);
        }
    };

    const addVendor = (vendorData) => {
        const newVendor = {
            ...vendorData,
            id: Date.now()
        };
        setVendorsList([...vendorsList, newVendor]);
        setShowVendorModal(false);
    };

    // === SNARKY COMMENT GENERATOR ===
    const getSnarkyComment = () => {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
        const dayOfWeek = today.getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const pick = (arr) => arr[(dayOfYear + arr.length) % arr.length];

        const ownerName = viewFilter !== 'all' ? teamMembers.find(m => m.id === viewFilter)?.name : null;

        const planSprint = sprints[planningActiveSprintIdx] || sprints[0];
        const kanbanSprint = sprints.find(s => s.id === selectedSprintId);
        const sprint = activeTab === 'planning' ? planSprint : kanbanSprint;
        const sprintNum = sprint ? sprint.number : 1;
        const isCurrent = sprint ? isCurrentSprint(sprint) : false;
        const isFuture = sprint ? isFutureSprint(sprint) : false;
        const isPast = sprint && !isCurrent && !isFuture;

        const weeksOut = sprint ? Math.max(0, Math.round((new Date(sprint.startDate) - today) / (7 * 86400000))) : 0;

        if (activeTab === 'kanban') {
            if (ownerName) {
                const personalJokes = [
                    `\uD83D\uDC40 ${ownerName}'s tasks only. If you're not ${ownerName}, avert your eyes or forever hold your peace.`,
                    `\uD83D\uDD12 Welcome to ${ownerName}'s private task kingdom. Trespassers will be assigned extra work.`,
                    `\uD83D\uDCCB ${ownerName}'s hit list. Not that kind. The productive kind. Probably.`,
                    `\uD83C\uDFAF Showing ${ownerName}'s tasks. Everyone else, go look busy somewhere.`,
                    `\uD83C\uDF31 ${ownerName}'s personal garden of responsibilities. Water them with effort.`,
                    `\u26A1 ${ownerName}'s to-do list has entered the chat. No pressure. (Lots of pressure.)`,
                    `\uD83C\uDFAA Ladies and gentlemen, presenting: the things ${ownerName} said they'd get done.`,
                    `\uD83D\uDD75\uFE0F ${ownerName}'s task file \u2014 classified. Well, not anymore.`,
                    `\uD83D\uDCAA ${ownerName}'s workload. If it seems like a lot, that's because it is.`,
                    `\uD83D\uDCCC Only ${ownerName}'s stuff here. The rest of you can relax. ${ownerName} cannot.`
                ];
                return pick(personalJokes);
            }

            const teamKanbanJokes = [
                `\uD83D\uDCCB The whole team's tasks for Sprint ${sprintNum}. Yes, all of them. Don't panic.`,
                `\uD83D\uDE80 Sprint ${sprintNum} Kanban \u2014 where dreams become checkboxes and checkboxes become done.`,
                `\u26A1 It's ${dayNames[dayOfWeek]}. Sprint ${sprintNum} won't finish itself. Or will it? No. It won't.`,
                `\uD83D\uDCCB Everything the team needs to crush this week. The microgreens are counting on you.`,
                `\uD83D\uDD25 Sprint ${sprintNum} task board. Move things to Done or the microgreens get it.`,
                `\uD83C\uDFAF Team board for Sprint ${sprintNum}. Remember: roadblocks are just speed bumps with attitude.`,
                `\uD83D\uDCBC Sprint ${sprintNum}: The stuff that needs doing. By humans. That's you.`,
                `\uD83C\uDF31 All hands on deck for Sprint ${sprintNum}. The greens wait for no one.`
            ];
            return pick(teamKanbanJokes);

        } else if (activeTab === 'planning') {
            if (isCurrent) {
                const currentJokes = [
                    `\uD83D\uDCCB Sprint ${sprintNum} is THIS WEEK. Drag tasks in, drag yourself out of bed, get it done.`,
                    `\u26A1 You're looking at Sprint ${sprintNum} \u2014 the one that's happening RIGHT NOW. Chop chop.`,
                    `\uD83D\uDD25 Sprint ${sprintNum} is live. If it's not in here, it's not getting done this week.`,
                    `\uD83C\uDFAF This is Sprint ${sprintNum}. It's happening. The backlog is watching. Drag and drop, people.`,
                    `\uD83D\uDCAA Sprint ${sprintNum}: currently active. Your backlog items are getting jealous of the ones already assigned.`,
                    `\uD83C\uDF31 Sprint ${sprintNum} is go time. Those microgreens aren't going to grow themselves. Wait\u2014they are. But YOUR tasks aren't.`
                ];
                return pick(currentJokes);
            } else if (isFuture) {
                const futureJokes = [
                    `\uD83D\uDD2E Sprint ${sprintNum} is ${weeksOut === 1 ? 'next week' : weeksOut + ' weeks out'}. Planning ahead? Look at you being all responsible.`,
                    `\uD83D\uDCC5 Future Sprint ${sprintNum} \u2014 ${weeksOut === 1 ? 'coming up next week' : weeksOut + ' weeks away'}. Load it up now so future-you doesn't hate present-you.`,
                    `\uD83D\uDE80 Sprint ${sprintNum} doesn't start for ${weeksOut === 1 ? 'another week' : weeksOut + ' weeks'}. But the early planner catches the... microgreen?`,
                    `\u231B You're ${weeksOut} week${weeksOut !== 1 ? 's' : ''} ahead looking at Sprint ${sprintNum}. The backlog appreciates your ambition.`,
                    `\uD83C\uDFAF Sprint ${sprintNum}: still in the future. Drag stuff here now so you can pretend to be organized later.`,
                    `\uD83C\uDF31 Sprint ${sprintNum} is coming in ${weeksOut} week${weeksOut !== 1 ? 's' : ''}. Pre-loading tasks is basically time travel.`
                ];
                return pick(futureJokes);
            } else if (isPast) {
                const pastJokes = [
                    `\uD83D\uDCDC Sprint ${sprintNum} is ancient history. Hopefully the good kind, not the "we don't talk about that" kind.`,
                    `\uD83D\uDD70\uFE0F Looking back at Sprint ${sprintNum}. Nostalgia hits different when it's a task list.`,
                    `\uD83D\uDCCB Sprint ${sprintNum}: completed. Feel free to admire your past productivity.`,
                    `\u23EA Sprint ${sprintNum} is in the rearview. What's done is done. Unless it's not done. Then yikes.`
                ];
                return pick(pastJokes);
            }

            const defaultPlanningJokes = [
                `\uD83D\uDCCB Backlog + Sprints = your master plan. Drag tasks from left to right. It's that simple. (It's never that simple.)`,
                `\uD83D\uDDC2\uFE0F The backlog is everything you need to do. The sprints are when you'll actually do them. Hopefully.`,
                `\uD83D\uDCCB Plan your sprints here. Your backlog has ${tasks.filter(t => !t.sprintId).length} tasks waiting. They're very patient. For now.`,
                `\uD83C\uDF31 Sprint Planning HQ. Grab a task, drop it in a sprint, feel accomplished. Repeat.`
            ];
            return pick(defaultPlanningJokes);

        } else if (activeTab === 'calendar') {
            const calJokes = [
                `\uD83D\uDDD3\uFE0F The calendar view. Because sometimes you need to see the chaos laid out in neat little boxes.`,
                `\uD83D\uDCC5 Your schedule, visualized. Each box is a tiny container of responsibility.`,
                `\uD83D\uDDD3\uFE0F Calendar mode: where you realize ${dayNames[dayOfWeek]} was supposed to be productive.`,
                `\uD83D\uDCC5 Look at all these days. So many opportunities to move tasks to "Done."`
            ];
            return pick(calJokes);
        } else if (activeTab === 'vendors') {
            const vendorJokes = [
                `\uD83C\uDFEA Vendor contacts \u2014 the people who make it all possible. Call them. Email them. Send carrier pigeons.`,
                `\uD83D\uDCDE Your vendor rolodex. Yes, we said rolodex. We're bringing it back.`,
                `\uD83E\uDD1D Vendor directory \u2014 keeping track of the people who keep us in business.`
            ];
            return pick(vendorJokes);
        }

        return `\uD83C\uDF31 Let's get it done today, team.`;
    };

    return (
        <div className="app-container">
            {!useFirebase && (
                <div className="setup-banner">
                    <h3>{'\uD83D\uDD27'} Firebase Setup Required for Team Collaboration</h3>
                    <p>
                        Currently running in single-user mode. To enable real-time collaboration with Halie and Ricardo,
                        you need to add your Firebase configuration. Instructions below! For now, you can use this locally
                        and it will save to your browser.
                    </p>
                </div>
            )}

            <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', margin: 0 }}>{'\uD83C\uDF31'} Mico's Micro Farm Agile</h1>
                    <div className="header-subtitle" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                        Keeping ourselves in line so we can take over the world
                        {useFirebase && synced && (
                            <span className="sync-status">
                                <span className="sync-dot"></span>
                                Live Sync
                            </span>
                        )}
                    </div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)',
                    border: '1px solid #bbf7d0', borderRadius: '10px',
                    padding: '8px 16px', maxWidth: '55%', textAlign: 'right'
                }}>
                    <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '500', fontStyle: 'italic', lineHeight: '1.3' }}>
                        {'\u2728'} {getSnarkyComment()}
                    </span>
                </div>
            </div>

            <div className="tabs" style={{ padding: '4px', gap: '4px', marginBottom: '10px' }}>
                <button className={`tab ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => setActiveTab('kanban')} style={{ padding: '8px 18px', fontSize: '13px' }}>
                    {'\uD83D\uDCCB'} Kanban
                </button>
                <button className={`tab ${activeTab === 'planning' ? 'active' : ''}`} onClick={() => setActiveTab('planning')} style={{ padding: '8px 18px', fontSize: '13px' }}>
                    {'\uD83D\uDCCB'} Planning
                </button>
                <button className={`tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')} style={{ padding: '8px 18px', fontSize: '13px' }}>
                    {'\uD83D\uDDD3\uFE0F'} Calendar
                </button>
                <button className={`tab ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setActiveTab('vendors')} style={{ padding: '8px 18px', fontSize: '13px' }}>
                    {'\uD83D\uDC65'} Vendors
                </button>
            </div>

            {activeTab === 'kanban' && (
                <>
                    {sprints.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px' }}>
                            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--text-secondary)' }}>No Sprints Created Yet</h2>
                            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>Create your first sprint to start planning!</p>
                            <button className="btn-create-sprint" onClick={() => setShowSprintModal(true)}>
                                + Create First Sprint
                            </button>
                        </div>
                    ) : (
                        <>
                            {selectedSprintId && sprints.find(s => s.id === selectedSprintId) && (
                                <SprintHeader
                                    sprint={sprints.find(s => s.id === selectedSprintId)}
                                    sprints={sprints}
                                    selectedSprintId={selectedSprintId}
                                    onSelectSprint={setSelectedSprintId}
                                    viewFilter={viewFilter}
                                    onViewFilterChange={setViewFilter}
                                    onCreateSprint={() => setShowSprintModal(true)}
                                />
                            )}
                            <KanbanBoard
                                tasks={getSprintTasks()}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onAddTask={(columnId) => {
                                    setAddToColumn(columnId);
                                    setShowModal(true);
                                }}
                                openMenuId={openMenuId}
                                onToggleMenu={setOpenMenuId}
                                onEditTask={setEditingTask}
                                onDeleteTask={deleteTask}
                                onMoveTask={(taskId, newStatus) => {
                                    const updatedTasks = tasks.map(task =>
                                        task.id === taskId ? { ...task, status: newStatus } : task
                                    );
                                    saveTasks(updatedTasks);
                                    setOpenMenuId(null);
                                }}
                            />
                        </>
                    )}
                </>
            )}

            {activeTab === 'planning' && (
                <PlanningBoard
                    tasks={tasks}
                    sprints={sprints}
                    onDragStart={handleDragStart}
                    onDrop={handlePlanningDrop}
                    onReorderBacklog={reorderBacklog}
                    onCreateSprint={() => setShowSprintModal(true)}
                    onActiveSprintChange={setPlanningActiveSprintIdx}
                />
            )}
            {activeTab === 'calendar' && <CalendarView tasks={tasks} />}
            {activeTab === 'vendors' && (
                <VendorsView
                    vendors={vendorsList}
                    onAddVendor={() => setShowVendorModal(true)}
                />
            )}

            {showModal && (
                <TaskModal
                    onClose={() => setShowModal(false)}
                    onSave={addTask}
                />
            )}

            {editingTask && (
                <TaskModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                    onSave={editTask}
                    onDelete={deleteTask}
                />
            )}

            {showVendorModal && (
                <VendorModal
                    onClose={() => setShowVendorModal(false)}
                    onSave={addVendor}
                />
            )}

            {showSprintModal && (
                <SprintModal
                    onClose={() => setShowSprintModal(false)}
                    onSave={addSprint}
                    sprintNumber={sprints.length + 1}
                />
            )}
        </div>
    );
}
