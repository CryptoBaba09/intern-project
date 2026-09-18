"use client";

import { useEffect, useState } from "react";

const COLORS = ["#00c805", "#ff6b35", "#ffd23f", "#ee4266", "#3bceac", "#ffffff"];

// Fires a burst of falling confetti whenever `fire` changes to a new
// truthy value (pass the swap's tx hash) -- used to celebrate a
// completed $interndex swap.
export default function Confetti({ fire }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!fire) return;
    setPieces(
      Array.from({ length: 44 }, (_, i) => ({
        id: `${fire}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.25,
        duration: 0.9 + Math.random() * 0.6,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        drift: (Math.random() - 0.5) * 120,
      }))
    );
    const timer = setTimeout(() => setPieces([]), 1800);
    return () => clearTimeout(timer);
  }, [fire]);

  if (pieces.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block w-2 h-2.5 rounded-sm"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            "--confetti-rotate": `${p.rotate}deg`,
            "--confetti-drift": `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(0, -10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--confetti-drift), 100vh) rotate(var(--confetti-rotate));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
