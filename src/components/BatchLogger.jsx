import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cropConfig, getEstimatedHarvest } from '../data/cropConfig';

const CATEGORIES = Object.entries(cropConfig).map(([id, cfg]) => ({
  id,
  label: cfg.label,
  unit: cfg.unit,
  stages: cfg.stages,
  varieties: cfg.varieties,
}));

const today = () => new Date().toISOString().split('T')[0];

export default function BatchLogger({ onAddBatch }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState('microgreens');
  const [varietyId, setVarietyId] = useState('broccoli');
  const [quantity, setQuantity] = useState(10);
  const [sowDate, setSowDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null); // { varietyName, quantity, unit }

  const catConfig = cropConfig[category];
  const varieties = catConfig.varieties;
  const variety = varieties.find((v) => v.id === varietyId) || varieties[0];
  const harvestDates = getEstimatedHarvest(variety.id, sowDate);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setVarietyId(cropConfig[cat].varieties[0].id);
  };

  const adjustQty = (delta) => setQuantity((q) => Math.max(1, q + delta));

  const handleLog = async () => {
    setSaving(true);
    try {
      await onAddBatch({
        cropCategory: category,
        varietyId: variety.id,
        varietyName: variety.name,
        quantity,
        unit: catConfig.unit,
        sowDate,
        stage: catConfig.stages[0].id,
        estimatedHarvestStart: harvestDates.harvestStart.toISOString().split('T')[0],
        estimatedHarvestEnd: harvestDates.harvestEnd.toISOString().split('T')[0],
        harvestedAt: null,
        harvestYield: null,
        notes,
      });
      setSuccess({ varietyName: variety.name, quantity, unit: catConfig.unit });
      setQuantity(10);
      setNotes('');
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const harvestPreview = harvestDates
    ? `${harvestDates.harvestStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${harvestDates.harvestEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : null;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/production')}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none cursor-pointer"
          aria-label="Back"
        >←</button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Log New Batch</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Plant it, log it, track it.</p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl text-green-800 font-semibold text-sm">
          ✅ Logged {success.quantity} {success.unit}s of {success.varietyName}!
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
                  category === cat.id
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-green-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Variety */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Variety</label>
          <select
            value={varietyId}
            onChange={(e) => setVarietyId(e.target.value)}
            className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:border-green-400 focus:outline-none"
          >
            {varieties.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.growDays}d)</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Quantity ({catConfig.unit}s)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustQty(-1)}
              className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 text-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            >−</button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center border-2 border-gray-200 dark:border-gray-700 rounded-xl py-3 text-lg font-bold focus:border-green-400 focus:outline-none"
            />
            <button
              onClick={() => adjustQty(1)}
              className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 text-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            >+</button>
          </div>
          <div className="flex gap-2 mt-2">
            {[10, 20, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => setQuantity(n)}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer"
              >{n}</button>
            ))}
          </div>
        </div>

        {/* Sow date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Sow Date</label>
          <input
            type="date"
            value={sowDate}
            onChange={(e) => setSowDate(e.target.value)}
            className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none"
          />
        </div>

        {/* Harvest preview */}
        {harvestPreview && (
          <div className="bg-green-50 rounded-xl px-4 py-3 text-sm">
            <span className="font-semibold text-green-800">Estimated harvest: </span>
            <span className="text-green-700">{harvestPreview}</span>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Notes <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Rack location, presoak notes, special conditions…"
            rows={2}
            className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleLog}
          disabled={saving}
          className="w-full py-4 bg-green-600 text-white font-bold rounded-xl text-base hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait transition-colors cursor-pointer"
        >
          {saving
            ? 'Logging…'
            : `🌱 Log ${quantity} ${catConfig.unit}${quantity !== 1 ? 's' : ''} of ${variety.name}`}
        </button>
      </div>
    </div>
  );
}
