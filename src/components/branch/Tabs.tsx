import React from "react";
import { Search as SearchIcon, X } from "lucide-react";

interface TabsProps {
  activePanel: "USAGE" | "ORDER" | null;
  setActivePanel: (panel: "USAGE" | "ORDER" | null) => void;
  isSearchActive: boolean;
  toggleSearch: () => void;
}

export const Tabs = ({ activePanel, setActivePanel, isSearchActive, toggleSearch }: TabsProps) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "0.5px solid hsl(var(--border))",
      marginBottom: "8px",
      padding: "0 12px",
      boxShadow: "0 4px 4px -4px rgba(0,0,0,0.8)",
    }}
  >
    <div style={{ display: "flex", gap: "28px" }}>
      {["USAGE", "ORDER"].map((btn) => (
        <button
          key={btn}
          onClick={() => setActivePanel(btn as "USAGE" | "ORDER")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 12px 0",
            fontSize: "clamp(16px, 4.5vw, 24px)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            fontFamily: "Raleway, inherit",
            color: "#000000",
            opacity: activePanel === btn ? 1 : 0.28,
            borderBottom: activePanel === btn ? "2px solid #000000" : "2px solid transparent",
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
    <button
      onClick={toggleSearch}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0 0 8px 0",
        fontSize: 0, // reset font size to avoid extra space
        color: "#000000",
        opacity: isSearchActive ? 1 : 0.28,
        borderBottom: "2px solid transparent",
        marginBottom: "-1px",
        transition: "opacity 0.2s ease, border-color 0.2s ease",
        display: "flex",
        alignItems: "center",
      }}
    >
      {isSearchActive ? <X size={24} /> : <SearchIcon size={24} />}
    </button>
  </div>
);
