import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { AlertProvider } from '../contexts/AlertContext';
import { useAppData } from '../hooks/useAppData';
import { useDemoOverlay } from '../hooks/useDemoOverlay';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNewOrderNotifier } from '../hooks/useNewOrderNotifier';
import Layout from './Layout';
import TaskModal from './modals/TaskModal';
import VendorModal from './modals/VendorModal';
import SprintModal from './modals/SprintModal';
import CompletionModal from './modals/CompletionModal';
import DevRequestModal from './modals/DevRequestModal';
import NotificationPermissionModal from './modals/NotificationPermissionModal';
import RoadblockModal from './modals/RoadblockModal';
import DevToolbar from './DevToolbar';
import Alert from './ui/Alert';
import PageLoader from './ui/PageLoader';
import RoleGuard from './RoleGuard';

// ── Route-level code splitting ───────────────────────────────────────────────
// Each route component is lazy-loaded in its own chunk to eliminate the
// monolithic 1.8MB bundle that caused TDZ initialization crashes.
const Dashboard = lazy(() => import('./Dashboard'));
const KanbanBoard = lazy(() => import('./KanbanBoard'));
const PlanningBoard = lazy(() => import('./PlanningBoard'));
const CalendarView = lazy(() => import('./CalendarView'));
const VendorsView = lazy(() => import('./VendorsView'));
const InventoryAlerts = lazy(() => import('./InventoryAlerts'));
const BudgetTracker = lazy(() => import('./BudgetTracker'));
const GrowthTracker = lazy(() => import('./GrowthTracker'));
const BatchLogger = lazy(() => import('./BatchLogger'));
const HarvestLogger = lazy(() => import('./HarvestLogger'));
const ProductManager = lazy(() => import('./ProductManager'));
const CustomerManager = lazy(() => import('./CustomerManager'));
const OrderManager = lazy(() => import('./OrderManager'));
const OrderFulfillmentBoard = lazy(() => import('./orders/OrderFulfillmentBoard'));
const SowingSchedule = lazy(() => import('./SowingSchedule'));
const ActivityLog = lazy(() => import('./ActivityLog'));
const CrewDailyBoard = lazy(() => import('./CrewDailyBoard'));
const PipelineDashboard = lazy(() => import('./PipelineDashboard'));
const FarmDashboard = lazy(() => import('./FarmDashboard'));
const DeliveryTracker = lazy(() => import('./DeliveryTracker'));
const EndOfDayReport = lazy(() => import('./EndOfDayReport'));
const ChefCatalog = lazy(() => import('./ChefCatalog'));
const ChefCart = lazy(() => import('./ChefCart'));
const ChefOrders = lazy(() => import('./ChefOrders'));
const HarvestQueue = lazy(() => import('./HarvestQueue'));
const PackingList = lazy(() => import('./PackingList'));
const SettingsPage = lazy(() => import('./SettingsPage'));
const AdminPanel = lazy(() => import('./AdminPanel'));
const ShopifySync = lazy(() => import('./admin/ShopifySync'));
const ShopifyChefOrders = lazy(() => import('./orders/ShopifyChefOrders'));
const AlertsList = lazy(() => import('./Alerts/AlertsList'));
const CropProfiles = lazy(() => import('./CropProfiles'));
const SowingCalculator = lazy(() => import('./SowingCalculator'));
const PlantingSchedule = lazy(() => import('./PlantingSchedule'));
const BatchTracker = lazy(() => import('./BatchTracker'));
const RevenueDashboard = lazy(() => import('./business/RevenueDashboard'));
const CustomerAnalytics = lazy(() => import('./business/CustomerAnalytics'));
const ProductAnalytics = lazy(() => import('./business/ProductAnalytics'));
const CostTracking = lazy(() => import('./business/CostTracking'));
const BusinessReports = lazy(() => import('./business/BusinessReports'));

/**
 * All authenticated routes. Data flows from three extracted hooks:
 *   useAppData      → Firestore subscriptions, mutations, side effects
 *   useDemoOverlay  → Demo-aware data aliases + guards
 *   useAppHandlers  → All event handler callbacks
 */
