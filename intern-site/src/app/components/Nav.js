"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { fadeUp, staggerContainer } from "./motion";
import ConnectWalletButton from "./ConnectWalletButton";
import Mascot from "./Mascot";
import ThemeToggle from "./ThemeToggle";

// Two standalone actions people jump to directly, kept as plain tabs --
// everything else groups under a dropdown so the bar reads as ~4 things,
// not nine. (Previously a flat 9-link list buried in a hamburger panel;
// see git history if that flat structure is ever needed again.)
const TOP_LINKS = [
  { href: "/trade", label: "Trade" },
  { href: "/stake", label: "Stake" },
];

const CATEGORIES = [
  {
    label: "Create",
    items: [
      { href: "/video-credits", label: "Video Credits" },
      { href: "/burn-to-create", label: "Burn to Create" },
      { href: "/personas", label: "Personas" },
      { href: "/marketplace", label: "Marketplace" },
    ],
  },
  {
    label: "About",
    items: [
      { href: "/tokenomics", label: "Tokenomics" },
      { href: "/roadmap", label: "Roadmap" },
      { href: "/docs", label: "Docs" },
    ],
  },
];

const EXTERNAL_LINKS = [
  { href: "https://robinhoodchain.blockscout.com/address/0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8", label: "Contract" },
  { href: "https://x.com/Internburn_xyz", label: "X" },
  { href: "https://t.me/internburnxyz", label: "Telegram" },
];

function ChevronIcon({ open }) {
  return (
    <motion.svg
      width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.15 }}
    >
      <path d="M1.5 3.5L5 7L8.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

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

// A single top-level horizontal tab (Trade, Stake).
function NavTab({ href, label, active }) {
  return (
    <Link
      href={href}
      className={`font-mono text-sm px-3 py-2 rounded-lg transition-colors ${
        active
          ? "text-[var(--color-space-fg)] bg-white/[0.08]"
          : "text-[var(--color-space-muted)] hover:text-[var(--color-space-fg)] hover:bg-white/[0.05]"
      }`}
    >
      {label}
    </Link>
  );
}

// A "Create ▾" / "About ▾" horizontal tab that opens a small dropdown
// panel of category links below it. Click-to-toggle (not hover-only) so
// it behaves the same on touch and mouse.
function NavDropdown({ label, items, pathname, openId, setOpenId }) {
  const id = label;
  const open = openId === id;
  const active = items.some((i) => i.href === pathname);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpenId(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, setOpenId]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpenId(open ? null : id)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 font-mono text-sm px-3 py-2 rounded-lg transition-colors ${
          active || open
            ? "text-[var(--color-space-fg)] bg-white/[0.08]"
            : "text-[var(--color-space-muted)] hover:text-[var(--color-space-fg)] hover:bg-white/[0.05]"
        }`}
      >
        {label}
        <ChevronIcon open={open} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 min-w-[190px] rounded-xl border border-white/10 bg-[#0a0b10] shadow-xl overflow-hidden py-1.5"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenId(null)}
                className={`block px-4 py-2 font-mono text-sm transition-colors ${
                  pathname === item.href
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-space-fg)] hover:bg-white/[0.06]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

// Deliberately NOT theme-dependent, unlike the rest of the page: this
// bar sits directly above SpaceField-backed hero sections (see
// components/SpaceField.js), which paint a literal near-black canvas
// regardless of the light/dark toggle. A theme-following transparent
// nav used to reveal the *light-mode body background* through itself
// at scroll top, creating a hard white-strip-over-black-hero seam --
// a real bug, not a design choice. Fixed to the exact same fill color
// SpaceField uses (#05060a) so the two are visually one surface, with
// only the border still fading in on scroll as a subtle depth cue.
const NAV_BG = "rgba(5,6,10,0.92)";
const SCROLL_BORDER = ["rgba(255,255,255,0)", "rgba(255,255,255,0.12)"];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const { scrollY } = useScroll();
  const borderColor = useTransform(scrollY, [0, 80], SCROLL_BORDER);

  // The mobile dropdown panel needs to open right below this bar's actual
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

  // Close any open menu/dropdown on route change so a link tap doesn't
  // leave one open behind the new page.
  useEffect(() => {
    setMenuOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  // Lock body scroll while the mobile panel is open -- it overlays real
  // content rather than pushing it down, so a scrollable page behind it
  // reads as a bug, not a feature.
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
        style={{ backgroundColor: NAV_BG, borderColor }}
        className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
      >
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Mascot className="w-7 h-7" />
            <span className="font-mono text-sm tracking-widest text-[var(--color-space-fg)]">
              $INTERN
            </span>
          </Link>

          {/* Horizontal tabs -- desktop/tablet only. Mobile keeps the
              hamburger panel below since there's no room for this row. */}
          <div className="hidden md:flex items-center gap-1">
            {TOP_LINKS.map((link) => (
              <NavTab key={link.href} href={link.href} label={link.label} active={pathname === link.href} />
            ))}
            {CATEGORIES.map((cat) => (
              <NavDropdown
                key={cat.label}
                label={cat.label}
                items={cat.items}
                pathname={pathname}
                openId={openDropdown}
                setOpenId={setOpenDropdown}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-4 mr-2">
              {EXTERNAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[var(--color-space-muted)] hover:text-[var(--color-space-fg)] transition-colors"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
            <div className="scale-90 origin-right">
              <ConnectWalletButton />
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="md:hidden text-[var(--color-space-fg)] p-2 -mr-2 rounded-lg hover:bg-white/[0.08] transition-colors"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile-only full panel -- same links/categories as the desktop
          tabs above, just grouped with headings instead of dropdowns
          since there's no hover/click-target room on a small screen. */}
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
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
            />
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ top: panelTop, maxHeight: `calc(100vh - ${panelTop}px)` }}
              className="fixed inset-x-0 z-40 overflow-y-auto border-b border-[var(--color-line)] bg-[var(--color-bg)] md:hidden"
            >
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="px-6 py-8 max-w-2xl mx-auto w-full"
              >
                <div>
                  {TOP_LINKS.map((link) => (
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

                {CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    <motion.p
                      variants={fadeUp}
                      className="font-mono text-xs text-[var(--color-muted-2)] tracking-widest mt-8 mb-1"
                    >
                      {cat.label.toUpperCase()}
                    </motion.p>
                    {cat.items.map((link) => (
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
                ))}

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
