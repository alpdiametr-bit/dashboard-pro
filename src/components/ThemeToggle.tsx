"use client";

import { useEffect, useState } from "react";
import { Sun1, Moon } from "iconsax-reactjs";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="grid place-items-center h-9 w-9 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] cursor-pointer hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
      aria-label="Mavzuni almashtirish"
    >
      {dark ? <Sun1 size={18} /> : <Moon size={18} />}
    </button>
  );
}
