import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * MobileNav — Fixed bottom navigation bar for screens < 768px.
 *
 * Admin/manager: 5 items — Home, Tasks, Production, Orders, More (drawer).
 * Chef: 3 items — Shop, Cart, My Orders.
 * Employee/driver: none (they have single-screen apps).
 *
 * The "More" button opens a slide-up drawer with all remaining nav items.
 * Active route gets a green indicator dot + bold label.
 */

const PRIMARY_ADMIN = [
  { to: '/dashboard',  label: 'Home',       icon: '🏠' },
  { to: '/kanban',     label: 'Tasks',      icon: '📋' },
  { to: '/production', label: 'Production', icon: '🌿' },
  { to: '/orders',     label: 'Orders',     icon: '📑' },
];

const MORE_ADMIN = [
  { group: 'Planning', items: [
    { to: '/planning',  label: 'Planning',  icon: '📐' },
    { to: '/calendar',  label: 'Calendar',  icon: '🗓️' },
    { to: '/activity',  label: 'Activity',  icon: '📝' },
  ]},
  { group: 'Growing', items: [
    { to: '/farm',      label: 'Farm View', icon: '🏠' },
    { to: '/sowing',    label: 'Sowing',    icon: '🌱' },
    { to: '/pipeline',  label: 'Pipeline',  icon: '📊' },
    { to: '/crew',      label: 'Crew Board',icon: '👷' },
  ]},
  { group: 'Orders', items: [
    { to: '/harvest-queue', label: 'Harvest Queue', icon: '🌾' },
    { to: '/packing-list',  label: 'Packing',       icon: '📦' },
    { to: '/deliveries',    label: 'Deliveries',    icon: '🚚' },
  ]},
  { group: 'Storefront', items: [
    { to: '/products',  label: 'Products',  icon: '🛍️' },
    { to: '/customers', label: 'Customers', icon: '👨‍🍳' },
  ]},
  { group: 'Business', items: [
    { to: '/budget',    label: 'Budget',    icon: '💰' },
    { to: '/inventory', label: 'Inventory', icon: '📦' },
    { to: '/vendors',   label: 'Vendors',   icon: '👥' },
    { to: '/reports',   label: 'Reports',   icon: '📄' },
  ]},
  { group: 'Admin', items: [
    { to: '/admin',    label: 'Admin',    icon: '🛡️' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ]},
];

const CHEF_NAV = [
  { to: '/shop',      label: 'Shop',      icon: '🛍️' },
  { to: '/cart',       label: 'Cart',      icon: '🛒' },
  { to: '/my-orders', label: 'My Orders', icon: '📋' },
];

export default function MobileNav({ role }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Employee / driver => no mobile nav
  if (role === 'employee' || role === 'driver') return null;

  const isChef = role === 'chef';
  const primaryItems = isChef ? CHEF_NAV : PRIMARY_ADMIN;
  const moreGroups = isChef ? [] : MORE_ADMIN;
  const showMore = moreGroups.length > 0;

  // Flatten all grouped items for route detection
  const allMoreItems = moreGroups.flatMap(g => g.items);
  const currentInMore = allMoreItems.some(item => location.pathname.startsWith(item.to));

  return (
    <>
      {/* Fixed bottom bar — only visible < md (768px) */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
        <div className={`grid ${showMore ? 'grid-cols-5' : `grid-cols-${primaryItems.length}`} h-16`}>
          {primaryItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-xl leading-none">{icon}</span>
                  <span>{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-green-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          {showMore && (
            <button
              onClick={() => setDrawerOpen(true)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors duration-150 cursor-pointer relative ${
                currentInMore || drawerOpen
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <span className="text-xl leading-none">⚡</span>
              <span>More</span>
              {currentInMore && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-green-500" />
              )}
            </button>
          )}
        </div>
      </nav>

      {/* More drawer overlay + slide-up sheet */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[110] md:hidden bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white dark:bg-gray-900 rounded-t-2xl border-t border-gray-200 dark:border-gray-800 max-h-[70vh] overflow-y-auto safe-area-bottom"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* Grouped nav items */}
              <div className="px-4 pb-6 space-y-4">
                {moreGroups.map(({ group, items }) => (
                  <div key={group}>
                    <h3 className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-1.5 px-1">
                      {group}
                    </h3>
                    <div className="grid grid-cols-4 gap-1">
                      {items.map(({ to, label, icon }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setDrawerOpen(false)}
                          className={({ isActive }) =>
                            `flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-[11px] font-semibold transition-colors duration-150 min-h-[60px] ${
                              isActive
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`
                          }
                        >
                          <span className="text-2xl leading-none">{icon}</span>
                          <span className="text-center leading-tight">{label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
