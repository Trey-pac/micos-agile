import { useState, useEffect } from 'react';
import { Settings, CreditCard, Users, Check, Building2, Zap, Sprout, Mail } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useFarmConfig } from '../contexts/FarmConfigContext';
import { updateFarmConfig, inviteUserToFarm, getFarmRoot } from '../services/farmService';
import { PLANS } from '../data/planTiers';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';

const PLAN_ICONS = { free: Sprout, pro: Zap, business: Building2 };

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
    { id: 'general', label: 'General' },
    { id: 'billing', label: 'Billing' },
    { id: 'team',    label: 'Team' },
  ];

  const TAB_ICONS = { general: Settings, billing: CreditCard, team: Users };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Settings</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full mb-6">
          {tabs.map((t) => {
            const Icon = TAB_ICONS[t.id];
            return (
              <TabsTrigger key={t.id} value={t.id} className="flex-1 gap-1.5">
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="general"><GeneralSettings farmId={farmId} config={config} setConfig={setConfig} /></TabsContent>
        <TabsContent value="billing"><BillingSettings farmId={farmId} user={user} /></TabsContent>
        <TabsContent value="team"><TeamSettings farmId={farmId} /></TabsContent>
      </Tabs>
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
      <Card className="p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Farm Branding</h2>

        <div>
          <Label>Farm Name</Label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label>Tagline</Label>
          <Input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Your farm's motto"
          />
        </div>

        <div>
          <Label className="mb-2">Brand Color</Label>
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

        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saved ? <><Check className="w-4 h-4 mr-1" /> Saved!</> : saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Card>
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
      <Card className="p-5">
        <div className="flex items-center gap-3">
          {(() => { const Icon = PLAN_ICONS[currentPlan] || Sprout; return <Icon className="w-6 h-6 text-green-600" />; })()}
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {PLANS[currentPlan]?.name || 'Free'} Plan
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subStatus === 'active' ? 'Active subscription' : currentPlan === 'free' ? 'No active subscription' : `Status: ${subStatus || 'unknown'}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isUpgrade = PLANS[plan.id].price > PLANS[currentPlan]?.price;

          return (
            <Card
              key={plan.id}
              className={`relative p-5 border-2 transition-colors ${
                isCurrent
                  ? 'border-green-500 dark:border-green-600'
                  : ''
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
                    <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
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
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!checkoutLoading}
                    className="w-full"
                  >
                    {checkoutLoading === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                  </Button>
                ) : (
                  <div className="text-center py-2.5 text-xs text-gray-400">
                    {plan.price === 0 ? 'Included' : 'Contact us to downgrade'}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Team Settings ───────────────────────────────────────────────────

function TeamSettings({ farmId }) {
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
      <Card className="p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Invite Team Members</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Invited users will be linked to your farm when they sign in with Google.
        </p>

        <div className="flex gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="flex-1"
          />
          <Select value={inviteRole} onValueChange={(val) => setInviteRole(val)}>
            <SelectTrigger className="w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="chef">Chef</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleInvite}
          disabled={!inviteEmail.trim() || sending}
        >
          {sent ? <><Check className="w-4 h-4 mr-1" /> Invite Sent!</> : sending ? 'Sending...' : <><Mail className="w-4 h-4 mr-1" /> Send Invite</>}
        </Button>
      </Card>

      {/* Role descriptions */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Role Permissions</h3>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Admin</span> — Full access to everything</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Manager</span> — All internal views, no billing/settings</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Employee</span> — Production views only (planting, growing, harvesting)</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Driver</span> — Delivery views only (route, confirmations)</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Chef</span> — Customer views only (catalog, cart, orders)</div>
        </div>
      </Card>
    </div>
  );
}
