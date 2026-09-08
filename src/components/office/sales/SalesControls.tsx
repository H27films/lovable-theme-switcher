import React, { useState } from "react";
import { monthName } from "./salesData";
import type { ViewMode } from "./salesData";

type Props = {
  onClose: () => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  monthFilter: string;
  yearFilter: string;
  onMonthFilterChange: (m: string) => void;
  onYearFilterChange: (y: string) => void;
  salesMonths: string[];
  salesYears: string[];
  onNavigate: (dir: 1 | -1) => void;
  backBlocked: boolean;
  fwdBlocked: boolean;
};

export const SalesControls: React.FC<Props> = ({
  onClose, viewMode, onViewModeChange, monthFilter, yearFilter,
  onMonthFilterChange, onYearFilterChange, salesMonths, salesYears,
  onNavigate, backBlocked, fwdBlocked,
}) => {
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [salesYearDropdownOpen, setSalesYearDropdownOpen] = useState(false);

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0 20px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={onClose} title="Back to Office" style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>SALES</button>
        </div>
        {/* Month navigation chevrons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            onClick={() => onNavigate(-1)}
            disabled={backBlocked}
            style={{ background: "none", border: "none", cursor: backBlocked ? "default" : "pointer", padding: "6px", color: "hsl(var(--foreground))", opacity: backBlocked ? 0.2 : 0.7, lineHeight: 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => onNavigate(1)}
            disabled={fwdBlocked}
            style={{ background: "none", border: "none", cursor: fwdBlocked ? "default" : "pointer", padding: "6px", color: "hsl(var(--foreground))", opacity: fwdBlocked ? 0.2 : 0.7, lineHeight: 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
{/* Month + Year filter + View toggle */}
      <div style={{ padding: "10px 20px 8px 20px", display: "flex", alignItems: "center", gap: "6px" }}>

        {/* In Month mode the Month/Year filters don't apply — show a plain label */}
        {viewMode === "month" ? (
          <span style={{ fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", letterSpacing: "0.04em" }}>12 Months</span>
        ) : (
        <>
        {/* Month dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setSalesDropdownOpen(v => !v); setSalesYearDropdownOpen(false); }}
            style={{
              background: "transparent", border: "none", padding: "0",
              fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit",
              cursor: "pointer", color: "hsl(var(--foreground))",
              display: "flex", alignItems: "center", gap: "5px", letterSpacing: "0.04em",
            }}
          >
            {monthFilter === "all" ? "All" : monthName(monthFilter)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              {salesDropdownOpen ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
            </svg>
          </button>
          {salesDropdownOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0,
              background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))",
              borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              zIndex: 100, minWidth: "140px", overflow: "hidden", marginTop: "6px",
            }}>
              {["all", ...salesMonths].map(m => (
                <div
                  key={m}
                  onClick={() => { onMonthFilterChange(m); setSalesDropdownOpen(false); }}
                  style={{
                    padding: "9px 16px", fontSize: "11px", fontFamily: "Raleway, inherit",
                    fontWeight: monthFilter === m ? 500 : 300,
                    cursor: "pointer",
                    color: monthFilter === m ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    background: monthFilter === m ? "hsl(var(--muted) / 0.4)" : "transparent",
                  }}
                >
                  {m === "all" ? "All" : monthName(m)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Year dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setSalesYearDropdownOpen(v => !v); setSalesDropdownOpen(false); }}
            style={{
              background: "transparent", border: "none", padding: "0",
              fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit",
              cursor: "pointer", color: "hsl(var(--muted-foreground))",
              display: "flex", alignItems: "center", gap: "5px", letterSpacing: "0.04em",
            }}
          >
            {yearFilter}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              {salesYearDropdownOpen ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
            </svg>
          </button>
          {salesYearDropdownOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0,
              background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))",
              borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              zIndex: 100, minWidth: "100px", overflow: "hidden", marginTop: "6px",
            }}>
              {salesYears.map(y => (
                <div
                  key={y}
                  onClick={() => { onYearFilterChange(y); setSalesYearDropdownOpen(false); onMonthFilterChange("all"); }}
                  style={{
                    padding: "9px 16px", fontSize: "11px", fontFamily: "Raleway, inherit",
                    fontWeight: yearFilter === y ? 500 : 300,
                    cursor: "pointer",
                    color: yearFilter === y ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    background: yearFilter === y ? "hsl(var(--muted) / 0.4)" : "transparent",
                  }}
                >
                  {y}
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />
        {/* Week / Day / Month toggle — grey pill with sliding white indicator (ALL/IN/OUT style) */}
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", background: "hsl(var(--foreground) / 0.07)", borderRadius: "999px", padding: "3px 6px" }}>
          {/* Sliding pill indicator */}
          <div
            style={{
              position: "absolute",
              top: "3px",
              bottom: "3px",
              left: "6px",
              width: "calc((100% - 12px) / 3)",
              transform: `translateX(${(["month", "week", "day"] as const).indexOf(viewMode) * 100}%)`,
              transition: "transform 0.22s ease",
              borderRadius: "999px",
              background: "hsl(0 0% 98%)",
            }}
          />
          {(["month", "week", "day"] as const).map(mode => {
            const dayDisabled = mode === "day" && monthFilter === "all";
            return (
              <button
                key={mode}
                onClick={() => { if (!dayDisabled) onViewModeChange(mode); }}
                disabled={dayDisabled}
                style={{
                  position: "relative",
                  zIndex: 1,
                  border: "none", background: "none",
                  cursor: dayDisabled ? "default" : "pointer",
                  width: "42px", padding: "4px 0",
                  fontSize: "9.5px", fontWeight: viewMode === mode ? 600 : 400,
                  letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit",
                  color: viewMode === mode ? "hsl(0 0% 10%)" : "hsl(var(--muted-foreground))",
                  opacity: dayDisabled ? 0.35 : 1,
                  transition: "color 0.2s ease",
                }}
              >
                {mode === "month" ? "Month" : mode === "week" ? "Week" : "Day"}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};