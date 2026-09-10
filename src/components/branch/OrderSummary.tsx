import { X, ArrowDown, MoreVertical, FileText, Download } from "lucide-react";
import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import { type BranchConfig } from "@/lib/branchSimple";
import { generateGRNPdf, exportToExcel } from "@/lib/grn";

// Shape of a submitted-but-unconfirmed order, persisted per branch until it is
// confirmed (written to AllFileLog) or reset. Owned by OrderPanel.
export type PersistedPendingOrder = {
  grn: string;
  date: string;
  entries: { id: number; productName: string; starting: number; qty: number; ending: number }[];
  notes?: string;
};

interface OrderSummaryProps {
  pendingOrder: PersistedPendingOrder;
  setPendingOrder: Dispatch<SetStateAction<PersistedPendingOrder | null>>;
  grnNotes: string;
  setGrnNotes: Dispatch<SetStateAction<string>>;
  orderConfirming: boolean;
  orderError: string | null;
  config: BranchConfig;
  onConfirm: () => void;
  onReset: () => void;
  /** Top offset (px) for the expanded overlay sheet — pass the measured ORDER title-row
      bottom so the expanded summary covers the page from just below the header. */
  overlayTop?: number;
}

// ⋮ export-menu animation timings — copied from the branch header hamburger menu.
const MENU_ENTRY_STAGGER_MS = 50;
const MENU_EXIT_STAGGER_MS = 40;
const MENU_EXIT_DURATION_MS = 200;

