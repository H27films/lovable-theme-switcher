import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { type LogRow, type OfficeProduct, type BranchConfig, BRANCH_CONFIGS } from "@/lib/branchSimple";
import { supabase } from "@/integrations/supabase/client";
import { therapistPillStyle, THERAPISTS } from "@/lib/branchSimpleUtils";
import { useBranchTherapists } from "@/hooks/useBranchTherapists";
import { EditEntryModal, type EditEntryUpdates } from "./EditEntryModal";

interface LogTableProps {
  rows: LogRow[];
  selectedProduct: any;
  onReverse: (row: LogRow) => void | Promise<void>;
  onUpdate?: (row: LogRow, updates: EditEntryUpdates) => void | Promise<void>;
  /** Called to change a row's therapist directly from the expanded row (pill cycling). */
  onTherapistChange?: (row: LogRow, therapist: string | null) => void | Promise<void>;
  viewType?: "all" | "usage" | "sale" | "orders";
  /** Called when the edit-entry modal opens (true) or closes (false). */
  onEditModalChange?: (open: boolean) => void;
  /** Branch displayName (e.g. "BOUDOIR") used to fetch the live therapist list for the edit modal. */
  branchDisplayName: string;
  /** The BRANCH value in AllFileLog used to filter the "orders" view (e.g. "Boudoir"). */
  branchLogName?: string;
  /** Optional element rendered in the last (therapist) header cell of the product view header. */
  headerAction?: React.ReactNode;
  /** Read-only mode: rows are not expandable, editable or deletable (used in compact past-data panels). */
  readOnly?: boolean;
  /** Render in page flow: no internal scrolling and no sticky header — the host page scrolls instead. */
  scrollWithPage?: boolean;
  /** Show the All / In / Out flow toggle above the column headers (past-data product view). */
  showFlowToggle?: boolean;
  /** Infinite scroll: called when the user scrolls near the bottom to load the next page of the branch log. */
  onLoadMore?: () => void;
  /** Infinite scroll: whether more pages are available from the host page. */
  hasMore?: boolean;
}

