import { supabase } from "@/integrations/supabase/client";

// ── Sales data module ────────────────────────────────────────────
// Pure (non-visual) sales logic extracted from the SalesPanel component:
// types, constants, the Cash-table fetch, month-window maths and the
// week/day/month series builders. No JSX lives here.

export type SalesRow = { Branch: string; Date: string; "Total GST": number };
export type ViewMode = "month" | "week" | "day";

// ─── SALES HELPERS ───────────────────────────────────────────────
export const BRANCHES = [
  // Design palette: Desert Rock / Soft Sandstone / Mocha.
  // highlight = tonal step of the same palette, used in Day view for days over 5k.
  { key: "Boudoir", color: "#A48D78", highlight: "#6B5545" },      // Desert Rock (deep dark step)
  { key: "Chic Nailspa", color: "#CBB9A4", highlight: "#A48D78" }, // Soft Sandstone (Desert Rock step)
  { key: "Nur Yadi", color: "#B7A49C", highlight: "#9A867E" },     // Mocha (darkened step)
];

// Month (12 Months) view: fixed per-branch axis range [floor, ceiling] in RM.
// Months below the floor show as a small bump; months above the ceiling clamp
// flat at the top of the chart.
export const MONTH_AXIS_RANGE: Record<string, [number, number]> = {
  "Boudoir": [30000, 80000],
  "Chic Nailspa": [80000, 120000],
  "Nur Yadi": [30000, 80000],
};

export const monthName = (mm: string) => {
  return new Date(2000, Number(mm) - 1, 1).toLocaleString("default", { month: "long" });
};

export const monthNameShort = (mm: string) => {
  return new Date(2000, Number(mm) - 1, 1).toLocaleString("default", { month: "short" });
};

export const getMonday = (d: Date) => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
};

// Paginate to get all rows (Supabase default cap is 1000)
export const fetchAllSales = async (): Promise<SalesRow[]> => {
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
  return allSales;
};

// Earliest / latest "YYYY-MM" present in the Cash table — the chevron limits.
export const computeSalesRange = (salesData: SalesRow[]) => {
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
};

// "YYYY-MM" shifted by n months (used to slide the 12-month window).
export const addMonthsKey = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// ── Month mode: sliding 12-month window ─────────────────────────
// The window's last bar = anchor (defaults to the latest data month). Months
// earlier than the first data month are dropped, so fewer than 12 bars show
// when there is less history; back/forward slide the whole window by 1 month.
export const buildMonthWindow = (salesRange: { min: string; max: string } | null, anchorKey: string | null) => {
  if (!salesRange) return null;
  const anchor = anchorKey ?? salesRange.max;
  const start = addMonthsKey(anchor, -11);
  return {
    anchor,
    months: Array.from({ length: 12 }, (_, i) => addMonthsKey(start, i)).filter(k => k >= salesRange.min),
  };
};

// Blocked flags for the month-window chevrons: back is allowed only while the
// shifted window would still span a full 12 months; forward stops at the
// latest month that has data.
export const monthWindowBlocked = (
  salesRange: { min: string; max: string } | null,
  monthWindow: { anchor: string; months: string[] } | null
) => ({
  back: !salesRange || !monthWindow || monthWindow.anchor < addMonthsKey(salesRange.min, 12),
  fwd: !salesRange || !monthWindow || monthWindow.anchor >= salesRange.max,
});

// ── Series builders (pure) ───────────────────────────────────────
// Each takes the full Cash table plus the active filters / month window and
// returns the bar data for one branch.

export const buildWeeklyData = (salesData: SalesRow[], branch: string, salesYearFilter: string, salesMonthFilter: string) => {
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

export const buildDailyData = (salesData: SalesRow[], branch: string, salesYearFilter: string, salesMonthFilter: string) => {
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
export const buildMonthlyData = (salesData: SalesRow[], branch: string, monthWindow: { anchor: string; months: string[] } | null) => {
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
export const monthlyWindowTotal = (salesData: SalesRow[], branch: string, monthWindow: { anchor: string; months: string[] } | null) =>
  buildMonthlyData(salesData, branch, monthWindow).reduce((s, d) => s + d.total, 0);

export const salesGrandTotal = (salesData: SalesRow[], branch: string, salesYearFilter: string, salesMonthFilter: string) => {
  return salesData
    .filter(r => { const p = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`; return r.Branch === branch && (r.Date?.startsWith(p) ?? false); })
    .reduce((s, r) => s + (Number(r["Total GST"]) || 0), 0);
};
