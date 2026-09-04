import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sortLogByBalance } from "@/lib/branchSimpleUtils";

interface LogRow {
  id: number;
  DATE: string;
  "PRODUCT NAME": string;
  BRANCH: string;
  TYPE: string;
  SUPPLIER: string | null;
  QTY: number;
  GRN?: string;
  "OFFICE BALANCE"?: number;
  /** Per-line value (RM) used to total up each GRN group. */
  "TOTAL VALUE"?: number;
}

interface GrnGroup {
  grn: string;
  date: string;
  branch: string;
  supplier: string;
  rows: LogRow[];
}

type LogView = "all" | "branches" | "supplier";

interface OfficeLogTableProps {
  refreshTrigger?: number;
}

const allDataHeaderStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  fontFamily: "Raleway, inherit",
  color: "#000000",
  letterSpacing: "0.08em",
  textTransform: "capitalize",
};

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const LOG_PAGE_SIZE = 300;

const OfficeLogTable = ({ refreshTrigger }: OfficeLogTableProps) => {
  const [logRows, setLogRows] = useState<LogRow[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());
  const [logView, setLogView] = useState<LogView>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreBusy = useRef(false);

  // Fetch one page (start..start+PAGE-1) of Order rows, newest first.
  // append=false replaces the list (first load / refresh); append=true merges
  // the next page onto the end (infinite scroll) with dedupe, then re-applies
  // the canonical balance ordering.
  const fetchLog = useCallback(async (start: number, append: boolean) => {
    const { data } = await (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("TYPE", "Order")
      .order("DATE", { ascending: false })
      .range(start, start + LOG_PAGE_SIZE - 1);
    const batch: LogRow[] = data || [];
    const pageHasMore = batch.length === LOG_PAGE_SIZE;
    if (!append) {
      setLogRows(sortLogByBalance(batch, r => r["OFFICE BALANCE"]));
      setHasMore(pageHasMore);
      setLoadingLog(false);
      return;
    }
    setHasMore(pageHasMore);
    if (batch.length > 0) {
      setLogRows(prev =>
        sortLogByBalance(
          [...prev, ...batch.filter(b => !prev.some(p => p.id === b.id))],
          r => r["OFFICE BALANCE"]
        )
      );
    }
    setMoreLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLog(0, false);
  }, [fetchLog]);

  // Re-fetch when ImportPanel closes (refreshTrigger increments)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      setHasMore(true);
      fetchLog(0, false);
    }
  }, [refreshTrigger, fetchLog]);

  // Append the next page when the user scrolls near the bottom.
  const loadMore = async () => {
    if (moreBusy.current || !hasMore || loadingLog) return;
    moreBusy.current = true;
    setMoreLoading(true);
    await fetchLog(logRows.length, true);
    moreBusy.current = false;
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMore();
  };

  // View filter: Branches = office's own stock movements (SUPPLIER = "Office"),
  // Supplier = external supplier movements (SUPPLIER <> "Office").
  const visibleRows =
    logView === "all"
      ? logRows
      : logRows.filter(row =>
          logView === "branches" ? row.SUPPLIER === "Office" : row.SUPPLIER !== "Office"
        );

  const grnGroups: GrnGroup[] = (() => {
    const map = new Map<string, GrnGroup>();
    for (const row of visibleRows) {
      const grn = row.GRN || `no-grn-${row.id}`;
      if (!map.has(grn))
        map.set(grn, { grn, date: row.DATE, branch: row.BRANCH, supplier: row.SUPPLIER ?? "—", rows: [] });
      map.get(grn)!.rows.push(row);
    }
    return Array.from(map.values());
  })();

  const toggleGRN = (grn: string) => {
    setExpandedGRNs(prev => {
      const next = new Set(prev);
      next.has(grn) ? next.delete(grn) : next.add(grn);
      return next;
    });
  };

  const renderViewTab = (view: LogView, label: string) => {
    const active = logView === view;
    return (
      <button
        key={view}
        onClick={() => setLogView(view)}
        style={{
          background: "none",
          border: "none",
          borderBottom: `2px solid ${active ? "hsl(var(--foreground))" : "transparent"}`,
          cursor: "pointer",
          padding: "0 0 6px 0",
          fontSize: active ? "16px" : "14px",
          fontWeight: active ? 400 : 300,
          letterSpacing: "0.06em",
          fontFamily: "Raleway, inherit",
          color: "hsl(var(--foreground))",
          opacity: active ? 1 : 0.6,
          marginBottom: "-1px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.opacity = "0.8"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.opacity = "0.6"; }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0,
          background: "hsl(var(--background))",
          zIndex: 10, display: "flex", flexDirection: "column", width: "100%",
        }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "baseline", marginBottom: "18px" }}>
            {renderViewTab("all", "All Data")}
            {renderViewTab("branches", "Branches")}
            {renderViewTab("supplier", "Supplier")}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "54px 1fr 0.7fr 36px 36px 18px",
            gap: "6px", paddingBottom: "8px",
            borderBottom: "0.5px solid hsl(var(--border))", width: "100%",
          }}>
            <div style={{ ...allDataHeaderStyle }}>Date</div>
            <div style={{ ...allDataHeaderStyle }}>GRN</div>
            <div style={{ ...allDataHeaderStyle }}>Supplier</div>
            <div style={{ ...allDataHeaderStyle, textAlign: "center" }}>Items</div>
            <div style={{ ...allDataHeaderStyle, textAlign: "center", visibility: expandedGRNs.size > 0 ? "visible" : "hidden" }}>Bal</div>
            <div />
          </div>
        </div>

        {/* Rows */}
        {loadingLog && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading...</div>
        )}
        {!loadingLog && grnGroups.length === 0 && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>
        )}
        {!loadingLog && grnGroups.map((group, idx) => {
          const showDate = idx === 0 || grnGroups[idx - 1].date !== group.date;
          const isOpen = expandedGRNs.has(group.grn);
          // Sum the per-line TOTAL VALUE column across every row sharing this GRN.
          const totalValue = isOpen
            ? group.rows.reduce((sum, row) => sum + (Number(row["TOTAL VALUE"] ?? 0)), 0)
            : null;

          return (
            <div key={group.grn}>
              <div
                onClick={() => toggleGRN(group.grn)}
                style={{ display: "grid", gridTemplateColumns: "54px 1fr 0.7fr 36px 36px 18px", gap: "6px", padding: "9px 0", borderBottom: isOpen ? "none" : "0.5px solid hsl(var(--border) / 0.4)", cursor: "pointer", alignItems: "center" }}
              >
                <div style={{ fontSize: "14px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", visibility: showDate ? "visible" : "hidden" }}>{fmtDate(group.date)}</div>
                <div style={{ fontSize: "14px", fontWeight: isOpen ? 400 : 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>{group.grn}</div>
                <div style={{ fontSize: "14px", fontWeight: isOpen ? 400 : 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {group.supplier}
                </div>
                <div style={{ fontSize: "14px", fontWeight: isOpen ? 400 : 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{group.rows.length}</div>
                <div />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))" }}>
                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
              </div>

              {isOpen && (
                <div style={{ paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border) / 0.4)" }}>
                  {group.rows.map((row, idx) => {
                    const lineValue = Number(row["TOTAL VALUE"] ?? 0);
                    return (
                      <div key={row.id} style={{ display: "grid", gridTemplateColumns: "54px 1fr 0.7fr 36px 36px 18px", gap: "6px", padding: "5px 0", borderTop: idx > 0 ? "0.5px solid hsl(var(--border) / 0.25)" : "none", alignItems: "center" }}>
                        <div style={{ visibility: "hidden", fontSize: "14px", fontWeight: 400, fontFamily: "Raleway, inherit" }}>{fmtDate(group.date)}</div>
                        {/* Product name always spans the GRN + Supplier columns; its TOTAL VALUE is right-aligned inside the same cell when present */}
                        <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", gridColumn: "2 / 4", whiteSpace: "normal", wordBreak: "break-word", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", minWidth: 0 }}>
                          <span style={{ minWidth: 0 }}>{row["PRODUCT NAME"]}</span>
                          {lineValue > 0 && (
                            <span style={{ flexShrink: 0, color: "hsl(var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              RM {lineValue.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: (row.BRANCH || "").toLowerCase() === "office" ? "hsl(120 45% 30%)" : "hsl(0 60% 35%)", textAlign: "center" }}>
                          {(row.BRANCH || "").toLowerCase() === "office" ? `+${Math.abs(row.QTY)}` : `-${Math.abs(row.QTY)}`}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{row["OFFICE BALANCE"] ?? "—"}</div>
                        <div />
                      </div>
                    );
                  })}
                  {/* Total value footer — sum of the rows' TOTAL VALUE column, black text in the GRN column */}
                  {isOpen && totalValue !== null && totalValue > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 0.7fr 36px 36px 18px", gap: "6px", padding: "7px 0 9px 0", borderTop: "0.5px solid hsl(var(--border) / 0.25)", alignItems: "center" }}>
                      <div />
                      <div style={{ gridColumn: "2 / 4", fontSize: "13px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "#000000" }}>
                        Total Value: <span style={{ fontWeight: 700 }}>RM {totalValue.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {moreLoading && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading more…</div>
        )}
        {!hasMore && !loadingLog && logRows.length > 0 && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>End of history</div>
        )}
      </div>
    </div>
  );
};

export default OfficeLogTable;