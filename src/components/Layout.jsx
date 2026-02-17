import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getSnarkyComment } from '../utils/snarkyComments';

/**
 * Shared layout — nav bar, header with snarky comments, user menu.
 *
 * Wraps all authenticated routes via <Outlet />.
 * Receives context props so the snarky comment generator can be context-aware.
 */
export default function Layout({ user, onLogout, snarkyContext }) {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Derive the active route key from the pathname
  const activeRoute = location.pathname.split('/')[1] || 'kanban';

  // Build snarky comment with whatever context we have
  const comment = getSnarkyComment(activeRoute, snarkyContext);

  const navItems = [
    { to: '/kanban', label: 'Kanban', icon: '📋' },
    { to: '/planning', label: 'Planning', icon: '📋' },
    { to: '/calendar', label: 'Calendar', icon: '🗓️' },
    { to: '/vendors', label: 'Vendors', icon: '👥' },
    { to: '/inventory', label: 'Inventory', icon: '📦' },
    { to: '/budget', label: 'Budget', icon: '💰' },
    { to: '/production', label: 'Production', icon: '🌿' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== HEADER ===== */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: branding */}
          <div className="shrink-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">
              🌱 Mico's Micro Farm Agile
            </h1>
            <p className="text-xs text-gray-400 leading-tight">
              Keeping ourselves in line so we can take over the world
            </p>
          </div>

          {/* Center: snarky comment */}
          <div className="hidden md:block flex-1 max-w-[55%]">
            <div className="bg-gradient-to-r from-green-50 to-sky-50 border border-green-200 rounded-xl px-4 py-2 text-right">
              <span className="text-xs text-gray-700 font-medium italic leading-snug">
                ✨ {comment}
              </span>
            </div>
          </div>

          {/* Right: user avatar + menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 pr-3 transition-colors cursor-pointer"
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
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {user?.displayName?.split(' ')[0] || 'User'}
              </span>
            </button>

            {showUserMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[180px]">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.displayName || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===== NAV BAR ===== */}
      <nav className="bg-white border-b border-gray-200 px-2 sm:px-4 overflow-x-auto">
        <div className="flex gap-1 py-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`
              }
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ===== MOBILE SNARKY COMMENT (below nav on small screens) ===== */}
      <div className="md:hidden px-4 pt-2">
        <div className="bg-gradient-to-r from-green-50 to-sky-50 border border-green-200 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-700 font-medium italic leading-snug">
            ✨ {comment}
          </span>
        </div>
      </div>

      {/* ===== PAGE CONTENT ===== */}
      <main className="p-3 sm:p-4">
        <Outlet />
      </main>
    </div>
  );
}
