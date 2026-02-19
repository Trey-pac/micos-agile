import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Microgreens', 'Leafy Greens', 'Herbs', 'Mushrooms', 'Other'];
const UNITS = ['oz', 'lbs', 'bunch', 'each', 'tray', 'flat'];

export default function ProductModal({ product, onClose, onSave, onDelete }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || 'Microgreens',
    unit: product?.unit || 'oz',
    pricePerUnit: product?.pricePerUnit ?? '',
    description: product?.description || '',
    available: product?.available ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || form.pricePerUnit === '') return;
    setSaving(true);
    try {
      await onSave({ ...form, pricePerUnit: parseFloat(form.pricePerUnit) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {isEdit ? 'Edit Product' : 'New Product'}
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 text-2xl leading-none cursor-pointer">×</button>
        </div>

        {/* Name */}
        <input
          placeholder="Product name *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none"
        />

        {/* Category + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            >
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Price per unit ($) *</label>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={form.pricePerUnit}
            onChange={(e) => set('pricePerUnit', e.target.value)}
            className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none"
          />
        </div>

        {/* Description */}
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none resize-none"
        />

        {/* Availability toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => set('available', !form.available)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.available ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow transition-transform ${form.available ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {form.available ? 'Available to chefs' : 'Hidden from chefs'}
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || form.pricePerUnit === ''}
            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
          {isEdit && (
            <button
              onClick={() => onDelete(product.id)}
              className="px-4 py-3 bg-red-50 text-red-600 font-semibold rounded-xl text-sm hover:bg-red-100 transition-colors cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
}
