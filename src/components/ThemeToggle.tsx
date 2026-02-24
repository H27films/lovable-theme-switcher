import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  theme: "dark" | "light";
  toggle: () => void;
}

export default function ThemeToggle({ theme, toggle }: ThemeToggleProps) {
  return (
    <button
      onClick={toggle}
      className="minimal-btn flex items-center gap-2"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
