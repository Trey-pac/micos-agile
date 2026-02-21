import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateFarmConfig, completeOnboarding, inviteUserToFarm } from '../services/farmService';
import { addProduct } from '../services/productService';

const STEPS = [
  { id: 'brand',    label: 'Branding',  icon: '🎨' },
  { id: 'products', label: 'Products',  icon: '🛍️' },
  { id: 'team',     label: 'Team',      icon: '👥' },
  { id: 'done',     label: 'Ready!',    icon: '🚀' },
];

const SAMPLE_PRODUCTS = [
  { name: 'Broccoli Microgreens', category: 'microgreens', unit: 'oz',     pricePerUnit: 4.00,  description: 'Mild, crunchy, packed with nutrients' },
  { name: 'Radish Microgreens',   category: 'microgreens', unit: 'oz',     pricePerUnit: 4.00,  description: 'Spicy kick, great on tacos' },
  { name: 'Sunflower Shoots',     category: 'microgreens', unit: 'oz',     pricePerUnit: 5.00,  description: 'Nutty flavor, substantial crunch' },
  { name: 'Pea Shoots',           category: 'microgreens', unit: 'oz',     pricePerUnit: 5.00,  description: 'Sweet and tender, classic garnish' },
  { name: 'Mixed Micro Blend',    category: 'microgreens', unit: 'oz',     pricePerUnit: 4.50,  description: 'Our signature mix of seasonal varieties' },
];

const slideVariant = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 60 : -60, opacity: 0 }),
};

/**
 * OnboardingWizard — step-by-step setup after creating a farm.
 *
 * Steps:
 * 1. Branding — tagline, primary color
 * 2. Products — add first products or load samples
 * 3. Team — invite first team member
 * 4. Done — launch into the app
 */
