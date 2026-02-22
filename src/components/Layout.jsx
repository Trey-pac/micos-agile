import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getSnarkyComment } from '../utils/snarkyComments';
import { useTheme } from '../contexts/ThemeContext';
import { useFarmConfig } from '../contexts/FarmConfigContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import MobileNav from './MobileNav';
import NavDropdown from './NavDropdown';
import AlertsBadge from './Alerts/AlertsBadge';
import { Button } from './ui/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/Popover';
import {
  Home, LayoutList, PenTool, Calendar, FileText,
  Sprout, Dna, Calculator, CalendarDays, Package, Leaf,
  BarChart3, HardHat, ClipboardList, ChefHat,
  Wheat, Truck, ShoppingBag, Users, TrendingUp,
  DollarSign, LineChart, PiggyBank, Warehouse,
  Handshake, FileBarChart, Shield, Settings, Link,
  Bell, Sun, Moon, Monitor, Sparkles, Target,
  LogOut, Wrench, Timer,
} from 'lucide-react';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };
const THEME_NEXT  = { light: 'dark', dark: 'system', system: 'light' };
const THEME_LABEL = { light: 'Light mode', dark: 'Dark mode', system: 'System' };

// ── Scroll progress bar ───────────────────────────────────────────────────────
function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const p = scrollHeight - clientHeight > 10
        ? (scrollTop / (scrollHeight - clientHeight)) * 100
        : 0;
      setPct(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (pct <= 2) return null;
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[200] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-green-400 to-cyan-400 transition-[width] duration-100"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Shared layout — nav bar, header with snarky comments, user menu.
 *
 * Wraps all authenticated routes via <Outlet />.
 * Receives context props so the snarky comment generator can be context-aware.
 *
 * Employee role: no nav bar rendered — CrewDailyBoard is their entire app.
 */
export default function Layout({ user, role, farmId, onLogout, snarkyContext, onDevRequest, isDemo }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { config: farmConfig } = useFarmConfig();
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [demoToggling, setDemoToggling] = useState(false);

  const handleDemoToggle = async () => {
    setDemoToggling(true);
    await toggleDemoMode();
    setDemoToggling(false);
  };

  const activeRoute = location.pathname.split('/')[1] || 'kanban';
  const comment = getSnarkyComment(activeRoute, snarkyContext);

  const ThemeIcon = THEME_ICONS[theme];

  // ── Grouped admin nav: 7 top-level items instead of 21 ──
  // Direct links (no dropdown)
  const adminNavDirect = [
    { to: '/dashboard', label: 'Home', icon: Home },
  ];
  // Dropdown groups
  const adminNavGroups = [
    {
      label: 'Planning', icon: LayoutList, items: [
        { to: '/kanban',    label: 'Kanban Board', icon: LayoutList },
        { to: '/planning',  label: 'Sprint Planning', icon: PenTool },
        { to: '/calendar',  label: 'Calendar', icon: Calendar },
        { to: '/activity',  label: 'Activity Log', icon: FileText },
      ],
    },
    {
      label: 'Growing', icon: Sprout, items: [
        { to: '/farm',               label: 'Farm View', icon: Home },
        { to: '/crop-profiles',      label: 'Crop Profiles', icon: Dna },
        { to: '/sowing-calculator',  label: 'Sowing Calculator', icon: Calculator },
        { to: '/planting-schedule',  label: 'Planting Schedule', icon: CalendarDays },
        { to: '/batch-tracker',      label: 'Batch Tracker', icon: Package },
        { to: '/production',         label: 'Growth Tracker', icon: Leaf },
        { to: '/sowing',             label: 'Sowing Schedule', icon: Sprout },
        { to: '/pipeline',           label: 'Pipeline', icon: BarChart3 },
        { to: '/crew',               label: 'Crew Board', icon: HardHat },
      ],
    },
    {
      label: 'Orders', icon: Package, items: [
        { to: '/orders',        label: 'Order Board', icon: ClipboardList },
        { to: '/chef-orders',   label: 'Chef Orders', icon: ChefHat },
        { to: '/harvest-queue', label: 'Harvest Queue', icon: Wheat },
        { to: '/packing-list',  label: 'Packing List', icon: Package },
        { to: '/deliveries',    label: 'Deliveries', icon: Truck },
      ],
    },
    {
      label: 'Storefront', icon: ShoppingBag, items: [
        { to: '/products',           label: 'Products', icon: ShoppingBag },
        { to: '/customers',          label: 'Customers', icon: ChefHat },
      ],
    },
    {
      label: 'Business', icon: DollarSign, items: [
        { to: '/business/revenue',   label: 'Revenue', icon: TrendingUp },
        { to: '/business/customers', label: 'Customer Analytics', icon: Users },
        { to: '/business/products',  label: 'Product Analytics', icon: BarChart3 },
        { to: '/business/costs',     label: 'Cost Tracking', icon: DollarSign },
        { to: '/business/reports',   label: 'BI Reports', icon: LineChart },
        { to: '/budget',             label: 'Budget', icon: PiggyBank },
        { to: '/inventory',          label: 'Inventory', icon: Warehouse },
        { to: '/vendors',            label: 'Vendors', icon: Handshake },
        { to: '/reports',            label: 'End of Day', icon: FileBarChart },
      ],
    },
    {
      label: 'Admin', icon: Settings, items: [
        { to: '/admin',    label: 'Team & Roles', icon: Shield },
        { to: '/settings', label: 'Settings', icon: Settings },
        { to: '/shopify-sync', label: 'Shopify Sync', icon: Link },
        { to: '/alerts', label: 'Alerts', icon: Bell },
      ],
    },
  ];

  const chefNavItems = [
    { to: '/shop', label: 'Shop', icon: ShoppingBag },
    { to: '/cart', label: 'Cart', icon: Package },
    { to: '/my-orders', label: 'My Orders', icon: ClipboardList },
  ];
  // Employee role gets no nav bar — their entire app is one screen (/crew)
  // For chef: flat array; for admin/manager: grouped (direct + dropdowns)
  const isAdminNav = role !== 'chef' && role !== 'employee';
  const navItems = role === 'chef' ? chefNavItems : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Scroll progress bar */}
      <ScrollProgress />

      {/* Demo mode banner */}
      {isDemo && (
        <div className="bg-amber-500 text-white text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-3">
          <Target className="h-4 w-4 animate-pulse" />
          <span>You&apos;re exploring a demo farm — data resets in 24 hours</span>
          <Button variant="ghost" size="sm" onClick={onLogout} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold">
            Exit Demo
          </Button>
        </div>
      )}

      {/* ===== DEMO MODE BANNER ===== */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 text-center text-sm font-bold py-2 px-4 flex items-center justify-center gap-3 shadow-sm">
          <Target className="h-4 w-4 animate-pulse" />
          <span>DEMO MODE — Showing sample data for investor presentation</span>
          <Button variant="ghost" size="sm" onClick={handleDemoToggle} className="bg-amber-900/20 hover:bg-amber-900/30 text-amber-950 text-xs font-bold border border-amber-900/20">
            Exit Demo
          </Button>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: branding */}
          <div className="shrink-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 leading-tight flex items-center gap-2">
              <Sprout className="h-5 w-5 text-green-600 dark:text-green-400" />
              {farmConfig.name}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {farmConfig.tagline}
            </p>
          </div>
          {/* Center: snarky comment — hide for employee */}
          {(isAdminNav || navItems.length > 0) && (
            <div className="hidden md:block flex-1 max-w-[55%]">
              <div className="bg-gradient-to-r from-green-50 to-sky-50 dark:from-green-900/30 dark:to-sky-900/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2 text-right">
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium italic leading-snug flex items-center justify-end gap-1.5">
                  <Sparkles className="h-3 w-3 text-green-500 shrink-0" />
                  {comment}
                </span>
              </div>
            </div>
          )}
          {/* Right: theme toggle + user avatar + menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Demo Mode toggle — admin only */}
            {role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDemoToggle}
                disabled={demoToggling}
                className={`text-xs font-bold ${
                  isDemoMode
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700'
                }`}
                title={isDemoMode ? 'Turn off demo mode' : 'Show demo data for presentations'}
              >
                {demoToggling ? <Timer className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                {isDemoMode ? 'Demo ON' : 'Demo'}
              </Button>
            )}
            {/* Alerts badge — Learning Engine */}
            {isAdminNav && <AlertsBadge farmId={farmId} />}
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(THEME_NEXT[theme])}
              title={THEME_LABEL[theme]}
              className="w-8 h-8"
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 p-1 pr-3 transition-colors cursor-pointer"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-8 h-8 rounded-full border-2 border-green-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-800">
                      {user?.displayName?.[0] || '?'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                    {user?.displayName?.split(' ')[0] || 'User'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[200px] p-0">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">{user?.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      {/* ===== NAV BAR (desktop only — hidden < md, replaced by MobileNav) ===== */}
      {(isAdminNav || navItems.length > 0) && (
        <nav className="hidden md:block bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-2 sm:px-4">
          <div className="flex items-center gap-1 py-1">
            {isAdminNav ? (
              <>
                {/* Direct links (Home) */}
                {adminNavDirect.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </NavLink>
                ))}
                {/* Dropdown groups */}
                {adminNavGroups.map((group) => (
                  <NavDropdown key={group.label} label={group.label} icon={group.icon} items={group.items} />
                ))}
              </>
            ) : (
              /* Chef flat nav */
              navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              ))
            )}
          </div>
        </nav>
      )}

      {/* ===== MOBILE SNARKY COMMENT ===== */}
      {(isAdminNav || navItems.length > 0) && (
        <div className="md:hidden px-4 pt-2">
          <div className="bg-gradient-to-r from-green-50 to-sky-50 dark:from-green-900/30 dark:to-sky-900/30 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium italic leading-snug flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-green-500 shrink-0" />
              {comment}
            </span>
          </div>
        </div>
      )}

      {/* ===== PAGE CONTENT ===== */}
      <main className="p-3 sm:p-4 pb-20 md:pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <MobileNav role={role} />

      {/* ===== FLOATING DEV REQUEST BUTTON — admin/manager only ===== */}
      {onDevRequest && role !== 'chef' && role !== 'employee' && (
        <Button
          onClick={onDevRequest}
          size="sm"
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[90] bg-gray-900 hover:bg-gray-800 active:scale-[0.97] text-white text-xs font-bold rounded-full shadow-lg border border-white/10"
          title="Submit a dev request"
        >
          <Wrench className="h-3.5 w-3.5" />
          Request
        </Button>
      )}
    </div>
  );
}
