import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import {
  MONTH_AXIS_RANGE,
  buildMonthlyData,
  buildWeeklyData,
  buildDailyData,
  monthlyWindowTotal,
  salesGrandTotal,
} from "./salesData";
import type { SalesRow, ViewMode } from "./salesData";

export type TappedBar = { branchKey: string; label: string; total: number };

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

interface SalesChartCardProps {
  branchKey: string;
  color: string;
  highlight: string;
  salesData: SalesRow[];
  viewMode: ViewMode;
  monthFilter: string;
  yearFilter: string;
  monthWindow: { anchor: string; months: string[] } | null;
  tappedBar: TappedBar | null;
  setTappedBar: (t: TappedBar | null) => void;
}

export const SalesChartCard = ({ branchKey: key, color, highlight, salesData, viewMode, monthFilter, yearFilter, monthWindow, tappedBar, setTappedBar }: SalesChartCardProps) => {
  const data = viewMode === "month" ? buildMonthlyData(salesData, key, monthWindow) : viewMode === "week" ? buildWeeklyData(salesData, key, yearFilter, monthFilter) : buildDailyData(salesData, key, yearFilter, monthFilter);
    const total = viewMode === "month" ? monthlyWindowTotal(salesData, key, monthWindow) : salesGrandTotal(salesData, key, yearFilter, monthFilter);
  return (
    <div style={{ flex: 1, minHeight: 110, maxHeight: 210, display: "flex", flexDirection: "column", background: "#F2EDE6", borderRadius: "18px", padding: "10px 12px 8px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px", flexShrink: 0 }}>
        <span style={{ fontSize: "13px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "#2a2a2a" }}>
          {({ "Boudoir": "BOUDOIR", "Chic Nailspa": "CHIC NAILSPA", "Nur Yadi": "NUR YADI" } as Record<string, string>)[key] ?? key.toUpperCase()}
        </span>
        <span style={{ fontSize: "14px", fontWeight: 300, color: "#2a2a2a", fontFamily: "Raleway, inherit", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "8px" }}>{total == null ? "—" : `RM ${total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
      </div>
            {(() => {
        if (data.length === 0) {
          return <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300, padding: "12px 0" }}>No data</div>;
        }
        let topTick: number;
        let yTicks: number[];
        let domain: [number, number];
        let chartData: typeof data;
        let monthlyAvg: number | null = null;
        let weeklyAvg: number | null = null;

        if (viewMode === "month") {
          const maxVal = data.reduce((m: number, d: any) => Math.max(m, d.total || 0), 0);
          const range = MONTH_AXIS_RANGE[key as keyof typeof MONTH_AXIS_RANGE] ?? [50000, 100000];
          const [floor] = range;
          topTick = Math.ceil(Math.max(maxVal, floor) / 50000) * 50000;
          yTicks = Array.from({ length: (topTick - floor) / 50000 + 1 }, (_, i) => floor + i * 50000);
          domain = [floor, topTick];
          const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
          const avgVals = data.filter((d: any) => d.total > 0 && d.key !== nowKey).map((d: any) => d.total);
          if (avgVals.length > 0) {
            monthlyAvg = avgVals.reduce((s: number, v: number) => s + v, 0) / avgVals.length;
            if (monthlyAvg < floor) monthlyAvg = null;
          }
          const bump = floor + (topTick - floor) * 0.03;
          chartData = data.map((d: any) => ({ ...d, plot: d.total < 1000 ? floor : Math.max(bump, Math.min(d.total, topTick)) }));
                } else if (viewMode === "day") {
          const allVals = data.map((d: any) => d.total);
          const maxVal = Math.max(...allVals, 0);
          if (maxVal > 0) {
            chartData = data;
            topTick = Math.max(maxVal, 1);
            yTicks = [0, topTick];
            domain = [0, topTick];
          } else {
            chartData = data;
            topTick = 10000;
            yTicks = [0, 5000, 10000];
            domain = [0, topTick];
          }
        } else {
          const maxVal = data.reduce((m: number, d: any) => Math.max(m, d.total || 0), 0);
          topTick = Math.ceil(Math.max(maxVal, 5000) / 5000) * 5000;
          yTicks = Array.from({ length: topTick / 5000 + 1 }, (_, i) => i * 5000);
          domain = [0, topTick];
          chartData = data;
          const prefix = monthFilter === "all" ? yearFilter : `${yearFilter}-${monthFilter}`;
          const filtered = salesData.filter(r => r.Branch === key && r.Date?.startsWith(prefix));
          if (filtered.length >= 2) {
            const dates = filtered.map(r => new Date(r.Date + "T00:00:00").getTime());
            const days = Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1);
            const sum = filtered.reduce((s, r) => s + (Number(r["Total GST"]) || 0), 0);
            weeklyAvg = sum / days * 7;
          }
        }

        const dataKey = viewMode === "month" ? "plot" : "total";
                const maxBarSize = viewMode === "month" ? 34 : viewMode === "week" ? (monthFilter === "all" ? 52 : 22) : 52;

        return (
          <div style={{ position: "relative", flex: 1 }} onClick={(e) => e.stopPropagation()}>
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
              <BarChart data={chartData} barCategoryGap={viewMode === "month" ? "25%" : viewMode === "week" ? (monthFilter === "all" ? "8%" : "35%") : "10%"} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                  tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
                  width={30}
                />
                <Bar
                  dataKey={dataKey}
                  isAnimationActive={false}
                  maxBarSize={maxBarSize}
                  cursor="pointer"
                  shape={makeRoundedBar(color, highlight, viewMode === "day")}
                  onClick={(barData: any) => {
                    const barLabel = barData.period ?? barData.week;
                    if (tappedBar?.branchKey === key && tappedBar?.label === barLabel) {
                      setTappedBar(null);
                    } else {
                      setTappedBar({ branchKey: key, label: barLabel, total: barData.total });
                    }
                  }}
                />
                {viewMode === "week" && weeklyAvg !== null && (
                  <ReferenceLine y={weeklyAvg} stroke="#888" strokeDasharray="4 3" strokeWidth={1} />
                )}
                {viewMode === "month" && monthlyAvg !== null && (
                  <ReferenceLine y={monthlyAvg} stroke="#888" strokeDasharray="4 3" strokeWidth={1} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
    </div>
  );
};
