// Blaze — $INTERN's original mascot. Hand-authored vector, not a
// borrowed/copyrighted character (see docs/genesis-nft-spec.md and
// branding/mascot-reveal.html for the full rationale). Kept as a plain
// inline SVG component (no background rect) so it composites cleanly
// against the site's dark ground at any size, matching how every other
// icon in this codebase (e.g. Nav's MenuIcon) is authored.
export default function Mascot({ className, spark = true }) {
  return (
    <svg
      viewBox="60 40 780 820"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id="mascotBodyGrad" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#3DFF4A" />
          <stop offset="55%" stopColor="#00C805" />
          <stop offset="100%" stopColor="#009104" />
        </radialGradient>
        <linearGradient id="mascotFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#B9740E" />
          <stop offset="55%" stopColor="#D9A441" />
          <stop offset="100%" stopColor="#FFE49A" />
        </linearGradient>
      </defs>
      <path
        d="M450 90 C 660 90, 795 245, 795 470 C 795 675, 655 830, 450 830 C 245 830, 105 675, 105 470 C 105 245, 240 90, 450 90 Z"
        fill="url(#mascotBodyGrad)"
        stroke="#052B02"
        strokeWidth="16"
      />
      <path
        d="M450 560 C 560 560, 630 610, 630 690 C 630 750, 550 780, 450 780 C 350 780, 270 750, 270 690 C 270 610, 340 560, 450 560 Z"
        fill="#00A604"
        opacity="0.55"
      />
      <path d="M340 210 L300 470" stroke="#1B1D1B" strokeWidth="20" strokeLinecap="round" />
      <path d="M560 210 L600 470" stroke="#1B1D1B" strokeWidth="20" strokeLinecap="round" />
      <rect x="368" y="455" width="164" height="108" rx="16" fill="#EDEEF0" stroke="#1B1D1B" strokeWidth="10" />
      <circle cx="450" cy="487" r="14" fill="#9BA1A6" />
      <rect x="392" y="516" width="116" height="14" rx="7" fill="#9BA1A6" />
      <rect x="404" y="538" width="92" height="10" rx="5" fill="#C7CBCE" />
      <ellipse cx="358" cy="360" rx="84" ry="96" fill="#F7FBF4" stroke="#052B02" strokeWidth="10" />
      <ellipse cx="542" cy="360" rx="84" ry="96" fill="#F7FBF4" stroke="#052B02" strokeWidth="10" />
      <circle cx="380" cy="382" r="34" fill="#0B0C0B" />
      <circle cx="564" cy="382" r="34" fill="#0B0C0B" />
      <circle cx="392" cy="368" r="11" fill="#ffffff" />
      <circle cx="576" cy="368" r="11" fill="#ffffff" />
      <path d="M296 292 Q356 262 410 288" stroke="#052B02" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M604 292 Q544 262 490 288" stroke="#052B02" strokeWidth="12" fill="none" strokeLinecap="round" />
      <ellipse cx="450" cy="430" rx="26" ry="20" fill="#052B02" />
      <ellipse cx="300" cy="410" rx="26" ry="16" fill="#00E60A" opacity="0.5" />
      <ellipse cx="600" cy="410" rx="26" ry="16" fill="#00E60A" opacity="0.5" />
      {spark && (
        <g transform="translate(560,150) rotate(12)">
          <path
            d="M0 70 C -34 40, -30 -10, 0 -60 C 30 -10, 34 40, 0 70 Z"
            fill="url(#mascotFlameGrad)"
            stroke="#7A4A08"
            strokeWidth="6"
          />
          <path d="M0 40 C -14 24, -12 0, 0 -26 C 12 0, 14 24, 0 40 Z" fill="#FFF3D0" />
        </g>
      )}
    </svg>
  );
}
