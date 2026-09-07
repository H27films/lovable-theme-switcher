import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type LogRow, type OfficeProduct, BRANCH_CONFIGS } from "@/lib/branchSimple";
import { supabase } from "@/integrations/supabase/client";
import { therapistPillStyle, THERAPISTS, LOG_PAGE_SIZE, LOG_MAX_ROWS } from "@/lib/branchSimpleUtils";
import { useBranchTherapists } from "@/hooks/useBranchTherapists";
import { EditEntryModal, type EditEntryUpdates } from "./EditEntryModal";
import { OrdersView } from "./LogTableSub/OrdersView";
import { FlowToggle } from "./LogTableSub/FlowToggle";
import { LogRowItem } from "./LogTableSub/LogRowItem";

interface LogTableProps {
  rows: LogRow[];
  selectedProduct: any;
  onReverse: (row: LogRow) => void | Promise<void>;
  onUpdate?: (row: LogRow, updates: EditEntryUpdates) => void | Promise<void>;
  /** Called to change a row's therapist directly from the expanded row (pill cycling). */
  onTherapistChange?: (row: LogRow, therapist: string | null) => void | Promise<void>;
  /** Called AFTER the delete + balance restore completes so the host page can refresh product state in the correct order. */
  onRestoreComplete?: (row: LogRow) => void | Promise<void>;
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

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDayName = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { weekday: "short" });
const fmtDayMonth = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const formatDate = (dateString: string) => fmtDayMonth(dateString);

