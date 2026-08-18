import React from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";

interface BoudoirCashPanelProps {
  activePanel: "USAGE" | "ORDER" | "CASH" | null;
  setActivePanel: (panel: "USAGE" | "ORDER" | "CASH" | null) => void;
  cashEntries: any[];
  cashLog: any[];
  onBack: () => void;
}

export const BoudoirCashPanel = ({ activePanel, setActivePanel, cashEntries, cashLog, onBack }: BoudoirCashPanelProps) => {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", background: "hsl(var(--background))", zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", paddingBottom: "0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>CASH</span>
          <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
            <X size={18} />
          </button>
        </div>

        {/* Cash entries table */}
        <div style={{ flex: 1, overflowY: "auto", paddingLeft: "12px", paddingRight: "12px", paddingBottom: "max(env(safe-area-inset-bottom, 24px), 24px)" }}>
          {cashEntries.map((entry, idx) => (
            <div key={entry.date} style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
              <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 48px 58px 20px", gap: "4px", alignItems: "center", padding: "9px 0" }}>
                <div style={{ fontSize: "11px", fontWeight: 300, color: "hsl(var(--muted-foreground))" }}>{new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                <input type="number" inputMode="decimal" value={entry.totalGST} onChange={(e) => { /* update */ }} placeholder="0" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", textAlign: "center", padding: "2px 0" }} />
                <input type="number" inputMode="decimal" value={entry.credit} onChange={(e) => { /* update */ }} placeholder="0" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", textAlign: "center", padding: "2px 0" }} />
                <input type="number" inputMode="decimal" value={entry.qr} onChange={(e) => { /* update */ }} placeholder="0" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", textAlign: "center", padding: "2px 0" }} />
                <button onClick={() => {/* toggle expanded */}} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const closePanel = () => {
    setActivePanel(null);
  };
}