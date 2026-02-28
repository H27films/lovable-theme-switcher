import { Moon, Sun, Palette } from "lucide-react";
import { type Theme } from "@/hooks/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  toggle: () => void;
}

const nextThemeLabel: Record<Theme, string> = {
  dark: "light",
  light: "sand",
  sand: "dark",
};

export default function ThemeToggle({ theme, toggle }: ThemeToggleProps) {
  return (
    <span
      onClick={toggle}
      className="cursor-pointer text-dim hover:text-foreground transition-colors"
      title={`Switch to ${nextThemeLabel[theme]} mode`}
    >
      {theme === "dark" && <Sun size={14} />}
      {theme === "light" && <Palette size={14} />}
      {theme === "sand" && <Moon size={14} />}
    </span>
  );
}
