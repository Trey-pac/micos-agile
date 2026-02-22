import { useNavigate } from 'react-router-dom';

const STATUS_CLS = {
  'not-started': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  'in-progress':  'bg-blue-100 text-blue-700',
  'roadblock':    'bg-red-100 text-red-700',
  'done':         'bg-green-100 text-green-700',
};

function RingProgress({ pct, size = 88, stroke = 7, color = '#22c55e' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} className="[transform:rotate(-90deg)]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
      />
    </svg>
  );
}

export default function ActiveSprintCard({ activeSprint, pct, animPct, animDone, totalSprint, daysLeft, statusCounts, ringColor }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Active Sprint</h3>
        <button onClick={() => navigate('/kanban')} className="text-xs text-sky-600 hover:underline cursor-pointer">View →</button>
      </div>
      {activeSprint ? (
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <RingProgress pct={pct} color={ringColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-gray-800 dark:text-gray-100">{animPct}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">
              Sprint {activeSprint.number}
              {activeSprint.name && <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">{activeSprint.name}</span>}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {animDone}/{totalSprint} tasks done
              {daysLeft !== null && (
                <span className={`ml-2 font-semibold ${daysLeft < 3 ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>· {daysLeft}d left</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {statusCounts.map(({ status, short, count }) => (
                <div key={status} className={`rounded-lg px-2 py-1.5 text-center ${STATUS_CLS[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  <div className="text-base font-black">{count}</div>
                  <div className="text-[9px] font-semibold leading-tight">{short}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 dark:text-gray-500 text-sm py-8 text-center">No active sprint — create one in Planning</div>
      )}
    </div>
  );
}