export default function OnboardingWizard({ user, farmId, onComplete }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1); // animation direction
  const [saving, setSaving] = useState(false);

  // Step 1 state: Branding
  const [tagline, setTagline] = useState('Farm-to-Table, Simplified');
  const [primaryColor, setPrimaryColor] = useState('#16a34a');

  // Step 2 state: Products
  const [addedProducts, setAddedProducts] = useState([]);
  const [customProduct, setCustomProduct] = useState({ name: '', unit: 'oz', pricePerUnit: '' });

  // Step 3 state: Team
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [invitedList, setInvitedList] = useState([]);

  const goNext = () => { setDir(1); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  // ── Step actions ──────────────────────────────────────────────────

  const saveBranding = async () => {
    setSaving(true);
    try {
      await updateFarmConfig(farmId, { tagline, primaryColor });
    } catch (err) {
      console.error('Branding save failed:', err);
    }
    setSaving(false);
    goNext();
  };

  const loadSampleProducts = async () => {
    setSaving(true);
    try {
      for (const p of SAMPLE_PRODUCTS) {
        await addProduct(farmId, { ...p, available: true });
      }
      setAddedProducts(SAMPLE_PRODUCTS.map((p) => p.name));
    } catch (err) {
      console.error('Sample product load failed:', err);
    }
    setSaving(false);
  };

  const addCustomProductFn = async () => {
    if (!customProduct.name.trim()) return;
    setSaving(true);
    try {
      await addProduct(farmId, {
        name: customProduct.name.trim(),
        category: 'microgreens',
        unit: customProduct.unit,
        pricePerUnit: parseFloat(customProduct.pricePerUnit) || 0,
        description: '',
        available: true,
      });
      setAddedProducts((prev) => [...prev, customProduct.name.trim()]);
      setCustomProduct({ name: '', unit: 'oz', pricePerUnit: '' });
    } catch (err) {
      console.error('Product add failed:', err);
    }
    setSaving(false);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    try {
      await inviteUserToFarm(farmId, { email: inviteEmail.trim(), role: inviteRole });
      setInvitedList((prev) => [...prev, { email: inviteEmail.trim(), role: inviteRole }]);
      setInviteEmail('');
    } catch (err) {
      console.error('Invite failed:', err);
    }
    setSaving(false);
  };

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      await completeOnboarding(farmId);
    } catch (err) {
      console.error('Complete onboarding failed:', err);
    }
    setSaving(false);
    onComplete();
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Progress bar */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 py-3 text-center text-xs font-semibold transition-colors ${
                i <= step
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            >
              <span className="block text-lg">{s.icon}</span>
              <span className="hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step content with slide animation */}
        <div className="p-6 sm:p-8 min-h-[340px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariant}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {step === 0 && (
                <StepBranding
                  tagline={tagline}
                  setTagline={setTagline}
                  primaryColor={primaryColor}
                  setPrimaryColor={setPrimaryColor}
                  onNext={saveBranding}
                  saving={saving}
                />
              )}
              {step === 1 && (
                <StepProducts
                  addedProducts={addedProducts}
                  customProduct={customProduct}
                  setCustomProduct={setCustomProduct}
                  onLoadSamples={loadSampleProducts}
                  onAddProduct={addCustomProductFn}
                  onNext={goNext}
                  onBack={goBack}
                  saving={saving}
                />
              )}
              {step === 2 && (
                <StepTeam
                  inviteEmail={inviteEmail}
                  setInviteEmail={setInviteEmail}
                  inviteRole={inviteRole}
                  setInviteRole={setInviteRole}
                  invitedList={invitedList}
                  onSendInvite={sendInvite}
                  onNext={goNext}
                  onBack={goBack}
                  saving={saving}
                />
              )}
              {step === 3 && (
                <StepDone onFinish={finishOnboarding} saving={saving} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Branding ────────────────────────────────────────────────

function StepBranding({ tagline, setTagline, primaryColor, setPrimaryColor, onNext, saving }) {
  const COLOR_OPTIONS = ['#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#0891b2'];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Make it yours</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Customize how your workspace looks to your team and customers.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tagline</label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Farm-to-Table, Simplified"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Brand Color</label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPrimaryColor(c)}
              className={`w-9 h-9 rounded-full cursor-pointer transition-transform ${
                primaryColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-600"
      >
        {saving ? 'Saving...' : 'Next →'}
      </motion.button>
    </div>
  );
}

// ── Step 2: Products ────────────────────────────────────────────────

function StepProducts({ addedProducts, customProduct, setCustomProduct, onLoadSamples, onAddProduct, onNext, onBack, saving }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Add your products</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          These are what your chefs will see in the ordering catalog.
        </p>
      </div>

      {addedProducts.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
            ✓ {addedProducts.length} product{addedProducts.length !== 1 ? 's' : ''} added
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">{addedProducts.join(', ')}</p>
        </div>
      )}

      {addedProducts.length === 0 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLoadSamples}
          disabled={saving}
          className="w-full py-3 rounded-xl border-2 border-dashed border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer"
        >
          {saving ? 'Loading...' : '⚡ Load 5 sample products (microgreens)'}
        </motion.button>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Or add manually:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customProduct.name}
            onChange={(e) => setCustomProduct({ ...customProduct, name: e.target.value })}
            placeholder="Product name"
            className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm outline-none"
          />
          <input
            type="number"
            value={customProduct.pricePerUnit}
            onChange={(e) => setCustomProduct({ ...customProduct, pricePerUnit: e.target.value })}
            placeholder="$"
            className="w-20 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onAddProduct}
            disabled={!customProduct.name.trim() || saving}
            className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-600"
          >
            +
          </motion.button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-semibold text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
          ← Back
        </button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onNext} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm cursor-pointer transition-colors">
          {addedProducts.length === 0 ? 'Skip →' : 'Next →'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Step 3: Team ────────────────────────────────────────────────────

function StepTeam({ inviteEmail, setInviteEmail, inviteRole, setInviteRole, invitedList, onSendInvite, onNext, onBack, saving }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Invite your team</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Add team members who'll use the workspace. You can always add more later.
        </p>
      </div>

      {invitedList.length > 0 && (
        <div className="space-y-2">
          {invitedList.map((inv, i) => (
            <div key={i} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{inv.email}</span>
              <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">{inv.role}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="teammate@email.com"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
        <div className="flex gap-2">
          {['employee', 'manager', 'driver', 'chef'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setInviteRole(r)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-colors ${
                inviteRole === r
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSendInvite}
          disabled={!inviteEmail.trim() || saving}
          className="w-full py-2.5 rounded-xl border-2 border-green-500 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer disabled:border-gray-200 disabled:text-gray-300 transition-colors"
        >
          {saving ? 'Sending...' : '📧 Send Invite'}
        </motion.button>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-semibold text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
          ← Back
        </button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onNext} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm cursor-pointer transition-colors">
          {invitedList.length === 0 ? 'Skip →' : 'Next →'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Step 4: Done ────────────────────────────────────────────────────

function StepDone({ onFinish, saving }) {
  return (
    <div className="text-center space-y-5 py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
        className="text-6xl"
      >
        🚀
      </motion.div>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">You're all set!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Your farm workspace is ready. You can customize everything from the settings later.
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onFinish}
        disabled={saving}
        className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors cursor-pointer"
      >
        {saving ? 'Launching...' : 'Launch My Workspace 🌱'}
      </motion.button>
    </div>
  );
}