export const LogTable = ({
  rows,
  selectedProduct,
  onReverse,
  onUpdate,
  onTherapistChange,
  onRestoreComplete,
  viewType = "all",
  onEditModalChange,
  branchDisplayName,
  branchLogName = "",
  headerAction,
  readOnly = false,
  scrollWithPage = false,
  showFlowToggle = false,
  onLoadMore,
  hasMore = false,
}: LogTableProps) => {
  // ── State ────────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<LogRow | null>(null);
  const [confirmPos, setConfirmPos] = useState<{ top: number; left: number } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<LogRow | null>(null);
  const [flowMode, setFlowMode] = useState<"all" | "in" | "out">("all");
  const [moreLoading, setMoreLoading] = useState(false);

  // Therapist staged change: cycled locally on the expanded row, written once on collapse
  const [pendingTherapist, setPendingTherapist] = useState<{ row: LogRow; value: string | null } | null>(null);
  const pendingTherapistRef = useRef<{ row: LogRow; value: string | null } | null>(null);
  const onTherapistChangeRef = useRef(onTherapistChange);
  onTherapistChangeRef.current = onTherapistChange;

  const containerRef = useRef<HTMLDivElement>(null);
  const mainSentinelRef = useRef<HTMLDivElement>(null);
  const moreBusy = useRef(false);
  const flowSwitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerLoadMoreRef = useRef<() => void>(() => {});

  const branchTherapists = useBranchTherapists(branchDisplayName);
  const therapistCycleList = branchTherapists.length > 0 ? branchTherapists : [...THERAPISTS];

  // ── Row filtering ────────────────────────────────────────────────────────
  const displayRows = useMemo(() => {
    if (viewType === "usage") return rows.filter((r) => r.TYPE !== "Customer" && r.TYPE !== "Staff" && r.TYPE !== "Order");
    if (viewType === "sale") return rows.filter((r) => r.TYPE === "Customer" || r.TYPE === "Staff");
    return rows;
  }, [rows, viewType]);

  // Reset flow mode when the focused product changes
  useEffect(() => { setFlowMode("all"); }, [selectedProduct]);

  const flowRows = useMemo(() => {
    if (!showFlowToggle || flowMode === "all") return displayRows;
    if (flowMode === "in") {
      return displayRows.filter((r) => {
        const type = (r.TYPE || "").trim().toUpperCase();
        return (type === "ORDER" || type === "TRANSFER") && Number(r.QTY) > 0;
      });
    }
    return displayRows.filter((r) => {
      const type = (r.TYPE || "").trim().toUpperCase();
      return type !== "ORDER" && (type !== "TRANSFER" || Number(r.QTY) < 0);
    });
  }, [displayRows, flowMode, showFlowToggle]);

  // ── Therapist cycling ────────────────────────────────────────────────────
  const therapistChanged = (row: LogRow, value: string | null) =>
    (row.THERAPIST || "").trim().toUpperCase() !== (value || "").trim().toUpperCase();

  const cycleRowTherapist = (row: LogRow) => {
    if (therapistCycleList.length === 0) return;
    const order: (string | null)[] = [null, ...therapistCycleList];
    const staged =
      pendingTherapistRef.current && pendingTherapistRef.current.row.id === row.id
        ? pendingTherapistRef.current.value
        : row.THERAPIST;
    const current = (staged || "").trim().toUpperCase();
    const idx = current ? order.indexOf(current) : 0;
    const next = order[(idx + 1) % order.length];
    const pending = { row, value: next };
    pendingTherapistRef.current = pending;
    setPendingTherapist(pending);
  };

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

  // ── Row expansion ────────────────────────────────────────────────────────
  const changeExpandedRow = (id: number | null) => {
    commitPendingTherapist();
    setExpandedId(id);
  };

  // Auto-collapse when view context switches
  useEffect(() => {
    commitPendingTherapist();
    setExpandedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, viewType, flowMode]);

  // Flow mode switch: collapse first, then swap filter after a short beat so
  // the collapse animation plays before the new list mounts.
  const changeFlowMode = (m: "all" | "in" | "out") => {
    if (m === flowMode) return;
    if (flowSwitchTimer.current) clearTimeout(flowSwitchTimer.current);
    commitPendingTherapist();
    setExpandedId(null);
    flowSwitchTimer.current = setTimeout(() => {
      flowSwitchTimer.current = null;
      setFlowMode(m);
    }, 150);
  };

  // Collapse when the user taps outside the table
  useEffect(() => {
    if (expandedId === null) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        changeExpandedRow(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expandedId]);

  // Safety net: commit staged therapist if the component unmounts mid-edit
  useEffect(() => {
    return () => {
      if (flowSwitchTimer.current) clearTimeout(flowSwitchTimer.current);
      const p = pendingTherapistRef.current;
      const cb = onTherapistChangeRef.current;
      if (p && cb && therapistChanged(p.row, p.value)) void cb(p.row, p.value);
      pendingTherapistRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when edit modal opens/closes (hides bottom nav)
  useEffect(() => {
    onEditModalChange?.(editRow !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRow]);

  // ── Infinite scroll ──────────────────────────────────────────────────────
  const triggerLoadMore = async () => {
    if (moreBusy.current || moreLoading || !onLoadMore || !hasMore) return;
    moreBusy.current = true;
    setMoreLoading(true);
    try { await onLoadMore(); }
    finally { setMoreLoading(false); moreBusy.current = false; }
  };
  triggerLoadMoreRef.current = triggerLoadMore;

  useEffect(() => {
    if (viewType === "orders") return;
    const sentinel = mainSentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) triggerLoadMoreRef.current(); },
      { rootMargin: "500px 0px 0px 0px", threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [viewType, flowMode, selectedProduct, onLoadMore, hasMore]);

  // ── Delete / restore ─────────────────────────────────────────────────────
  const handleConfirm = async (row: LogRow) => {
    setConfirmRow(null);
    setConfirmPos(null);
    setDeleting(row.id);
    discardPendingTherapist();
    setExpandedId(null);
    try {
      await onReverse(row);

      const productName = row["PRODUCT NAME"];
      const branchName = row.BRANCH;
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
        const isOrder = row.TYPE === "Order";
        const needsOfficeUpdate = isOrder && balanceKey !== "OFFICE BALANCE";
        const selectFields = needsOfficeUpdate
          ? `"${balanceKey}", "PRODUCT NAME", "OFFICE BALANCE"`
          : `"${balanceKey}", "PRODUCT NAME"`;

        const { data, error } = await (supabase as any)
          .from("AllFileProducts")
          .select(selectFields)
          .eq("PRODUCT NAME", productName)
          .limit(1);

        if (error) {
          console.error("Error fetching product for balance update:", error);
        } else if (data && data.length > 0) {
          const currentBalance = data[0][balanceKey] ?? 0;
          const updates: any = { [balanceKey]: (currentBalance as number) - row.QTY };
          if (needsOfficeUpdate) {
            updates["OFFICE BALANCE"] = ((data[0]["OFFICE BALANCE"] ?? 0) as number) + row.QTY;
          }
          const { error: updateError } = await (supabase as any)
            .from("AllFileProducts")
            .update(updates)
            .eq("PRODUCT NAME", productName);
          if (updateError) console.error("Error updating product balance:", updateError);
          else console.log(`Product balances for ${productName} updated successfully.`);
        }
      } else {
        console.warn(`Could not find balanceKey for branch: ${branchName}`);
      }

      if (onRestoreComplete) await onRestoreComplete(row);
    } finally {
      setDeleting(null);
    }
  };

  // ── View transition key ──────────────────────────────────────────────────
  const viewKey = viewType === "orders"
    ? "orders"
    : `${selectedProduct ? "product" : "log"}:${flowMode}`;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{
          width: "100%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          flex: scrollWithPage ? undefined : 1,
          overflow: "hidden",
        }}
      >
        {viewType === "orders" ? (
          // ── Orders view (fully self-contained) ──────────────────────────
          <OrdersView branchLogName={branchLogName} scrollWithPage={scrollWithPage} />
        ) : (
          // ── Main log view ────────────────────────────────────────────────
          <div
            ref={containerRef}
            style={
              scrollWithPage
                ? { width: "100%", minWidth: 0 }
                : { flex: 1, overflowX: "hidden", overflowY: "auto", minHeight: 0, paddingBottom: "76px" }
            }
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>

              {/* Flow toggle (past-data panel) */}
              {showFlowToggle && (
                <FlowToggle
                  flowMode={flowMode}
                  onChange={changeFlowMode}
                  headerAction={headerAction}
                />
              )}

              {/* Column headers */}
              {selectedProduct ? (
                <div
                  style={{
                    position: scrollWithPage ? "relative" : "sticky",
                    top: scrollWithPage ? undefined : 0,
                    zIndex: scrollWithPage ? undefined : 10,
                    display: "grid",
                    gridTemplateColumns: "50px 44px 52px 64px 64px",
                    gap: "4px",
                    paddingTop: "8px",
                    paddingBottom: "10px",
                    borderBottom: scrollWithPage
                      ? "0.5px solid hsl(var(--border) / 0.4)"
                      : "1px solid hsl(var(--border) / 0.9)",
                    background: scrollWithPage ? "transparent" : "hsl(var(--background))",
                  }}
                >
                  {["Date", "Qty", "Bal", "Type"].map((label) => (
                    <div key={label} style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: label === "Date" ? undefined : "center" }}>
                      {label}
                    </div>
                  ))}
                  {!showFlowToggle && headerAction ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>{headerAction}</div>
                  ) : (
                    <div />
                  )}
                </div>
              ) : (
                <div
                  style={{
                    position: scrollWithPage ? "relative" : "sticky",
                    top: scrollWithPage ? undefined : 0,
                    zIndex: scrollWithPage ? undefined : 10,
                    display: "grid",
                    gridTemplateColumns: "45px 1fr 28px 32px 70px",
                    gap: "4px",
                    paddingBottom: "10px",
                    borderBottom: scrollWithPage
                      ? "0.5px solid hsl(var(--border) / 0.4)"
                      : "1px solid hsl(var(--border) / 0.9)",
                    background: scrollWithPage ? "transparent" : "hsl(var(--background))",
                  }}
                >
                  {["Date", "Product", "Qty", "Bal", "Type"].map((label) => (
                    <div key={label} style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: label === "Date" || label === "Product" ? undefined : "center", whiteSpace: label === "Product" ? "normal" : undefined, wordBreak: label === "Product" ? "break-word" : undefined }}>
                      {label}
                    </div>
                  ))}
                </div>
              )}

              {/* Row list */}
              <div
                style={scrollWithPage ? undefined : { flex: 1, overflowY: "auto", minHeight: 0 }}
                onClick={() => changeExpandedRow(null)}
              >
                {showFlowToggle && flowRows.length === 0 && (
                  <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>
                    No entries
                  </div>
                )}

                {flowRows.map((row, idx) => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const cutoff = new Date(today); cutoff.setDate(today.getDate() - 6);
                  const rd = new Date(row.DATE); rd.setHours(0, 0, 0, 0);
                  const withinCutoff = rd >= cutoff;

                  return (
                    <LogRowItem
                    key={row.id}
                    row={row}
                    idx={idx}
                    flowRows={flowRows}
                    expanded={expandedId === row.id}
                    nextExpanded={idx < flowRows.length - 1 && flowRows[idx + 1].id === expandedId}
                      isDeleting={deleting === row.id}
                      selectedProduct={selectedProduct}
                      readOnly={readOnly}
                      scrollWithPage={scrollWithPage}
                      pendingTherapist={pendingTherapist}
                      branchTherapists={branchTherapists}
                      therapistCycleList={therapistCycleList}
                      withinCutoff={withinCutoff}
                      onUpdate={onUpdate}
                      formatDate={formatDate}
                      fmtDayName={fmtDayName}
                      onExpand={(id) => changeExpandedRow(id)}
                      onCollapse={() => changeExpandedRow(null)}
                      onEditClick={(r) => {
                        const stagedPending =
                          pendingTherapist && pendingTherapist.row.id === r.id
                            ? pendingTherapist
                            : null;
                        commitPendingTherapist();
                        setEditRow(stagedPending ? { ...r, THERAPIST: stagedPending.value } : r);
                      }}
                      onDeleteClick={(r, e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setConfirmPos({ top: rect.top, left: rect.left });
                        setConfirmRow(r);
                      }}
                      onCycleTherapist={cycleRowTherapist}
                    />
                  );
                })}

                {moreLoading && (
                  <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>
                    Loading more…
                  </div>
                )}
                {!hasMore && !moreLoading && onLoadMore && rows.length > 0 && (
                  <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>
                    End of history
                  </div>
                )}
                <div ref={mainSentinelRef} style={{ height: 1 }} />
              </div>
            </div>

            {/* Edit modal */}
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

            {/* Delete confirm portal */}
            {confirmRow && confirmPos &&
              createPortal(
                <div
                  onClick={() => { setConfirmRow(null); setConfirmPos(null); }}
                  style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1000, background: "rgba(0,0,0,0.1)" }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
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
                      zIndex: 1001,
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
        )}
      </motion.div>
    </AnimatePresence>
  );
};