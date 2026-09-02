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

// Drop-in wrapper for a single element that should fade/slide up once it
// scrolls into view.
export function Reveal({ children, className = "", delay = 0, as = "div" }) {
  const MotionTag = motion[as] ?? motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      transition={{ duration: 0.6, ease: easeOut, delay }}
    >
      {children}
    </MotionTag>
  );
}
