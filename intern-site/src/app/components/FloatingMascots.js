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
//
// Pinned to `left`/`right` in PIXELS, not `left` as a percentage: page
// content on this site sits in a centered column capped at max-w-6xl
// (1152px) or narrower, so on any ordinary desktop width a percentage
// like left:40% lands *inside* that column, not the margin -- covered
// by whichever card/section happens to paint there, which is exactly
// why these were only ever visible for an instant before real content
// settled on top of them. Anchoring to the true edges keeps every icon
// in the margin, where the starfield itself is already visible, no
// matter how wide the viewport is.
const ITEMS = [
  { src: "/personas/blaze-icon.png", top: "8%", side: "left", offset: 20, size: 44, duration: 22, delay: 0 },
  { src: "/personas/rendo-icon.png", top: "24%", side: "right", offset: 24, size: 40, duration: 26, delay: 4 },
  { src: "/personas/promptly-icon.png", top: "48%", side: "left", offset: 14, size: 36, duration: 24, delay: 8 },
  { src: "/personas/synapse-icon.png", top: "62%", side: "right", offset: 16, size: 42, duration: 28, delay: 2 },
  { src: "/personas/blaze-icon.png", top: "80%", side: "left", offset: 28, size: 32, duration: 30, delay: 12 },
  { src: "/personas/rendo-icon.png", top: "90%", side: "right", offset: 30, size: 30, duration: 25, delay: 6 },
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
            [item.side]: item.offset,
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
