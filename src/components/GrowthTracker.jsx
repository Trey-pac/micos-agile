import { useNavigate } from 'react-router-dom';
import { cropConfig, getVarietyById } from '../data/cropConfig';

// Canonical display order across all crop categories (harvested excluded)
const STAGE_ORDER = [
  'germination', 'inoculation',
  'blackout', 'incubation',
  'seedling', 'transplant',
  'light', 'growing', 'pinning',
  'fruiting', 'ready',
];

const CATEGORY_BADGE = {
  microgreens: 'bg-green-100 border-green-300 text-green-800',
  leafyGreens: 'bg-teal-100 border-teal-300 text-teal-800',
  herbs: 'bg-lime-100 border-lime-300 text-lime-800',
  mushrooms: 'bg-amber-100 border-amber-300 text-amber-800',
};

const CATEGORY_BAR = {
  microgreens: 'bg-green-500',
  leafyGreens: 'bg-teal-500',
  herbs: 'bg-lime-500',
  mushrooms: 'bg-amber-500',
};

function stageLabelFor(cropCategory, stageId) {
  const stages = cropConfig[cropCategory]?.stages || [];
  return stages.find((s) => s.id === stageId)?.label || stageId;
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function BatchCard({ batch, onAdvance }) {
  const variety = getVarietyById(batch.varietyId);
  const growDays = variety?.growDays ?? 10;
  const days = daysSince(batch.sowDate);
  const progress = Math.min(100, Math.round((days / growDays) * 100));
  const daysLeft = Math.max(0, growDays - days);
  const isReady = batch.stage === 'ready';

  return (
    <div className={`rounded-xl border-2 p-4 ${isReady ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'}`}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-gray-800 text-sm leading-tight">{batch.varietyName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{batch.quantity} {batch.unit}s · Day {days}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${CATEGORY_BADGE[batch.cropCategory] || 'bg-gray-100 border-gray-300 text-gray-700'}`}>
          {cropConfig[batch.cropCategory]?.label ?? batch.cropCategory}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{stageLabelFor(batch.cropCategory, batch.stage)}</span>
          <span>{isReady ? '✅ Ready!' : `${daysLeft}d left`}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${CATEGORY_BAR[batch.cropCategory] ?? 'bg-gray-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Advance button (hidden when ready — harvest via HarvestLogger) */}
      {!isReady && (
        <button
          onClick={() => onAdvance(batch)}
          className="w-full py-2 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-200 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all cursor-pointer"
        >
          Advance Stage →
        </button>
      )}

      {batch.notes && (
        <p className="text-xs text-gray-400 mt-2 truncate">{batch.notes}</p>
      )}
    </div>
  );
}

function Header({ activeBatches, readyCount, navigate }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Production Tracker</h2>
        <p className="text-sm text-gray-500">
          {activeBatches.length} active batch{activeBatches.length !== 1 ? 'es' : ''} in progress
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/production/log')}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition-colors cursor-pointer"
        >
          + Log Batch
        </button>
        <button
          onClick={() => navigate('/production/harvest')}
          className="relative bg-white border-2 border-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-sm hover:border-green-400 transition-colors cursor-pointer"
        >
          ✂️ Harvest
          {readyCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {readyCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function GrowthTracker({ activeBatches = [], readyBatches = [], onAdvanceStage }) {
  const navigate = useNavigate();

  // Group active batches by stage
  const grouped = {};
  activeBatches.forEach((b) => {
    if (!grouped[b.stage]) grouped[b.stage] = [];
    grouped[b.stage].push(b);
  });
  const stagesInUse = STAGE_ORDER.filter((s) => grouped[s]?.length > 0);

  if (activeBatches.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Header activeBatches={[]} readyCount={0} navigate={navigate} />
        <div className="mt-12 text-center py-16">
          <p className="text-5xl mb-3">🌱</p>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No active batches</h3>
          <p className="text-sm text-gray-500 mb-6">Log your first planting to start tracking growth.</p>
          <button
            onClick={() => navigate('/production/log')}
            className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
          >
            🌱 Log First Batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Header activeBatches={activeBatches} readyCount={readyBatches.length} navigate={navigate} />

      <div className="space-y-6">
        {stagesInUse.map((stage) => {
          const stageBatches = grouped[stage];
          const label = stageLabelFor(stageBatches[0].cropCategory, stage);
          return (
            <section key={stage}>
              <div className={`flex items-center gap-2 mb-3 ${stage === 'ready' ? 'text-green-700' : 'text-gray-700'}`}>
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  {stage === 'ready' ? '✅ ' : ''}{label}
                </h3>
                <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {stageBatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stageBatches.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} onAdvance={onAdvanceStage} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
