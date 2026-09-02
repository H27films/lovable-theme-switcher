import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSlideExit, useSlideEnter, slideExitStyle } from "@/hooks/useSlideTransition";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import Sync from "@/components/office/Sync";
import OfficeLogTable from "@/components/office/OfficeLogTable";
import { OfficeHeader } from "@/components/office/OfficeHeader";
import { BottomNavOffice } from "@/components/office/BottomNavOffice";

interface OfficeProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "STAFF PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "OFFICE BALANCE": number | null;
  "OFFICE SECTION": string | null;
  "UNITS/ORDER": number | null;
  "BOUDOIR BALANCE": number | null;
  "CHIC NAILSPA BALANCE": number | null;
  "NUR YADI BALANCE": number | null;
  "Colour": string | null;
  "OFFICE FAVOURITE": string | null;
  "PAR": number | null;
}

interface OfficeProps {
  onBack?: () => void;
  onBackToMain?: () => void;
  products?: OfficeProduct[];
}

const hdrStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: "#000000", textTransform: "uppercase",
  letterSpacing: "0.08em",
};

// Y-axis tick rendered flush-left so the labels line up with the branch title above each chart.
// NOTE: Recharts discards `tickFormatter` for function-component ticks, so the "k" formatting
// is applied here directly (payload.value is the raw tick value).
const LeftAlignedYTick = ({ y, payload }: any) => {
  const v = payload.value;
  return (
    <text x={0} y={y} dy={4} textAnchor="start" fill="#888" fontSize={10} fontWeight={300} fontFamily="Raleway, inherit">
      {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
    </text>
  );
};

const Office = ({ onBack, onBackToMain, products = [] }: OfficeProps) => {
  const { exiting, slideTo } = useSlideExit();
  const enterStyle = useSlideEnter();
  const location = useLocation();
  // ── SYNC PANEL STATE ────────────────────────────────────
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showSalesPanel, setShowSalesPanel] = useState(false);
  const [salesData, setSalesData] = useState<{ Branch: string; Date: string; "Total GST": number }[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesMonthFilter, setSalesMonthFilter] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [salesYearFilter, setSalesYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [salesViewMode, setSalesViewMode] = useState<"week" | "day">("week");
  // Reset to week view when "All" months is selected
  React.useEffect(() => {
    if (salesMonthFilter === "all") setSalesViewMode("week");
  }, [salesMonthFilter]);
  const [tappedBar, setTappedBar] = useState<{ branchKey: string; label: string; total: number } | null>(null);
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [salesYearDropdownOpen, setSalesYearDropdownOpen] = useState(false);

  // Open Sales / Sync directly when returning from the Order / Search pages via
  // the bottom nav — they slide back here with { openPanel } router state.
  useEffect(() => {
    const openPanel = (location.state as { openPanel?: string } | null)?.openPanel;
    if (openPanel === "sales") setShowSalesPanel(true);
    else if (openPanel === "sync") setShowSyncPanel(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const BRANCH_NAME = "OFFICE";

  // ── Local products (synced from prop, refreshed after order) ─
  const [localProducts, setLocalProducts] = useState<OfficeProduct[]>(products);
  useEffect(() => { setLocalProducts(products ?? []); }, [products]);

  const refreshLocalProducts = async () => {
    let allData: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("AllFileProducts").select("*").range(from, from + 999);
      if (error || !data?.length) break;
      allData = allData.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    setLocalProducts(allData);
  };

  // Standalone route: no products prop provided → load them here
  useEffect(() => {
    if (!products || products.length === 0) refreshLocalProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Log table refresh trigger ────────────────────────────────
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);

  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  // Month navigation (chevrons on SALES header)
  const navigateMonth = (dir: 1 | -1) => {
    let m = salesMonthFilter === "all" ? (dir === -1 ? 13 : 0) : parseInt(salesMonthFilter);
    let y = parseInt(salesYearFilter);
    m += dir;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1)  { m = 12; y -= 1; }
    setSalesYearFilter(String(y));
    setSalesMonthFilter(String(m).padStart(2, '0'));
  };

  // Custom bar shape: half-circle top, straight bottom
  const makeRoundedBar = (baseColor: string, highlightColor: string, isDay: boolean) =>
    (props: any) => {
      const { x, y, width, height } = props;
      const value = props.value ?? props.total ?? 0;
      if (!width || height == null || height <= 0) return null;
      const fill = isDay && value > 5000 ? highlightColor : baseColor;
      const r = Math.min(width / 2, height);
      const d = `M ${x},${y + height} L ${x},${y + r} A ${r},${r} 0 0 1 ${x + width},${y + r} L ${x + width},${y + height} Z`;
      return <path d={d} fill={fill} cursor="pointer" />;
    };

  // ─── SALES HELPERS ───────────────────────────────────────────────
  const BRANCHES = [
    { key: "Boudoir", color: "#9CA998", highlight: "#7BC47A" },
    { key: "Chic Nailspa", color: "#707F84", highlight: "#5BA3B5" },
    { key: "Nur Yadi", color: "#CAB99E", highlight: "#E09660" },
  ];

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
    if (showSalesPanel) fetchSales();
  }, [showSalesPanel, fetchSales]);

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
    const bandMap: Record<string, { total: number; sortKey: string }> = {};
    filtered.forEach(r => {
      const d = new Date(r.Date + "T00:00:00");
      const day = d.getDate();
      const bandStart = day <= 7 ? 1 : day <= 14 ? 8 : day <= 21 ? 15 : 22;
      const startDate = new Date(d.getFullYear(), d.getMonth(), bandStart);
      const label = startDate.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      const sortKey = r.Date.slice(0, 7) + "-" + String(bandStart).padStart(2, "0");
      if (!bandMap[label]) bandMap[label] = { total: 0, sortKey };
      bandMap[label].total += Number(r["Total GST"]) || 0;
    });
    return Object.entries(bandMap)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([week, { total }]) => ({ week, total }));
  };

  const buildDailyData = (branch: string) => {
    const prefix = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
    const filtered = salesData.filter(r => r.Branch === branch && r.Date?.startsWith(prefix));
    const dayMap: Record<string, { total: number; sortKey: string }> = {};
    filtered.forEach(r => {
      const d = new Date(r.Date + "T00:00:00");
      const label = d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      if (!dayMap[label]) dayMap[label] = { total: 0, sortKey: r.Date };
      dayMap[label].total += Number(r["Total GST"]) || 0;
    });
    return Object.entries(dayMap)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([day, { total }]) => ({ week: day, total }));
  };

  const salesGrandTotal = (branch: string) => {
    return salesData
      .filter(r => { const p = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`; return r.Branch === branch && (r.Date?.startsWith(p) ?? false); })
      .reduce((s, r) => s + (Number(r["Total GST"]) || 0), 0);
  };
  // ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      height: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))",
      fontFamily: "'Raleway', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden",
      ...enterStyle,
      ...slideExitStyle(exiting),
    }}>

            {/* ── TOP AREA ── */}
            <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px", flexShrink: 0 }}>

{/* Branch name header row */}
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
  <button
    onClick={() => slideTo("/simple/admin", undefined, "back")}
    style={{
      display: "block", fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300,
      letterSpacing: "0.08em", color: "hsl(var(--foreground))",
      background: "none", border: "none", cursor: "pointer", textAlign: "left",
      padding: 0, fontFamily: "Raleway, inherit", lineHeight: 1,
    }}
  >
    {BRANCH_NAME}
  </button>
  <OfficeHeader />
</div>


        </div> 
        
      {/* ── MIDDLE SCROLLABLE ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}>

        {/* ══ SEARCH + RECENT ══════════════════════════════════════ */}
        <>

            

            {/* ══ LOG TABLE ══════════════════════════════════════════════ */}
            <OfficeLogTable
              localProducts={localProducts}
              refreshTrigger={logRefreshTrigger}
            />


        </>
      </div>

        {/* ══ SALES PANEL OVERLAY ══════════════════════════════════ */}
        {showSalesPanel && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "hsl(var(--background))", zIndex: 100,
            display: "flex", flexDirection: "column",
            fontFamily: "Raleway, inherit",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0 20px" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => setShowSalesPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginRight: "16px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
                </button>
                <button onClick={() => setShowSalesPanel(false)} title="Back to Office" style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>SALES</button>
              </div>
              {/* Month navigation chevrons */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  onClick={() => navigateMonth(-1)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", color: "hsl(var(--foreground))", opacity: 0.7, lineHeight: 1 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", color: "hsl(var(--foreground))", opacity: 0.7, lineHeight: 1 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            {/* Month + Year filter + View toggle */}
            <div style={{ padding: "14px 20px 10px 20px", display: "flex", alignItems: "center", gap: "6px" }}>

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

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Week / Day toggle — only when a specific month is selected */}
              {salesMonthFilter !== "all" && (
                <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "0.5px solid hsl(var(--border))" }}>
                  {(["week", "day"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSalesViewMode(mode)}
                      style={{
                        background: salesViewMode === mode ? "hsl(var(--foreground))" : "transparent",
                        color: salesViewMode === mode ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                        border: "none", padding: "5px 12px",
                        fontSize: "10px", fontWeight: 400, fontFamily: "Raleway, inherit",
                        letterSpacing: "0.06em", cursor: "pointer", textTransform: "uppercase",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      {mode === "week" ? "Week" : "Day"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Charts */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px 20px" }} onClick={() => setTappedBar(null)}>
              {salesLoading && (
                <div style={{ textAlign: "center", padding: "40px", fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))" }}>Loading...</div>
              )}
              {!salesLoading && BRANCHES.map(({ key, color, highlight }) => {
                const data = salesViewMode === "week" ? buildWeeklyData(key) : buildDailyData(key);
                const total = salesGrandTotal(key);
                return (
                  <div key={key} style={{ marginBottom: "20px", background: "#F2EDE6", borderRadius: "18px", padding: "16px 16px 8px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "#2a2a2a" }}>
                        {({ "Boudoir": "BOUDOIR", "Chic Nailspa": "CHIC NAILSPA", "Nur Yadi": "NUR YADI" } as Record<string,string>)[key] ?? key.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 300, color: "#2a2a2a", fontFamily: "Raleway, inherit" }}>
                        RM {total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {data.length === 0 ? (
                      <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300, padding: "12px 0" }}>No data</div>
                    ) : (() => {
                      // Day view: fixed 0-10k; Week view: dynamic 5k increments
                      let topTick: number;
                      let yTicks: number[];
                      if (salesViewMode === "day") {
                        topTick = 10000;
                        yTicks = [0, 5000, 10000];
                      } else {
                        const maxVal = data.reduce((m: number, d: any) => Math.max(m, d.total || d.value || 0), 0);
                        topTick = Math.ceil(Math.max(maxVal, 5000) / 5000) * 5000;
                        yTicks = Array.from({ length: topTick / 5000 + 1 }, (_, i) => i * 5000);
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
                      return (
                        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
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
                          <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={data} barCategoryGap="25%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#e8e8e8" strokeWidth={0.8} />
                            <XAxis
                              dataKey="week"
                              tick={{ fontSize: 10, fontFamily: "Raleway, inherit", fontWeight: 300, fill: "#888" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              ticks={yTicks}
                              domain={[0, topTick]}
                              interval={0}
                              tick={LeftAlignedYTick}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`}
                              width={36}
                            />
                            <Bar
                              dataKey="total"
                              isAnimationActive={false}
                              maxBarSize={40}
                              cursor="pointer"
                              shape={makeRoundedBar(color, highlight, salesViewMode === "day")}
                              onClick={(barData: any) => {
                                if (tappedBar?.branchKey === key && tappedBar?.label === barData.week) {
                                  setTappedBar(null);
                                } else {
                                  setTappedBar({ branchKey: key, label: barData.week, total: barData.total });
                                }
                              }}
                            />
                            {salesViewMode === "week" && weeklyAvg !== null && (
                              <ReferenceLine y={weeklyAvg} stroke="#888" strokeDasharray="4 3" strokeWidth={1} />
                            )}
                          </BarChart>
                        </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {/* ── Combined grand total ─────────────────────── */}
              <div style={{ textAlign: "right", paddingTop: "8px", borderTop: "0.5px solid #d8d0c8" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#2a2a2a", fontFamily: "Raleway, inherit", letterSpacing: "0.02em" }}>
                  Total: RM {BRANCHES.reduce((sum, b) => sum + salesGrandTotal(b.key), 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ═ SYNC PANEL ══════════════════════════════ */}
        {showSyncPanel && (
          <Sync
            onClose={() => setShowSyncPanel(false)}
            onImported={() => setLogRefreshTrigger(prev => prev + 1)}
            onProductsUpdated={refreshLocalProducts}
          />
        )}

        {/* ── BOTTOM NAV (Order / Sales / Sync / Search) ── */}
        <BottomNavOffice
          active={showSalesPanel ? "sales" : showSyncPanel ? "sync" : null}
          onSelect={(key) => {
            if (key === "order") slideTo("/simple/order", { from: "office" }, "forward");
            else if (key === "sales") setShowSalesPanel(v => !v);
            else if (key === "sync") setShowSyncPanel(v => !v);
            else if (key === "search") slideTo("/simple/search", { from: "office" }, "forward");
          }}
        />

    </div>
  );
};

export default Office;