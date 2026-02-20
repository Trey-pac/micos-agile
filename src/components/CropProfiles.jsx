/**
 * CropProfiles.jsx — Crop Profiles database.
 *
 * Card grid UI showing all crop profiles with:
 *  - DTM (days to maturity), category, active toggle
 *  - Expandable detail (soak hours, blackout days, seed density, yield, notes)
 *  - Add / Edit / Delete via modal
 *  - Category filter tabs
 *
 * Pre-populated with 10 default microgreen profiles on first load.
 */

import { useState, useMemo } from 'react';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'microgreens', label: 'Microgreens' },
  { key: 'leafy-greens', label: 'Leafy Greens' },
  { key: 'herbs', label: 'Herbs' },
  { key: 'mushrooms', label: 'Mushrooms' },
  { key: 'other', label: 'Other' },
];

const CATEGORY_COLORS = {
  microgreens: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  'leafy-greens': 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  herbs: 'bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300',
  mushrooms: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  other: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
};

const EMPTY_FORM = {
  name: '',
  category: 'microgreens',
  daysToMaturity: '',
  harvestWindow: '',
  soakHours: '',
  blackoutDays: '',
  seedDensity: '',
  yieldPerTray: '',
  notes: '',
  active: true,
};

// ── Profile Card ────────────────────────────────────────────────────────────

function ProfileCard({ profile, onEdit, onToggleActive, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const catClass = CATEGORY_COLORS[profile.category] || CATEGORY_COLORS.other;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        profile.active !== false
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
      }`}
    >
      {/* Header — always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base truncate">
                {profile.name}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${catClass}`}>
                {profile.category}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {profile.daysToMaturity} DTM
              </span>
              {profile.harvestWindow && (
                <span>+{profile.harvestWindow}d window</span>
              )}
              {profile.soakHours > 0 && (
                <span>{profile.soakHours}h soak</span>
              )}
              {profile.blackoutDays > 0 && (
                <span>{profile.blackoutDays}d blackout</span>
              )}
            </div>
          </div>
          <span className="text-gray-400 dark:text-gray-500 text-lg mt-1 transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>
            ▾
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700/50">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
            <div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Seed Density</span>
              <p className="text-gray-700 dark:text-gray-300 font-medium">{profile.seedDensity || '—'}</p>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Yield / Tray</span>
              <p className="text-gray-700 dark:text-gray-300 font-medium">{profile.yieldPerTray || '—'}</p>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Soak Hours</span>
              <p className="text-gray-700 dark:text-gray-300 font-medium">{profile.soakHours || 0}h</p>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Blackout Days</span>
              <p className="text-gray-700 dark:text-gray-300 font-medium">{profile.blackoutDays || 0}d</p>
            </div>
          </div>
          {profile.notes && (
            <div className="mt-3">
              <span className="text-gray-400 dark:text-gray-500 text-xs">Notes</span>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">{profile.notes}</p>
            </div>
          )}
          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(profile); }}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              ✏️ Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleActive(profile); }}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                profile.active !== false
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
              }`}
            >
              {profile.active !== false ? '⏸️ Deactivate' : '▶️ Activate'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${profile.name}" crop profile?`)) {
                  onDelete(profile.id);
                }
              }}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-bold cursor-pointer transition-colors"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile Modal ───────────────────────────────────────────────────────────

function ProfileModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      daysToMaturity: Number(form.daysToMaturity) || 0,
      harvestWindow: Number(form.harvestWindow) || 0,
      soakHours: Number(form.soakHours) || 0,
      blackoutDays: Number(form.blackoutDays) || 0,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {initial ? 'Edit Crop Profile' : 'Add Crop Profile'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Crop Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
              placeholder="e.g. Sunflower"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
            >
              <option value="microgreens">Microgreens</option>
              <option value="leafy-greens">Leafy Greens</option>
              <option value="herbs">Herbs</option>
              <option value="mushrooms">Mushrooms</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Number fields row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Days to Maturity *</label>
              <input
                type="number"
                value={form.daysToMaturity}
                onChange={(e) => set('daysToMaturity', e.target.value)}
                required min="1" max="365"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Harvest Window (days)</label>
              <input
                type="number"
                value={form.harvestWindow}
                onChange={(e) => set('harvestWindow', e.target.value)}
                min="0" max="30"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
                placeholder="e.g. 3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Soak Hours</label>
              <input
                type="number"
                value={form.soakHours}
                onChange={(e) => set('soakHours', e.target.value)}
                min="0" max="48"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
                placeholder="e.g. 8"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Blackout Days</label>
              <input
                type="number"
                value={form.blackoutDays}
                onChange={(e) => set('blackoutDays', e.target.value)}
                min="0" max="14"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
                placeholder="e.g. 3"
              />
            </div>
          </div>

          {/* Text fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Seed Density</label>
              <input
                type="text"
                value={form.seedDensity}
                onChange={(e) => set('seedDensity', e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
                placeholder="e.g. 1 oz per 1020 tray"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Yield / Tray</label>
              <input
                type="text"
                value={form.yieldPerTray}
                onChange={(e) => set('yieldPerTray', e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
                placeholder="e.g. 8-10 oz"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors resize-none"
              placeholder="Growing tips, preferences, etc."
            />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set('active', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Active (visible to sowing calculator)</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="px-6 py-2.5 min-h-[44px] rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer transition-colors"
            >
              {saving ? 'Saving…' : initial ? 'Update' : 'Add Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CropProfiles({
  profiles = [],
  loading = false,
  error,
  onAddProfile,
  onEditProfile,
  onDeleteProfile,
}) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', profile }

  const filtered = useMemo(() => {
    let list = profiles;
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [profiles, categoryFilter, search]);

  const activeCount = profiles.filter((p) => p.active !== false).length;

  // Count by category for filter badges
  const categoryCounts = useMemo(() => {
    const counts = { all: profiles.length };
    for (const p of profiles) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [profiles]);

  const handleSave = async (formData) => {
    if (modal?.mode === 'edit') {
      await onEditProfile(modal.profile.id, formData);
    } else {
      await onAddProfile(formData);
    }
    setModal(null);
  };

  const handleToggleActive = (profile) => {
    onEditProfile(profile.id, { active: profile.active === false ? true : false });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Crop Profiles</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {profiles.length} crops · {activeCount} active
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="bg-green-600 text-white font-bold px-4 py-2.5 min-h-[44px] rounded-xl text-sm hover:bg-green-700 transition-colors cursor-pointer"
        >
          + Add Crop
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat.key
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
              }`}
            >
              {cat.label}
              {categoryCounts[cat.key] ? ` (${categoryCounts[cat.key]})` : ''}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search crops…"
          className="flex-1 min-w-[160px] px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {profiles.length === 0
              ? 'Setting up your crop library…'
              : 'No crops match your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              onEdit={() => setModal({ mode: 'edit', profile: p })}
              onToggleActive={handleToggleActive}
              onDelete={onDeleteProfile}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ProfileModal
          initial={modal.mode === 'edit' ? modal.profile : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
