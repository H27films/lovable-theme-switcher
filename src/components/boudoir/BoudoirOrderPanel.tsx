import React from "react";
import { X, FileText, Download } from "lucide-react";

interface BoudoirOrderPanelProps {
  activePanel: "USAGE" | "ORDER" | "CASH" | null;
  setActivePanel: (panel: "USAGE" | "ORDER" | "CASH" | null) => void;
  products: any[];
  onBack: () => void;
  onBackToMain?: () => void;
}

export const BoudoirOrderPanel = ({ activePanel, setActivePanel, products, onBack, onBackToMain }: BoudoirOrderPanelProps) => {
  // Simplified order panel - would contain full order logic from original
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", background: "hsl(var(--background))", zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", paddingBottom: "0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>ORDER</span>
          <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "12px", marginBottom: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input ref={orderInputRef} type="text" inputMode="search" value={orderSearch} onChange={(e) => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }} placeholder="Select product..." style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))" }} />
            <button onClick={() => { if (showOrderDropdown) dismissOrderDropdown(); else { setShowOrderDropdown(true); orderInputRef.current?.focus(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", flexShrink: 0, display: "flex", alignItems: "center" }}>
              {showOrderDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Order entries would render here */}

      <div style={{ padding: "12px", paddingLeft: "12px", paddingRight: "12px", paddingBottom: "max(env(safe-area-inset-bottom, 24px), 24px)" }}>
        {/* GRN generation, PDF export, etc. */}
      </div>
    </div>
  );

  const closePanel = () => {
    setActivePanel(null);
    setUsageSearch("");
    setShowUsageDropdown(false);
    setOrderSearch("");
    setShowOrderDropdown(false);
  };
}