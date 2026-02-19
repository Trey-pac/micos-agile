/**
 * ErrorBanner — Shows a data-loading error with optional retry.
 *
 * Usage:
 *   <ErrorBanner error={ordersError} label="orders" onRetry={refresh} />
 *
 * Renders nothing when error is falsy.
 */
import Alert from './Alert';

export default function ErrorBanner({ error, label = 'data', onRetry }) {
  if (!error) return null;

  return (
    <Alert
      variant="error"
      message={`Couldn't load ${label} right now. Try refreshing.`}
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
      className="mb-4"
    />
  );
}
