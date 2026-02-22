/**
 * Alert — reusable banner/alert component with dark-mode support.
 *
 * Usage:
 *   <Alert variant="error" title="Connection failed" message="Could not load orders." />
 *   <Alert variant="info" message="Showing latest 200 entries." />
 *   <Alert variant="warning" action={{ label: 'Retry', onClick: handleRetry }} />
 */
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const VARIANTS = {
  info: {
    wrapper: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
    icon: Info,
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  success: {
    wrapper: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200',
    icon: CheckCircle2,
    iconColor: 'text-green-500 dark:text-green-400',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
    icon: XCircle,
    iconColor: 'text-red-500 dark:text-red-400',
  },
};

export default function Alert({ variant = 'info', title, message, action, className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.info;
  const IconComp = v.icon;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${v.wrapper} ${className}`}>
      <IconComp className={`h-4 w-4 shrink-0 mt-0.5 ${v.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {message && <p className={title ? 'mt-0.5 opacity-90' : ''}>{message}</p>}
      </div>
      {action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          className="shrink-0 text-xs font-semibold bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
