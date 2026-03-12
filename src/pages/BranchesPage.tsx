import React from "react";
import { ChevronLeft, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface BranchesPageProps {
  onBack: () => void;
}

export default function BranchesPage({ onBack }: BranchesPageProps) {
  const { theme, setTheme } = useTheme();
  const isSand = theme === "sand";
  const handleToggle = () => setTheme(isSand ? "light" : "sand");

  const fg = "hsl(var(--foreground))";

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "hsl(var(--background))",
        color: fg,
        fontFamily: "'Raleway', sans-serif",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 16px 12px 12px",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: fg, display: "flex", alignItems: "center", touchAction: "manipulation" }}
        >
          <ChevronLeft size={24} strokeWidth={1.5} />
        </button>
        <button
          onClick={handleToggle}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: fg, display: "flex", alignItems: "center", touchAction: "manipulation" }}
          title={isSand ? "Switch to Light" : "Switch to Sand"}
        >
          <Sun size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
