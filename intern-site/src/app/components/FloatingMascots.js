"use client";

// The ambient "floating in the universe" layer the user asked for --
// small crew icons drifting slowly over the SpaceField starfield
// (see layout.js), on every page, not just the homepage hero. Purely
// decorative: aria-hidden, pointer-events-none, and z-[-5] so it always
// sits behind real content (z-index:auto/0) but above the plain star
// canvas (z-[-10]) -- the same "-N stacks under 0, not under the
// canvas's own background" logic already used for SpaceField itself.
// Real, existing crew art (not new assets) -- same 4 icons used on
// /marketplace and /personas.
const ITEMS = [
  { src: "/personas/blaze-icon.png", top: "10%", left: "8%", size: 44, duration: 22, delay: 0 },
  { src: "/personas/rendo-icon.png", top: "22%", left: "86%", size: 40, duration: 26, delay: 4 },
  { src: "/personas/promptly-icon.png", top: "58%", left: "5%", size: 38, duration: 24, delay: 8 },
  { src: "/personas/synapse-icon.png", top: "70%", left: "90%", size: 42, duration: 28, delay: 2 },
  { src: "/personas/blaze-icon.png", top: "88%", left: "40%", size: 34, duration: 30, delay: 12 },
  { src: "/personas/rendo-icon.png", top: "38%", left: "50%", size: 30, duration: 25, delay: 6 },
];

export default function FloatingMascots() {
  return (
    <div aria-hidden className="fixed inset-0 -z-[5] overflow-hidden pointer-events-none">
      {ITEMS.map((item, i) => (
        <img
          key={i}
          src={item.src}
          alt=""
          width={item.size}
          height={item.size}
          className="intern-float absolute rounded-full opacity-60"
          style={{
            top: item.top,
            left: item.left,
            width: item.size,
            height: item.size,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
