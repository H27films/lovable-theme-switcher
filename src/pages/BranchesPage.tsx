import React from "react";
import { ChevronLeft } from "lucide-react";

interface BranchesPageProps {
  onBack: () => void;
}

export default function BranchesPage({ onBack }: BranchesPageProps) {
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
      </div>
    </div>
  );
}
