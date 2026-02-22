/**
 * TrustBadge.jsx — Learning Engine trust tier badge.
 *
 * Displays a color-coded confidence badge based on:
 *   gray  (<40)    — Low confidence / learning
 *   yellow (40-69) — Moderate confidence
 *   green  (70+)   — High confidence
 *   blue   (70+ with 12+ months of data) — Verified / trusted
 *
 * Also shows a compact tooltip with contextual info.
 */
import { Search, BarChart, CheckCircle, Award } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

const TIERS = {
  learning:  { label: 'Learning',  color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400', icon: Search },
  moderate:  { label: 'Moderate',  color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: BarChart },
  confident: { label: 'Confident', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle },
  verified:  { label: 'Verified',  color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: Award },
};

function getTier(confidence, firstOrderDate) {
  if (confidence >= 70) {
    // Check if 12+ months of data
    if (firstOrderDate) {
      const monthsOfData = (Date.now() - new Date(firstOrderDate).getTime()) / (30.44 * 86400000);
      if (monthsOfData >= 12) return 'verified';
    }
    return 'confident';
  }
  if (confidence >= 40) return 'moderate';
  return 'learning';
}

export default function TrustBadge({ confidence = 0, firstOrderDate = null, compact = false }) {
  const tier = getTier(confidence, firstOrderDate);
  const { label, color, icon: TierIcon } = TIERS[tier];

  const tooltipText = compact
    ? `${label} (${confidence}% confidence)`
    : `Trust tier: ${label} — ${confidence}% confidence${firstOrderDate ? `, tracking since ${firstOrderDate.split('T')[0]}` : ''}`;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>
            <TierIcon className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>
          <TierIcon className="h-3 w-3" /> {label} {confidence}%
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

export { getTier, TIERS };
