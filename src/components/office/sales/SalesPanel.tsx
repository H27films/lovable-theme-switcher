import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import type { SalesRow, ViewMode } from "./salesData";
import { fetchAllSales, computeSalesRange, addMonthsKey, buildMonthWindow, monthWindowBlocked, salesGrandTotal } from "./salesData";
import { SalesControls } from "./SalesControls";
import { SalesChartCard } from "./SalesChartCard";

type Props = { onClose: () => void };

export const SalesPanel: React.FC<Props> = ({ onClose }) => {
  const [salesData, setSalesData] = useState<SalesRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesMonthFilter, setSalesMonthFilter] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [salesYearFilter, setSalesYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [salesViewMode, setSalesViewMode] = useState<ViewMode>("day");
  const [salesMonthAnchor, setSalesMonthAnchor] = useState<string | null>(null);
  const [tappedBar, setTappedBar] = useState<{ branchKey: string; label: string; total: number } | null>(null);

  // Reset to week view when "All" months is selected
  useEffect(() => {
    if (salesMonthFilter === "all") setSalesViewMode("week");
  }, [salesMonthFilter]);

  const salesRange = useMemo(() => computeSalesRange(salesData), [salesData]);
  const monthWindow = useMemo(() => buildMonthWindow(salesRange, salesMonthAnchor), [salesRange, salesMonthAnchor]);
  const { back: monthBackBlocked, fwd: monthFwdBlocked } = useMemo(() => monthWindowBlocked(salesRange, monthWindow), [salesRange, monthWindow]);

  const prospectiveMonth = (dir: 1 | -1) => {
    let m = salesMonthFilter === "all" ? (dir === -1 ? 13 : 0) : parseInt(salesMonthFilter);
    let y = parseInt(salesYearFilter);
    m += dir;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1)  { m = 12; y -= 1; }
    return `${y}-${String(m).padStart(2, "0")}`;
  };

  const backBlocked = !!salesRange && prospectiveMonth(-1) < salesRange.min;
  const fwdBlocked = !!salesRange && prospectiveMonth(1) > salesRange.max;
  const backBlockedFinal = salesViewMode === "month" ? monthBackBlocked : backBlocked;
  const fwdBlockedFinal = salesViewMode === "month" ? monthFwdBlocked : fwdBlocked;

  const navigateMonth = (dir: 1 | -1) => {
    if (salesViewMode === "month") {
      if (!monthWindow) return;
      if (dir === -1 ? monthBackBlocked : monthFwdBlocked) return;
      const next = addMonthsKey(monthWindow.anchor, dir);
      setSalesMonthAnchor(next === salesRange!.max ? null : next);
      return;
    }
    const target = prospectiveMonth(dir);
    if (salesRange && (target < salesRange.min || target > salesRange.max)) return;
    setSalesYearFilter(target.slice(0, 4));
    setSalesMonthFilter(target.slice(5, 7));
  };

  const salesYears = useMemo(() => {
    if (!salesData.length) return [String(new Date().getFullYear())];
    const years = new Set<string>();
    for (const r of salesData) {
      const y = (r.Date ?? "").slice(0, 4);
      if (y.length === 4) years.add(y);
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [salesData]);

  const salesMonths = useMemo(() => {
    const out: string[] = [];
    for (let m = 1; m <= 12; m++) out.push(String(m).padStart(2, "0"));
    return out;
  }, []);

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try { setSalesData(await fetchAllSales()); } catch {}
    setSalesLoading(false);
  }, []);

  useEffect(() => {
    if (salesData.length === 0) fetchSales();
  }, []);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "hsl(var(--background))", zIndex: 100,
      display: "flex", flexDirection: "column",
      fontFamily: "Raleway, inherit",
    }}>
      <SalesControls
        onClose={onClose}
        viewMode={salesViewMode}
        onViewModeChange={setSalesViewMode}
        monthFilter={salesMonthFilter}
        yearFilter={salesYearFilter}
        onMonthFilterChange={setSalesMonthFilter}
        onYearFilterChange={setSalesYearFilter}
        salesMonths={salesMonths}
        salesYears={salesYears}
        onNavigate={navigateMonth}
        backBlocked={backBlockedFinal}
        fwdBlocked={fwdBlockedFinal}
      />

      {/* Charts area — flex column with gap (mirrors original wrapper so each card
          receives real height for the chart and keeps 12px spacing between boxes). */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 16px 6px 16px", display: "flex", flexDirection: "column", gap: "12px" }} onClick={() => setTappedBar(null)}>
        {salesLoading && (
          <div style={{ textAlign: "center", padding: "40px", fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))" }}>Loading...</div>
        )}
        {!salesLoading && [
          { key: "Boudoir", color: "#A48D78", highlight: "#6B5545" },
          { key: "Chic Nailspa", color: "#CBB9A4", highlight: "#A48D78" },
          { key: "Nur Yadi", color: "#B7A49C", highlight: "#9A867E" },
        ].map(({ key, color, highlight }) => (
          <SalesChartCard
            key={key}
            branchKey={key}
            color={color}
            highlight={highlight}
            salesData={salesData}
            viewMode={salesViewMode}
            monthFilter={salesMonthFilter}
            yearFilter={salesYearFilter}
            monthWindow={monthWindow}
            tappedBar={tappedBar}
            setTappedBar={setTappedBar}
          />
        ))}
      </div>

      {/* Pinned grand total */}
      <div style={{ flexShrink: 0, textAlign: "right", padding: "10px 20px calc(10px + env(safe-area-inset-bottom, 0px)) 20px", borderTop: "0.5px solid #d8d0c8" }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "#2a2a2a", fontFamily: "Raleway, inherit", letterSpacing: "0.02em" }}>
          Total: RM {
            ["Boudoir", "Chic Nailspa", "Nur Yadi"].reduce(
              (sum, k) => sum + salesGrandTotal(salesData, k, salesYearFilter, salesMonthFilter), 0
            ).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          }
        </span>
      </div>
    </div>
  );
};
