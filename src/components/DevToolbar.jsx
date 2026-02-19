import { useState } from 'react';

const ROLES = ['admin', 'manager', 'employee', 'driver', 'chef'];

/**
 * DevToolbar — floating panel for admin/dev users.
 *
 * Features:
 * - Role impersonation: test how any role sees the app
 * - Debug info: current user, farmId, actual vs impersonated role
 * - One-click back to real role
 *
 * Only renders when `actualRole` is 'admin'. Completely hidden for everyone else.
 */
export default function DevToolbar({ actualRole, activeRole, onImpersonate, user, farmId }) {
  const [expanded, setExpanded] = useState(false);

  // Only admins see this
  if (actualRole !== 'admin') return null;

  const isImpersonating = activeRole !== actualRole;

  return (
    <div className="fixed bottom-20 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {expanded && (
        <div className="bg-gray-900 text-gray-100 rounded-xl shadow-2xl border border-gray-700 w-64 overflow-hidden animate-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Dev Tools</span>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-500 hover:text-gray-300 text-lg leading-none cursor-pointer"
            >
              ×
            </button>
          </div>

          {/* Debug info */}
          <div className="px-4 py-3 space-y-1.5 border-b border-gray-700 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">User</span>
              <span className="text-gray-300 truncate ml-2 max-w-[140px]">{user?.displayName || user?.email || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">UID</span>
              <span className="text-gray-400 font-mono truncate ml-2 max-w-[140px]">{user?.uid || '–'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Farm</span>
              <span className="text-gray-400 font-mono truncate ml-2 max-w-[140px]">{farmId || '–'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Actual role</span>
              <span className="text-green-400 font-semibold">{actualRole}</span>
            </div>
          </div>

          {/* Role impersonation */}
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider mb-2">
              View as role
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => onImpersonate(r === actualRole ? null : r)}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeRole === r
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {isImpersonating && (
              <button
                onClick={() => onImpersonate(null)}
                className="w-full mt-2 text-xs font-semibold py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer"
              >
                ↩ Back to {actualRole}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-lg transition-all cursor-pointer ${
          isImpersonating
            ? 'bg-amber-500 hover:bg-amber-400 ring-2 ring-amber-300/50'
            : 'bg-gray-800 hover:bg-gray-700 ring-1 ring-gray-600'
        }`}
        title={isImpersonating ? `Impersonating: ${activeRole}` : 'Dev Tools'}
      >
        {isImpersonating ? '🎭' : '🛠️'}
      </button>

      {/* Impersonation banner pinned to bottom */}
      {isImpersonating && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-amber-950 text-center text-xs font-bold py-1 z-[9998]">
          👁 Viewing as <span className="uppercase">{activeRole}</span> — your actual role is {actualRole}
        </div>
      )}
    </div>
  );
}
