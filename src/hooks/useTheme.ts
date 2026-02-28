import { useState, useEffect } from "react";

export type Theme = "dark" | "light" | "sand";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved === "light" || saved === "sand" ? saved : "dark") as Theme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light", "sand");
    if (theme === "dark") root.classList.add("dark");
    if (theme === "sand") root.classList.add("sand");
    // light is the default (no class needed)
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => {
    if (t === "dark") return "light";
    if (t === "light") return "sand";
    return "dark";
  });

  return { theme, toggle };
}
