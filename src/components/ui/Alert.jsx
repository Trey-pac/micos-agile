/**
 * Alert — reusable banner/alert component with dark-mode support.
 *
 * Usage:
 *   <Alert variant="error" title="Connection failed" message="Could not load orders." />
 *   <Alert variant="info" message="Showing latest 200 entries." />
 *   <Alert variant="warning" action={{ label: 'Retry', onClick: handleRetry }} />
 */

const VARIANTS = {
  info: {
    wrapper: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
    icon: 'ℹ️',
  },
  success: {
    wrapper: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200',
    icon: '✅',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200',
    icon: '⚠️',
  },
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
    icon: '❌',
  },
};

export default function Alert({ variant = 'info', title, message, action, className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.info;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${v.wrapper} ${className}`}>
      <span className="shrink-0 text-base leading-none mt-0.5">{v.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {message && <p className={title ? 'mt-0.5 opacity-90' : ''}>{message}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
