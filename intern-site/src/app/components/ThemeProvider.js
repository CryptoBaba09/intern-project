"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Dark is the deliberate default -- see globals.css. This context exists
// so components that need the *current* theme in JS (not just CSS), like
// Nav's scroll-driven backdrop color, can react to it. The actual
// data-theme attribute is set synchronously by the inline script in
// layout.js before paint, so there's no flash -- this just mirrors that
// into React state on mount.
const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      if (next === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      try {
        localStorage.setItem("intern-theme", next);
      } catch {
        // Private browsing / storage blocked -- the toggle still works
        // for this page load, it just won't persist across visits.
      }
      return next;
    });
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
