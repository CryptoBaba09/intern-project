"use client";

import { useEffect, useRef } from "react";

// Intergalactic backdrop for the crew scene: twinkling stars + slow
// drifting color-blob nebulae in the four persona colors (green/amber/
// purple/teal), on a near-black ground. Same lightweight canvas
// approach as ParticleField.js (no dependency beyond the canvas API,
// respects prefers-reduced-motion by drawing one static frame).
const NEBULA_COLORS = ["0,200,5", "245,166,35", "155,93,229", "45,212,191"];

export default function SpaceField({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let stars = [];
    let nebulae = [];
    let frameId;
    let t = 0;

    function init() {
      width = canvas.width = canvas.offsetWidth * dpr;
      height = canvas.height = canvas.offsetHeight * dpr;

      const starCount = Math.min(Math.floor((width * height) / 6000), 220);
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: (Math.random() * 1.1 + 0.3) * dpr,
        phase: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.02,
      }));

      nebulae = NEBULA_COLORS.map((color, i) => ({
        x: (0.2 + 0.6 * ((i % 2) + 0.3)) * width * (i % 2 === 0 ? 0.6 : 1),
        y: (0.25 + 0.5 * Math.random()) * height,
        r: (Math.min(width, height) * (0.35 + Math.random() * 0.15)),
        color,
        vx: (Math.random() - 0.5) * 0.05 * dpr,
        vy: (Math.random() - 0.5) * 0.05 * dpr,
      }));
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, width, height);

      for (const n of nebulae) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -n.r || n.x > width + n.r) n.vx *= -1;
        if (n.y < -n.r || n.y > height + n.r) n.vy *= -1;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, `rgba(${n.color}, 0.14)`);
        grad.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      for (const s of stars) {
        const twinkle = prefersReducedMotion ? 0.7 : 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + 0.55 * twinkle})`;
        ctx.fill();
      }

      t += 1;
      if (!prefersReducedMotion) frameId = requestAnimationFrame(frame);
    }

    init();
    frame();

    const handleResize = () => init();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
