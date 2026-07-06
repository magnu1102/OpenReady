import type { Variants } from "framer-motion";

/*
 * Aurora motion constants — the single choreography source for framer-motion.
 * Durations and easing mirror the CSS transition tokens in tailwind.config.ts
 * (micro 150ms / soft 220ms / route 320ms, ease-soft) so CSS transitions and
 * framer animations stay in step.
 *
 * Hard rule: elements carrying a `data-tour-anchor` attribute (and their
 * ancestors) may only animate with `fadeIn` — opacity, never transform.
 * TourOverlay positions its clip-path dimmer from getBoundingClientRect(),
 * which includes in-flight CSS transforms, so a card mid-`y` entrance
 * measures at the wrong place. See docs/design-system.md.
 *
 * Reduced motion: AppShell wraps the tree in <MotionConfig reducedMotion="user">,
 * which zeroes transform animations automatically; the CSS guard in globals.css
 * flattens everything else. Imperative animations (useCountUp, ring draw)
 * check useReducedMotion() themselves.
 */

export const durations = {
  micro: 0.15,
  soft: 0.22,
  route: 0.32,
} as const;

export const easeSoft = [0.2, 0.8, 0.2, 1] as const;

/** Standard entrance: fade + small upward drift. Not for tour-anchored elements. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.soft, ease: easeSoft },
  },
};

/** Opacity-only entrance — required for tour-anchored elements and their children. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.soft, ease: easeSoft },
  },
};

/** Route-level entrance. Entrance-only by design: exit animations double-mount
 * routes, which breaks focus traps and the skip-link target. */
export const routeVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.route, ease: easeSoft },
  },
};

/**
 * Parent container that staggers `fadeUp`/`fadeIn` children. Cap the total
 * choreography under ~600ms: with n children, keep n * stagger + soft < 0.6s.
 */
export function staggerContainer(stagger = 0.05, delay = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };
}

/** Score visuals: slightly longer fade for rings/bars revealing alongside count-up. */
export const scoreReveal: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.route, ease: easeSoft },
  },
};

/** Hover lift for interactive cards — transform-only, never shadows per-frame. */
export const hoverLift = {
  whileHover: { y: -2 },
  transition: { duration: durations.micro, ease: easeSoft },
} as const;
