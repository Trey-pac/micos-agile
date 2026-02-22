import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const QUICK_LINKS = [
  { path: '/kanban',     icon: '📋', label: 'Kanban'     },
  { path: '/planning',   icon: '📐', label: 'Planning'   },
  { path: '/production', icon: '🌿', label: 'Production' },
  { path: '/orders',     icon: '📑', label: 'Orders'     },
  { path: '/budget',     icon: '💰', label: 'Budget'     },
  { path: '/sowing',     icon: '🌱', label: 'Sowing'     },
  { path: '/pipeline',   icon: '📊', label: 'Pipeline'   },
  { path: '/business/revenue', icon: '💹', label: 'Revenue' },
];

export default function QuickLinksCard() {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Quick Links</h3>
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {QUICK_LINKS.map(({ path, icon, label }) => (
          <motion.button
            key={path}
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-sky-50 dark:hover:bg-sky-900/30 border border-gray-100 dark:border-gray-700 hover:border-sky-200 dark:hover:border-sky-600 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{label}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
