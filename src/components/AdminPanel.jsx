import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TeamTab from './admin/TeamTab';
import InvitesTab from './admin/InvitesTab';
import SettingsTab from './admin/SettingsTab';
import BillingTab from './admin/BillingTab';

/**
 * AdminPanel â€” Thin shell with tab switcher.
 * Tab content lives in src/components/admin/*.jsx
 */
export default function AdminPanel({ user, farmId, role, members, invites, teamLoading }) {
  const [tab, setTab] = useState('team');
  const [searchParams] = useSearchParams();

  // Auto-switch to billing if redirected from Stripe
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success' || status === 'cancelled') setTab('billing');
  }, [searchParams]);

  const tabs = [
    { id: 'team',     label: 'Team',     icon: 'ðŸ‘¥' },
    { id: 'invites',  label: 'Invites',  icon: 'ðŸ“§' },
    { id: 'settings', label: 'Settings', icon: 'âš™ï¸' },
    ...(role === 'admin' ? [{ id: 'billing', label: 'Billing', icon: 'ðŸ’³' }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Admin Panel</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage your farm, team, and billing</p>

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
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <TeamTab
          members={members}
          loading={teamLoading}
          currentUserId={user?.uid}
          role={role}
          farmId={farmId}
        />
      )}
      {tab === 'invites' && <InvitesTab farmId={farmId} invites={invites} loading={teamLoading} />}
      {tab === 'settings' && <SettingsTab farmId={farmId} />}
      {tab === 'billing' && <BillingTab farmId={farmId} user={user} />}
    </div>
  );
}
