import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { CashRow } from "@/lib/branchSimple";
import type { ViewMode } from "@/components/office/sales/salesData";
import { monthName, monthNameShort, computeSalesRange, addMonthsKey, buildMonthWindow, monthWindowBlocked } from "@/components/office/sales/salesData";

type Props = {
  branchName: string;
  onClose: () => void;
};

const LeftAlignedYTick = ({ y, payload }: any) => {
  const v = payload.value;
  return (
    <text x={0} y={y} dy={4} textAnchor="start" fill="#888" fontSize={10} fontWeight={300} fontFamily="Raleway, inherit">
      {v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
    </text>
  );
};

const lightenHex = (hex: string, amt: number) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const ch = (v: number) => Math.min(255, v + amt);
  const r = ch((num >> 16) & 255), g = ch((num >> 8) & 255), b = ch(num & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

const BRANCH_COLORS: Record<string, { color: string; highlight: string }> = {
  "Boudoir": { color: "#A48D78", highlight: "#6B5545" },
  "Chic Nailspa": { color: "#CBB9A4", highlight: "#A48D78" },
  "Nur Yadi": { color: "#B7A49C", highlight: "#9A867E" },
};

const makeRoundedBar = (baseColor: string, highlightColor: string, isDay: boolean) =>
  (props: any) => {
    const { x, y, width, height } = props;
    const value = props.value ?? props.total ?? 0;
    if (!width || height == null || height <= 0) return null;
    const fill = isDay && value > 5000 ? highlightColor : baseColor;
    const r = Math.min(width / 2, height);
    const d = `M ${x},${y + height} L ${x},${y + r} A ${r},${r} 0 0 1 ${x + width},${y + r} L ${x + width},${y + height} Z`;
    const gradId = `barGradBranch-${fill.replace("#", "")}`;
    return (
      <g>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} />
            <stop offset="100%" stopColor={lightenHex(fill, 10)} />
          </linearGradient>
        </defs>
        <path d={d} fill={`url(#${gradId})`} cursor="pointer" />
      </g>
    );
  };

export const BranchSalesPanel: React.FC<Props> = ({ branchName, onClose }) => {
  const [salesData, setSalesData] = useState<CashRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesMonthFilter, setSalesMonthFilter] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [salesYearFilter, setSalesYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [salesViewMode, setSalesViewMode] = useState<ViewMode>("day");
  const [salesMonthAnchor, setSalesMonthAnchor] = useState<string | null>(null);

  useEffect(() => {
    if (salesMonthFilter === "all") setSalesViewMode("week");
  }, [salesMonthFilter]);

  const branchData = useMemo(() => salesData.filter(r => r.Branch === branchName), [salesData, branchName]);

  const salesRange = useMemo(() => computeSalesRange(branchData as any), [branchData]);
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
    if (!branchData.length) return [String(new Date().getFullYear())];
    const years = new Set<string>();
    for (const r of branchData) {
      const y = (r.Date ?? "").slice(0, 4);
      if (y.length === 4) years.add(y);
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [branchData]);

  const salesMonths = useMemo(() => {
    const out: string[] = [];
    for (let m = 1; m <= 12; m++) out.push(String(m).padStart(2, "0"));
    return out;
  }, []);

  const chartData = useMemo(() => {
    if (salesViewMode === "month") {
      if (!monthWindow) return [];
      const sums: Record<string, number> = {};
      for (const r of branchData) {
        if (!r.Date) continue;
        const ym = String(r.Date).slice(0, 7);
        if (!monthWindow.months.includes(ym)) continue;
        sums[ym] = (sums[ym] || 0) + (Number(r["Total GST"]) || 0);
      }
      return monthWindow.months.map(ym => ({
        key: ym,
        week: monthNameShort(ym.slice(5, 7)),
        total: sums[ym] || 0,
        period: `${monthNameShort(ym.slice(5, 7))} ${ym.slice(0, 4)}`,
      }));
    } else if (salesViewMode === "week") {
      const prefix = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
      const filtered = branchData.filter(r => r.Date?.startsWith(prefix));
      const weekMap: Record<string, { total: number; sortKey: string; period: string }> = {};
      filtered.forEach(r => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(r.Date)) return;
        const d = new Date(r.Date + "T00:00:00");
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const mon = new Date(d);
        mon.setDate(d.getDate() + diff);
        const weekStart = mon.toISOString().slice(0, 10);
        const sortKey = r.Date.slice(0, 7) + "-" + String(mon.getDate()).padStart(2, "0");
        if (!weekMap[weekStart]) weekMap[weekStart] = { total: 0, sortKey, period: weekStart };
        weekMap[weekStart].total += Number(r["Total GST"]) || 0;
      });
      return Object.entries(weekMap)
        .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
        .map(([week, { total, period }]) => ({ week: period, total, period }));
    } else {
      const prefix = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
      const filtered = branchData.filter(r => r.Date?.startsWith(prefix));
      const dayMap: Record<string, number> = {};
      filtered.forEach(r => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(r.Date)) return;
        dayMap[r.Date] = (dayMap[r.Date] || 0) + (Number(r["Total GST"]) || 0);
      });
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
      return Object.entries(dayMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([ds, total]) => ({
          week: new Date(ds + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short" }),
          total,
        }));
    }
  }, [branchData, salesViewMode, salesMonthFilter, salesYearFilter, monthWindow]);

  const tableData = useMemo(() => {
    const dateMap: Record<string, { total: number; credit: number; qr: number; cash: number }> = {};
    branchData.forEach(r => {
      const d = r.Date;
      if (!d) return;
      if (!dateMap[d]) dateMap[d] = { total: 0, credit: 0, qr: 0, cash: 0 };
      dateMap[d].total += Number(r["Total GST"]) || 0;
      dateMap[d].credit += Number(r.Credit) || 0;
      dateMap[d].qr += Number(r.QR) || 0;
      dateMap[d].cash += Number(r.Cash) || 0;
    });
    return Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [branchData]);

  const grandTotal = branchData.reduce((s, r) => s + (Number(r["Total GST"]) || 0), 0);
  const grandCredit = branchData.reduce((s, r) => s + (Number(r.Credit) || 0), 0);
  const grandQR = branchData.reduce((s, r) => s + (Number(r.QR) || 0), 0);
  const grandCash = branchData.reduce((s, r) => s + (Number(r.Cash) || 0), 0);

  const branchStyle = BRANCH_COLORS[branchName] || { color: "#A48D78", highlight: "#6B5545" };

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "hsl(var(--background))", zIndex: 100,
      display: "flex", flexDirection: "column",
      fontFamily: "Raleway, inherit",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0 20px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={onClose} title="Back" style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
            {branchName.toUpperCase()} SALES
          </button>
        </div>
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
      <div style={{ padding: "10px 20px 8px 20px", display: "flex", alignItems: "center", gap: "6px" }}>
        {salesViewMode === "month" ? (
          <span style={{ fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", letterSpacing: "0.04em" }}>12 Months</span>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setSalesMonthFilter("all"); }}
                style={{
                  background: "transparent", border: "none", padding: "0",
                  fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit",
                  cursor: "pointer", color: "hsl(var(--foreground))",
                  display: "flex", alignItems: "center", gap: "5px", letterSpacing: "0.04em",
                }}
              >
                {salesMonthFilter === "all" ? "All" : monthName(salesMonthFilter)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {}}
                style={{
                  background: "transparent", border: "none", padding: "0",
                  fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit",
                  cursor: "pointer", color: "hsl(var(--foreground))",
                  display: "flex", alignItems: "center", gap: "5px", letterSpacing: "0.04em",
                }}
              >
                {salesYearFilter}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", background: "hsl(var(--foreground) / 0.07)", borderRadius: "999px", padding: "3px 6px" }}>
          <div
            style={{
              position: "absolute", top: "3px", bottom: "3px", left: "6px",
              width: "calc((100% - 12px) / 3)",
              transform: `translateX(${["month", "week", "day"].indexOf(salesViewMode) * 100}%)`,
              transition: "transform 0.22s ease", borderRadius: "999px",
              background: "hsl(0 0% 98%)",
            }}
          />
          {["month", "week", "day"].map(mode => {
            const dayDisabled = mode === "day" && salesMonthFilter === "all";
            return (
              <button
                key={mode}
                onClick={() => { if (!dayDisabled) setSalesViewMode(mode); }}
                disabled={dayDisabled}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 16px 6px 16px" }}>
        {salesLoading ? (
          <div style={{ textAlign: "center", padding: "40px", fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))" }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px", flexShrink: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "#2a2a2a" }}>
                {branchName.toUpperCase()}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 300, color: "#2a2a2a", fontFamily: "Raleway, inherit" }}>
                RM {grandTotal.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ background: "#F2EDE6", borderRadius: "18px", padding: "4px 12px 8px 12px", minHeight: 220, maxHeight: 420, position: "relative" }}>
                style={{
                  position: "relative", zIndex: 1,
                  border: "none", background: "none",
                  cursor: dayDisabled ? "default" : "pointer",
                  width: "42px", padding: "4px 0",
                  fontSize: "9.5px", fontWeight: salesViewMode === mode ? 600 : 400,
                  letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit",
                  color: salesViewMode === mode ? "hsl(0 0% 10%)" : "hsl(var(--muted-foreground))",
                  opacity: dayDisabled ? 0.35 : 1,
                  transition: "color 0.2s ease",
              {chartData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "hsl(var(--muted-foreground))", fontSize: "12px", fontFamily: "Raleway, inherit" }}>No sales data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap={salesViewMode === "month" ? "25%" : salesViewMode === "week" ? (salesMonthFilter === "all" ? "8%" : "35%") : "10%"} margin={{ top: 14, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e8e8e8" strokeWidth={0.8} />
                    <XAxis
                      dataKey="week"
                      interval="preserveStart"
                      tick={{ fontSize: 10, fontFamily: "Raleway, inherit", fontWeight: 300, fill: "#888" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      ticks={[0, 5000, 10000, 15000, 20000, 25000, 30000]}
                      domain={[0, Math.max(30000, ...chartData.map(d => d.total)) * 1.1]}
                      interval={0}
                      tick={LeftAlignedYTick}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: any) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
                      width={30}
                    />
                    <Bar
                      dataKey="total"
                      isAnimationActive={false}
                      maxBarSize={salesViewMode === "month" ? 34 : salesViewMode === "week" ? (salesMonthFilter === "all" ? 52 : 22) : 52}
                      cursor="pointer"
                      shape={makeRoundedBar(branchStyle.color, branchStyle.highlight, salesViewMode === "day")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
                }}
              >
                {mode === "month" ? "Month" : mode === "week" ? "Week" : "Day"}
              </button>
            );
          })}
            <div style={{ marginTop: "16px", borderRadius: "12px", overflow: "hidden", border: "0.5px solid hsl(var(--border))" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "Raleway, inherit" }}>
                <thead>
                  <tr style={{ background: "hsl(var(--background) / 0.3)" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderBottom: "0.5px solid hsl(var(--border))", fontSize: "10px", textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderBottom: "0.5px solid hsl(var(--border))", fontSize: "10px", textTransform: "uppercase" }}>Total</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderBottom: "0.5px solid hsl(var(--border))", fontSize: "10px", textTransform: "uppercase" }}>Credit</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderBottom: "0.5px solid hsl(var(--border))", fontSize: "10px", textTransform: "uppercase" }}>QR</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderBottom: "0.5px solid hsl(var(--border))", fontSize: "10px", textTransform: "uppercase" }}>Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontStyle: "italic", fontSize: "12px" }}>No sales data</td>
                    </tr>
                  ) : (
                    tableData.map(row => (
                      <tr key={row.date} style={{ borderBottom: "0.5px solid hsl(var(--border) / 0.4)" }}>
                        <td style={{ padding: "7px 10px", color: "hsl(var(--foreground))", fontWeight: 300, whiteSpace: "nowrap", fontSize: "11px" }}>
                          {new Date(row.date).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: "hsl(var(--foreground))", fontWeight: 300, whiteSpace: "nowrap", fontSize: "11px" }}>
                          RM {row.total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: "hsl(var(--foreground))", fontWeight: 300, whiteSpace: "nowrap", fontSize: "11px" }}>
                          RM {row.credit.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: "hsl(var(--foreground))", fontWeight: 300, whiteSpace: "nowrap", fontSize: "11px" }}>
                          RM {row.qr.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: "hsl(var(--foreground))", fontWeight: 300, whiteSpace: "nowrap", fontSize: "11px" }}>
                          RM {row.cash.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: "hsl(var(--background) / 0.3)", fontWeight: 600 }}>
                    <td style={{ padding: "8px 10px", color: "hsl(var(--foreground))", fontSize: "10px", textTransform: "uppercase" }}>Total</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "hsl(var(--foreground))", fontSize: "10px" }}>RM {grandTotal.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "hsl(var(--foreground))", fontSize: "10px" }}>RM {grandCredit.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "hsl(var(--foreground))", fontSize: "10px" }}>RM {grandQR.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "hsl(var(--foreground))", fontSize: "10px" }}>RM {grandCash.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};