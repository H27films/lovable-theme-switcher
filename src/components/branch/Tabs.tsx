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
            fontWeight: 500,
            letterSpacing: "0.08em",
            fontFamily: "Raleway, inherit",
            color: "hsl(0 0% 20%)",
            opacity: activePanel === btn ? 1 : 0.5,
            borderBottom: activePanel === btn ? "2px solid hsl(0 0% 20%)" : "2px solid transparent",
            marginBottom: "-1px",
            transition: "opacity 0.2s ease, border-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.7";
            e.currentTarget.style.borderBottom = "2px solid hsl(0 0% 20%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = activePanel === btn ? "1" : "0.5";
            e.currentTarget.style.borderBottom = activePanel === btn ? "2px solid hsl(0 0% 20%)" : "2px solid transparent";
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
        color: "hsl(0 0% 20%)",
        opacity: isSearchActive ? 1 : 0.5,
        borderBottom: "2px solid transparent",
        marginBottom: "-1px",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        display: "flex",
        alignItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {isSearchActive ? <X size={24} strokeWidth={1.5} /> : <SearchIcon size={24} strokeWidth={1.5} />}
    </button>
  </div>
);
