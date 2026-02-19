/**
 * RefreshBanner — "Tap to refresh" / "Updated just now" indicator.
 *
 * Shows a tappable banner when the app returns from background after being
 * away for >60 seconds, or shows a subtle "Updated X seconds ago" label.
 * Purely a confidence signal — Firestore subscriptions keep data live.
 */
export default function RefreshBanner({ refreshing, returnedFromBg, secondsAgo, onRefresh }) {
  // Show prominent "Tap to refresh" when returning from background
  if (returnedFromBg && !refreshing) {
    return (
      <button
        onClick={onRefresh}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-50 border border-sky-200 rounded-xl text-sm font-semibold text-sky-700 hover:bg-sky-100 active:scale-[0.98] transition-all cursor-pointer mb-3"
      >
        <span className="text-base">🔄</span>
        Tap to refresh
      </button>
    );
  }

  // Show spinner during refresh
  if (refreshing) {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-2 mb-3">
        <div className="w-4 h-4 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
        <span className="text-xs text-green-600 font-semibold">Refreshing…</span>
      </div>
    );
  }

  // Show subtle "Updated X ago" timestamp
  const label = secondsAgo < 10
    ? 'Updated just now'
    : secondsAgo < 60
      ? `Updated ${secondsAgo}s ago`
      : `Updated ${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <button
      onClick={onRefresh}
      className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors cursor-pointer mb-1"
      title="Tap to refresh"
    >
      <span>⟳</span>
      <span>{label}</span>
    </button>
  );
}
