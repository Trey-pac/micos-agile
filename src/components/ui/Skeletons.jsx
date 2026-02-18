/**
 * Loading skeleton components for all data-driven pages.
 * Primitives: SkCard, SkText, SkList — compose into page layouts below.
 * Each page skeleton approximates the real layout so the transition feels instant.
 */

// ── Primitives ─────────────────────────────────────────────────────────────────

export function SkCard({ h = 'h-16', className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl w-full ${h} ${className}`} />;
}

export function SkText({ w = 'w-32', h = 'h-4', className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${h} ${w} ${className}`} />;
}

export function SkList({ count = 4, h = 'h-14', gap = 'gap-3', className = '' }) {
  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {Array.from({ length: count }).map((_, i) => <SkCard key={i} h={h} />)}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Greeting */}
      <div className="space-y-1.5">
        <SkText w="w-56" h="h-7" />
        <SkText w="w-40" />
      </div>
      {/* Sprint ring + My Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <SkText w="w-32" />
          <div className="flex items-center gap-5">
            <div className="w-[88px] h-[88px] rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <SkText w="w-full" />
              <SkText w="w-2/3" />
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {[0,1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <SkText w="w-44" />
          <SkList count={5} h="h-8" gap="gap-2" />
        </div>
      </div>
      {/* Quick Links */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <SkText w="w-28" className="mb-3" />
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
      {/* Crew row */}
      <div className="h-14 bg-white rounded-2xl animate-pulse border border-gray-100" />
      {/* Pipeline + Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
          <SkText w="w-36" />
          <SkList count={4} h="h-8" gap="gap-2" />
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
          <SkText w="w-36" />
          <SkList count={4} h="h-8" gap="gap-2" />
        </div>
      </div>
    </div>
  );
}

// ── Kanban ─────────────────────────────────────────────────────────────────────

export function KanbanSkeleton() {
  const COL_BORDERS = ['border-gray-300', 'border-blue-300', 'border-red-300', 'border-green-300'];
  return (
    <div>
      <div className="h-16 bg-gray-100 rounded-2xl animate-pulse mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COL_BORDERS.map((border, i) => (
          <div key={i} className={`bg-white rounded-2xl p-5 shadow-md border-t-4 min-h-[400px] ${border}`}>
            <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-200">
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-8 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <SkList count={3} h="h-20" gap="gap-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Planning Board ─────────────────────────────────────────────────────────────

export function PlanningBoardSkeleton() {
  return (
    <div>
      {/* View toggle + filter row */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse" />
        <div className="ml-auto h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      {/* Sprint columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 min-w-[280px] flex-shrink-0 border border-gray-200 space-y-2">
            <div className="h-9 bg-sky-50 border border-sky-100 rounded-xl animate-pulse" />
            <SkList count={4} h="h-14" gap="gap-2" />
          </div>
        ))}
        {/* Backlog column */}
        <div className="bg-white rounded-2xl p-4 min-w-[280px] flex-shrink-0 border border-gray-200 space-y-2">
          <div className="h-9 bg-orange-50 border border-orange-100 rounded-xl animate-pulse" />
          <SkList count={6} h="h-14" gap="gap-2" />
        </div>
      </div>
    </div>
  );
}

// ── Calendar ───────────────────────────────────────────────────────────────────

export function CalendarSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
        <SkText w="w-40" h="h-7" />
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
      {/* Day name headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      {/* 5-row × 7-col calendar grid */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: 7 }).map((_, col) => (
            <div key={col} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Growth Tracker ─────────────────────────────────────────────────────────────

export function GrowthTrackerSkeleton() {
  return (
    <div className="space-y-5">
      <SkText w="w-52" h="h-7" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <SkText w="w-28" />
              <SkText w="w-16" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gray-200 animate-pulse rounded-full" style={{ width: `${45 + i * 8}%` }} />
            </div>
            <div className="flex gap-2">
              <SkText w="w-20" />
              <SkText w="w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────────────

export function BudgetSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SkText w="w-44" h="h-7" />
        <div className="flex gap-2">
          {[0, 1, 2].map(i => <div key={i} className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      </div>
      {/* 3 summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <SkText w="w-20" />
            <SkText w="w-28" h="h-6" />
          </div>
        ))}
      </div>
      {/* Category bars */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <SkText w="w-36" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <SkText w="w-24" />
              <SkText w="w-16" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div className="h-full bg-gray-200 animate-pulse rounded-full" style={{ width: `${80 - i * 15}%` }} />
            </div>
          </div>
        ))}
      </div>
      <SkList count={5} h="h-12" gap="gap-2" />
    </div>
  );
}

// ── Sowing Schedule ────────────────────────────────────────────────────────────

export function SowingSkeleton() {
  return (
    <div className="space-y-4">
      <SkText w="w-48" h="h-7" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <SkText w="w-3/4" />
              <SkText w="w-1/2" />
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Order Manager ──────────────────────────────────────────────────────────────

export function OrderManagerSkeleton() {
  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>
      <SkList count={5} h="h-24" gap="gap-3" />
    </div>
  );
}

// ── Pipeline Dashboard ─────────────────────────────────────────────────────────

export function PipelineSkeleton() {
  return (
    <div className="space-y-4">
      <SkText w="w-48" h="h-7" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <SkText w="w-20" />
            <SkText w="w-16" h="h-6" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <SkText w="w-36" />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <SkText w="w-32" />
              <SkText w="w-20" />
            </div>
            <div className="h-3 bg-gray-100 rounded-full">
              <div className="h-full bg-gray-200 animate-pulse rounded-full" style={{ width: `${30 + i * 14}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Log ───────────────────────────────────────────────────────────────

export function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => <div key={i} className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />)}
      </div>
      {/* Feed items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkText w="w-full" />
            <SkText w="w-2/3" />
          </div>
          <SkText w="w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Crew Daily Board ───────────────────────────────────────────────────────────

export function CrewSkeleton() {
  return (
    <div className="space-y-4">
      <SkText w="w-52" h="h-7" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Plant Today', 'Move Today', 'Harvest Today'].map(label => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <SkText w="w-32" />
            <SkList count={3} h="h-16" gap="gap-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inventory Alerts ───────────────────────────────────────────────────────────

export function InventorySkeleton() {
  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />)}
      </div>
      {/* Alert banner */}
      <div className="h-12 bg-red-50 rounded-xl animate-pulse border border-red-100" />
      <SkList count={6} h="h-14" gap="gap-2" />
    </div>
  );
}

// ── Product Manager ────────────────────────────────────────────────────────────

export function ProductManagerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkText w="w-36" h="h-7" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
            <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            <SkText w="w-3/4" />
            <SkText w="w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Customer Manager ───────────────────────────────────────────────────────────

export function CustomerManagerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkText w="w-40" h="h-7" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <SkList count={6} h="h-16" gap="gap-3" />
    </div>
  );
}

// ── End of Day Report ──────────────────────────────────────────────────────────

export function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <SkText w="w-52" h="h-7" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}
      </div>
      <SkList count={5} h="h-16" gap="gap-3" />
    </div>
  );
}

// ── Harvest Logger ─────────────────────────────────────────────────────────────

export function HarvestLoggerSkeleton() {
  return (
    <div className="space-y-4">
      <SkText w="w-44" h="h-7" />
      <SkList count={4} h="h-20" gap="gap-3" />
    </div>
  );
}
