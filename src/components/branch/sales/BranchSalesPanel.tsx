import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchAllSales,
  computeSalesRange,
  addMonthsKey,
  buildMonthWindow,
  monthWindowBlocked,
  type SalesRow,
  type ViewMode,
} from "@/components/office/sales/salesData";
import { SalesControls } from "@/components/office/sales/SalesControls";
import { SalesChartCard, type TappedBar } from "@/components/office/sales/SalesChartCard";

type Props = {
  branchName: string;
  onClose: () => void;
};

const BRANCH_COLORS: Record<string, { color: string; highlight: string }> = {
  "Boudoir": { color: "#A48D78", highlight: "#6B5545" },
  "Chic Nailspa": { color: "#CBB9A4", highlight: "#A48D78" },
  "Nur Yadi": { color: "#B7A49C", highlight: "#9A867E" },
};

export const BranchSalesPanel: React.FC<Props> = ({ branchName, onClose }) => {
  const [salesData, setSalesData] = useState<SalesRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesMonthFilter, setSalesMonthFilter] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [salesYearFilter, setSalesYearFilter] = useState<string>(
    String(new Date().getFullYear())
  );
  const [salesViewMode, setSalesViewMode] = useState<ViewMode>("day");
  const [salesMonthAnchor, setSalesMonthAnchor] = useState<string | null>(null);
  const [tappedBar, setTappedBar] = useState<TappedBar | null>(null);

  // Reset to week view when "All" months is selected
  useEffect(() => {
    if (salesMonthFilter === "all") setSalesViewMode("week");
  }, [salesMonthFilter]);

  // Per-branch data slice (used for table + range calculations).
  // Uses a case-insensitive, trimmed comparison because the DB may store
  // branch names inconsistently (e.g. "Boudoir" vs "BOUDOIR").
  const branchData = useMemo(() => {
    const target = branchName.trim().toLowerCase();
    return salesData.filter((r) => String(r.Branch ?? "").trim().toLowerCase() === target);
  }, [salesData, branchName]);
  const salesRange = useMemo(() => computeSalesRange(branchData), [branchData]);
  const monthWindow = useMemo(
    () => buildMonthWindow(salesRange, salesMonthAnchor),
    [salesRange, salesMonthAnchor]
  );
  const { back: monthBackBlocked, fwd: monthFwdBlocked } = useMemo(
    () => monthWindowBlocked(salesRange, monthWindow),
    [salesRange, monthWindow]
  );

  const prospectiveMonth = (dir: 1 | -1) => {
    let m = salesMonthFilter === "all" ? (dir === -1 ? 13 : 0) : parseInt(salesMonthFilter);
    let y = parseInt(salesYearFilter);
    m += dir;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (m < 1) {
      m = 12;
      y -= 1;
    }
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

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const data = await fetchAllSales();
      setSalesData(data);
    } catch {
      // ignore
    }
    setSalesLoading(false);
  }, []);

  useEffect(() => {
    if (salesData.length === 0) {
      fetchSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSales]);

  const branchColors = BRANCH_COLORS[branchName] || { color: "#A48D78", highlight: "#6B5545" };

  // ── Table data: per-date aggregation filtered by the active month/year ──
  const tablePrefix =
    salesMonthFilter === "all"
      ? salesYearFilter
      : `${salesYearFilter}-${salesMonthFilter}`;
  const filteredRows = useMemo(
    () => branchData.filter((r) => r.Date?.startsWith(tablePrefix)),
    [branchData, tablePrefix]
  );

  const tableData = useMemo(() => {
    const dateMap: Record<string, { total: number; credit: number; qr: number; cash: number }> = {};
    filteredRows.forEach((r) => {
      const d = r.Date;
      if (!d) return;
      if (!dateMap[d]) dateMap[d] = { total: 0, credit: 0, qr: 0, cash: 0 };
      dateMap[d].total += Number(r["Total GST"]) || 0;
      const rr = r as unknown as Record<string, unknown>;
      dateMap[d].credit += Number(rr.Credit) || 0;
      dateMap[d].qr += Number(rr.QR) || 0;
      dateMap[d].cash += Number(rr.Cash) || 0;
    });
    return Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [filteredRows]);

  const grandTotal = useMemo(
    () => filteredRows.reduce((s, r) => s + (Number(r["Total GST"]) || 0), 0),
    [filteredRows]
  );
  const grandCredit = useMemo(
    () => filteredRows.reduce((s, r) => {
      const rr = r as unknown as Record<string, unknown>;
      return s + (Number(rr.Credit) || 0);
    }, 0),
    [filteredRows]
  );
  const grandQR = useMemo(
    () => filteredRows.reduce((s, r) => {
      const rr = r as unknown as Record<string, unknown>;
      return s + (Number(rr.QR) || 0);
    }, 0),
    [filteredRows]
  );
  const grandCash = useMemo(
    () => filteredRows.reduce((s, r) => {
      const rr = r as unknown as Record<string, unknown>;
      return s + (Number(rr.Cash) || 0);
    }, 0),
    [filteredRows]
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "hsl(var(--background))",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Raleway, inherit",
      }}
    >
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

      {/* Chart + Table area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "10px 16px 6px 16px",
        }}
        onClick={() => setTappedBar(null)}
      >
        {salesLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              fontSize: "12px",
              fontWeight: 300,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            Loading...
          </div>
        )}
        {!salesLoading && (
          <>
            <SalesChartCard
              branchKey={branchName}
              color={branchColors.color}
              highlight={branchColors.highlight}
              salesData={salesData}
              viewMode={salesViewMode}
              monthFilter={salesMonthFilter}
              yearFilter={salesYearFilter}
              monthWindow={monthWindow}
              tappedBar={tappedBar}
              setTappedBar={setTappedBar}
            />

            {/* Borderless table — matches branch table styling (no grid lines) */}
            <div style={{ marginTop: "12px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "Raleway, inherit",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 500, color: "hsl(var(--foreground))", fontSize: "13px", fontFamily: "Raleway, inherit" }}>Date</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 500, color: "hsl(var(--foreground))", fontSize: "13px", fontFamily: "Raleway, inherit" }}>Total</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 500, color: "hsl(var(--foreground))", fontSize: "13px", fontFamily: "Raleway, inherit" }}>Credit</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 500, color: "hsl(var(--foreground))", fontSize: "13px", fontFamily: "Raleway, inherit" }}>QR</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 500, color: "hsl(var(--foreground))", fontSize: "13px", fontFamily: "Raleway, inherit" }}>Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontStyle: "italic", fontSize: "12px" }}>No sales data</td>
                    </tr>
                  ) : (
                    tableData.map((row) => (
                      <tr key={row.date}>
                        <td style={{ padding: "7px 10px", textAlign: "left", color: "hsl(var(--foreground))", fontWeight: 300, fontSize: "13px", fontFamily: "Raleway, inherit" }}>
                          {new Date(row.date).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", color: "hsl(var(--foreground))", fontWeight: 300, fontSize: "11px", fontFamily: "Raleway, inherit", whiteSpace: "nowrap" }}>
                          RM {row.total.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", color: "hsl(var(--foreground))", fontWeight: 300, fontSize: "11px", fontFamily: "Raleway, inherit", whiteSpace: "nowrap" }}>
                          RM {row.credit.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", color: "hsl(var(--foreground))", fontWeight: 300, fontSize: "11px", fontFamily: "Raleway, inherit", whiteSpace: "nowrap" }}>
                          RM {row.qr.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", color: "hsl(var(--foreground))", fontWeight: 300, fontSize: "11px", fontFamily: "Raleway, inherit", whiteSpace: "nowrap" }}>
                          RM {row.cash.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: "hsl(var(--background) / 0.3)", fontWeight: 600 }}>
                    <td style={{ padding: "8px 10px", textAlign: "left", color: "hsl(var(--foreground))", fontSize: "13px", fontFamily: "Raleway, inherit" }}>Total</td>
                    <td style={{ padding: "8px 8px", textAlign: "center", color: "hsl(var(--foreground))", fontSize: "11px", fontFamily: "Raleway, inherit", whiteSpace: "nowrap" }}>RM {grandTotal.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: "8px 8px", textAlign: "center", color: "hsl(var(--foreground))", fontSize: "11px", fontFamily: "Raleway, inherit", whiteSpace: "nowrap" }}>RM {grandCredit.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: "8px 8px", textAlign: "center", color: "hsl(var(--foreground))", fontSize: "11px", fontFamily: "Raleway, inherit", whiteSpace: "nowrap" }}>RM {grandQR.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: "8px 8px", textAlign: "center", color: "hsl(var(--foreground))", fontSize: "11px", fontFamily: "Raleway, inherit", whiteSpace: "nowrap" }}>RM {grandCash.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
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
