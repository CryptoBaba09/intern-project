"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// A soft radial glow that follows the pointer across the whole page.
// Fixed + pointer-events-none so it never interferes with clicks, and it
// only shows through where a section doesn't paint its own opaque
// background (the hero, mostly) — same restraint as the rest of the site.
export default function CursorGlow() {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const springX = useSpring(x, { damping: 34, stiffness: 180, mass: 0.5 });
  const springY = useSpring(y, { damping: 34, stiffness: 180, mass: 0.5 });

  const background = useTransform([springX, springY], ([latestX, latestY]) =>
    `radial-gradient(560px circle at ${latestX}px ${latestY}px, rgba(0,200,5,0.10), rgba(217,164,65,0.03) 45%, transparent 70%)`
  );

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const handleMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background }}
    />
  );
}