// "Order Summary" block of the Order panel, shown while a submitted order is
// awaiting confirmation: GRN header, editable quantity rows, notes textarea,
// confirm/reset actions and the GRN PDF / Excel export pair. Collapsed it is a
// slim bar pinned above the Past Orders row; expanded (with overlayTop) it renders
// as a full-height overlay sheet covering everything below the ORDER header.
export const OrderSummary = ({
  pendingOrder, setPendingOrder, grnNotes, setGrnNotes, orderConfirming, orderError, config, onConfirm, onReset, overlayTop
}: OrderSummaryProps) => {
  const [expanded, setExpanded] = useState(false);
  const [editingPendingIdx, setEditingPendingIdx] = useState<number | null>(null);
  const [editingPendingQty, setEditingPendingQty] = useState("");

  // ⋮ export menu (GRN PDF / Export) — same staggered floating-pill dropdown as the
  // branch header's hamburger: "closed" → unmounted; "open" → staggered pop-in;
  // "closing" → reverse staggered collapse, then unmount.
  const [exportMenuState, setExportMenuState] = useState<"closed" | "open" | "closing">("closed");
  const exportMenuTimerRef = useRef<number | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  /** Collapse the menu in reverse stagger order, then unmount. */
  const closeExportMenu = () => {
    if (exportMenuState !== "open") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setExportMenuState("closed");
      return;
    }
    setExportMenuState("closing");
    exportMenuTimerRef.current = window.setTimeout(() => {
      exportMenuTimerRef.current = null;
      setExportMenuState("closed");
    }, MENU_EXIT_DURATION_MS);
  };

  /** Open the menu (cancels a pending collapse if re-opened mid-close). */
  const openExportMenu = () => {
    if (exportMenuTimerRef.current !== null) {
      window.clearTimeout(exportMenuTimerRef.current);
      exportMenuTimerRef.current = null;
    }
    setExportMenuState("open");
  };

  // Click outside the ⋮ menu closes it.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) closeExportMenu();
    };
    if (exportMenuState === "open") document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportMenuState]);

  // Clear a pending collapse timer if the summary unmounts mid-animation.
  useEffect(() => () => {
    if (exportMenuTimerRef.current !== null) window.clearTimeout(exportMenuTimerRef.current);
  }, []);

  // Starts collapsed: a slim bar pinned above the Past Orders row showing the
  // product count. Tapping it expands the full summary; tapping the header
  // row of the expanded summary collapses it back down.
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", borderTop: "0.5px solid hsl(var(--border, 0 0% 50%))", borderBottom: "0.5px solid hsl(var(--border, 0 0% 50%))", cursor: "pointer", padding: "12px", textAlign: "left" }}
      >
        <span style={{ fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))" }}>Order Summary</span>
        <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))" }}>{pendingOrder.entries.length} {pendingOrder.entries.length === 1 ? "Product" : "Products"}</span>
      </button>
    );
  }

  // The two export actions shown in the ⋮ popup.
  const exportItems = [
    { key: "grn", label: "GRN PDF", icon: FileText, onSelect: () => generateGRNPdf(pendingOrder.entries, pendingOrder.grn, config, grnNotes) },
    { key: "export", label: "Export", icon: Download, onSelect: () => exportToExcel(pendingOrder.entries, config, pendingOrder.date) },
  ];

  // Expanded: overlay sheet mode (when overlayTop is provided) covers the panel from just
  // below the ORDER title row down — over the Select Product row, the order lines, the
  // submit footer and the Past Orders / Low Balance footer. Falls back to the original
  // in-flow expanding block when no overlayTop is given.
  const overlay = overlayTop != null && overlayTop > 0;
  return (
    <div style={overlay ? {
      position: "absolute", top: overlayTop, left: 0, right: 0, bottom: 0, zIndex: 60,
      background: "hsl(var(--background, 0 0% 0%))",
      display: "flex", flexDirection: "column",
      paddingLeft: "12px", paddingRight: "12px", paddingTop: "16px",
    } : {
      flexShrink: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingLeft: "12px", paddingRight: "12px", borderTop: "0.5px solid hsl(var(--border, 0 0% 50%))", paddingTop: "20px", paddingBottom: "8px",
    }}>
      {/* Scrollable content — everything above the pinned footer */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Header row — GRN sits right next to the title; the down arrow on the right is
          the collapse affordance (tapping anywhere on the row minimises the summary). */}
      <div onClick={() => setExpanded(false)} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px", cursor: "pointer" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}>
          <div style={{ fontSize: "22px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "-0.02em" }}>Order Summary</div>
          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))", letterSpacing: "0.08em", flexShrink: 0 }}>{pendingOrder.grn}</div>
        </span>
        <ArrowDown size={16} strokeWidth={2} style={{ color: "hsl(var(--foreground, 0 0% 100%) / 0.6)", flexShrink: 0 }} />
      </div>
      <div style={{ fontSize: "11px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))", textTransform: "uppercase", marginBottom: "16px" }}>
        Tap qty to edit
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 56px 48px 20px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border, 0 0% 50%))", paddingBottom: "8px", marginBottom: "4px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", letterSpacing: "0.02em" }}>Product</div>
        <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", letterSpacing: "0.02em", textAlign: "center" }}>Cur Bal</div>
        <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", letterSpacing: "0.02em", textAlign: "center" }}>Qty</div>
        <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", letterSpacing: "0.02em", textAlign: "center" }}>End Bal</div>
        <div />
      </div>
      {pendingOrder.entries.map((entry, idx) => {
        const isEditing = editingPendingIdx === idx;
        const parsedEdit = parseInt(editingPendingQty);
        const displayQty = isEditing && !isNaN(parsedEdit) && parsedEdit > 0 ? parsedEdit : entry.qty;
        return (
          <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr 48px 56px 48px 20px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border, 0 0% 50%))", padding: "8px 0", alignItems: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", wordBreak: "break-word" }}>{entry.productName}</div>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))", textAlign: "center" }}>{entry.starting}</div>
            <div style={{ textAlign: "center" }}>
              {isEditing ? (
                <input
                  type="number"
                  value={editingPendingQty}
                  onChange={e => setEditingPendingQty(e.target.value)}
                  onBlur={() => {
                    if (!isNaN(parsedEdit) && parsedEdit > 0) {
                      setPendingOrder(prev => {
                        if (!prev) return prev;
                        const entries = prev.entries.map((e, i) => i === idx ? { ...e, qty: parsedEdit, ending: e.starting + parsedEdit } : e);
                        return { ...prev, entries };
                      });
                    }
                    setEditingPendingIdx(null);
                    setEditingPendingQty("");
                  }}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setEditingPendingIdx(null); setEditingPendingQty(""); } }}
                  autoFocus
                  style={{ width: "44px", textAlign: "center", fontSize: "13px", fontFamily: "Raleway, inherit", fontWeight: 300, background: "none", border: "0.5px solid hsl(var(--border, 0 0% 50%))", color: "hsl(var(--foreground, 0 0% 100%))", padding: "2px", outline: "none" }}
                />
              ) : (
                <span onClick={() => { setEditingPendingIdx(idx); setEditingPendingQty(String(entry.qty)); }} style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(120 60% 40%)", cursor: "pointer", display: "inline-block", minWidth: "32px" }}>+{entry.qty}</span>
              )}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", textAlign: "center" }}>{entry.starting + displayQty}</div>
            <button onClick={() => { setPendingOrder(prev => { if (!prev) return prev; const entries = prev.entries.filter((_, i) => i !== idx); return entries.length === 0 ? null : { ...prev, entries }; }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground, 0 0% 50%))", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 70% 50%)")} onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground, 0 0% 50%))")}><X size={11} /></button>
          </div>
        );
      })}
      <div style={{ marginTop: "16px", marginBottom: "16px" }}>
        <textarea value={grnNotes} onChange={e => setGrnNotes(e.target.value)} placeholder="Add notes (optional)" rows={2} style={{ width: "100%", background: "hsl(var(--card, 0 0% 10%))", border: "0.5px solid hsl(var(--border, 0 0% 50%))", color: "hsl(var(--foreground, 0 0% 100%))", fontSize: "13px", fontFamily: "Raleway, inherit", fontWeight: 300, padding: "8px", resize: "none", outline: "none", boxSizing: "border-box" }} />
      </div>
      {orderError && <div style={{ fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em", marginBottom: "8px" }}>✗ {orderError}</div>}
      </div>

      {/* Pinned footer of the expanded sheet — Confirm Order / Reset on the left, the ⋮
          export menu on the right (opens upward with the same staggered floating pills
          as the branch header's hamburger dropdown). */}
      <div style={{ flexShrink: 0, paddingTop: "12px", paddingBottom: overlay ? "max(env(safe-area-inset-bottom, 8px), 8px)" : "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={onConfirm} disabled={orderConfirming} style={{ background: "hsl(var(--foreground, 0 0% 100%))", color: "hsl(var(--background, 0 0% 0%))", border: "none", borderRadius: "6px", cursor: orderConfirming ? "default" : "pointer", padding: "10px 18px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", opacity: orderConfirming ? 0.5 : 1 }}>{orderConfirming ? "Saving..." : "Confirm Order"}</button>
          <button onClick={onReset} style={{ background: "hsl(var(--foreground, 0 0% 100%))", color: "hsl(var(--background, 0 0% 0%))", border: "none", borderRadius: "6px", cursor: "pointer", padding: "10px 18px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit" }}>Reset</button>
        </div>

        <div ref={exportMenuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => (exportMenuState === "open" ? closeExportMenu() : openExportMenu())} aria-label="Export options" aria-expanded={exportMenuState === "open"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground, 0 0% 100%))" }}>
            <MoreVertical size={22} />
          </button>

          {exportMenuState !== "closed" && (
            /* Same iOS segmented floating-pill menu as the branch header hamburger,
               anchored to open upward from the ⋮ (top-to-bottom pop in, reverse out). */
            <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 8px)", zIndex: 1000, display: "flex", flexDirection: "column", gap: "6px", width: "208px", pointerEvents: exportMenuState === "closing" ? "none" : "auto" }}>
              {exportItems.map((item, i) => (
                <button
                  key={item.key}
                  onClick={() => { closeExportMenu(); item.onSelect(); }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-black/5 bg-raised px-4 py-3 text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-150 hover:bg-card active:scale-95 active:bg-card ${exportMenuState === "closing" ? "animate-menu-pop-out" : "animate-menu-pop"}`}
                  style={{
                    fontFamily: "Raleway, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    letterSpacing: "0.04em",
                    textAlign: "left",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                    /* Exit runs in reverse: the bottom pill leaves first. */
                    animationDelay: exportMenuState === "closing"
                      ? `${(exportItems.length - 1 - i) * MENU_EXIT_STAGGER_MS}ms`
                      : `${i * MENU_ENTRY_STAGGER_MS}ms`,
                  }}
                >
                  <span className="font-normal">{item.label}</span>
                  <item.icon className="h-5 w-5 shrink-0 opacity-80" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};