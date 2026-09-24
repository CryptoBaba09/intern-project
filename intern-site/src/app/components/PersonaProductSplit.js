"use client";

// Shared two-column layout for every persona's own page (Blaze, Rendo,
// Promptly, Hush, Cache): the mascot loop pinned on the left, the actual
// working product on the right, so a visitor sees "what this intern
// looks like" and "what I can actually do here" in the same glance
// instead of scrolling past a video to find the product further down.
// Stacks to a single column (media first, product below) under `lg`,
// which is also the natural order for a mobile visitor.
export default function PersonaProductSplit({ media, children }) {
  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <div className="lg:sticky lg:top-20">{media}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
