import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BRANCH_CONFIGS, type LogRow } from "@/lib/branchSimple";

interface DataLogManagerProps {
  /** Whether the panel is shown — owned by the host page (Office header menu). */
  open: boolean;
  /** Called when the panel requests to close (back arrow or title tap). */
  onClose: () => void;
  /** Called after a successful bulk deletion so the host page can refresh its own log views. */
  onDataChanged?: () => void;
}

/** AllFileLog.BRANCH values for the three branch tabs. */
type TabKey = "Boudoir" | "Chic Nailspa" | "Nur Yadi";

/** Tab labels: branch display names, word-capitalised (Boudoir / Chic / Nur Yadi). */
const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());

const TABS: { key: TabKey; label: string }[] =
  Object.values(BRANCH_CONFIGS).map(c => ({ key: c.logBranchName as TabKey, label: titleCase(c.displayName) }));

/** Column grid: Date | Product | Qty | Bal | Type | checkbox */
const GRID = "48px 1fr 36px 36px 54px 22px";

/** The window of data shown: 7 days including today. */
const DAYS_SHOWN = 7;

/** YYYY-MM-DD (UTC) — the same date convention every AllFileLog writer uses. */
const dateISO = (d: Date) => d.toISOString().split("T")[0];

const headerStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  fontFamily: "Raleway, inherit",
  color: "#000000",
  letterSpacing: "0.08em",
  textTransform: "capitalize",
};

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** DATE desc, newest id first within the same date. */
const sortRows = (list: LogRow[]): LogRow[] =>
  [...list].sort((a, b) => {
    const dateCmp = String(b.DATE ?? "").localeCompare(String(a.DATE ?? ""));
    return dateCmp !== 0 ? dateCmp : b.id - a.id;
  });

/**
 * DataLogManager — Office-page data-management utility for the AllFileLog table.
 *
 * Opened from the Office header's hamburger menu ("Supabase" entry); a
 * full-screen panel with one tab per branch (Boudoir / Chic / Nur Yadi)
 * showing that branch's raw log rows for the last 7 days (today inclusive). Rows are multi-selectable via
 * checkbox or row tap, and a footer action bar bulk-deletes the selected rows
 * straight from AllFileLog — deliberately WITHOUT any balance correction
 * (unlike the branch LogTable's reverse flow). Toasts report the outcome and
 * the table refreshes afterwards.
 */
