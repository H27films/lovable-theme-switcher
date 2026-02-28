import { useState, useEffect } from "react";

export type Theme = "dark" | "light" | "sand";
export type Font = "inter" | "tenor" | "raleway";

const fontFamilies: Record<Font, string> = {
  inter: "'Inter', sans-serif",
  tenor: "'Tenor Sans', sans-serif",
  raleway: "'Raleway', sans-serif",
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved === "light" || saved === "sand" ? saved : "dark") as Theme;
  });

  const [font, setFont] = useState<Font>(() => {
    const saved = localStorage.getItem("font");
    return (saved === "tenor" || saved === "raleway" ? saved : "inter") as Font;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light", "sand");
    if (theme === "dark") root.classList.add("dark");
    if (theme === "sand") root.classList.add("sand");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-family", fontFamilies[font]);
    document.body.style.fontFamily = fontFamilies[font];
    localStorage.setItem("font", font);
  }, [font]);

  const toggle = () => setTheme(t => {
    if (t === "dark") return "light";
    if (t === "light") return "sand";
    return "dark";
  });

  const cycleFont = () => setFont(f => {
    if (f === "inter") return "tenor";
    if (f === "tenor") return "raleway";
    return "inter";
  });

  return { theme, toggle, font, cycleFont };
}
