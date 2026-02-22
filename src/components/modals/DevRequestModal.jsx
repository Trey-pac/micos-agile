import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Bug, Sparkles, Palette, Settings, Pin, Wrench, Loader2, Rocket, Plus } from 'lucide-react';

const CATEGORIES = [
  { id: 'Bug Fix',        icon: Bug },
  { id: 'New Feature',    icon: Sparkles },
  { id: 'UI Change',      icon: Palette },
  { id: 'Process Change', icon: Settings },
  { id: 'Other',          icon: Pin },
];

const URGENCIES = [
  { id: 'this-sprint', label: 'This Sprint',  sub: 'Priority: High' },
  { id: 'next-sprint', label: 'Next Sprint',  sub: 'Priority: Medium' },
  { id: 'whenever',    label: 'Whenever',     sub: 'Priority: Low' },
];

export default function DevRequestModal({ onSubmit, onClose }) {
  const [title,       setTitle]       = useState('');
  const [category,    setCategory]    = useState('New Feature');
  const [urgency,     setUrgency]     = useState('next-sprint');
  const [details,     setDetails]     = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), category, urgency, details: details.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Wrench className="h-5 w-5 text-primary" />
            Dev Request
          </DialogTitle>
          <DialogDescription className="text-gray-400">Routed to Trey for triage</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              What do you need?
            </label>
            <Input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short, clear description…"
              required
              className="bg-white/5 border-white/10 text-white placeholder-gray-600 focus-visible:ring-green-500/50"
            />
          </div>

          {/* Category pills */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                      category === c.id
                        ? 'bg-green-600 border-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {c.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Urgency pills */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              When?
            </label>
            <div className="flex gap-2">
              {URGENCIES.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgency(u.id)}
                  className={`flex-1 py-2.5 px-2 rounded-xl text-center border transition-all duration-150 cursor-pointer ${
                    urgency === u.id
                      ? 'bg-sky-600 border-sky-500 text-white shadow-[0_0_8px_rgba(14,165,233,0.3)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{u.label}</div>
                  <div className={`text-[10px] mt-0.5 ${urgency === u.id ? 'text-sky-200' : 'text-gray-600'}`}>
                    {u.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details — collapsed by default */}
          <div>
            {!showDetails ? (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add details
              </button>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Details <span className="normal-case font-normal text-gray-700">(optional)</span>
                </label>
                <Textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Links, screenshots, more context…"
                  rows={3}
                  autoFocus
                  className="bg-white/5 border-white/10 text-white placeholder-gray-600 focus-visible:ring-green-500/50 resize-none"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!title.trim() || submitting}
            className="w-full bg-green-600 hover:bg-green-500 text-white"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              <><Rocket className="h-4 w-4" /> Submit Request</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
