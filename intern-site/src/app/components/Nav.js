"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const LINKS = [
  { href: "/tokenomics", label: "TOKENOMICS" },
  { href: "/stake", label: "STAKE" },
  { href: "/roadmap", label: "ROADMAP" },
];

function NavLink({ href, children, active }) {
  return (
    <Link
      href={href}
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

export default function Nav() {
  const pathname = usePathname();
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
      className="sticky top-0 z-50 w-full border-b px-6 py-4 flex items-center justify-between gap-4 backdrop-blur-md"
    >
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#00C805] ember-pulse" />
        <span className="font-mono text-sm tracking-widest text-[#EDEEF0]">
          $INTERN
        </span>
      </Link>
      <div className="flex items-center gap-3 sm:gap-6 font-mono text-[10px] sm:text-xs overflow-x-auto">
        {LINKS.map((link) => (
          <NavLink key={link.href} href={link.href} active={pathname === link.href}>
            {link.label}
          </NavLink>
        ))}
        <ExternalNavLink href="https://robinhoodchain.blockscout.com">
          CONTRACT ↗
        </ExternalNavLink>
        <ExternalNavLink href="https://x.com">X ↗</ExternalNavLink>
      </div>
      <div className="scale-90 origin-right">
        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
        />
      </div>
    </motion.nav>
  );
}
