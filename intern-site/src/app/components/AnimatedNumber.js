"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { formatNumber } from "../lib/format";

// Renders a MotionValue's text directly to the DOM (no React re-render per
// tick), spring-animated toward whatever `value` becomes.
export default function AnimatedNumber({ value }) {
  const spring = useSpring(value, { stiffness: 90, damping: 28, mass: 1 });
  const display = useTransform(spring, (v) => formatNumber(Math.round(v)));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}
