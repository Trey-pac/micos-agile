import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home, LayoutList, Leaf, Package, Zap,
  PenTool, Calendar, FileText,
  Sprout, BarChart3, HardHat, Wheat,
  Truck, ShoppingBag, ChefHat,
  TrendingUp, Users, DollarSign, LineChart,
  PiggyBank, Warehouse, Handshake, FileBarChart,
  Shield, Settings, ClipboardList,
} from 'lucide-react';

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
  { to: '/dashboard',  label: 'Home',       icon: Home },
  { to: '/kanban',     label: 'Tasks',      icon: LayoutList },
  { to: '/production', label: 'Production', icon: Leaf },
  { to: '/orders',     label: 'Orders',     icon: Package },
];

const MORE_ADMIN = [
  { group: 'Planning', items: [
    { to: '/planning',  label: 'Planning',  icon: PenTool },
    { to: '/calendar',  label: 'Calendar',  icon: Calendar },
    { to: '/activity',  label: 'Activity',  icon: FileText },
  ]},
  { group: 'Growing', items: [
    { to: '/farm',      label: 'Farm View', icon: Home },
    { to: '/sowing',    label: 'Sowing',    icon: Sprout },
    { to: '/pipeline',  label: 'Pipeline',  icon: BarChart3 },
    { to: '/crew',      label: 'Crew Board',icon: HardHat },
  ]},
  { group: 'Orders', items: [
    { to: '/harvest-queue', label: 'Harvest Queue', icon: Wheat },
    { to: '/packing-list',  label: 'Packing',       icon: Package },
    { to: '/deliveries',    label: 'Deliveries',    icon: Truck },
  ]},
  { group: 'Storefront', items: [
    { to: '/products',  label: 'Products',  icon: ShoppingBag },
    { to: '/customers', label: 'Customers', icon: ChefHat },
  ]},
  { group: 'Business', items: [
    { to: '/business/revenue',   label: 'Revenue',    icon: TrendingUp },
    { to: '/business/customers', label: 'Customers',  icon: Users },
    { to: '/business/products',  label: 'Products',   icon: BarChart3 },
    { to: '/business/costs',     label: 'Costs',      icon: DollarSign },
    { to: '/business/reports',   label: 'BI Reports', icon: LineChart },
    { to: '/budget',             label: 'Budget',     icon: PiggyBank },
    { to: '/inventory',          label: 'Inventory',  icon: Warehouse },
    { to: '/vendors',            label: 'Vendors',    icon: Handshake },
    { to: '/reports',            label: 'End of Day', icon: FileBarChart },
  ]},
  { group: 'Admin', items: [
    { to: '/admin',    label: 'Admin',    icon: Shield },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]},
];

const CHEF_NAV = [
  { to: '/shop',      label: 'Shop',      icon: ShoppingBag },
  { to: '/cart',       label: 'Cart',      icon: Package },
  { to: '/my-orders', label: 'My Orders', icon: ClipboardList },
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
          {primaryItems.map(({ to, label, icon: Icon }) => (
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
                  <Icon className="h-5 w-5" />
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
              <Zap className="h-5 w-5" />
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
                      {items.map(({ to, label, icon: Icon }) => (
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
                          <Icon className="h-6 w-6" />
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
