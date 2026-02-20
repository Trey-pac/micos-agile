import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getSnarkyComment } from '../utils/snarkyComments';
import { useTheme } from '../contexts/ThemeContext';
import { useFarmConfig } from '../contexts/FarmConfigContext';
import MobileNav from './MobileNav';
import NavDropdown from './NavDropdown';

const THEME_ICONS = { light: '☀️', dark: '🌙', system: '💻' };
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
export default function Layout({ user, role, onLogout, snarkyContext, onDevRequest, isDemo }) {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  const { config: farmConfig } = useFarmConfig();

  const activeRoute = location.pathname.split('/')[1] || 'kanban';
  const comment = getSnarkyComment(activeRoute, snarkyContext);

  // ── Grouped admin nav: 7 top-level items instead of 21 ──
  // Direct links (no dropdown)
  const adminNavDirect = [
    { to: '/dashboard', label: 'Home', icon: '🏠' },
  ];
  // Dropdown groups
  const adminNavGroups = [
    {
      label: 'Planning', icon: '📋', items: [
        { to: '/kanban',    label: 'Kanban Board', icon: '📋' },
        { to: '/planning',  label: 'Sprint Planning', icon: '📐' },
        { to: '/calendar',  label: 'Calendar', icon: '🗓️' },
        { to: '/activity',  label: 'Activity Log', icon: '📝' },
      ],
    },
    {
      label: 'Growing', icon: '🌱', items: [
        { to: '/farm',           label: 'Farm View', icon: '🏠' },
        { to: '/production',     label: 'Growth Tracker', icon: '🌿' },
        { to: '/sowing',         label: 'Sowing Schedule', icon: '🌱' },
        { to: '/crop-profiles',  label: 'Crop Profiles', icon: '🧬' },
        { to: '/pipeline',       label: 'Pipeline', icon: '📊' },
        { to: '/crew',           label: 'Crew Board', icon: '👷' },
      ],
    },
    {
      label: 'Orders', icon: '📦', items: [
        { to: '/orders',        label: 'Order Board', icon: '📋' },
        { to: '/chef-orders',   label: 'Chef Orders', icon: '🍳' },
        { to: '/harvest-queue', label: 'Harvest Queue', icon: '🌾' },
        { to: '/packing-list',  label: 'Packing List', icon: '📦' },
        { to: '/deliveries',    label: 'Deliveries', icon: '🚚' },
      ],
    },
    {
      label: 'Storefront', icon: '🛍️', items: [
        { to: '/products',           label: 'Products', icon: '🛍️' },
        { to: '/customers',          label: 'Customers', icon: '👨‍🍳' },
      ],
    },
    {
      label: 'Business', icon: '💰', items: [
        { to: '/budget',    label: 'Budget', icon: '💰' },
        { to: '/inventory', label: 'Inventory', icon: '📦' },
        { to: '/vendors',   label: 'Vendors', icon: '👥' },
        { to: '/reports',   label: 'Reports', icon: '📄' },
      ],
    },
    {
      label: 'Admin', icon: '⚙️', items: [
        { to: '/admin',    label: 'Team & Roles', icon: '🛡️' },
        { to: '/settings', label: 'Settings', icon: '⚙️' },
        { to: '/shopify-sync', label: 'Shopify Sync', icon: '🔗' },
      ],
    },
  ];

  const chefNavItems = [
    { to: '/shop', label: 'Shop', icon: '🛍️' },
    { to: '/cart', label: 'Cart', icon: '🛒' },
    { to: '/my-orders', label: 'My Orders', icon: '📋' },
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
          <span>🎭 You&apos;re exploring a demo farm — data resets in 24 hours</span>
          <button
            onClick={onLogout}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Exit Demo
          </button>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: branding */}
          <div className="shrink-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
              🌱 {farmConfig.name}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {farmConfig.tagline}
            </p>
          </div>
          {/* Center: snarky comment — hide for employee */}
          {(isAdminNav || navItems.length > 0) && (
            <div className="hidden md:block flex-1 max-w-[55%]">
              <div className="bg-gradient-to-r from-green-50 to-sky-50 dark:from-green-900/30 dark:to-sky-900/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2 text-right">
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium italic leading-snug">
                  ✨ {comment}
                </span>
              </div>
            </div>
          )}
          {/* Right: theme toggle + user avatar + menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(THEME_NEXT[theme])}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title={THEME_LABEL[theme]}
            >
              <span className="text-sm">{THEME_ICONS[theme]}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
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

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[180px]">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{user?.displayName || 'User'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); onLogout(); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                    >Sign out</button>
                  </div>
                </>
              )}
            </div>
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
                {adminNavDirect.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                        isActive
                          ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                      }`
                    }
                  >
                    <span>{icon}</span>
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
              navItems.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                    }`
                  }
                >
                  <span>{icon}</span>
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
            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium italic leading-snug">✨ {comment}</span>
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
        <button
          onClick={onDevRequest}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[90] flex items-center gap-2 bg-gray-900 hover:bg-gray-800 active:scale-[0.97] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg border border-white/10 transition-all duration-150 cursor-pointer"
          title="Submit a dev request"
        >
          🛠️ Request
        </button>
      )}
    </div>
  );
}
