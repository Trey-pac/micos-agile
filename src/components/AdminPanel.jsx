import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useFarmConfig } from '../contexts/FarmConfigContext';
import { updateFarmConfig, inviteUserToFarm } from '../services/farmService';
import { updateMemberRole, removeMember, revokeInvite } from '../services/userService';
import { PLANS } from '../data/planTiers';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ROLE_LABELS = {
  admin:    { label: 'Admin',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  manager:  { label: 'Manager',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  employee: { label: 'Employee', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  driver:   { label: 'Driver',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  chef:     { label: 'Chef',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none';

/**
 * AdminPanel — Full admin dashboard with team, invites, settings, and billing.
 * Only accessible to admin (and partially to manager) via RoleGuard.
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
    { id: 'team',     label: 'Team',     icon: '👥' },
    { id: 'invites',  label: 'Invites',  icon: '📧' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    ...(role === 'admin' ? [{ id: 'billing', label: 'Billing', icon: '💳' }] : []),
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

// ═══════════════════════════════════════════════════════════════════════
// TAB 1: TEAM MEMBERS
// ═══════════════════════════════════════════════════════════════════════

function TeamTab({ members, loading, currentUserId, role, farmId }) {
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
              {/* Avatar */}
              {member.photoURL ? (
                <img src={member.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-sm font-bold text-green-800 dark:text-green-200">
                  {(member.displayName || member.email || '?')[0].toUpperCase()}
                </div>
              )}

              {/* Info */}
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

              {/* Role selector — admin can change roles (not their own) */}
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

              {/* Remove button — admin only, can't remove self */}
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

// ═══════════════════════════════════════════════════════════════════════
// TAB 2: INVITES
// ═══════════════════════════════════════════════════════════════════════

function InvitesTab({ farmId, invites, loading }) {
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

      {/* Accepted invites (history) */}
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

// ═══════════════════════════════════════════════════════════════════════
// TAB 3: SETTINGS
// ═══════════════════════════════════════════════════════════════════════

function SettingsTab({ farmId }) {
  const { config, setConfig } = useFarmConfig();
  const [name, setName] = useState(config.name || '');
  const [tagline, setTagline] = useState(config.tagline || '');
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor || '#16a34a');
  const [timezone, setTimezone] = useState(config.timezone || 'America/Boise');
  const [cutoffTime, setCutoffTime] = useState(config.cutoffTime || '14:00');
  const [deliveryDays, setDeliveryDays] = useState(config.deliveryDays || ['tuesday', 'friday']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const COLOR_OPTIONS = ['#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#d97706', '#059669'];
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Boise',
    'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  ];

  const toggleDay = (day) => {
    setDeliveryDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateFarmConfig(farmId, { name, tagline, primaryColor, timezone, cutoffTime, deliveryDays });
      setConfig((prev) => ({ ...prev, name, tagline, primaryColor, timezone, cutoffTime, deliveryDays }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Settings save failed:', err);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Branding */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Farm Branding</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Farm Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tagline</label>
          <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Your farm's motto" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Brand Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPrimaryColor(c)}
                className={`w-9 h-9 rounded-full cursor-pointer transition-transform ${
                  primaryColor === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Operations</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Timezone</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass + ' cursor-pointer'}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace('America/', '').replace('Pacific/', '').replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Order Cutoff Time</label>
          <input type="time" value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Delivery Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  deliveryDays.includes(day)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {day.charAt(0).toUpperCase() + day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-600"
      >
        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
      </motion.button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 4: BILLING (admin only)
// ═══════════════════════════════════════════════════════════════════════

function BillingTab({ farmId, user }) {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const farmSnap = await getDoc(doc(db, 'farms', farmId));
        if (farmSnap.exists()) {
          const data = farmSnap.data();
          setCurrentPlan(data.plan || 'free');
          setSubStatus(data.subscriptionStatus || null);
        }
      } catch (err) {
        console.error('Load billing failed:', err);
      }
      setLoading(false);
    })();
  }, [farmId]);

  const handleUpgrade = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, plan: planId, customerEmail: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setCheckoutLoading(null);
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading billing info...</div>;

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentPlan === 'business' ? '🏢' : currentPlan === 'pro' ? '⚡' : '🌱'}</span>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{PLANS[currentPlan]?.name || 'Free'} Plan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subStatus === 'active' ? 'Active subscription' : currentPlan === 'free' ? 'No active subscription' : `Status: ${subStatus || 'unknown'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isUpgrade = PLANS[plan.id].price > PLANS[currentPlan]?.price;

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 p-5 transition-colors ${
                isCurrent ? 'border-green-500 dark:border-green-600' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{plan.name}</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                {plan.price === 0 ? 'Free' : `$${plan.price}`}
                {plan.price > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mt-0.5">✓</span><span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <div className="text-center py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold">Current Plan</div>
                ) : isUpgrade ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!checkoutLoading}
                    className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors cursor-pointer disabled:bg-gray-300"
                  >
                    {checkoutLoading === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                  </motion.button>
                ) : (
                  <div className="text-center py-2.5 text-xs text-gray-400">
                    {plan.price === 0 ? 'Included' : 'Contact us to downgrade'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
