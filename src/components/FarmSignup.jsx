import { useState } from 'react';
import { motion } from 'framer-motion';
import { createFarm } from '../services/farmService';

const FARM_TYPES = [
  { id: 'microgreens', label: 'Microgreens', icon: '🌱' },
  { id: 'mushrooms',   label: 'Mushrooms',   icon: '🍄' },
  { id: 'leafy-greens', label: 'Leafy Greens', icon: '🥬' },
  { id: 'herbs',        label: 'Herbs',        icon: '🌿' },
  { id: 'mixed',        label: 'Mixed / Other', icon: '🌾' },
];

/**
 * FarmSignup — new user creates their farm workspace.
 *
 * Clean, branded registration form. After submission, farmService creates
 * the Firestore structure and the user is redirected to onboarding.
 */
export default function FarmSignup({ user, onFarmCreated, onLogout }) {
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [farmType, setFarmType] = useState('microgreens');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!farmName.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const newFarmId = await createFarm({
        farmName: farmName.trim(),
        ownerName: user.displayName || '',
        ownerEmail: user.email,
        ownerUid: user.uid,
        location: location.trim(),
        farmType,
      });
      onFarmCreated(newFarmId);
    } catch (err) {
      console.error('Farm creation failed:', err);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 max-w-lg w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-5xl">🌱</span>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-3">
            Create Your Farm Workspace
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set up your farm in under 60 seconds
          </p>
        </div>

        {/* Signed in as */}
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-6">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold text-green-800">
              {user.displayName?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user.displayName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            Switch
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Farm name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Farm Name *
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g. Mico's Micro Farm"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              required
              autoFocus
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Boise, Idaho"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Farm type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              What do you grow?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FARM_TYPES.map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFarmType(id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    farmType === id
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-green-700 dark:text-green-400'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={!farmName.trim() || saving}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating workspace...
              </span>
            ) : (
              'Create My Farm Workspace →'
            )}
          </motion.button>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-5">
          Free to start • No credit card required
        </p>
      </motion.div>
    </div>
  );
}