export const DataLogManager = ({ open, onClose, onDataChanged }: DataLogManagerProps) => {
  // ── Data state (panel open state is owned by the host page) ────────────
  const [activeTab, setActiveTab] = useState<TabKey>("Boudoir");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  // ── Selection & deletion state ─────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch the active tab's log rows for the 7-day window (today inclusive),
  // newest first. Paginates 1000-row pages until the window is exhausted —
  // a branch's week of entries comfortably fits in a page or two.
  const fetchLog = useCallback(async () => {
    setLoading(true);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (DAYS_SHOWN - 1));
    let all: LogRow[] = [];
    let pageFrom = 0;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("AllFileLog")
        .select("*")
        .eq("BRANCH", activeTab)
        .gte("DATE", dateISO(fromDate))
        .lte("DATE", dateISO(new Date()))
        .order("DATE", { ascending: false })
        .range(pageFrom, pageFrom + 999);
      if (error) {
        sonnerToast.error("Could not load log", { description: error.message });
        break;
      }
      if (!data || data.length === 0) break;
      all = all.concat(data as LogRow[]);
      if (data.length < 1000) break;
      pageFrom += 1000;
    }
    setRows(sortRows(all));
    setLoading(false);
  }, [activeTab]);

  // Initial fetch + refetch on tab switch / open (also resets selection & scroll).
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    scrollRef.current?.scrollTo({ top: 0 });
    fetchLog();
  }, [fetchLog, open]);

  // ── Selection helpers ──────────────────────────────────────────────────
  const toggleRow = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  // ── Deletion ───────────────────────────────────────────────────────────
  // Direct bulk delete from AllFileLog — deliberately no balance correction.
  const deleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0 || deleting) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from("AllFileLog")
      .delete()
      .in("id", ids);
    setDeleting(false);
    if (error) {
      sonnerToast.error("Delete failed", { description: error.message });
      return;
    }
    sonnerToast.success("Deleted", {
      description: `${ids.length} row${ids.length === 1 ? "" : "s"} removed from the log.`,
    });
    setSelected(new Set());
    setConfirmOpen(false);
    fetchLog();
    onDataChanged?.();
  };

  // Tab buttons — identical styling to the OfficeLogTable view tabs.
  const renderTab = (tab: { key: TabKey; label: string }) => {
    const active = activeTab === tab.key;
    return (
      <button
        key={tab.key}
        onClick={() => setActiveTab(tab.key)}
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
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.opacity = "0.8"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.opacity = "0.6"; }}
      >
        {tab.label}
      </button>
    );
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        background: "hsl(var(--background))", color: "hsl(var(--foreground))",
        fontFamily: "'Raleway', sans-serif", display: "flex", flexDirection: "column",
      }}
    >
      {/* ── Panel header — title left-aligned, back arrow on the right ── */}
      <div style={{
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 12px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "0.5px solid hsl(var(--border))", flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          aria-label="Back"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontFamily: "'Raleway', sans-serif", color: "hsl(var(--foreground))",
            fontSize: "clamp(20px, 5.5vw, 26px)", fontWeight: 300,
            letterSpacing: "0.08em", lineHeight: 1.05, textAlign: "left",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          SUPABASE
        </button>
        <button
          onClick={onClose}
          aria-label="Back"
          title="Back"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", touchAction: "manipulation" }}
        >
          {/* Long left arrow — identical to the Search page's back arrow */}
          <svg width="36" height="16" viewBox="0 0 36 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="30" y1="8" x2="1" y2="8" />
            <polyline points="9,1 1,8 9,15" />
          </svg>
        </button>
      </div>

      {/* ── Scrollable table area (12px inset — same as the Office page) ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingLeft: "12px", paddingRight: "12px" }}>
        {/* Sticky header: branch tabs + column labels */}
        <div style={{ position: "sticky", top: 0, background: "hsl(var(--background))", zIndex: 10, display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "baseline", margin: "14px 0 14px" }}>
            {TABS.map(renderTab)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: "6px", paddingBottom: "8px", borderBottom: "0.5px solid hsl(var(--border))" }}>
            <div style={{ ...headerStyle }}>Date</div>
            <div style={{ ...headerStyle }}>Product</div>
            <div style={{ ...headerStyle, textAlign: "center" }}>Qty</div>
            <div style={{ ...headerStyle, textAlign: "center" }}>Bal</div>
            <div style={{ ...headerStyle }}>Type</div>
            <div />
          </div>
        </div>

        {/* Rows */}
        {loading && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading...</div>
        )}
        {!loading && rows.length === 0 && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>
        )}
        {!loading && rows.map((row, idx) => {
          const isSel = selected.has(row.id);
          const qty = row.QTY ?? 0;
          // Date grouping: the date only prints on the first row of each day —
          // repeated dates stay in the grid (invisible) to keep rows aligned.
          const showDate = idx === 0 || rows[idx - 1].DATE !== row.DATE;
          return (
            <div
              key={row.id}
              onClick={() => toggleRow(row.id)}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: "6px",
                padding: "8px 0",
                alignItems: "center",
                cursor: "pointer",
                borderBottom: "0.5px solid hsl(var(--border) / 0.4)",
                background: isSel ? "hsl(var(--muted) / 0.55)" : "transparent",
                borderRadius: isSel ? "10px" : "0",
                transition: "background 0.15s ease",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", visibility: showDate ? "visible" : "hidden" }}>
                {fmtDate(row.DATE)}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>
                {row["PRODUCT NAME"] || "—"}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: qty < 0 ? "hsl(0 70% 50%)" : qty > 0 ? "hsl(142 65% 38%)" : "hsl(var(--foreground))", textAlign: "center" }}>
                {qty > 0 ? "+" : ""}{qty}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>
                {row["ENDING BALANCE"] ?? "—"}
              </div>
              <div style={{ fontSize: "10px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.TYPE || "—"}
              </div>
              {/* Selection checkbox (right side; tap stops propagation — row tap also toggles) */}
              <span
                role="checkbox"
                aria-checked={isSel}
                onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }}
                style={{
                  width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${isSel ? "hsl(var(--foreground))" : "hsl(var(--border-active))"}`,
                  background: isSel ? "hsl(var(--foreground))" : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.12s ease, border-color 0.12s ease",
                }}
              >
                {isSel && <Check size={11} strokeWidth={3} color="hsl(var(--background))" />}
              </span>
            </div>
          );
        })}

        {/* Spacer keeps the last rows clear of the fixed footer action bar */}
        {selected.size > 0 && <div style={{ height: "84px" }} />}
      </div>

      {/* ── Footer action bar — appears only when rows are selected ── */}
      {selected.size > 0 && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 100001,
          background: "hsl(var(--background))",
          borderTop: "0.5px solid hsl(var(--border))",
          padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            style={{
              background: "hsl(var(--primary))", border: "none", borderRadius: "999px",
              padding: "9px 22px", cursor: deleting ? "default" : "pointer",
              fontFamily: "Raleway, sans-serif", fontSize: "12px", fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--primary-foreground))",
              opacity: deleting ? 0.6 : 1, WebkitTapHighlightColor: "transparent",
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "Raleway, inherit", letterSpacing: "0.02em" }}>
            {selected.size} row{selected.size === 1 ? "" : "s"} selected
          </span>
        </div>
      )}

      {/* ── Delete confirmation — rendered INSIDE the panel (an AlertDialog
             portal would land behind the panel's z-index 100000 overlay) ── */}
      {confirmOpen && (
        <div
          onClick={() => { if (!deleting) setConfirmOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100002,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px", fontFamily: "'Raleway', sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            style={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border-active))",
              borderRadius: "14px",
              padding: "20px",
              width: "100%", maxWidth: "360px",
              display: "flex", flexDirection: "column", gap: "14px",
              boxShadow: "0 20px 50px hsl(0 0% 0% / 0.3)",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "0.02em", color: "hsl(var(--foreground))" }}>
              Delete {selected.size} row{selected.size === 1 ? "" : "s"}?
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, lineHeight: 1.5, color: "hsl(var(--muted-foreground))" }}>
              Are you sure? This will remove the selected data permanently. Balances will not be recalculated.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                style={{
                  background: "none", border: "1px solid hsl(var(--border-active))",
                  borderRadius: "999px", padding: "8px 18px", cursor: "pointer",
                  fontFamily: "Raleway, sans-serif", fontSize: "12px", fontWeight: 400,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "hsl(var(--muted-foreground))", opacity: deleting ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={deleteSelected}
                disabled={deleting}
                style={{
                  background: "hsl(var(--primary))", border: "none", borderRadius: "999px",
                  padding: "8px 18px", cursor: deleting ? "default" : "pointer",
                  fontFamily: "Raleway, sans-serif", fontSize: "12px", fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "hsl(var(--primary-foreground))", opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DataLogManager;



