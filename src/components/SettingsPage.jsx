import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { inviteUserToFarm } from '../services/farmService';
import SettingsTab from './admin/SettingsTab';
import BillingTab from './admin/BillingTab';
import ApprovedEmailsCard from './admin/ApprovedEmailsCard';

/**
 * SettingsPage — Farm settings, branding, billing, and team management.
 * Reuses shared admin tab components for DRY.
 *
 * Tabs: General | Billing | Team
 */
export default function SettingsPage({ user, farmId, role }) {
  const [tab, setTab] = useState('general');
  const [searchParams] = useSearchParams();

  // Show billing tab if redirected from Stripe checkout
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success' || status === 'cancelled') {
      setTab('billing');
    }
  }, [searchParams]);

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'team',    label: 'Team',    icon: '👥' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              tab === t.id
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'general' && <SettingsTab farmId={farmId} />}
      {tab === 'billing' && <BillingTab farmId={farmId} user={user} />}
      {tab === 'team' && <TeamSection farmId={farmId} user={user} role={role} />}
    </div>
  );
}

// ── Lightweight team section (invite form + approved emails) ────────

function TeamSection({ farmId, user, role }) {
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

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Invite Team Members</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Invited users will be linked to your farm when they sign in with Google.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm outline-none"
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
          className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors cursor-pointer disabled:bg-gray-300"
        >
          {sent ? '✓ Invite Sent!' : sending ? 'Sending...' : '📧 Send Invite'}
        </motion.button>
      </div>

      {/* Approved Users — admin only */}
      {role === 'admin' && <ApprovedEmailsCard farmId={farmId} user={user} />}

      {/* Role descriptions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Role Permissions</h3>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Admin</span> — Full access to everything</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Manager</span> — All internal views, no billing/settings</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Employee</span> — Production views only (planting, growing, harvesting)</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Driver</span> — Delivery views only (route, confirmations)</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Chef</span> — Customer views only (catalog, cart, orders)</div>
        </div>
      </div>
    </div>
  );
}