export const LogTable = ({ rows, selectedProduct, onReverse, onUpdate, onTherapistChange, viewType = "all", onEditModalChange, branchDisplayName, branchLogName = "", headerAction, readOnly = false, scrollWithPage = false, showFlowToggle = false, onLoadMore, hasMore = false }: LogTableProps) => {
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<LogRow | null>(null);
  const [confirmPos, setConfirmPos] = useState<{ top: number; left: number } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Therapist change staged on the expanded row: cycled locally, written to Supabase once on collapse
  const [pendingTherapist, setPendingTherapist] = useState<{ row: LogRow; value: string | null } | null>(null);
  const pendingTherapistRef = useRef<{ row: LogRow; value: string | null } | null>(null);
  const onTherapistChangeRef = useRef(onTherapistChange);
  onTherapistChangeRef.current = onTherapistChange;
  const [editRow, setEditRow] = useState<LogRow | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Infinite scroll state (branch log is appended by the host page via onLoadMore)
  const [moreLoading, setMoreLoading] = useState(false);
  const moreBusy = useRef(false);
  const branchTherapists = useBranchTherapists(branchDisplayName);

  // ── "orders" view state ─────────────────────────────────────────────
  const [ordersData, setOrdersData] = useState<LogRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersMoreLoading, setOrdersMoreLoading] = useState(false);
  const [ordersHasMore, setOrdersHasMore] = useState(true);
  const [expandedOrderGRNs, setExpandedOrderGRNs] = useState<Set<string>>(new Set());
  const ordersMoreBusy = useRef(false);
  const ordersScrollRef = useRef<HTMLDivElement>(null);
  const ORDERS_PAGE_SIZE = 300;

  // Fetch one page of this branch's Orders (newest first). The initial page-0
  // load replaces the list; later pages are appended for infinite scroll.
  const fetchOrdersPage = useCallback(async (start: number) => {
    const { data } = await (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("TYPE", "Order")
      .eq("BRANCH", branchLogName)
      .order("DATE", { ascending: false })
      .range(start, start + ORDERS_PAGE_SIZE - 1);
    return (data || []) as LogRow[];
  }, [branchLogName]);

  useEffect(() => {
    if (viewType !== "orders" || !branchLogName) return;
    let cancelled = false;
    setOrdersLoading(true);
    setOrdersMoreLoading(false);
    setOrdersHasMore(true);
    fetchOrdersPage(0).then((batch) => {
      if (cancelled) return;
      setOrdersData(batch);
      setOrdersHasMore(batch.length === ORDERS_PAGE_SIZE);
      setOrdersLoading(false);
    });
    return () => { cancelled = true; };
  }, [viewType, branchLogName, fetchOrdersPage]);

  // Append the next page of Orders when the list is scrolled to the bottom.
  const loadMoreOrders = async () => {
    if (ordersMoreBusy.current || !ordersHasMore || ordersLoading) return;
    ordersMoreBusy.current = true;
    setOrdersMoreLoading(true);
    const start = ordersData.length;
    const batch = await fetchOrdersPage(start);
    if (batch.length > 0) {
      const seen = new Set(ordersData.map(r => r.id));
      setOrdersData([...ordersData, ...batch.filter(r => !seen.has(r.id))]);
    }
    setOrdersHasMore(batch.length === ORDERS_PAGE_SIZE);
    setOrdersMoreLoading(false);
    ordersMoreBusy.current = false;
  };

  const handleOrdersScroll = () => {
    const el = ordersScrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMoreOrders();
  };

  // Infinite scroll for the main branch log (host page appends via onLoadMore).
  const handleMainScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) triggerLoadMore();
  };
  const triggerLoadMore = async () => {
    if (moreBusy.current || moreLoading || !onLoadMore || !hasMore) return;
    moreBusy.current = true;
    setMoreLoading(true);
    try {
      await onLoadMore();
    } finally {
      setMoreLoading(false);
      moreBusy.current = false;
    }
  };

  const toggleOrderGRN = (grn: string) => {
    setExpandedOrderGRNs(prev => {
      const next = new Set(prev);
      next.has(grn) ? next.delete(grn) : next.add(grn);
      return next;
    });
  };

  const orderGroups = (() => {
    const map = new Map<string, LogRow[]>();
    for (const row of ordersData) {
      const grn = row.GRN || `no-grn-${row.id}`;
      if (!map.has(grn)) map.set(grn, []);
      map.get(grn)!.push(row);
    }
    return Array.from(map.entries());
  })();

  // Row filtering per view type (rows are provided by the call site):
  // - "usage": only rows that are NOT a Customer, Staff or Order entry
  // - "sale":  only Customer or Staff entries
  // - "all":   no TYPE filtering
  // - "orders": fetches and renders its own rows above
  const displayRows = useMemo(() => {
    if (viewType === "usage") {
      return rows.filter(r => r.TYPE !== "Customer" && r.TYPE !== "Staff" && r.TYPE !== "Order");
    }
    if (viewType === "sale") {
      return rows.filter(r => r.TYPE === "Customer" || r.TYPE === "Staff");
    }
    return rows;
  }, [rows, viewType]);

  // ── Past-data flow toggle (All / In / Out) ────────────────────────────
  // In  -> Order/Transfer rows with QTY > 0 (stock arriving)
  // Out -> everything else: rows whose TYPE is neither Order nor Transfer,
  //        plus Transfers with QTY < 0 (stock leaving)
  const [flowMode, setFlowMode] = useState<"all" | "in" | "out">("all");
  useEffect(() => { setFlowMode("all"); }, [selectedProduct]);
  const flowRows = useMemo(() => {
    if (!showFlowToggle || flowMode === "all") return displayRows;
    if (flowMode === "in") {
      return displayRows.filter(r => {
        const type = (r.TYPE || "").trim().toUpperCase();
        return (type === "ORDER" || type === "TRANSFER") && Number(r.QTY) > 0;
      });
    }
    return displayRows.filter(r => {
      const type = (r.TYPE || "").trim().toUpperCase();
      return type !== "ORDER" && (type !== "TRANSFER" || Number(r.QTY) < 0);
    });
  }, [displayRows, flowMode, showFlowToggle]);

  // Therapist pill cycling (expanded rows): live therapist list with the same static fallback as the edit modal
  const therapistCycleList = branchTherapists.length > 0 ? branchTherapists : [...THERAPISTS];

  const therapistChanged = (row: LogRow, value: string | null) =>
    (row.THERAPIST || "").trim().toUpperCase() !== (value || "").trim().toUpperCase();

  // NONE → first therapist → … → last therapist → NONE → …
  // Cycling is local-only: the value is staged and written once when the row collapses.
  const cycleRowTherapist = (row: LogRow) => {
    if (therapistCycleList.length === 0) return;
    const order: (string | null)[] = [null, ...therapistCycleList];
    const staged = pendingTherapistRef.current && pendingTherapistRef.current.row.id === row.id
      ? pendingTherapistRef.current.value
      : row.THERAPIST;
    const current = (staged || "").trim().toUpperCase();
    const idx = current ? order.indexOf(current) : 0;
    const next = order[(idx + 1) % order.length];
    const pending = { row, value: next };
    pendingTherapistRef.current = pending;
    setPendingTherapist(pending);
  };

  // Write the staged therapist (if any) — called when the expanded row collapses
  const commitPendingTherapist = () => {
    const p = pendingTherapistRef.current;
    if (!p) return;
    pendingTherapistRef.current = null;
    setPendingTherapist(null);
    if (onTherapistChange && therapistChanged(p.row, p.value)) {
      void onTherapistChange(p.row, p.value);
    }
  };

  const discardPendingTherapist = () => {
    pendingTherapistRef.current = null;
    setPendingTherapist(null);
  };

  // Collapse / switch the expanded row, committing any staged therapist change first
  const changeExpandedRow = (id: number | null) => {
    commitPendingTherapist();
    setExpandedId(id);
  };

  const fmtOrderDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const fmtDayName = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { weekday: "short" });
  const fmtDayMonth = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  // Date column format for the all/usage/sale views: day + short month ("28 Aug", "3 Jan").
  // The day name ("Fri") is revealed below the date only when the row is expanded.
  const formatDate = (dateString: string) => fmtDayMonth(dateString);

  const handleConfirm = async (row: LogRow) => {
    const r = row;
    setConfirmRow(null);
    setConfirmPos(null);
    setDeleting(row.id);
    discardPendingTherapist();
    setExpandedId(null);
    try {
      await onReverse(r);

      // --- Start of new Supabase update logic ---
      const productName = r["PRODUCT NAME"];
      const quantity = r.QTY; // The quantity of the action being reversed
      const branchName = r.BRANCH;

      let balanceKey: keyof OfficeProduct | null = null;
      if (branchName === "Office") {
        balanceKey = "OFFICE BALANCE";
      } else {
        for (const key in BRANCH_CONFIGS) {
          if (BRANCH_CONFIGS[key as keyof typeof BRANCH_CONFIGS].logBranchName === branchName) {
            balanceKey = BRANCH_CONFIGS[key as keyof typeof BRANCH_CONFIGS].balanceKey;
            break;
          }
        }
      }

      if (balanceKey) {
        const isOrder = r.TYPE === "Order";
        const needsOfficeUpdate = isOrder && balanceKey !== "OFFICE BALANCE";
        const selectFields = needsOfficeUpdate 
          ? `"${balanceKey}", "PRODUCT NAME", "OFFICE BALANCE"` 
          : `"${balanceKey}", "PRODUCT NAME"`;

        // Fetch the current product record from AllFileProducts
        const { data, error } = await supabase
          .from("AllFileProducts")
          .select(selectFields)
          .eq("PRODUCT NAME", productName)
          .single();

        if (error) {
          console.error("Error fetching product for balance update:", error);
        } else if (data) {
          const currentBalance = data[balanceKey] ?? 0;
          const newBalance = (currentBalance as number) - quantity;
          
          const updates: any = { [balanceKey]: newBalance };

          if (needsOfficeUpdate) {
            const currentOfficeBalance = data["OFFICE BALANCE"] ?? 0;
            const newOfficeBalance = (currentOfficeBalance as number) + quantity;
            updates["OFFICE BALANCE"] = newOfficeBalance;
          }

          const { error: updateError } = await (supabase as any)
            .from("AllFileProducts")
            .update(updates)
            .eq("PRODUCT NAME", productName);

          if (updateError) {
            console.error("Error updating product balance:", updateError);
          } else {
            console.log(`Product balances for ${productName} updated successfully.`);
          }
        }
      } else {
        console.warn(`Could not find balanceKey for branch: ${branchName}`);
      }
      // --- End of new Supabase update logic ---

    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    if (expandedId === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        changeExpandedRow(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedId]);

  // Safety net: if the table unmounts while a row is expanded with a staged change, commit it
  useEffect(() => {
    return () => {
      const p = pendingTherapistRef.current;
      const cb = onTherapistChangeRef.current;
      if (p && cb && (p.row.THERAPIST || "").trim().toUpperCase() !== (p.value || "").trim().toUpperCase()) {
        void cb(p.row, p.value);
      }
      pendingTherapistRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify the parent when the edit modal opens/closes so the bottom nav can be hidden
  useEffect(() => {
    onEditModalChange?.(editRow !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRow]);

  return viewType === "orders" ? (
    <div ref={ordersScrollRef} onScroll={handleOrdersScroll} style={scrollWithPage ? { width: "100%", minWidth: 0 } : { flex: 1, overflowX: "hidden", overflowY: "auto", minHeight: 0, paddingBottom: "90px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>
        {/* Sticky header */}
        <div style={{ position: scrollWithPage ? "relative" : "sticky", top: scrollWithPage ? undefined : 0, zIndex: scrollWithPage ? undefined : 10, display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 22px", gap: "6px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))", background: scrollWithPage ? "transparent" : "hsl(var(--background))" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
          <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>GRN</div>
          <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Items</div>
          <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center", visibility: expandedOrderGRNs.size > 0 ? "visible" : "hidden" }}>Bal</div>
          <div />
        </div>

        {ordersLoading && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading...</div>
        )}
        {!ordersLoading && orderGroups.length === 0 && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>
        )}

        {!ordersLoading && orderGroups.map(([grn, grnRows]) => {
          const isOpen = expandedOrderGRNs.has(grn);
          const dateStr = fmtOrderDate(grnRows[0]?.DATE || "");
          return (
            <div key={grn}>
              <div
                onClick={() => toggleOrderGRN(grn)}
                style={{ display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 22px", gap: "6px", padding: "9px 0", borderBottom: "0.5px solid hsl(var(--border) / 0.4)", cursor: "pointer", alignItems: "center" }}
              >
                <div style={{ fontSize: "14px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{dateStr}</div>
                <div style={{ fontSize: "14px", fontWeight: isOpen ? 400 : 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{grn}</div>
                <div style={{ fontSize: "14px", fontWeight: isOpen ? 400 : 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{grnRows.length}</div>
                <div />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))" }}>
                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
              </div>

              {isOpen && (
                <div style={{ paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border) / 0.4)" }}>
                  {grnRows.map((row, idxRow) => (
                    <div key={row.id} style={{ display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 22px", gap: "6px", padding: "5px 0", borderTop: idxRow > 0 ? "0.5px solid hsl(var(--border) / 0.25)" : "none", alignItems: "center" }}>
                      <div style={{ visibility: "hidden", fontSize: "14px", fontWeight: 400, fontFamily: "Raleway, inherit" }}>{dateStr}</div>
                      <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>{row["PRODUCT NAME"]}</div>
                      <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(142 65% 38%)", textAlign: "center" }}>+{Math.abs(row.QTY ?? 0)}</div>
                      <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                      <div />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {ordersMoreLoading && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading more…</div>
        )}
        {!ordersHasMore && !ordersLoading && ordersData.length > 0 && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>End of history</div>
        )}
      </div>
    </div>
  ) : (
    <div ref={containerRef} onScroll={handleMainScroll} style={scrollWithPage ? { width: "100%", minWidth: 0 } : { flex: 1, overflowX: "hidden", overflowY: "auto", minHeight: 0, paddingBottom: "90px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>
        {showFlowToggle && (() => {
          const flowOrder = ["all", "in", "out"] as const;
          const activeIdx = flowOrder.indexOf(flowMode);
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Past Data</span>
                {headerAction}
              </div>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", background: "hsl(var(--foreground) / 0.07)", borderRadius: "999px", padding: "2px" }}>
                <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc((100% - 4px) / 3)", transform: `translateX(${activeIdx * 100}%)`, transition: "transform 0.22s ease", borderRadius: "999px", background: "hsl(0 0% 98%)" }} />
                {flowOrder.map(m => (
                  <button key={m} onClick={() => setFlowMode(m)} style={{ position: "relative", zIndex: 1, border: "none", background: "none", cursor: "pointer", width: "40px", padding: "2px 0", fontSize: "8.5px", fontWeight: flowMode === m ? 600 : 400, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: flowMode === m ? "hsl(0 0% 10%)" : "hsl(var(--muted-foreground))", transition: "color 0.2s ease" }}>
                    {m === "all" ? "All" : m}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        {selectedProduct ? (
          <div style={{ position: scrollWithPage ? "relative" : "sticky", top: scrollWithPage ? undefined : 0, zIndex: scrollWithPage ? undefined : 10, display: "grid", gridTemplateColumns: "50px 44px 52px 64px 64px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: scrollWithPage ? "0.5px solid hsl(var(--border) / 0.4)" : "1px solid hsl(var(--border) / 0.9)", background: scrollWithPage ? "transparent" : "hsl(var(--background))" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
            <div style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
            <div style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
            <div style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
            {/* Therapist column has no header — the name is shown as a pill; headerAction (e.g. minimise chevron) sits here */}
            {!showFlowToggle && headerAction ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>{headerAction}</div>
            ) : (
              <div />
            )}
          </div>
        ) : (
          <div style={{ position: scrollWithPage ? "relative" : "sticky", top: scrollWithPage ? undefined : 0, zIndex: scrollWithPage ? undefined : 10, display: "grid", gridTemplateColumns: "45px 1fr 28px 32px 70px", gap: "4px", paddingTop: "16px", paddingBottom: "10px", borderBottom: scrollWithPage ? "0.5px solid hsl(var(--border) / 0.4)" : "1px solid hsl(var(--border) / 0.9)", background: scrollWithPage ? "transparent" : "hsl(var(--background))" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
            <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>Product</div>
            <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
            <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
            <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
          </div>
        )}
        <div style={scrollWithPage ? undefined : { flex: 1, overflowY: "auto", minHeight: 0 }} onClick={() => changeExpandedRow(null)}>
          {showFlowToggle && flowRows.length === 0 && (
            <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>
          )}
          {flowRows.map((row, idx) => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const cutoff = new Date(today); cutoff.setDate(today.getDate() - 6);
            const dateStr = formatDate(row.DATE);
            // Compare against the DISPLAYED list (flowRows) so date grouping stays correct
            // in the filtered usage/sale views, not just in the unfiltered all view.
            const prevDateStr = idx > 0 ? formatDate(flowRows[idx - 1].DATE) : null;
            const showDate = dateStr !== prevDateStr;
            const dateSeparator = showDate && idx > 0;
            const nextDateStr = idx < flowRows.length - 1 ? formatDate(flowRows[idx + 1].DATE) : null;
            const isLastRowBeforeDateChange = nextDateStr !== null && nextDateStr !== dateStr;
            const isDeleting = deleting === row.id;
            const expanded = expandedId === row.id;
            const withinCutoff = (() => { const rd = new Date(row.DATE); rd.setHours(0, 0, 0, 0); return rd >= cutoff; })();
            const gridCols = selectedProduct ? "50px 44px 52px 64px 64px" : "45px 1fr 28px 32px 70px";
            const canCycleTherapist = !!onTherapistChange && withinCutoff;
            // Cycled therapist is staged locally until the row collapses; show it immediately on the pill
            const pillTherapist = pendingTherapist && pendingTherapist.row.id === row.id ? pendingTherapist.value : row.THERAPIST;

            return (
              <div key={row.id} style={{ borderBottom: (!dateSeparator && !isLastRowBeforeDateChange) ? "0.5px solid hsl(var(--border) / 0.5)" : "none" }}>
                <div
                  onClick={(e) => { if (readOnly) return; e.stopPropagation(); changeExpandedRow(expanded ? null : row.id); }}
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: gridCols, 
                    gap: "4px", 
                    padding: "8px 0", 
                    borderTop: dateSeparator ? (scrollWithPage ? "0.5px solid hsl(var(--border) / 0.4)" : "1px solid hsl(var(--border) / 0.9)") : "none", 
                    borderBottom: "none",
                    marginTop: dateSeparator ? "4px" : "0",  
                    alignItems: "start", 
                    cursor: readOnly ? "default" : "pointer" 
                  }}
                >
                  {selectedProduct ? (
                    <>
                      <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>{showDate ? dateStr : ""}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : row.QTY > 0 ? "hsl(142 65% 38%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
                      <div style={{ display: "flex", justifyContent: "center", minWidth: 0 }}>
                        {row.THERAPIST ? (
                          <span style={{ ...therapistPillStyle(row.THERAPIST, branchTherapists), padding: "2px 5px", borderRadius: "999px", fontSize: "8px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{row.THERAPIST}</span>
                        ) : (
                          <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}></span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>{showDate ? dateStr : ""}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>
                            {row["PRODUCT NAME"] || "—"}
                          </div>
                          {!expanded && (row as any)["THERAPIST"] && (
                            <span style={{
                              ...therapistPillStyle((row as any)["THERAPIST"], branchTherapists),
                              padding: "2px 6px",
                              borderRadius: "999px",
                              fontSize: "8px",
                              fontWeight: 600,
                              fontFamily: "Raleway, inherit",
                              textTransform: "uppercase",
                              letterSpacing: "0.02em"
                            }}>
                              {(row as any)["THERAPIST"]}
                            </span>
                          )}
                        </div>
                        {!expanded && (row as any)["NOTES"] && (
                          <span style={{ 
                            fontSize: "11px", 
                            fontWeight: 400, 
                            fontFamily: "Raleway, inherit", 
                            color: "hsl(var(--muted-foreground))",
                            lineHeight: 1.2
                          }}>
                            {(row as any)["NOTES"]}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : row.QTY > 0 ? "hsl(142 65% 38%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
                    </>
                  )}
                </div>
                {expanded && !readOnly && (
                  <div style={{ padding: "0 0 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "4px", alignItems: "center" }}>
                      {/* Day name sits in the Date column of the expanded row, level with the Edit / Delete pills */}
                      <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{fmtDayName(row.DATE)}</div>
                      {/* Edit / Delete buttons sit under the content columns (after the Date col): product view aligns under Qty (col 2), home view under Product (col 2) */}
                      <div style={{ gridColumn: selectedProduct ? "2 / 4" : "2 / 5", display: "flex", gap: "10px", alignItems: "center" }}>
                        {onUpdate && withinCutoff && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open the modal from the staged therapist (if one was cycled), then commit it
                              const stagedPending = pendingTherapist && pendingTherapist.row.id === row.id ? pendingTherapist : null;
                              commitPendingTherapist();
                              setEditRow(stagedPending ? { ...row, THERAPIST: stagedPending.value } : row);
                            }}
                            style={{ background: "hsl(var(--secondary))", color: "hsl(var(--secondary-foreground))", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase" }}
                          >
                            Edit
                          </button>
                        )}
                        {withinCutoff && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setConfirmPos({ top: rect.top, left: rect.left });
                              setConfirmRow(row);
                            }}
                            disabled={isDeleting}
                            style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))", border: "none", cursor: isDeleting ? "default" : "pointer", padding: "6px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase", opacity: isDeleting ? 0.5 : 1 }}
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                      {/* Colour-coded therapist pill, aligned under the Type column (col 4 on product view, col 5 on home view).
                          Click it to cycle therapists (… → NONE → first therapist → …) directly — same edit window as Edit / Delete. */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {canCycleTherapist && therapistCycleList.length > 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); cycleRowTherapist(row); }}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                          >
                            <span style={{ ...(pillTherapist ? therapistPillStyle(pillTherapist, therapistCycleList) : { background: "none", color: "hsl(var(--muted-foreground))", border: "0.5px dashed hsl(var(--border))" }), padding: "3px 8px", borderRadius: "999px", fontSize: "8px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{pillTherapist ? pillTherapist : "NONE"}</span>
                          </button>
                        ) : pillTherapist ? (
                          <span style={{ ...therapistPillStyle(pillTherapist, branchTherapists), padding: "3px 8px", borderRadius: "999px", fontSize: "8px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{pillTherapist}</span>
                        ) : (
                          <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}></span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {moreLoading && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading more…</div>
        )}
        {!hasMore && !moreLoading && onLoadMore && rows.length > 0 && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>End of history</div>
        )}
      </div>

      {editRow && onUpdate && (
        <EditEntryModal
          row={editRow}
          branchDisplayName={branchDisplayName}
          onSave={async (updates) => {
            await onUpdate(editRow, updates);
            setEditRow(null);
          }}
          onClose={() => setEditRow(null)}
        />
      )}

      {confirmRow && confirmPos && createPortal(
        <div 
          onClick={() => { setConfirmRow(null); setConfirmPos(null); }}
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1000, background: "rgba(0,0,0,0.1)" }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              position: "fixed", 
              top: Math.max(10, confirmPos.top - 40), 
              left: Math.min(window.innerWidth - 160, confirmPos.left), 
              background: "hsl(var(--background))", 
              border: "1px solid hsl(var(--border))", 
              borderRadius: "12px", 
              padding: "8px", 
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              zIndex: 1001
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit" }}>Are you sure?</span>
            <button 
              onClick={() => handleConfirm(confirmRow)}
              style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Check size={14} />
            </button>
            <button 
              onClick={() => { setConfirmRow(null); setConfirmPos(null); }}
              style={{ background: "hsl(var(--secondary))", color: "hsl(var(--secondary-foreground))", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};



