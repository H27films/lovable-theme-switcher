import { type Theme, type Font } from "@/hooks/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  toggle: () => void;
  font: Font;
  cycleFont: () => void;
}

const nextThemeLabel: Record<Theme, string> = {
  dark: "light",
  light: "sand",
  sand: "dark",
};

const fontLabel: Record<Font, string> = {
  inter: "Inter",
  raleway: "Raleway",
  helvetica: "Helvetica Neue",
};

export default function ThemeToggle({ theme, toggle, font, cycleFont }: ThemeToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        onClick={cycleFont}
        className="cursor-pointer text-dim hover:text-foreground hover:scale-125 transition-all duration-200 flex items-center gap-1"
        title={`Font: ${fontLabel[font] ?? font} — click to change`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M3 19l5-12 5 12M5.5 14h5M14 19l3.5-7 3.5 7M15.5 16h4" />
        </svg>
      </span>
      <span
        onClick={toggle}
        className="cursor-pointer text-dim hover:text-foreground hover:scale-125 transition-all duration-200"
        title={`Switch to ${nextThemeLabel[theme]} mode`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </span>
    </div>
  );
}
