import { motion } from 'framer-motion';

const pageVariants = {
  initial:  { opacity: 0, y: 10 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -5 },
};

const pageTransition = {
  duration: 0.2,
  ease: 'easeOut',
};

/**
 * Wrap a page component for fade + slide-up entry animation.
 * Used inside each Route element in AppRoutes.
 */
export default function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

// ── Staggered list container — wraps card lists ─────────────────────────────

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
};

// ── Modal animation variants ────────────────────────────────────────────────

export const modalOverlay = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
  transition: { duration: 0.15 },
};

// Desktop: fade + scale. Mobile: slide up from bottom.
export const modalContent = {
  initial:  { opacity: 0, scale: 0.95, y: 10 },
  animate:  { opacity: 1, scale: 1, y: 0 },
  exit:     { opacity: 0, scale: 0.95, y: 10 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

export const modalContentMobile = {
  initial:  { opacity: 0, y: 100 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: 100 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

// ── Button tap animation ────────────────────────────────────────────────────
export const tapScale = { whileTap: { scale: 0.97 } };

// ── Toast animation ─────────────────────────────────────────────────────────
export const toastVariants = {
  initial:  { opacity: 0, x: 100, scale: 0.95 },
  animate:  { opacity: 1, x: 0, scale: 1 },
  exit:     { opacity: 0, x: 100, scale: 0.95 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

// ── Number spring (for animated counters) ───────────────────────────────────
export const numberSpring = {
  type: 'spring',
  stiffness: 200,
  damping: 20,
};