export default function AppRoutes({ user, farmId, role: actualRole, onLogout, isDemo }) {
  const [impersonatedRole, setImpersonatedRole] = useState(null);
  const role = (actualRole === 'admin' && impersonatedRole) ? impersonatedRole : actualRole;

  const { isDemoMode } = useDemoMode();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // ── Data Layer (all Firestore subscriptions + side effects) ────────────────
  const data = useAppData(farmId, user, role, isDemoMode);

  // ── Demo Mode Overlay ──────────────────────────────────────────────────────
  const demo = useDemoOverlay(data);

  // ── New order alert (admin/manager gets toast when chef places order) ──────
  useNewOrderNotifier(demo.orders, role);

  // ── Local UI State ─────────────────────────────────────────────────────────
  const [viewFilter, setViewFilter] = useState('all');
  const [taskModal, setTaskModal] = useState(null);
  const [planningTargetSprint, setPlanningTargetSprint] = useState(null);
  const [vendorModal, setVendorModal] = useState(false);
  const [sprintModal, setSprintModal] = useState(false);
  const [cart, setCart] = useState([]);
  const [completionModal, setCompletionModal] = useState(null);
  const [roadblockModal, setRoadblockModal] = useState(null);
  const [devRequestModal, setDevRequestModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Delay notification permission ask by 5 seconds after mount
  useEffect(() => {
    const timer = setTimeout(() => setShowNotificationModal(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const h = useAppHandlers({
    data,
    taskModal, setTaskModal,
    completionModal, setCompletionModal,
    roadblockModal, setRoadblockModal,
    setVendorModal, setSprintModal, setDevRequestModal,
    cart, setCart,
    setPlanningTargetSprint,
    user, farmId, navigate, addToast,
  });

  // ── Computed values ────────────────────────────────────────────────────────
  const sprint = demo.sprints.find(s => s.id === demo.selectedSprintId);
  const backlogCount = demo.tasks.filter(t => !t.sprintId).length;
  const snarkyContext = { viewFilter, sprint, backlogCount };

  const activeErrors = [
    data.tasksError && 'Tasks', data.sprintsError && 'Sprints',
    data.batchesError && 'Production', data.productsError && 'Products',
    data.ordersError && 'Orders', data.customersError && 'Customers',
    data.budgetError && 'Budget', data.inventoryError && 'Inventory',
    data.activitiesError && 'Activity', data.deliveriesError && 'Deliveries',
    data.teamError && 'Team',
  ].filter(Boolean);

  // Collect actual error messages for diagnostics
  const firstErrorMsg = [
    data.tasksError, data.sprintsError, data.batchesError,
    data.productsError, data.ordersError, data.customersError,
    data.budgetError, data.inventoryError, data.activitiesError,
    data.deliveriesError, data.teamError,
  ].find(e => e && typeof e === 'string');

  const defaultRoute =
    role === 'chef'     ? '/shop'  :
    role === 'employee' ? '/crew'  :
    '/dashboard';

  return (
    <AlertProvider farmId={farmId}>
      {/* Global error banner — shows if any Firestore subscription fails */}
      {!isDemoMode && activeErrors.length > 0 && (
        <Alert
          variant="error"
          message={`⚠️ Connection issue with: ${activeErrors.join(', ')} — data may be stale.${firstErrorMsg ? ` (${firstErrorMsg})` : ''} [farmId=${farmId || 'null'}, user=${user?.email || 'none'}, conn=${data.connStatus}]`}
          action={{ label: 'Refresh', onClick: () => window.location.reload() }}
        />
      )}
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout user={user} role={role} farmId={farmId} onLogout={onLogout} snarkyContext={snarkyContext} onDevRequest={() => setDevRequestModal(true)} isDemo={isDemo} />}>
          <Route index element={<Navigate to={defaultRoute} replace />} />

          {/* ── Management routes (admin + manager) ── */}
          <Route
            path="kanban"
            element={
              <KanbanBoard
                loading={demo.dl(data.tasksLoading || data.sprintsLoading)}
                tasks={demo.tasks}
                sprints={demo.sprints}
                selectedSprintId={demo.selectedSprintId}
                onSelectSprint={data.setSelectedSprintId}
                viewFilter={viewFilter}
                onViewFilterChange={setViewFilter}
                onAddTask={h.handleAddTask}
                onEditTask={h.handleEditTask}
                onDeleteTask={demo.dg(h.handleDeleteTask)}
                onMoveTaskStatus={isDemoMode ? demo.demoMoveTaskStatus : h.handleMoveTaskStatus}
                onMoveTaskToColumn={isDemoMode ? demo.demoMoveTaskStatus : h.handleMoveTaskToColumn}
                onReorderColumnTasks={demo.dg(data.reorderColumnTasks)}
                onCreateSprint={h.handleCreateSprint}
                error={demo.de(data.tasksError || data.sprintsError)}
              />
            }
          />
          <Route
            path="planning"
            element={
              <PlanningBoard
                loading={demo.dl(data.tasksLoading || data.sprintsLoading)}
                tasks={demo.tasks}
                sprints={demo.sprints}
                onMoveTaskToSprint={demo.dg(data.moveTaskToSprint)}
                onMoveTaskSprint={demo.dg(data.moveTaskSprint)}
                onMoveTaskStatus={isDemoMode ? demo.demoMoveTaskStatus : h.handleMoveTaskStatus}
                onUpdateTask={demo.dg(data.editTask)}
                onCreateSprint={h.handleCreateSprint}
                onEditTask={h.handleEditTask}
                onDeleteTask={demo.dg(h.handleDeleteTask)}
                onAddTask={h.handleAddTaskWithDefaults}
                namingOverrides={data.namingOverrides}
                onRenameEpic={demo.dg(data.handleRenameEpic)}
                onRenameFeature={demo.dg(data.handleRenameFeature)}
                targetSprintId={planningTargetSprint}
                error={demo.de(data.tasksError || data.sprintsError)}
              />
            }
          />
          <Route path="calendar" element={<CalendarView loading={demo.dl(data.tasksLoading || data.sprintsLoading)} tasks={demo.tasks} sprints={demo.sprints} onGoToSprint={h.handleGoToSprint} />} />
          <Route
            path="vendors"
            element={
              <VendorsView
                loading={demo.dl(data.vendorsLoading)}
                vendors={demo.vendors}
                onAddVendor={h.handleAddVendor}
                onViewActivity={(vendorId, vendorName) =>
                  navigate('/activity', { state: { contactId: vendorId, contactName: vendorName } })
                }
                farmId={farmId}
              />
            }
          />
          <Route
            path="inventory"
            element={
              <InventoryAlerts
                loading={demo.dl(data.inventoryLoading)}
                inventory={demo.inventory}
                orders={demo.orders}
                activeBatches={demo.activeBatches}
                onAdd={demo.dg(data.addItem)}
                onEdit={demo.dg(data.editItem)}
                onRemove={demo.dg(data.removeItem)}
                farmId={farmId}
              />
            }
          />
          <Route
            path="budget"
            element={
              <BudgetTracker
                loading={demo.dl(data.budgetLoading)}
                expenses={demo.expenses}
                revenue={demo.revenue}
                infrastructure={demo.infrastructure}
                onAddExpense={demo.dg(data.addExpense)}
                onAddProject={demo.dg(data.addProject)}
                onEditProject={demo.dg(data.editProject)}
                onDeleteProject={demo.dg(data.removeProject)}
                error={demo.de(data.budgetError)}
              />
            }
          />
          <Route
            path="production"
            element={
              <GrowthTracker
                loading={demo.dl(data.batchesLoading)}
                activeBatches={demo.activeBatches}
                readyBatches={demo.readyBatches}
                onAdvanceStage={demo.dg(data.advanceStage)}
              />
            }
          />
          <Route path="production/log" element={
            <RoleGuard allow={['admin', 'manager', 'employee']} role={role}>
              <BatchLogger onAddBatch={demo.dg(data.addBatch)} />
            </RoleGuard>
          } />
          <Route
            path="production/harvest"
            element={
              <RoleGuard allow={['admin', 'manager', 'employee']} role={role}>
                <HarvestLogger loading={demo.dl(data.batchesLoading)} readyBatches={demo.readyBatches} onHarvest={demo.dg(data.harvestBatch)} />
              </RoleGuard>
            }
          />
          <Route
            path="sowing"
            element={
              <SowingSchedule
                loading={demo.dl(data.ordersLoading || data.batchesLoading)}
                orders={demo.orders}
                activeBatches={demo.activeBatches}
                onAddBatch={demo.dg(data.addBatch)}
              />
            }
          />
          <Route
            path="crop-profiles"
            element={
              <CropProfiles
                profiles={demo.cropProfiles}
                loading={demo.dl(data.cropProfilesLoading)}
                error={demo.de(data.cropProfilesError)}
                onAddProfile={demo.dg(data.addCropProfile)}
                onEditProfile={demo.dg(data.editCropProfile)}
                onDeleteProfile={demo.dg(data.removeCropProfile)}
              />
            }
          />
          <Route
            path="sowing-calculator"
            element={
              <SowingCalculator
                cropProfiles={demo.cropProfiles}
                shopifyOrders={demo.shopifyOrders}
                onAddBatch={demo.dg(data.addBatch)}
                onAddTask={demo.dg(data.addTask)}
                farmId={farmId}
                loading={demo.dl(data.cropProfilesLoading)}
              />
            }
          />
          <Route
            path="planting-schedule"
            element={
              <PlantingSchedule
                batches={demo.batches}
                cropProfiles={demo.cropProfiles}
                loading={demo.dl(data.batchesLoading)}
              />
            }
          />
          <Route
            path="batch-tracker"
            element={
              <BatchTracker
                batches={demo.batches}
                loading={demo.dl(data.batchesLoading)}
                onEditBatch={demo.dg(data.editBatch)}
                onHarvestBatch={demo.dg(data.harvestBatch)}
              />
            }
          />
          <Route
            path="activity"
            element={
              <ActivityLog
                loading={demo.dl(data.activitiesLoading)}
                activities={demo.activities}
                vendors={demo.vendors}
                customers={demo.customers}
                onDeleteActivity={demo.dg(data.deleteActivity)}
                error={demo.de(data.activitiesError)}
              />
            }
          />
          <Route
            path="products"
            element={
              <ProductManager
                loading={demo.dl(data.productsLoading)}
                products={demo.products}
                onAddProduct={demo.dg(data.addProduct)}
                onEditProduct={demo.dg(data.editProduct)}
                onDeleteProduct={demo.dg(data.removeProduct)}
                farmId={farmId}
              />
            }
          />
          <Route
            path="customers"
            element={
              <CustomerManager
                shopifyCustomers={demo.shopifyCustomers}
                loading={demo.dl(data.shopifyCustomersLoading)}
                farmId={farmId}
              />
            }
          />
          <Route
            path="orders"
            element={
              <OrderFulfillmentBoard
                loading={demo.dl(data.ordersLoading || data.shopifyOrdersLoading)}
                orders={demo.orders}
                shopifyOrders={demo.shopifyOrders}
                shopifyCustomers={demo.shopifyCustomers}
                onAdvanceStatus={isDemoMode ? demo.demoAdvanceOrderStatus : h.handleAdvanceOrderStatus}
                onUpdateOrder={demo.dg(h.handleUpdateOrder)}
                farmId={farmId}
              />
            }
          />
          <Route
            path="dashboard"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <Dashboard
                  loading={demo.dl(data.tasksLoading || data.sprintsLoading)}
                  farmId={farmId}
                  tasks={demo.tasks}
                  sprints={demo.sprints}
                  activities={demo.activities}
                  orders={demo.orders}
                  activeBatches={demo.activeBatches}
                  batches={demo.batches}
                  todayDeliveries={demo.todayDeliveries}
                  shopifyCustomers={demo.shopifyCustomers}
                  shopifyOrders={demo.shopifyOrders}
                  user={user}
                  refresh={data.refresh}
                />
              </RoleGuard>
            }
          />
          <Route
            path="crew"
            element={
              <RoleGuard allow={['admin', 'manager', 'employee']} role={role}>
                <CrewDailyBoard
                  loading={demo.dl(data.ordersLoading || data.batchesLoading)}
                  orders={demo.orders}
                  activeBatches={demo.activeBatches}
                  onPlantBatch={demo.dg(data.plantCrewBatch)}
                  onAdvanceStage={demo.dg(data.advanceCrewStage)}
                  onHarvestBatch={demo.dg(data.harvestCrewBatch)}
                  onEditBatch={demo.dg(data.editBatch)}
                  user={user}
                  error={demo.de(data.ordersError || data.batchesError)}
                />
              </RoleGuard>
            }
          />
          <Route
            path="pipeline"
            element={<PipelineDashboard loading={demo.dl(data.batchesLoading || data.ordersLoading)} batches={demo.batches} orders={demo.orders} />}
          />
          <Route
            path="farm"
            element={
              <RoleGuard allow={['admin', 'manager', 'employee']} role={role}>
                <FarmDashboard
                  activeBatches={demo.activeBatches}
                  readyBatches={demo.readyBatches}
                  loading={demo.dl(data.batchesLoading)}
                />
              </RoleGuard>
            }
          />
          <Route
            path="deliveries"
            element={
              <RoleGuard allow={['admin', 'manager', 'driver']} role={role}>
                <DeliveryTracker loading={demo.dl(data.deliveriesLoading)} deliveries={demo.deliveries} error={demo.de(data.deliveriesError)} />
              </RoleGuard>
            }
          />
          <Route
            path="reports"
            element={<EndOfDayReport loading={demo.dl(data.batchesLoading || data.ordersLoading)} batches={demo.batches} orders={demo.orders} />}
          />
          <Route
            path="business/revenue"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <RevenueDashboard shopifyOrders={demo.shopifyOrders} loading={demo.dl(data.shopifyOrdersLoading)} />
              </RoleGuard>
            }
          />
          <Route
            path="business/customers"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <CustomerAnalytics shopifyOrders={demo.shopifyOrders} shopifyCustomers={demo.shopifyCustomers} loading={demo.dl(data.shopifyOrdersLoading)} />
              </RoleGuard>
            }
          />
          <Route
            path="business/products"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <ProductAnalytics shopifyOrders={demo.shopifyOrders} shopifyCustomers={demo.shopifyCustomers} loading={demo.dl(data.shopifyOrdersLoading)} />
              </RoleGuard>
            }
          />
          <Route
            path="business/costs"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <CostTracking
                  costs={demo.costs}
                  shopifyOrders={demo.shopifyOrders}
                  cropProfiles={demo.cropProfiles}
                  onAddCost={demo.dg(data.addCost)}
                  onEditCost={demo.dg(data.editCostFn)}
                  onRemoveCost={demo.dg(data.removeCost)}
                  onEditCropProfile={demo.dg(data.editCropProfile)}
                  loading={demo.dl(data.costsLoading || data.shopifyOrdersLoading)}
                />
              </RoleGuard>
            }
          />
          <Route
            path="business/reports"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <BusinessReports
                  shopifyOrders={demo.shopifyOrders}
                  shopifyCustomers={demo.shopifyCustomers}
                  costs={demo.costs}
                  reports={demo.biReports}
                  saveReport={demo.dg(data.saveReport)}
                  user={user}
                  loading={demo.dl(data.shopifyOrdersLoading)}
                />
              </RoleGuard>
            }
          />
          <Route
            path="harvest-queue"
            element={
              <HarvestQueue
                farmId={farmId}
                orders={demo.orders}
                loading={demo.dl(data.ordersLoading)}
              />
            }
          />
          <Route
            path="packing-list"
            element={
              <PackingList
                orders={demo.orders}
                onAdvanceStatus={isDemoMode ? demo.demoAdvanceOrderStatus : h.handleAdvanceOrderStatus}
                loading={demo.dl(data.ordersLoading)}
              />
            }
          />

          {/* ── Chef routes ── */}
          <Route
            path="shop"
            element={
              <RoleGuard allow={['chef', 'admin', 'manager']} role={role}>
                <ChefCatalog
                  loading={demo.dl(data.productsLoading)}
                  products={demo.availableProducts}
                  cart={cart}
                  onAddToCart={h.handleAddToCart}
                  error={demo.de(data.productsError)}
                />
              </RoleGuard>
            }
          />
          <Route
            path="cart"
            element={
              <RoleGuard allow={['chef', 'admin', 'manager']} role={role}>
                <ChefCart
                  cart={cart}
                  onUpdateQty={h.handleUpdateCartQty}
                  onPlaceOrder={h.handlePlaceOrder}
                />
              </RoleGuard>
            }
          />
          <Route
            path="my-orders"
            element={
              <RoleGuard allow={['chef', 'admin', 'manager']} role={role}>
                <ChefOrders
                  loading={demo.dl(data.ordersLoading)}
                  orders={demo.orders}
                  onReorder={h.handleReorder}
                  refresh={data.refresh}
                  error={demo.de(data.ordersError)}
                />
              </RoleGuard>
            }
          />

          <Route path="settings" element={<SettingsPage user={user} farmId={farmId} role={role} />} />
          <Route
            path="alerts"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <AlertsList farmId={farmId} />
              </RoleGuard>
            }
          />
          <Route
            path="shopify-sync"
            element={
              <RoleGuard allow={['admin']} role={role}>
                <ShopifySync farmId={farmId} user={user} />
              </RoleGuard>
            }
          />
          <Route
            path="chef-orders"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <ShopifyChefOrders
                  shopifyOrders={demo.shopifyOrders}
                  loading={demo.dl(data.shopifyOrdersLoading)}
                />
              </RoleGuard>
            }
          />
          <Route
            path="admin"
            element={
              <RoleGuard allow={['admin', 'manager']} role={role}>
                <AdminPanel
                  user={user}
                  farmId={farmId}
                  role={role}
                  members={data.teamMembers_live}
                  invites={data.teamInvites}
                  teamLoading={data.teamLoading}
                />
              </RoleGuard>
            }
          />
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Route>
      </Routes>
      </Suspense>

      {/* === Modals (rendered above routes) === */}
      {taskModal && (
        <TaskModal
          task={taskModal.mode === 'edit' ? taskModal.task : null}
          defaultValues={taskModal.mode === 'add' ? (taskModal.defaults || {}) : {}}
          sprints={demo.sprints}
          allTasks={demo.tasks}
          teamMembers={data.allTeamMembers}
          onClose={() => setTaskModal(null)}
          onSave={isDemoMode ? async () => setTaskModal(null) : h.handleSaveTask}
          onDelete={isDemoMode ? async () => setTaskModal(null) : h.handleDeleteTask}
          onNavigateToTask={(linkedId) => {
            setTaskModal(null);
            const linked = demo.tasks.find(t => t.id === linkedId);
            if (linked) {
              setTimeout(() => setTaskModal({ mode: 'edit', task: linked }), 100);
            }
          }}
        />
      )}
      {vendorModal && (
        <VendorModal
          onClose={() => setVendorModal(false)}
          onSave={h.handleSaveVendor}
        />
      )}
      {sprintModal && (
        <SprintModal
          sprintNumber={demo.sprints.length + 1}
          onClose={() => setSprintModal(false)}
          onSave={isDemoMode ? async () => setSprintModal(false) : h.handleSaveSprint}
        />
      )}
      {completionModal && (
        <CompletionModal
          task={completionModal.task}
          vendors={demo.vendors}
          customers={demo.customers}
          onSave={isDemoMode ? async () => setCompletionModal(null) : h.handleCompletionSave}
          onSkip={isDemoMode ? async () => setCompletionModal(null) : h.handleCompletionSkip}
        />
      )}
      {roadblockModal && (
        <RoadblockModal
          task={roadblockModal.task}
          teamMembers={data.allTeamMembers}
          onSubmit={h.handleRoadblockSubmit}
          onSkip={h.handleRoadblockSkip}
        />
      )}
      {devRequestModal && (
        <DevRequestModal
          onSubmit={h.handleSubmitDevRequest}
          onClose={() => setDevRequestModal(false)}
        />
      )}
      {showNotificationModal && (
        <NotificationPermissionModal
          farmId={farmId}
          userId={user?.uid}
          onClose={() => setShowNotificationModal(false)}
        />
      )}

      {/* Dev toolbar — only visible to admins */}
      <DevToolbar
        actualRole={actualRole}
        activeRole={role}
        onImpersonate={setImpersonatedRole}
        user={user}
        farmId={farmId}
        dataDiag={data.dataDiag}
      />
    </AlertProvider>
  );
}
