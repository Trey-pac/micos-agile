import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFarmConfig } from '../../contexts/FarmConfigContext';
import { updateFarmConfig } from '../../services/farmService';

const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none';

const COLOR_OPTIONS = ['#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#d97706', '#059669'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Boise',
  'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
];

export default function SettingsTab({ farmId }) {
  const { config, setConfig } = useFarmConfig();
  const [name, setName] = useState(config.name || '');
  const [tagline, setTagline] = useState(config.tagline || '');
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor || '#16a34a');
  const [timezone, setTimezone] = useState(config.timezone || 'America/Boise');
  const [cutoffTime, setCutoffTime] = useState(config.cutoffTime || '14:00');
  const [deliveryDays, setDeliveryDays] = useState(config.deliveryDays || ['tuesday', 'friday']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
