import { useState, useRef, useEffect } from 'react';

const CATEGORIES = [
  { id: 'Bug Fix',        icon: '🐛' },
  { id: 'New Feature',    icon: '✨' },
  { id: 'UI Change',      icon: '🎨' },
  { id: 'Process Change', icon: '⚙️' },
  { id: 'Other',          icon: '📌' },
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

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-white/10 animate-fade-in overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">🛠️ Dev Request</h2>
              <p className="text-xs text-gray-500 mt-0.5">Routed to Trey for triage</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-300 transition-colors text-xl leading-none cursor-pointer mt-0.5"
              aria-label="Close"
            >✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              What do you need?
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short, clear description…"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
            />
          </div>

          {/* Category pills */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                    category === c.id
                      ? 'bg-green-600 border-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200'
                  }`}
                >
                  {c.icon} {c.id}
                </button>
              ))}
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
                <span className="text-gray-700">+</span> Add details
              </button>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Details <span className="normal-case font-normal text-gray-700">(optional)</span>
                </label>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Links, screenshots, more context…"
                  rows={3}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="w-full py-3 bg-green-600 hover:bg-green-500 active:scale-[0.98] disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-xl text-sm transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? '⏳ Submitting…' : '🚀 Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
