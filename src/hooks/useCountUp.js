import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from its previous value to the new target.
 * Uses requestAnimationFrame for smooth 60fps transitions.
 *
 * @param {number} target  - The value to animate to
 * @param {number} duration - Animation duration in ms (default 350)
 * @returns {number} - The current animated value
 */
export function useCountUp(target, duration = 350) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    if (prevRef.current === target) return;
    const start = prevRef.current;
    const t0 = performance.now();

    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}
