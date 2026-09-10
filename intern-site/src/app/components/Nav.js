"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { fadeUp, staggerContainer } from "./motion";
import ConnectWalletButton from "./ConnectWalletButton";
import Mascot from "./Mascot";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";

// Burn to Create's contest window closed (see AnnouncementBar.js) -- the
// page itself now explains that plus the Pons migration, so it's still
// worth a visible slot, just no longer the lead item. Video Credits is
// the live, ongoing product push now.
const LINKS = [
  { href: "/video-credits", label: "Video Credits" },
  { href: "/burn-to-create", label: "Burn to Create" },
  { href: "/trade", label: "Trade" },
  { href: "/stake", label: "Stake" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/personas", label: "Personas" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/docs", label: "Docs" },
];

const EXTERNAL_LINKS = [
  { href: "https://robinhoodchain.blockscout.com/address/0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8", label: "Contract" },
  { href: "https://x.com/Internburn_xyz", label: "X" },
  { href: "https://t.me/internburnxyz", label: "Telegram" },
];

// Deliberately not the old "logo + eight links jammed into the top bar"
// layout. One quiet top bar -- logo, Connect, a single menu toggle -- on
// every breakpoint, with everything else living in one expanding panel.
// Restraint is the design decision here, not a missing feature.
function MenuIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <motion.line
        x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="1.5"
        animate={{ rotate: open ? 45 : 0, y: open ? 5 : 0 }}
        style={{ transformOrigin: "10px 5px" }}
      />
      <motion.line
        x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5"
        animate={{ opacity: open ? 0 : 1 }}
      />
      <motion.line
        x1="2" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="1.5"
        animate={{ rotate: open ? -45 : 0, y: open ? -5 : 0 }}
        style={{ transformOrigin: "10px 15px" }}
      />
    </svg>
  );
}

function PanelLink({ href, children, active, external, onClick }) {
  const className =
    "group flex items-baseline justify-between gap-4 py-3.5 border-b border-[var(--color-line)] transition-colors";
  const labelClass = `font-mono text-2xl sm:text-3xl tracking-tight transition-colors ${
    active ? "text-[var(--color-accent)]" : "text-[var(--color-fg)] group-hover:text-[var(--color-accent)]"
  }`;

  if (external) {
    return (
      <motion.a
        variants={fadeUp}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <span className={labelClass}>{children}</span>
        <span className="font-mono text-xs text-[var(--color-muted-2)] group-hover:text-[var(--color-muted)] transition-colors shrink-0">
          ↗
        </span>
      </motion.a>
    );
  }

  return (
    <motion.div variants={fadeUp}>
      <Link href={href} onClick={onClick} className={className}>
        <span className={labelClass}>{children}</span>
        {active && (
          <span className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest shrink-0">
            HERE
          </span>
        )}
      </Link>
    </motion.div>
  );
}

// Scroll-driven backdrop needs literal rgba strings for framer-motion's
// interpolation (a CSS var can't be animated between two color stops this
// way), so it has to know the theme explicitly rather than just reading
// --color-bg. Kept in sync with the two token sets in globals.css.
const SCROLL_BG = {
  dark: ["rgba(11,12,11,0)", "rgba(11,12,11,0.85)"],
  light: ["rgba(247,248,246,0)", "rgba(247,248,246,0.85)"],
};
const SCROLL_BORDER = {
  dark: ["rgba(27,29,27,0)", "rgba(27,29,27,1)"],
  light: ["rgba(226,229,226,0)", "rgba(226,229,226,1)"],
};

export default function Nav() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const background = useTransform(scrollY, [0, 80], SCROLL_BG[theme]);
  const borderColor = useTransform(scrollY, [0, 80], SCROLL_BORDER[theme]);

  // The dropdown panel needs to open right below this bar's actual
  // bottom edge, not a hardcoded pixel guess -- AnnouncementBar.js sits
  // above it with a height that varies by breakpoint (wraps to 2-3 lines
  // on narrow screens) and by whether a campaign is even running, so any
  // fixed constant here goes wrong the moment either changes.
  const navRef = useRef(null);
  const [panelTop, setPanelTop] = useState(64);

  useEffect(() => {
    if (!menuOpen || !navRef.current) return;
    const measure = () => setPanelTop(navRef.current.getBoundingClientRect().bottom);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [menuOpen]);

  // Close the panel on route change so a link tap doesn't leave it open
  // behind the new page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the panel is open -- it overlays real content
  // rather than pushing it down, so a scrollable page behind it reads as
  // a bug, not a feature.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      <motion.nav
        ref={navRef}
        style={{ backgroundColor: background, borderColor }}
        className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
      >
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Mascot className="w-7 h-7" />
            <span className="font-mono text-sm tracking-widest text-[var(--color-fg)]">
              $INTERN
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="scale-90 origin-right">
              <ConnectWalletButton />
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="text-[var(--color-fg)] p-2 -mr-2 rounded-lg hover:bg-[var(--color-fg)]/[0.06] transition-colors"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50"
            />
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ top: panelTop, maxHeight: `calc(100vh - ${panelTop}px)` }}
              className="fixed inset-x-0 z-40 overflow-y-auto border-b border-[var(--color-line)] bg-[var(--color-bg)]"
            >
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="px-6 py-8 max-w-2xl mx-auto w-full"
              >
                <div>
                  {LINKS.map((link) => (
                    <PanelLink
                      key={link.href}
                      href={link.href}
                      active={pathname === link.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </PanelLink>
                  ))}
                </div>

                <motion.p
                  variants={fadeUp}
                  className="font-mono text-xs text-[var(--color-muted-2)] tracking-widest mt-8 mb-3"
                >
                  ELSEWHERE
                </motion.p>
                <div className="flex flex-wrap gap-x-8 gap-y-1">
                  {EXTERNAL_LINKS.map((link) => (
                    <motion.a
                      key={link.href}
                      variants={fadeUp}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors py-1"
                    >
                      {link.label} ↗
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
