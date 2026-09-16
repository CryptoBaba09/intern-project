// Standalone decorative flame, same hand-authored vector language as
// Mascot.js's own spark (not a copy -- redrawn at its own scale so it
// reads well as a background accent rather than a shrunk hat-flame).
// Needs its own gradient id per instance since SVG gradient ids are
// global to the document -- multiple flames on one page would otherwise
// silently share (and fight over) the same gradient definition.
export default function FlameAccent({ className, gradientId }) {
  const id = `flameAccentGrad-${gradientId}`;
  return (
    <svg viewBox="0 0 120 160" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#B9740E" />
          <stop offset="50%" stopColor="#D9A441" />
          <stop offset="100%" stopColor="#FFE49A" />
        </linearGradient>
      </defs>
      <path
        d="M60 155 C 10 120, 0 70, 40 10 C 45 45, 65 55, 75 35 C 90 55, 100 90, 85 120 C 100 105, 108 85, 105 65 C 125 100, 120 135, 60 155 Z"
        fill={`url(#${id})`}
        stroke="#7A4A08"
        strokeWidth="4"
      />
      <path
        d="M58 135 C 35 115, 32 85, 52 50 C 55 70, 65 76, 70 64 C 80 76, 85 96, 75 115 C 90 100, 92 82, 85 68 C 98 92, 92 122, 58 135 Z"
        fill="#FFF3D0"
        opacity="0.85"
      />
    </svg>
  );
}
