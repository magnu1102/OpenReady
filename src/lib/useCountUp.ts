import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

interface UseCountUpOptions {
  duration?: number;
}

/**
 * Animates from 0 to the target number using requestAnimationFrame.
 * Returns the target immediately when prefers-reduced-motion is set, or when
 * target is null. The animation restarts whenever target changes.
 */
export function useCountUp(target: number | null, options: UseCountUpOptions = {}): number | null {
  const reducedMotion = useReducedMotion();
  const [current, setCurrent] = useState<number | null>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null || reducedMotion) {
      // Snap directly to the target (or null) without animating.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync when animation is disabled or there's no value to animate to
      setCurrent(target);
      return;
    }

    const duration = options.duration ?? 600;
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = from + (target! - from) * eased;
      setCurrent(value);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, reducedMotion, options.duration]);

  return current;
}
