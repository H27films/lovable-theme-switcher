import React from "react";

interface OrderSubmitFooterProps {
  count: number;
  onSubmit: () => void;
}

export const OrderSubmitFooter = ({ count, onSubmit }: OrderSubmitFooterProps) => (
  <div style={{ flexShrink: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)", borderTop: "0.5px solid hsl(var(--border))" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={onSubmit} style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", cursor: "pointer", padding: "10px 24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", borderRadius: "999px" }}>Submit Order</button>
      <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{count} {count === 1 ? "Product" : "Products"}</span>
    </div>
  </div>
);
