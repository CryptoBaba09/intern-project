"use client";

// Shared 5-second intro clip player, used on every persona's own page
// (Blaze, Rendo, Promptly, Synapse). Autoplays muted and loops -- no
// controls needed for a silent 5s idle loop, matches how a GIF would
// behave but at real video quality. `poster` shows instantly before the
// clip loads (the persona's own locked concept art), so there's never a
// blank box.
export default function PersonaIntroVideo({ src, poster, label }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[var(--color-line)] bg-black">
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-auto block"
        aria-label={label}
      />
    </div>
  );
}
