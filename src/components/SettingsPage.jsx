import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useFarmConfig } from '../contexts/FarmConfigContext';
import { updateFarmConfig, inviteUserToFarm, getFarmRoot, getFarmConfig } from '../services/farmService';
import { PLANS } from '../data/planTiers';

/**
 * SettingsPage — Farm settings, branding, billing, and team management.
 *
 * Tabs: General | Billing | Team
 */
export default function SettingsPage({ user, farmId, role }) {
  const [tab, setTab] = useState('general');
  const [searchParams] = useSearchParams();
  const { config, setConfig } = useFarmConfig();

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

      {tab === 'general' && <GeneralSettings farmId={farmId} config={config} setConfig={setConfig} />}
      {tab === 'billing' && <BillingSettings farmId={farmId} user={user} />}
      {tab === 'team' && <TeamSettings farmId={farmId} user={user} role={role} />}
    </div>
  );
}

// ── General Settings ────────────────────────────────────────────────

function GeneralSettings({ farmId, config, setConfig }) {
  const [name, setName] = useState(config.name || '');
  const [tagline, setTagline] = useState(config.tagline || '');
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor || '#16a34a');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const COLOR_OPTIONS = ['#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#d97706', '#059669'];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateFarmConfig(farmId, { name, tagline, primaryColor });
      setConfig((prev) => ({ ...prev, name, tagline, primaryColor }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Settings save failed:', err);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Farm Branding</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Farm Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Your farm's motto"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
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

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors cursor-pointer disabled:bg-gray-300"
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Billing Settings ────────────────────────────────────────────────

function BillingSettings({ farmId, user }) {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const farmData = await getFarmRoot(farmId);
        if (farmData) {
          setCurrentPlan(farmData.plan || 'free');
          setSubStatus(farmData.subscriptionStatus || null);
        }
      } catch (err) {
        // error already logged in service
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
        body: JSON.stringify({
          farmId,
          plan: planId,
          customerEmail: user.email,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL:', data);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setCheckoutLoading(null);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-400">Loading billing info...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current plan badge */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {currentPlan === 'business' ? '🏢' : currentPlan === 'pro' ? '⚡' : '🌱'}
          </span>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {PLANS[currentPlan]?.name || 'Free'} Plan
            </h2>
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
                isCurrent
                  ? 'border-green-500 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700'
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
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <div className="text-center py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold">
                    Current Plan
                  </div>
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

// ── Team Settings ───────────────────────────────────────────────────

function TeamSettings({ farmId, user, role }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // ── Approved Users (Access Control) ─────────────────────────────────
  const [approvedEmails, setApprovedEmails] = useState([]);
  const [newApprovedEmail, setNewApprovedEmail] = useState('');
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [approvedSaving, setApprovedSaving] = useState(false);
  const [approvedMsg, setApprovedMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await getFarmConfig(farmId);
        if (!cancelled) {
          setApprovedEmails(config?.approvedEmails || []);
        }
      } catch (err) {
        console.error('Failed to load approved emails:', err);
      }
      if (!cancelled) setApprovedLoading(false);
    })();
    return () => { cancelled = true; };
  }, [farmId]);

  const handleAddApprovedEmail = useCallback(async () => {
    const email = newApprovedEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (approvedEmails.map(e => e.toLowerCase()).includes(email)) {
      setApprovedMsg({ ok: false, text: 'Email already in list' });
      setTimeout(() => setApprovedMsg(null), 3000);
      return;
    }
    setApprovedSaving(true);
    try {
      const updated = [...approvedEmails, email];
      await updateFarmConfig(farmId, { approvedEmails: updated });
      setApprovedEmails(updated);
      setNewApprovedEmail('');
      setApprovedMsg({ ok: true, text: 'User added!' });
      setTimeout(() => setApprovedMsg(null), 3000);
    } catch (err) {
      console.error('Failed to add approved email:', err);
      setApprovedMsg({ ok: false, text: 'Failed to save' });
      setTimeout(() => setApprovedMsg(null), 3000);
    }
    setApprovedSaving(false);
  }, [newApprovedEmail, approvedEmails, farmId]);

  const handleRemoveApprovedEmail = useCallback(async (emailToRemove) => {
    if (emailToRemove.toLowerCase() === user?.email?.toLowerCase()) {
      setApprovedMsg({ ok: false, text: "Can't remove yourself" });
      setTimeout(() => setApprovedMsg(null), 3000);
      return;
    }
    if (approvedEmails.length <= 1) {
      setApprovedMsg({ ok: false, text: 'Must have at least one approved user' });
      setTimeout(() => setApprovedMsg(null), 3000);
      return;
    }
    setApprovedSaving(true);
    try {
      const updated = approvedEmails.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase());
      await updateFarmConfig(farmId, { approvedEmails: updated });
      setApprovedEmails(updated);
      setApprovedMsg({ ok: true, text: 'User removed' });
      setTimeout(() => setApprovedMsg(null), 3000);
    } catch (err) {
      console.error('Failed to remove approved email:', err);
      setApprovedMsg({ ok: false, text: 'Failed to save' });
      setTimeout(() => setApprovedMsg(null), 3000);
    }
    setApprovedSaving(false);
  }, [approvedEmails, farmId, user]);

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

      {/* Approved Users (Access Control) — admin only */}
      {role === 'admin' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Approved Users</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Only these email addresses can sign in and access workspace data.
            Anyone not on this list will see an &quot;Access Denied&quot; screen.
          </p>

          {approvedLoading ? (
            <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
          ) : (
            <>
              {/* Current approved emails */}
              <div className="space-y-2">
                {approvedEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{email}</span>
                    <button
                      onClick={() => handleRemoveApprovedEmail(email)}
                      disabled={approvedSaving || email.toLowerCase() === user?.email?.toLowerCase()}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {email.toLowerCase() === user?.email?.toLowerCase() ? 'You' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new email */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newApprovedEmail}
                  onChange={(e) => setNewApprovedEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddApprovedEmail()}
                  placeholder="newuser@example.com"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddApprovedEmail}
                  disabled={!newApprovedEmail.trim() || approvedSaving}
                  className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {approvedSaving ? '...' : '+ Add'}
                </motion.button>
              </div>

              {/* Status message */}
              {approvedMsg && (
                <p className={`text-xs font-semibold ${approvedMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {approvedMsg.text}
                </p>
              )}

              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                ⚠️ Removing all emails or yourself will lock everyone out.
                Changes take effect immediately for new sign-ins.
              </p>
            </>
          )}
        </div>
      )}

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
