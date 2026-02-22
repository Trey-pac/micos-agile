import { useState, useRef, useEffect } from 'react';
import { teamMembers as fallbackTeamMembers } from '../../data/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Construction, Circle } from 'lucide-react';

const URGENCY_OPTIONS = [
  { id: 'immediate', label: 'Immediate', color: 'bg-red-500/20 border-red-500 text-red-300', dotColor: 'text-red-500' },
  { id: 'end-of-day', label: 'By End of Day', color: 'bg-yellow-500/20 border-yellow-500 text-yellow-300', dotColor: 'text-yellow-500' },
  { id: 'end-of-sprint', label: 'By End of Sprint', color: 'bg-blue-500/20 border-blue-500 text-blue-300', dotColor: 'text-blue-500' },
];

const ownerAvatarBg = {
  trey: 'bg-green-600',
  halie: 'bg-cyan-600',
  ricardo: 'bg-orange-500',
  team: 'bg-purple-600',
};

/**
 * RoadblockModal — triggered when a task moves to "roadblock" status.
 * Captures: reason, unblocker, urgency. Creates an unblock task + annotates original.
 */
export default function RoadblockModal({ task, teamMembers: teamMembersProp, onSubmit, onSkip }) {
  const teamMembers = teamMembersProp || fallbackTeamMembers;
  const [reason, setReason] = useState('');
  const [unblocker, setUnblocker] = useState('trey');
  const [urgency, setUrgency] = useState('end-of-day');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ reason: reason.trim(), unblockOwnerId: unblocker, urgency });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onSkip(); }}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Construction className="h-5 w-5 text-amber-400" />
            Roadblock
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            <span className="font-semibold text-amber-400">{task?.title}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Why is this blocked?
            </label>
            <Textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What's stopping progress?"
              required
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder-gray-600 focus-visible:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Who can unblock? — horizontal avatar picker */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Who can unblock this?
            </label>
            <div className="flex gap-2">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setUnblocker(member.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all cursor-pointer min-w-[64px] ${
                    unblocker === member.id
                      ? 'border-amber-400 bg-amber-400/10 scale-105'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${ownerAvatarBg[member.id] || 'bg-gray-600'}`}>
                    {member.name.charAt(0)}
                  </div>
                  <span className={`text-[11px] font-semibold ${unblocker === member.id ? 'text-amber-300' : 'text-gray-500'}`}>
                    {member.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Urgency — pill buttons */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              How urgent?
            </label>
            <div className="flex gap-2">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUrgency(opt.id)}
                  className={`flex-1 py-2.5 px-2 rounded-xl border-2 text-center transition-all cursor-pointer text-sm font-semibold ${
                    urgency === opt.id
                      ? `${opt.color} scale-[1.03]`
                      : 'border-white/10 bg-white/5 text-gray-500 hover:border-white/20'
                  }`}
                >
                  <Circle className={`h-4 w-4 mx-auto mb-0.5 fill-current ${opt.dotColor}`} />
                  <span className="text-[11px] leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <Button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white"
            >
              {submitting ? 'Creating…' : 'Submit & Create Unblock Task'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-300"
              onClick={onSkip}
            >
              Skip — just mark as roadblocked
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
