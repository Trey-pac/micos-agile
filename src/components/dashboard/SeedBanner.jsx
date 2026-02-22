import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { seedDatabase } from '../../services/seedService';

export default function SeedBanner({ farmId }) {
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

  if (seedResult) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl flex items-center justify-between">
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
          ✅ Seeded {seedResult.sprints} sprints, {seedResult.tasks} tasks, and {seedResult.vendors} vendors!
        </p>
        <button
          onClick={() => navigate('/kanban')}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm"
        >Go to Kanban →</button>
      </div>
    );
  }

  return (
    <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl">
      <h3 className="text-base font-bold text-amber-800 dark:text-amber-300 mb-1">🌱 Seed Starter Data</h3>
      <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
        ⚠️ Resets all sprint, task, and vendor data to the latest starter dataset. Existing data will be wiped.
      </p>
      {seedError && <p className="text-sm text-red-600 mb-2 font-medium">Error: {seedError}</p>}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm"
        >🌱 Seed Starter Data</button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer text-sm"
          >{seeding ? 'Seeding…' : 'Yes, seed now'}</button>
          <button
            onClick={() => setConfirming(false)}
            disabled={seeding}
            className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer text-sm"
          >Cancel</button>
        </div>
      )}
    </div>
  );
}
