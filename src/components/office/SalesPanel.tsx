import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { supabase } from "@/integrations/supabase/client";

// Sales panel — extracted verbatim from src/pages/Office.tsx (no visual changes).
// The Office page mounts this component only while the Sales panel is open.

// Y-axis tick rendered flush-left so the labels line up with the branch title above each chart.
// NOTE: Recharts discards `tickFormatter` for function-component ticks, so the "k" formatting
// is applied here directly (payload.value is the raw tick value). Values round to whole
// thousands with no decimals ("7.6k" → "8k", "8.2k" → "8k").
const LeftAlignedYTick = ({ y, payload }: any) => {
  const v = payload.value;
  return (
    <text x={0} y={y} dy={4} textAnchor="start" fill="#888" fontSize={10} fontWeight={300} fontFamily="Raleway, inherit">
      {v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
    </text>
  );
};

interface SalesPanelProps {
  onClose: () => void;
}

export const SalesPanel = ({ onClose }: SalesPanelProps) => {

  const [salesLoading, setSalesLoading] = useState(false);
  const [salesMonthFilter, setSalesMonthFilter] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [salesYearFilter, setSalesYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [salesViewMode, setSalesViewMode] = useState<"week" | "day" | "month">("day");
  // Month mode: sliding 12-month window ending at this "YYYY-MM" anchor
  // (null = the latest month that actually has data).
  const [salesMonthAnchor, setSalesMonthAnchor] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<{ Branch: string; Date: string; "Total GST": number }[]>([]);
  const [tappedBar, setTappedBar] = useState<{ branchKey: string; label: string; total: number } | null>(null);
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [salesYearDropdownOpen, setSalesYearDropdownOpen] = useState(false);
  // Reset to week view when "All" months is selected (Day would mean ~365 bars)
  React.useEffect(() => {
    if (salesMonthFilter === "all" && salesViewMode === "day") setSalesViewMode("week");
  }, [salesMonthFilter, salesViewMode]);
  // ── SALES PANEL NAV GESTURE ──────────────────────────────

  // Month navigation (chevrons on SALES header).
  // Limited to months that actually have data: the back chevron stops at the
  // earliest month in the Cash table, the forward chevron at the latest.
  const salesRange = React.useMemo(() => {
    if (!salesData.length) return null;
    let min: string | null = null;
    let max: string | null = null;
    for (const r of salesData) {
      const ym = String(r.Date ?? "").slice(0, 7); // "YYYY-MM"
      if (ym.length !== 7) continue;
      if (!min || ym < min) min = ym;
      if (!max || ym > max) max = ym;
    }
    return min && max ? { min, max } : null;
  }, [salesData]);

  // Month the chevron would land on if pressed (also used for blocked visuals)
  const prospectiveMonth = (dir: 1 | -1) => {
    let m = salesMonthFilter === "all" ? (dir === -1 ? 13 : 0) : parseInt(salesMonthFilter);
    let y = parseInt(salesYearFilter);
    m += dir;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1)  { m = 12; y -= 1; }
    return `${y}-${String(m).padStart(2, "0")}`;
  };

  const navigateMonth = (dir: 1 | -1) => {
    // Month mode: chevrons slide the 12-month window by one month instead of
    // moving the Month/Year filter (which Month mode ignores).
    if (salesViewMode === "month") {
      if (!monthWindow) return;
      if (dir === -1 ? monthBackBlocked : monthFwdBlocked) return;
      const next = addMonthsKey(monthWindow.anchor, dir);
      setSalesMonthAnchor(next === salesRange!.max ? null : next);
      return;
    }
    const target = prospectiveMonth(dir);
    // No data before the earliest / after the latest month — don't move.
    if (salesRange && (target < salesRange.min || target > salesRange.max)) return;
    setSalesYearFilter(target.slice(0, 4));
    setSalesMonthFilter(target.slice(5, 7));
  };

  const backBlocked = !!salesRange && prospectiveMonth(-1) < salesRange.min;
  const fwdBlocked = !!salesRange && prospectiveMonth(1) > salesRange.max;

  // ── Month mode: sliding 12-month window ─────────────────────────
  // The window's last bar = anchor (defaults to the latest data month). Months
  // earlier than the first data month are dropped, so fewer than 12 bars show
  // when there is less history; back/forward slide the whole window by 1 month.
  const addMonthsKey = (ym: string, n: number) => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const monthWindow = React.useMemo(() => {
    if (!salesRange) return null;
    const anchor = salesMonthAnchor ?? salesRange.max;
    const start = addMonthsKey(anchor, -11);
    return {
      anchor,
      months: Array.from({ length: 12 }, (_, i) => addMonthsKey(start, i)).filter(k => k >= salesRange!.min),
    };
  }, [salesRange, salesMonthAnchor]);
  // Back allowed only while the shifted window still spans a full 12 months.
  const monthBackBlocked = !salesRange || !monthWindow || monthWindow.anchor < addMonthsKey(salesRange.min, 12);
  const monthFwdBlocked = !salesRange || !monthWindow || monthWindow.anchor >= salesRange.max;

  // Chevron disabled state, depending on the active view mode.
  const backBlockedFinal = salesViewMode === "month" ? monthBackBlocked : backBlocked;
  const fwdBlockedFinal = salesViewMode === "month" ? monthFwdBlocked : fwdBlocked;

  // Lighten a hex colour by mixing toward white (used for bar gradient tops)
  const lightenHex = (hex: string, amt: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const ch = (v: number) => Math.min(255, v + amt);
    const r = ch((num >> 16) & 255), g = ch((num >> 8) & 255), b = ch(num & 255);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  };

  // Custom bar shape: half-circle top, straight bottom, vertical gradient from the
  // bar's main colour at the top into a lighter tone at the base. Day-view bars
  // over 5k keep their darker highlight colour (gradient is computed from it).
  const makeRoundedBar = (baseColor: string, highlightColor: string, isDay: boolean) =>
    (props: any) => {
      const { x, y, width, height } = props;
      const value = props.value ?? props.total ?? 0;
      if (!width || height == null || height <= 0) return null;
      const fill = isDay && value > 5000 ? highlightColor : baseColor;
      const r = Math.min(width / 2, height);
      const d = `M ${x},${y + height} L ${x},${y + r} A ${r},${r} 0 0 1 ${x + width},${y + r} L ${x + width},${y + height} Z`;
      const gradId = `barGrad-${fill.replace("#", "")}`;
      return (
        <g>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} />
              <stop offset="100%" stopColor={lightenHex(fill, 22)} />
            </linearGradient>
          </defs>
          <path d={d} fill={`url(#${gradId})`} cursor="pointer" />
        </g>
      );
    };

  // ─── SALES HELPERS ───────────────────────────────────────────────
  const BRANCHES = [
    // Design palette: Desert Rock / Soft Sandstone / Mocha.
    // highlight = tonal step of the same palette, used in Day view for days over 5k.
    { key: "Boudoir", color: "#A48D78", highlight: "#6B5545" },      // Desert Rock (deep dark step)
    { key: "Chic Nailspa", color: "#CBB9A4", highlight: "#A48D78" }, // Soft Sandstone (Desert Rock step)
    { key: "Nur Yadi", color: "#B7A49C", highlight: "#9A867E" },     // Mocha (darkened step)
  ];

  // Month (12 Months) view: fixed per-branch axis range [floor, ceiling] in RM.
  // Months below the floor show as a small bump; months above the ceiling clamp
  // flat at the top of the chart.
  const MONTH_AXIS_RANGE: Record<string, [number, number]> = {
    "Boudoir": [30000, 80000],
    "Chic Nailspa": [80000, 120000],
    "Nur Yadi": [30000, 80000],
  };

  const fetchSales = React.useCallback(async () => {
    setSalesLoading(true);
    try {
      // Paginate to get all rows (Supabase default cap is 1000)
      let allSales: any[] = [];
      let salesFrom = 0;
      const salesPageSize = 1000;
      while (true) {
        const { data: pageData } = await (supabase as any)
          .from("Cash").select("*")
          .order("Date", { ascending: true })
          .range(salesFrom, salesFrom + salesPageSize - 1);
        if (!pageData || pageData.length === 0) break;
        allSales = allSales.concat(pageData);
        if (pageData.length < salesPageSize) break;
        salesFrom += salesPageSize;
      }
      setSalesData(allSales);
    } catch {}
    setSalesLoading(false);
  }, []);

  React.useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const salesYears = React.useMemo(() => {
    const set = new Set<string>();
    salesData.forEach(r => { if (r.Date) set.add(r.Date.slice(0, 4)); });
    return Array.from(set).sort();
  }, [salesData]);

  const salesMonths = React.useMemo(() => {
    const set = new Set<string>();
    salesData.forEach(r => { if (r.Date && r.Date.slice(0, 4) === salesYearFilter) set.add(r.Date.slice(5, 7)); });
    return Array.from(set).sort();
  }, [salesData, salesYearFilter]);

  const monthName = (mm: string) => {
    return new Date(2000, Number(mm) - 1, 1).toLocaleString("default", { month: "long" });
  };

  const monthNameShort = (mm: string) => {
    return new Date(2000, Number(mm) - 1, 1).toLocaleString("default", { month: "short" });
  };

  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return mon;
  };

  const buildWeeklyData = (branch: string) => {
    const filtered = salesData.filter(r => {
      if (r.Branch !== branch) return false;
      const prefix = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
      if (!r.Date?.startsWith(prefix)) return false;
      return true;
    });
    // Group into fixed date bands: 1-7, 8-14, 15-21, 22-end
    const bandMap: Record<string, { total: number; sortKey: string; period: string }> = {};
    filtered.forEach(r => {
      const d = new Date(r.Date + "T00:00:00");
      const day = d.getDate();
      const bandStart = day <= 7 ? 1 : day <= 14 ? 8 : day <= 21 ? 15 : 22;
      // Full period covered by the band (e.g. "22-31 Aug"): bands end at
      // bandStart+6, except the last band which runs to the month's final day.
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const bandEnd = bandStart === 22 ? lastDayOfMonth : bandStart + 6;
      const startDate = new Date(d.getFullYear(), d.getMonth(), bandStart);
      const label = startDate.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      const period = `${bandStart}-${bandEnd} ${monthNameShort(r.Date.slice(5, 7))}`;
      const sortKey = r.Date.slice(0, 7) + "-" + String(bandStart).padStart(2, "0");
      if (!bandMap[label]) bandMap[label] = { total: 0, sortKey, period };
      bandMap[label].total += Number(r["Total GST"]) || 0;
    });
    return Object.entries(bandMap)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([week, { total, period }]) => ({ week, total, period }));
  };

  const buildDailyData = (branch: string) => {
    const prefix = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
    const filtered = salesData.filter(r => r.Branch === branch && r.Date?.startsWith(prefix));
    // Sum rows per calendar day, keyed by the raw "YYYY-MM-DD" date.
    const dayMap: Record<string, number> = {};
    filtered.forEach(r => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.Date)) return;
      dayMap[r.Date] = (dayMap[r.Date] || 0) + (Number(r["Total GST"]) || 0);
    });
    // For a specific month, always cover every calendar day (1st → last) so the
    // x-axis starts at the 1st and days without sales rows render as RM 0 instead
    // of disappearing from the chart entirely.
    const parts = prefix.split("-").map(Number);
    if (parts.length === 2 && parts[0] > 0 && parts[1] >= 1 && parts[1] <= 12) {
      const [y, m] = parts;
      const daysInMonth = new Date(y, m, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const ds = `${prefix}-${String(i + 1).padStart(2, "0")}`;
        const label = new Date(ds + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short" });
        return { week: label, total: dayMap[ds] || 0 };
      });
    }
    // Fallback ("All" view is week-only so this shouldn't normally render):
    // keep the old aggregate-what-exists behaviour.
    return Object.entries(dayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ds, total]) => ({
        week: new Date(ds + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short" }),
        total,
      }));
  };

  // Month mode: one bar per calendar month across the sliding 12-month window.
  const buildMonthlyData = (branch: string) => {
    if (!monthWindow) return [];
    const sums: Record<string, number> = {};
    for (const r of salesData) {
      if (r.Branch !== branch || !r.Date) continue;
      const ym = String(r.Date).slice(0, 7);
      if (!monthWindow.months.includes(ym)) continue;
      sums[ym] = (sums[ym] || 0) + (Number(r["Total GST"]) || 0);
    }
    return monthWindow.months.map(ym => {
      const y = ym.slice(0, 4);
      const mm = ym.slice(5, 7);
      return {
        key: ym,
        week: monthNameShort(mm),
        total: sums[ym] || 0,
        period: `${monthNameShort(mm)} ${y}`,
      };
    });
  };

  // Total across the visible month-mode window (box header + pinned grand total).
  const monthlyWindowTotal = (branch: string) =>
    buildMonthlyData(branch).reduce((s, d) => s + d.total, 0);

  const salesGrandTotal = (branch: string) => {
    return salesData
      .filter(r => { const p = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`; return r.Branch === branch && (r.Date?.startsWith(p) ?? false); })
      .reduce((s, r) => s + (Number(r["Total GST"]) || 0), 0);
  };
  // ─────────────────────────────────────────────────────────────────
  return (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "hsl(var(--background))", zIndex: 100,
            display: "flex", flexDirection: "column",
            fontFamily: "Raleway, inherit",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0 20px" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={onClose} title="Back to Office" style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>SALES</button>
              </div>
              {/* Month navigation chevrons */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  onClick={() => navigateMonth(-1)}
                  disabled={backBlockedFinal}
                  style={{ background: "none", border: "none", cursor: backBlockedFinal ? "default" : "pointer", padding: "6px", color: "hsl(var(--foreground))", opacity: backBlockedFinal ? 0.2 : 0.7, lineHeight: 1 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  disabled={fwdBlockedFinal}
                  style={{ background: "none", border: "none", cursor: fwdBlockedFinal ? "default" : "pointer", padding: "6px", color: "hsl(var(--foreground))", opacity: fwdBlockedFinal ? 0.2 : 0.7, lineHeight: 1 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            {/* Month + Year filter + View toggle */}
            <div style={{ padding: "10px 20px 8px 20px", display: "flex", alignItems: "center", gap: "6px" }}>

              {/* In Month mode the Month/Year filters don't apply — show a plain label */}
              {salesViewMode === "month" ? (
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
                  {salesMonthFilter === "all" ? "All" : monthName(salesMonthFilter)}
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
                        onClick={() => { setSalesMonthFilter(m); setSalesDropdownOpen(false); if (m !== "all") {} }}
                        style={{
                          padding: "9px 16px", fontSize: "11px", fontFamily: "Raleway, inherit",
                          fontWeight: salesMonthFilter === m ? 500 : 300,
                          cursor: "pointer",
                          color: salesMonthFilter === m ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                          background: salesMonthFilter === m ? "hsl(var(--muted) / 0.4)" : "transparent",
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
                  {salesYearFilter}
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
                        onClick={() => { setSalesYearFilter(y); setSalesYearDropdownOpen(false); setSalesMonthFilter("all"); }}
                        style={{
                          padding: "9px 16px", fontSize: "11px", fontFamily: "Raleway, inherit",
                          fontWeight: salesYearFilter === y ? 500 : 300,
                          cursor: "pointer",
                          color: salesYearFilter === y ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                          background: salesYearFilter === y ? "hsl(var(--muted) / 0.4)" : "transparent",
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

              {/* Week / Day / Month toggle — grey pill with sliding white indicator,
                  sized like the ALL/IN/OUT toggle on the Product card's Past Data */}
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", background: "hsl(var(--foreground) / 0.07)", borderRadius: "999px", padding: "3px 6px" }}>
                {/* Sliding pill indicator */}
                <div
                  style={{
                    position: "absolute",
                    top: "3px",
                    bottom: "3px",
                    left: "6px",
                    width: "calc((100% - 12px) / 3)",
                    transform: `translateX(${(["month", "week", "day"] as const).indexOf(salesViewMode) * 100}%)`,
                    transition: "transform 0.22s ease",
                    borderRadius: "999px",
                    background: "hsl(0 0% 98%)",
                  }}
                />
                {(["month", "week", "day"] as const).map(mode => {
                  const dayDisabled = mode === "day" && salesMonthFilter === "all";
                  return (
                    <button
                      key={mode}
                      onClick={() => { if (!dayDisabled) setSalesViewMode(mode); }}
                      disabled={dayDisabled}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        border: "none", background: "none",
                        cursor: dayDisabled ? "default" : "pointer",
                        width: "42px", padding: "4px 0",
                        fontSize: "9.5px", fontWeight: salesViewMode === mode ? 600 : 400,
                        letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit",
                        color: salesViewMode === mode ? "hsl(0 0% 10%)" : "hsl(var(--muted-foreground))",
                        opacity: dayDisabled ? 0.35 : 1,
                        transition: "color 0.2s ease",
                      }}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Charts + Total pinned to the bottom (fits one iPhone screen) */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 16px 6px 16px", display: "flex", flexDirection: "column", gap: "12px" }} onClick={() => setTappedBar(null)}>
              {salesLoading && (
                <div style={{ textAlign: "center", padding: "40px", fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))" }}>Loading...</div>
              )}
              {!salesLoading && BRANCHES.map(({ key, color, highlight }) => {
                const data = salesViewMode === "month" ? buildMonthlyData(key) : salesViewMode === "week" ? buildWeeklyData(key) : buildDailyData(key);
                const total = salesViewMode === "month" ? monthlyWindowTotal(key) : salesGrandTotal(key);
                return (
                  <div key={key} style={{ flex: 1, minHeight: 110, maxHeight: 210, display: "flex", flexDirection: "column", background: "#F2EDE6", borderRadius: "18px", padding: "10px 12px 8px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px", flexShrink: 0 }}>
                      <span style={{ fontSize: "13px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "#2a2a2a" }}>
                        {({ "Boudoir": "BOUDOIR", "Chic Nailspa": "CHIC NAILSPA", "Nur Yadi": "NUR YADI" } as Record<string,string>)[key] ?? key.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 300, color: "#2a2a2a", fontFamily: "Raleway, inherit", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "8px" }}>
                        RM {total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {data.length === 0 ? (
                      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>No data</div>
                    ) : (() => {
                      // Day view: relative scale — bars always start at the 0 baseline (never
                      // floating above the x-axis line) and the month's best day fills the
                      // chart (100% height); the slowest day shows as a small bump proportional
                      // to it. Single axis label = best day rounded to the nearest thousand
                      // ("7.6k" → "8k", "8.2k" → "8k") — no min label. The >5k darker shade
                      // rule is value-based and unchanged. Week view: unchanged — dynamic 10k.
                      let topTick: number;
                      let yTicks: number[];
                      let domain: [number, number];
                      if (salesViewMode === "month") {
                        // Month view: fixed per-branch scale (floor → ceiling from
                        // MONTH_AXIS_RANGE). Months under the floor render as a small bump
                        // and months over the ceiling clamp flat at the top ("plot" below).
                        const [minV, maxV] = MONTH_AXIS_RANGE[key] ?? [50000, 100000];
                        topTick = maxV;
                        yTicks = [minV, maxV];
                        domain = [minV, maxV];
                      } else if (salesViewMode === "day") {
                        const vMax = Math.max(...data.map((d: any) => d.total || d.value || 0));
                        if (vMax > 0) {
                          topTick = vMax;
                          domain = [0, vMax];
                          yTicks = [vMax];
                        } else {
                          // No positive values this month — keep the absolute 0–10k scale
                          topTick = 10000;
                          domain = [0, topTick];
                          yTicks = [0, 5000, 10000];
                        }
                      } else {
                        const maxVal = data.reduce((m: number, d: any) => Math.max(m, d.total || d.value || 0), 0);
                        topTick = Math.ceil(Math.max(maxVal, 10000) / 10000) * 10000;
                        yTicks = Array.from({ length: topTick / 10000 + 1 }, (_, i) => i * 10000);
                        domain = [0, topTick];
                      }
                      const prefix2 = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
                      const filtered2 = salesData.filter(r => r.Branch === key && r.Date?.startsWith(prefix2));
                      let weeklyAvg: number | null = null;
                      if (filtered2.length >= 2) {
                        const dates2 = filtered2.map(r => new Date(r.Date).getTime());
                        const days2 = Math.max(1, Math.round((Math.max(...dates2) - Math.min(...dates2)) / 86400000) + 1);
                        const sum2 = filtered2.reduce((s, r) => s + (parseFloat(r["Total GST"] as any) || 0), 0);
                        weeklyAvg = sum2 / days2 * 7;
                      }
                      // Month view: dotted average line excludes zero months and the current
                      // (in-progress) month. "plot" clamps sub-50k months to a small uniform
                      // bump just above the 50k axis floor so they stay visible.
                      let monthlyAvg: number | null = null;
                      let chartData = data;
                      if (salesViewMode === "month") {
                        const [minV, maxV] = MONTH_AXIS_RANGE[key] ?? [50000, 100000];
                        const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
                        const avgVals = data.filter((d: any) => d.total > 0 && d.key !== nowKey).map((d: any) => d.total);
                        if (avgVals.length > 0) monthlyAvg = avgVals.reduce((s: number, v: number) => s + v, 0) / avgVals.length;
                        // Hide the line if it falls outside the fixed axis range
                        if (monthlyAvg !== null && (monthlyAvg < minV || monthlyAvg > maxV)) monthlyAvg = null;
                        const bump = minV + (maxV - minV) * 0.03;
                        // Months under RM 1k show as no bar at all (plotted at the axis floor)
                        chartData = data.map((d: any) => ({ ...d, plot: d.total < 1000 ? minV : Math.min(Math.max(d.total, bump), maxV) }));
                      }
                      return (
                        <div style={{ position: "relative", flex: 1, minHeight: 0 }} onClick={(e) => e.stopPropagation()}>
                          {tappedBar?.branchKey === key && (
                            <div style={{
                              position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)",
                              zIndex: 10, background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.18)",
                              borderRadius: "8px", padding: "5px 12px", display: "flex", flexDirection: "column",
                              alignItems: "center", gap: "1px", boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                              pointerEvents: "none",
                            }}>
                              <span style={{ fontSize: "10px", fontWeight: 300, color: "#aaa", letterSpacing: "0.04em", fontFamily: "Raleway, inherit" }}>{tappedBar.label}</span>
                              <span style={{ fontSize: "13px", fontWeight: 500, color: "#fff", fontFamily: "Raleway, inherit" }}>RM {tappedBar.total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barCategoryGap={salesViewMode === "month" ? "25%" : salesViewMode === "week" ? (salesMonthFilter === "all" ? "8%" : "35%") : "10%"} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#e8e8e8" strokeWidth={0.8} />
                            <XAxis
                              dataKey="week"
                              interval="preserveStart"
                              tick={{ fontSize: 10, fontFamily: "Raleway, inherit", fontWeight: 300, fill: "#888" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              ticks={yTicks}
                              domain={domain}
                              interval={0}
                              tick={LeftAlignedYTick}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`}
                              width={30}
                            />
                            <Bar
                              dataKey={salesViewMode === "month" ? "plot" : "total"}
                              isAnimationActive={false}
                              maxBarSize={salesViewMode === "month" ? 34 : salesViewMode === "week" ? (salesMonthFilter === "all" ? 52 : 22) : 52}
                              cursor="pointer"
                              shape={makeRoundedBar(color, highlight, salesViewMode === "day")}
                              onClick={(barData: any) => {
                                // Weekly bars carry a full "period" label (e.g. "22-31 Aug");
                                // daily bars fall back to their own label.
                                const barLabel = barData.period ?? barData.week;
                                if (tappedBar?.branchKey === key && tappedBar?.label === barLabel) {
                                  setTappedBar(null);
                                } else {
                                  setTappedBar({ branchKey: key, label: barLabel, total: barData.total });
                                }
                              }}
                            />
                            {salesViewMode === "week" && weeklyAvg !== null && (
                              <ReferenceLine y={weeklyAvg} stroke="#888" strokeDasharray="4 3" strokeWidth={1} />
                            )}
                            {salesViewMode === "month" && monthlyAvg !== null && (
                              <ReferenceLine y={monthlyAvg} stroke="#888" strokeDasharray="4 3" strokeWidth={1} />
                            )}
                          </BarChart>
                        </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              </div>
              {/* ── Combined grand total — pinned to the bottom of the screen ── */}
              <div style={{ flexShrink: 0, textAlign: "right", padding: "10px 20px calc(10px + env(safe-area-inset-bottom, 0px)) 20px", borderTop: "0.5px solid #d8d0c8" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#2a2a2a", fontFamily: "Raleway, inherit", letterSpacing: "0.02em" }}>
                  Total: RM {BRANCHES.reduce((sum, b) => sum + (salesViewMode === "month" ? monthlyWindowTotal(b.key) : salesGrandTotal(b.key)), 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
  );
};
