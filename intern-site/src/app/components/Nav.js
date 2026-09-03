"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const LINKS = [
  { href: "/tokenomics", label: "TOKENOMICS" },
  { href: "/stake", label: "STAKE" },
  { href: "/roadmap", label: "ROADMAP" },
];

const EXTERNAL_LINKS = [
  { href: "https://robinhoodchain.blockscout.com", label: "CONTRACT ↗" },
  { href: "https://x.com", label: "X ↗" },
];

function NavLink({ href, children, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative pb-1 transition-colors after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:bg-[#00C805] after:transition-transform after:duration-300 ${
        active
          ? "text-[#EDEEF0] after:scale-x-100"
          : "text-[#9BA1A6] hover:text-[#EDEEF0] after:scale-x-0 hover:after:scale-x-100"
      }`}
    >
      {children}
    </Link>
  );
}

function ExternalNavLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative pb-1 text-[#9BA1A6] transition-colors hover:text-[#EDEEF0] after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[#00C805] after:transition-transform after:duration-300 hover:after:scale-x-100"
    >
      {children}
    </a>
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

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const background = useTransform(
    scrollY,
    [0, 80],
    ["rgba(11,12,11,0)", "rgba(11,12,11,0.85)"]
  );
  const borderColor = useTransform(
    scrollY,
    [0, 80],
    ["rgba(27,29,27,0)", "rgba(27,29,27,1)"]
  );

  return (
    <motion.nav
      style={{ backgroundColor: background, borderColor }}
      className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
    >
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#00C805] ember-pulse" />
          <span className="font-mono text-sm tracking-widest text-[#EDEEF0]">
            $INTERN
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 font-mono text-xs">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} active={pathname === link.href}>
              {link.label}
            </NavLink>
          ))}
          {EXTERNAL_LINKS.map((link) => (
            <ExternalNavLink key={link.href} href={link.href}>
              {link.label}
            </ExternalNavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="scale-90 origin-right">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            />
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="md:hidden text-[#EDEEF0] p-1"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden border-t border-[#1B1D1B] bg-[#0B0C0B]"
          >
            <div className="px-6 py-5 flex flex-col gap-4 font-mono text-sm">
              {LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  active={pathname === link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              {EXTERNAL_LINKS.map((link) => (
                <ExternalNavLink key={link.href} href={link.href}>
                  {link.label}
                </ExternalNavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
