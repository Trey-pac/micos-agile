import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: '📦',
    title: '15-Second Ordering',
    desc: 'Chefs open the app, tap their usual items, hit order. Done. No more texting.',
  },
  {
    icon: '🌱',
    title: 'Production Tracking',
    desc: 'From seed to harvest — know exactly what\'s growing, when it\'s ready, and how much you\'ll have.',
  },
  {
    icon: '🚚',
    title: 'Delivery Management',
    desc: 'Optimized routes, photo proof of delivery, automatic invoicing. One tap for your drivers.',
  },
  {
    icon: '📊',
    title: 'Financial Dashboard',
    desc: 'Revenue, expenses, per-crop profitability. See your money in real time, not at tax time.',
  },
  {
    icon: '🌾',
    title: 'Smart Sowing',
    desc: 'The app tells your team what to plant based on demand. No more guessing, no more waste.',
  },
  {
    icon: '👥',
    title: 'Team Workspace',
    desc: 'Tasks, sprints, calendars, daily boards. Everyone knows what to do today.',
  },
];

const TIERS = [
  {
    name: 'Free',
    price: 'Free',
    priceSub: 'forever',
    features: ['1 team member', '10 products', '50 orders/month', 'Basic production tracking'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    priceSub: '/month',
    features: ['5 team members', 'Unlimited products & orders', 'Delivery management', 'Advanced reports', 'Priority support'],
    cta: 'Start Free Trial',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Business',
    price: '$149',
    priceSub: '/month',
    features: ['Unlimited everything', 'White-label branding', 'API access', 'Dedicated support'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' },
  }),
};

/**
 * LandingPage — public marketing page for the SaaS product.
 * Shown at the root URL for unauthenticated users (or at /landing).
 */
export default function LandingPage({ onGetStarted, onTryDemo, demoLoading }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* ── HERO ────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-gray-950 dark:to-gray-950" />
        <nav className="relative z-10 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Mico's Farm Workspace</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            Sign In
          </motion.button>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight"
          >
            Farm-to-Table,{' '}
            <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              Simplified
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Replace texting, spreadsheets, and guesswork with one app.
            Production tracking, chef ordering, delivery management, and financial dashboards — built for small farms.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="px-8 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-bold transition-colors cursor-pointer shadow-lg shadow-green-600/20"
            >
              Get Started Free →
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onTryDemo}
              disabled={demoLoading}
              className="px-8 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-base font-semibold hover:border-green-400 transition-colors cursor-pointer disabled:opacity-60"
            >
              {demoLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
                  Loading Demo...
                </span>
              ) : (
                'Try Demo'
              )}
            </motion.button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-xs text-gray-400 dark:text-gray-500"
          >
            No credit card required • Free plan included
          </motion.p>
        </div>
      </header>

      {/* ── SOCIAL PROOF ───────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900/50 py-8 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Built by a real farm, for real farms
          </p>
          <div className="flex items-center justify-center gap-8 mt-4 text-gray-800 dark:text-gray-200">
            <div><span className="text-2xl font-bold">80K+</span><br /><span className="text-xs text-gray-500 dark:text-gray-400">lbs delivered</span></div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
            <div><span className="text-2xl font-bold">0</span><br /><span className="text-xs text-gray-500 dark:text-gray-400">spreadsheets</span></div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
            <div><span className="text-2xl font-bold">15s</span><br /><span className="text-xs text-gray-500 dark:text-gray-400">chef ordering</span></div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Everything your farm needs
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-xl mx-auto">
            One platform replaces 6+ tools. Production, ordering, delivery, finance, team management — all connected.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-3 text-lg font-bold text-gray-800 dark:text-gray-100">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-12">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`relative rounded-2xl p-6 ${
                  tier.highlight
                    ? 'bg-white dark:bg-gray-800 border-2 border-green-500 shadow-xl'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-4 py-1 rounded-full">
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{tier.price}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">{tier.priceSub}</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onGetStarted}
                  className={`w-full mt-6 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                    tier.highlight
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-400'
                  }`}
                >
                  {tier.cta}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-gray-200 leading-relaxed italic"
          >
            "We went from texting orders to a fully automated farm-to-table pipeline.
            Our chefs order in seconds, our team knows exactly what to plant, and I can
            see every dollar in real time."
          </motion.blockquote>
          <div className="mt-6">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Trey</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Owner, Mico's Micro Farm — Boise, Idaho</p>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to simplify your farm?
          </h2>
          <p className="text-green-100 mb-8">
            Join farms already using Farm Workspace to streamline operations.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="px-10 py-4 rounded-xl bg-white text-green-700 text-base font-bold hover:bg-green-50 transition-colors cursor-pointer shadow-lg"
          >
            Get Started Free →
          </motion.button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Farm Workspace</span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Farm Workspace. Built with 🌱 in Boise, Idaho.
          </p>
        </div>
      </footer>
    </div>
  );
}
