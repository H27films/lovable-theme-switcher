import React from "react";

type FlowMode = "all" | "in" | "out";
const FLOW_ORDER: FlowMode[] = ["all", "in", "out"];

interface FlowToggleProps {
  flowMode: FlowMode;
  onChange: (mode: FlowMode) => void;
  headerAction?: React.ReactNode;
}

export const FlowToggle = ({ flowMode, onChange, headerAction }: FlowToggleProps) => {
  const activeIdx = FLOW_ORDER.indexOf(flowMode);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "14px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
          Past Data
        </span>
        {headerAction}
      </div>

      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", background: "hsl(var(--foreground) / 0.07)", borderRadius: "999px", padding: "2px" }}>
        {/* Sliding pill indicator */}
        <div
          style={{
            position: "absolute",
            top: "2px",
            bottom: "2px",
            left: "2px",
            width: "calc((100% - 4px) / 3)",
            transform: `translateX(${activeIdx * 100}%)`,
            transition: "transform 0.22s ease",
            borderRadius: "999px",
            background: "hsl(0 0% 98%)",
          }}
        />
        {FLOW_ORDER.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            style={{
              position: "relative",
              zIndex: 1,
              border: "none",
              background: "none",
              cursor: "pointer",
              width: "40px",
              padding: "2px 0",
              fontSize: "8.5px",
              fontWeight: flowMode === m ? 600 : 400,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "Raleway, inherit",
              color: flowMode === m ? "hsl(0 0% 10%)" : "hsl(var(--muted-foreground))",
              transition: "color 0.2s ease",
            }}
          >
            {m === "all" ? "All" : m}
          </button>
        ))}
      </div>
    </div>
  );
};