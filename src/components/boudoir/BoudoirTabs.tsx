import React from "react";

interface BoudoirTabsProps {
  activePanel: "USAGE" | "ORDER" | "CASH" | null;
  setActivePanel: (panel: "USAGE" | "ORDER" | "CASH" | null) => void;
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
}

export const BoudoirTabs = ({
  activePanel,
  setActivePanel,
  showDropdown,
  setShowDropdown,
}: BoudoirTabsProps) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "28px",
        borderBottom: "0.5px solid hsl(var(--border))",
        marginBottom: "20px",
      }}
    >
      {["USAGE", "ORDER", "CASH"].map((btn) => (
        <button
          key={btn}
          onClick={() => setActivePanel(btn as any)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 12px 0",
            fontSize: "clamp(16px, 4.5vw, 24px)",
            fontWeight: 300,
            letterSpacing: "0.08em",
            color: "hsl(var(--foreground))",
            opacity: activePanel === btn ? 1 : 0.28,
            borderBottom: "2px solid transparent",
            marginBottom: "-1px",
            transition: "opacity 0.2s ease, border-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = activePanel === btn ? "1" : "0.28";
          }}
        >
          {btn}
        </button>
      ))}
    </div>
  );
};