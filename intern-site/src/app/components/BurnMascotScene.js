"use client";

import { motion } from "framer-motion";
import Mascot from "./Mascot";
import FlameAccent from "./FlameAccent";

// Original visual joke, not a redraw of anyone else's comic: the
// mascot, unbothered, while flames drift around it -- "the work burns
// $INTERN, and that's the point, not a problem." Every flame here is
// FlameAccent (its own hand-authored vector, see that file's comment),
// arranged around Mascot -- the same two building blocks used
// everywhere else on the site, just composed differently for this one
// scene rather than a new asset pipeline.
const FLAMES = [
  { id: 1, className: "w-10 h-14 top-2 left-4 rotate-[-8deg]", delay: 0 },
  { id: 2, className: "w-8 h-12 top-10 right-8 rotate-[10deg]", delay: 0.6 },
  { id: 3, className: "w-12 h-16 bottom-6 left-10 rotate-[6deg]", delay: 1.2 },
  { id: 4, className: "w-9 h-12 bottom-2 right-4 rotate-[-12deg]", delay: 0.3 },
  { id: 5, className: "w-7 h-10 top-1/2 left-0 rotate-[4deg]", delay: 0.9 },
  { id: 6, className: "w-7 h-10 top-1/3 right-0 rotate-[-6deg]", delay: 1.5 },
];

export default function BurnMascotScene() {
  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square">
      {FLAMES.map((f) => (
        <motion.div
          key={f.id}
          className={`absolute opacity-70 ${f.className}`}
          animate={{ y: [0, -6, 0], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 2.2 + f.delay, repeat: Infinity, ease: "easeInOut", delay: f.delay }}
        >
          <FlameAccent gradientId={f.id} className="w-full h-full" />
        </motion.div>
      ))}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-2/3 mx-auto mt-12 drop-shadow-[0_20px_50px_rgba(217,164,65,0.25)]"
      >
        <Mascot className="w-full h-full" spark={false} />
      </motion.div>
      <p className="absolute bottom-0 left-0 right-0 text-center font-mono text-[10px] text-[var(--color-muted-2)] tracking-widest">
        STATUS: FINE. SUPPLY: DOWN.
      </p>
    </div>
  );
}
