import { teamMembers } from '../data/constants';

const legendColors = {
  trey: 'bg-green-900',
  halie: 'bg-cyan-700',
  ricardo: 'bg-orange-500',
  team: 'bg-emerald-600',
};

export default function OwnerLegend() {
  return (
    <div className="flex gap-4 mb-6 flex-wrap">
      {teamMembers.map(member => (
        <div key={member.id} className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
          <div className={`w-5 h-5 rounded-md ${legendColors[member.id] || 'bg-gray-400'}`} />
          <span>{member.name}</span>
        </div>
      ))}
    </div>
  );
}
