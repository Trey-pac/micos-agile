import { useState } from 'react';
import { updateMemberRole, removeMember } from '../../services/userService';

const ROLE_LABELS = {
  admin:    { label: 'Admin',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  manager:  { label: 'Manager',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  employee: { label: 'Employee', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  driver:   { label: 'Driver',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  chef:     { label: 'Chef',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export { ROLE_LABELS };

export default function TeamTab({ members, loading, currentUserId, role, farmId }) {
  const [changingRole, setChangingRole] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const handleRoleChange = async (uid, newRole) => {
    setChangingRole(uid);
    try {
      await updateMemberRole(uid, newRole);
    } catch (err) {
      console.error('Role change failed:', err);
    }
    setChangingRole(null);
  };

  const handleRemove = async (uid) => {
    try {
      await removeMember(uid);
    } catch (err) {
      console.error('Remove member failed:', err);
    }
    setConfirmRemove(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const sorted = [...members].sort((a, b) => {
    const order = { admin: 0, manager: 1, employee: 2, driver: 3, chef: 4 };
    return (order[a.role] ?? 5) - (order[b.role] ?? 5);
  });

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(ROLE_LABELS).map(([key, { label, color }]) => {
          const count = members.filter((m) => m.role === key).length;
          return (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{count}</div>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Member list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {sorted.map((member) => {
          const isMe = member.id === currentUserId;
          const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.employee;
          const isRemoving = confirmRemove === member.id;

          return (
            <div key={member.id} className="flex items-center gap-3 p-4">
              {member.photoURL ? (
                <img src={member.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-sm font-bold text-green-800 dark:text-green-200">
                  {(member.displayName || member.email || '?')[0].toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {member.displayName || 'Unknown'}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">you</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{member.email}</p>
              </div>

              {role === 'admin' && !isMe ? (
                <select
                  value={member.role || 'employee'}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  disabled={changingRole === member.id}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                  <option value="driver">Driver</option>
                  <option value="chef">Chef</option>
                </select>
              ) : (
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              )}

              {role === 'admin' && !isMe && (
                <>
                  {isRemoving ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="text-[11px] text-gray-400 px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(member.id)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer p-1"
                      title="Remove member"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            No team members yet. Send an invite to get started.
          </div>
        )}
      </div>
    </div>
  );
}
