import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cropConfig } from '../data/cropConfig';
import { HarvestLoggerSkeleton } from './ui/Skeletons';

// Yield unit by category — microgreens are measured in oz, everything else in lbs
const YIELD_UNIT = {
  microgreens: 'oz',
  leafyGreens: 'lbs',
  herbs: 'lbs',
  mushrooms: 'lbs',
};

export default function HarvestLogger({ readyBatches, onHarvest, loading = false }) {
  const navigate = useNavigate();
  // Local yield inputs: { [batchId]: string }
  const [yields, setYields] = useState({});
  const [harvesting, setHarvesting] = useState(null); // batchId currently being saved
  if (loading) return <HarvestLoggerSkeleton />;

  const setYieldFor = (id, val) =>
    setYields((prev) => ({ ...prev, [id]: val }));

  const handleHarvest = async (batch) => {
    setHarvesting(batch.id);
    try {
      const raw = parseFloat(yields[batch.id]);
      await onHarvest(batch.id, isNaN(raw) ? null : raw);
      // Clear the yield input — the batch disappears from readyBatches on Firestore update
      setYields((prev) => { const next = { ...prev }; delete next[batch.id]; return next; });
    } finally {
      setHarvesting(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/production')}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none cursor-pointer"
          aria-label="Back"
        >←</button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Harvest Logger</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {readyBatches.length} batch{readyBatches.length !== 1 ? 'es' : ''} ready to cut
          </p>
        </div>
      </div>

      {readyBatches.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">⏳</p>
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">Nothing ready yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Check back when batches reach the Ready stage.</p>
          <button
            onClick={() => navigate('/production')}
            className="mt-6 text-sm font-semibold text-green-600 hover:underline cursor-pointer"
          >
            ← Back to tracker
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {readyBatches.map((batch) => {
            const catLabel = cropConfig[batch.cropCategory]?.label ?? batch.cropCategory;
            const yieldUnit = YIELD_UNIT[batch.cropCategory] ?? 'lbs';
            const isHarvesting = harvesting === batch.id;

            return (
              <div
                key={batch.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-green-300 p-5 shadow-sm"
              >
                {/* Batch info */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">{batch.varietyName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {batch.quantity} {batch.unit}s · {catLabel}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sown {batch.sowDate}</p>
                  </div>
                  <span className="text-3xl">✅</span>
                </div>

                {/* Yield input + harvest button */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Actual yield ({yieldUnit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0"
                      value={yields[batch.id] ?? ''}
                      onChange={(e) => setYieldFor(batch.id, e.target.value)}
                      className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleHarvest(batch)}
                    disabled={isHarvesting}
                    className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isHarvesting ? 'Saving…' : '✂️ Harvest'}
                  </button>
                </div>

                {batch.notes && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    {batch.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
