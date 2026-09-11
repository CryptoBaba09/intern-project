"use client";

import { useEffect, useRef } from "react";

// Fires a short, physical confetti burst -- purely decorative, no data
// behind it, triggered imperatively right after a REAL confirmed
// transaction (a stake, a burn) so the celebration always corresponds
// to something that actually happened on-chain, never to an optimistic
// guess. Mount once per page with a `burstKey` that changes (e.g. the
// confirmed tx hash) to fire a new burst without remounting anything
// else on the page.
const COLORS = ["#00C805", "#D9A441", "#9B5DE5", "#2DD4BF", "#F5A623"];

export default function Confetti({ burstKey }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!burstKey) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return; // a static burst would just be visual noise

    const width = (canvas.width = window.innerWidth * dpr);
    const height = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const originX = width / 2;
    const originY = height * 0.35;
    const pieces = Array.from({ length: 90 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 6 + 3) * dpr;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4 * dpr,
        size: (Math.random() * 5 + 3) * dpr,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        life: 1,
      };
    });

    let raf;
    function frame() {
      ctx.clearRect(0, 0, width, height);
      let anyAlive = false;
      for (const p of pieces) {
        p.vy += 0.25 * dpr; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        p.life -= 0.012;
        if (p.life <= 0) continue;
        anyAlive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (anyAlive) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    }
    frame();

    return () => cancelAnimationFrame(raf);
  }, [burstKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 z-[100] pointer-events-none"
    />
  );
}
