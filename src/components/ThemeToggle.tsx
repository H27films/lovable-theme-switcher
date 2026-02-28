import { Moon, Sun, Palette, Type } from "lucide-react";
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
  tenor: "Tenor Sans",
  raleway: "Raleway",
};

export default function ThemeToggle({ theme, toggle, font, cycleFont }: ThemeToggleProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Font cycler */}
      <span
        onClick={cycleFont}
        className="cursor-pointer text-dim hover:text-foreground transition-colors flex items-center gap-1"
        title={`Font: ${fontLabel[font]} — click to change`}
      >
        <Type size={14} />
      </span>
      {/* Theme toggler */}
      <span
        onClick={toggle}
        className="cursor-pointer text-dim hover:text-foreground transition-colors"
        title={`Switch to ${nextThemeLabel[theme]} mode`}
      >
        {theme === "dark" && <Sun size={14} />}
        {theme === "light" && <Palette size={14} />}
        {theme === "sand" && <Moon size={14} />}
      </span>
    </div>
  );
}
