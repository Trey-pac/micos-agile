import { useState } from 'react';
import { motion } from 'framer-motion';
import { inviteUserToFarm } from '../../services/farmService';
import { revokeInvite } from '../../services/userService';
import { ROLE_LABELS } from './TeamTab';

const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none';

export default function InvitesTab({ farmId, invites, loading }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      await inviteUserToFarm(farmId, { email: inviteEmail.trim(), role: inviteRole });
      setSent(true);
      setInviteEmail('');
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error('Invite failed:', err);
    }
    setSending(false);
  };

  const handleRevoke = async (inviteId) => {
    try {
      await revokeInvite(farmId, inviteId);
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  const pending = invites.filter((i) => i.status === 'pending');
  const accepted = invites.filter((i) => i.status === 'accepted');

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Send Invite</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Invited users will be linked to your farm when they sign in with Google.
        </p>

        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@email.com"
            className={`flex-1 ${inputClass}`}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm outline-none cursor-pointer"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="driver">Driver</option>
            <option value="chef">Chef</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleInvite}
          disabled={!inviteEmail.trim() || sending}
          className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-600"
        >
          {sent ? '✓ Invite Sent!' : sending ? 'Sending...' : '📧 Send Invite'}
        </motion.button>
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Pending Invites <span className="text-gray-400 font-normal">({pending.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pending.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{inv.email}</span>
                  <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_LABELS[inv.role]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {inv.role}
                  </span>
                </div>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold cursor-pointer"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted invites */}
      {accepted.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Accepted <span className="text-gray-400 font-normal">({accepted.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {accepted.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{inv.email}</span>
                  <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_LABELS[inv.role]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {inv.role}
                  </span>
                </div>
                <span className="text-[10px] text-green-500 font-semibold">✓ Joined</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invites.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
          No invites sent yet.
        </div>
      )}

      {/* Role descriptions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Role Permissions</h3>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Admin</span> — Full access to everything incl. billing &amp; team management</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Manager</span> — All internal views, team management, no billing</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Employee</span> — Production views only (planting, growing, harvesting)</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Driver</span> — Delivery views only (route, confirmations)</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Chef</span> — Customer views only (catalog, cart, orders)</div>
        </div>
      </div>
    </div>
  );
}
