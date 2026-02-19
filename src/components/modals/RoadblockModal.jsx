import { useState, useRef, useEffect } from 'react';
import { teamMembers as fallbackTeamMembers } from '../../data/constants';

const URGENCY_OPTIONS = [
  { id: 'immediate', emoji: '🔴', label: 'Immediate', color: 'bg-red-500/20 border-red-500 text-red-300' },
  { id: 'end-of-day', emoji: '🟡', label: 'By End of Day', color: 'bg-yellow-500/20 border-yellow-500 text-yellow-300' },
  { id: 'end-of-sprint', emoji: '🔵', label: 'By End of Sprint', color: 'bg-blue-500/20 border-blue-500 text-blue-300' },
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

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onSkip(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onSkip]);

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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />

      {/* Modal card — slide up on mobile */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">🚧 Roadblock</h2>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed truncate max-w-[280px]">
                <span className="font-semibold text-amber-400">{task?.title}</span>
              </p>
            </div>
            <button
              onClick={onSkip}
              className="text-gray-600 hover:text-gray-300 transition-colors text-xl leading-none cursor-pointer mt-0.5"
              aria-label="Close"
            >✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Why is this blocked?
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What's stopping progress?"
              required
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-all resize-none"
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
                  <span className="block text-base mb-0.5">{opt.emoji}</span>
                  <span className="text-[11px] leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl text-sm hover:bg-amber-500 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {submitting ? 'Creating…' : 'Submit & Create Unblock Task'}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="w-full py-2.5 text-gray-500 font-semibold text-sm hover:text-gray-300 cursor-pointer transition-colors"
            >
              Skip — just mark as roadblocked
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
