import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/**
 * NavDropdown — A nav button that opens a dropdown of sub-items on hover (desktop)
 * or click. Highlights when any child route is active.
 *
 * Props:
 *   label    — Display text (e.g. "Planning")
 *   icon     — Emoji icon
 *   items    — [{ to, label, icon }]
 */
export default function NavDropdown({ label, icon, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);
  const location = useLocation();

  // Is any child route active?
  const isChildActive = items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Hover with small delay to avoid accidental triggers
  const handleMouseEnter = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), 80);
  };
  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
          isChildActive
            ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
        <span className={`text-[10px] ml-0.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 min-w-[180px] animate-in fade-in slide-in-from-top-1 duration-150">
          {items.map(({ to, label: itemLabel, icon: itemIcon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="text-base w-5 text-center">{itemIcon}</span>
              <span>{itemLabel}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
