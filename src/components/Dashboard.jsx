import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { seedDatabase } from '../services/seedService';

export default function Dashboard({ farmId }) {
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [seedError, setSeedError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const result = await seedDatabase(farmId);
      setSeedResult(result);
      setConfirming(false);
    } catch (err) {
      console.error('Seed error:', err);
      setSeedError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const modules = [
    { path: '/kanban', icon: '📋', label: 'Kanban Board', desc: 'Drag tasks across status columns', ready: true },
    { path: '/planning', icon: '📐', label: 'Planning Board', desc: 'Backlog + sprint planning', ready: true },
    { path: '/calendar', icon: '🗓️', label: 'Calendar', desc: 'Monthly view with task dots', ready: true },
    { path: '/vendors', icon: '👥', label: 'Vendors', desc: 'Vendor contacts directory', ready: true },
    { path: '/inventory', icon: '📦', label: 'Inventory', desc: 'Track seeds, supplies, equipment', ready: false },
    { path: '/budget', icon: '💰', label: 'Budget', desc: 'Expenses and revenue tracking', ready: false },
    { path: '/production', icon: '🌿', label: 'Production', desc: 'Harvest and yield logs', ready: false },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h2>

      {/* Seed Data Banner — always visible until seeded this session */}
      {!seedResult && (
        <div className="mb-6 p-5 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <h3 className="text-lg font-bold text-amber-800 mb-1">
            🌱 Seed Starter Data
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            ⚠️ Resets all sprint, task, and vendor data to the latest starter
            dataset. Existing data will be wiped.
          </p>

          {seedError && (
            <p className="text-sm text-red-600 mb-2 font-medium">Error: {seedError}</p>
          )}

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-lg
                         hover:bg-green-700 transition-colors cursor-pointer text-sm"
            >
              🌱 Seed Starter Data
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg
                           hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait
                           transition-colors cursor-pointer text-sm"
              >
                {seeding ? 'Seeding…' : 'Yes, seed now'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={seeding}
                className="bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-lg
                           hover:bg-gray-300 transition-colors cursor-pointer text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success message */}
      {seedResult && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-xl flex items-center justify-between">
          <p className="text-sm font-semibold text-green-800">
            ✅ Seeded {seedResult.sprints} sprints, {seedResult.tasks} tasks,
            and {seedResult.vendors} vendors!
          </p>
          <button
            onClick={() => navigate('/kanban')}
            className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors cursor-pointer text-sm"
          >
            Go to Kanban →
          </button>
        </div>
      )}

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(({ path, icon, label, desc, ready }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
              ready
                ? 'bg-white border-gray-200 hover:border-green-400 hover:shadow-md'
                : 'bg-gray-50 border-dashed border-gray-300 opacity-60'
            }`}
          >
            <span className="text-2xl">{icon}</span>
            <h3 className="text-sm font-bold text-gray-800 mt-2">{label}</h3>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
            {!ready && (
              <span className="inline-block mt-2 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Coming soon
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
