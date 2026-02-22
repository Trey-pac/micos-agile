import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cropConfig } from '../data/cropConfig';
import { HarvestLoggerSkeleton } from './ui/Skeletons';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/production')}
          aria-label="Back"
          className="text-2xl"
        >
          ←
        </Button>
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
          <Button
            variant="link"
            onClick={() => navigate('/production')}
          >
            ← Back to tracker
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {readyBatches.map((batch) => {
            const catLabel = cropConfig[batch.cropCategory]?.label ?? batch.cropCategory;
            const yieldUnit = YIELD_UNIT[batch.cropCategory] ?? 'lbs';
            const isHarvesting = harvesting === batch.id;

            return (
              <Card
                key={batch.id}
                className="rounded-2xl border-2 border-green-300"
              >
                <CardContent className="p-5">
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
                    <Label>
                      Actual yield ({yieldUnit})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0"
                      value={yields[batch.id] ?? ''}
                      onChange={(e) => setYieldFor(batch.id, e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleHarvest(batch)}
                    disabled={isHarvesting}
                  >
                    {isHarvesting ? 'Saving…' : '✂️ Harvest'}
                  </Button>
                </div>

                {batch.notes && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    {batch.notes}
                  </p>
                )}
              </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
