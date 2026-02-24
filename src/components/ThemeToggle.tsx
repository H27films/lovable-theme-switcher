import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  theme: "dark" | "light";
  toggle: () => void;
}

export default function ThemeToggle({ theme, toggle }: ThemeToggleProps) {
  return (
    <span
      onClick={toggle}
      className="nav-link flex items-center gap-1.5"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
      &nbsp;{theme === "dark" ? <Sun size={13} className="inline -mt-0.5" /> : <Moon size={13} className="inline -mt-0.5" />}
    </span>
  );
}
