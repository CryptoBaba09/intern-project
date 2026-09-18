"use client";

import { motion } from "framer-motion";

// Shared scroll-reveal variants used across the page's sections/cards so
// the choreography feels consistent instead of ad-hoc per-section.
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const easeOut = [0.16, 1, 0.3, 1];

// Drop-in wrapper for a single element that fades/slides up on mount.
//
// Used to be scroll-triggered (whileInView + an IntersectionObserver-
// based viewport check) -- found live 2026-09-19 that this doesn't
// reliably fire for content that's already in the viewport at page
// load: on a fresh navigation, hero H1s/paragraphs across every page
// (they're the first thing Reveal wraps) could get stuck at their
// "hidden" opacity indefinitely, only ever completing once something
// nudged the observer -- confirmed a single 1px scroll tick was enough
// to instantly snap a stuck headline to fully visible. That's a much
// worse failure mode than losing the "only animates once scrolled to"
// effect for below-the-fold sections, so this now animates on mount
// unconditionally instead, the same safe pattern HomeView.js's own
// Hero() already uses for its own text (initial="hidden" animate="show",
// never whileInView).
export function Reveal({ children, className = "", delay = 0, as = "div" }) {
  const MotionTag = motion[as] ?? motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      animate="show"
      variants={fadeUp}
      transition={{ duration: 0.6, ease: easeOut, delay }}
    >
      {children}
    </MotionTag>
  );
}
