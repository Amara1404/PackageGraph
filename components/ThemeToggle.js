"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pg-theme", next);
    setTheme(next);
  }

  if (!theme) return <span className="w-14 h-7 inline-block" />;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="text-xs border rounded-full px-2 py-1 border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-btn-hover-bg)]"
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
