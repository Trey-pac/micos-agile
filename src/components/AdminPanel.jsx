import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFarmConfig } from '../contexts/FarmConfigContext';
import { updateFarmConfig, inviteUserToFarm, getFarmRoot } from '../services/farmService';
import { updateMemberRole, removeMember, revokeInvite } from '../services/userService';
import { PLANS } from '../data/planTiers';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/Select';
import { Users, Mail, Settings, CreditCard, Check, Building2, Zap, Sprout, Trash2, X } from 'lucide-react';

const ROLE_LABELS = {
  admin:    { label: 'Admin',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  manager:  { label: 'Manager',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  employee: { label: 'Employee', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  driver:   { label: 'Driver',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  chef:     { label: 'Chef',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none';

const TAB_ICONS = {
  team: Users,
  invites: Mail,
  settings: Settings,
  billing: CreditCard,
};

const PLAN_ICONS = {
  business: Building2,
  pro: Zap,
  free: Sprout,
};

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
    { id: 'team',     label: 'Team' },
    { id: 'invites',  label: 'Invites' },
    { id: 'settings', label: 'Settings' },
    ...(role === 'admin' ? [{ id: 'billing', label: 'Billing' }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Admin Panel</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage your farm, team, and billing</p>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full mb-6">
          {tabs.map((t) => {
            const Icon = TAB_ICONS[t.id];
            return (
              <TabsTrigger key={t.id} value={t.id} className="flex-1 gap-1.5">
                {Icon && <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="team">
          <TeamTab
            members={members}
            loading={teamLoading}
            currentUserId={user?.uid}
            role={role}
            farmId={farmId}
          />
        </TabsContent>
        <TabsContent value="invites">
          <InvitesTab farmId={farmId} invites={invites} loading={teamLoading} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab farmId={farmId} />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab farmId={farmId} user={user} />
        </TabsContent>
      </Tabs>
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
            <Card key={key} className="p-3 text-center">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{count}</div>
              <Badge className={`text-[10px] ${color}`}>{label}</Badge>
            </Card>
          );
        })}
      </div>

      {/* Member list */}
      <Card className="divide-y divide-gray-100 dark:divide-gray-700">
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
                <Select
                  value={member.role || 'employee'}
                  onValueChange={(val) => handleRoleChange(member.id, val)}
                  disabled={changingRole === member.id}
                >
                  <SelectTrigger className="w-[120px] text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`text-[11px] ${roleInfo.color}`}>
                  {roleInfo.label}
                </Badge>
              )}

              {/* Remove button — admin only, can't remove self */}
              {role === 'admin' && !isMe && (
                <>
                  {isRemoving ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                        className="text-[11px] h-auto py-1"
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setConfirmRemove(null)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => setConfirmRemove(member.id)}
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
      </Card>
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
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Send Invite</h2>
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
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
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

      {/* Pending invites */}
      {pending.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Pending Invites <span className="text-gray-400 font-normal">({pending.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pending.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{inv.email}</span>
                  <Badge className={`text-[10px] ${ROLE_LABELS[inv.role]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {inv.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-500 hover:text-red-700"
                  onClick={() => handleRevoke(inv.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Accepted invites (history) */}
      {accepted.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Accepted <span className="text-gray-400 font-normal">({accepted.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {accepted.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{inv.email}</span>
                  <Badge className={`text-[10px] ${ROLE_LABELS[inv.role]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {inv.role}
                  </Badge>
                </div>
                <span className="text-[10px] text-green-500 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Joined</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {invites.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
          No invites sent yet.
        </div>
      )}

      {/* Role descriptions */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Role Permissions</h3>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Admin</span> — Full access to everything incl. billing &amp; team management</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Manager</span> — All internal views, team management, no billing</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Employee</span> — Production views only (planting, growing, harvesting)</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Driver</span> — Delivery views only (route, confirmations)</div>
          <div><span className="font-semibold text-gray-800 dark:text-gray-200">Chef</span> — Customer views only (catalog, cart, orders)</div>
        </div>
      </Card>
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
      <Card className="p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Farm Branding</h2>

        <div>
          <Label className="mb-1.5">Farm Name</Label>
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <Label className="mb-1.5">Tagline</Label>
          <Input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Your farm's motto" />
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
      </Card>

      {/* Operations */}
      <Card className="p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Operations</h2>

        <div>
          <Label className="mb-1.5">Timezone</Label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass + ' cursor-pointer'}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace('America/', '').replace('Pacific/', '').replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-1.5">Order Cutoff Time</Label>
          <Input type="time" value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} />
        </div>

        <div>
          <Label className="mb-2">Delivery Days</Label>
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
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
      >
        {saved ? <><Check className="w-4 h-4 mr-1" /> Saved!</> : saving ? 'Saving...' : 'Save Changes'}
      </Button>
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
      <Card className="p-5">
        <div className="flex items-center gap-3">
          {(() => { const Icon = PLAN_ICONS[currentPlan] || Sprout; return <Icon className="w-6 h-6 text-green-600" />; })()}
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{PLANS[currentPlan]?.name || 'Free'} Plan</h2>
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
                isCurrent ? 'border-green-500 dark:border-green-600' : ''
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
                    <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <div className="text-center py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold">Current Plan</div>
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
