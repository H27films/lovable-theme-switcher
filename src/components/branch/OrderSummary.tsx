import { X, ArrowDown, Check, ClipboardCheck, MoreVertical, FileText, Download } from "lucide-react";
import { createPortal } from "react-dom";
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
  /** Fired after the tick button's "Order Submitted" animation — closes the summary and
      returns to the branch home (log table) page. Purely visual: it does NOT confirm the
      order (that's Confirm Order in the ⋮ popup) or touch the order/log data. */
  onSubmittedExit?: () => void;
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
  pendingOrder, setPendingOrder, grnNotes, setGrnNotes, orderConfirming, orderError, config, onConfirm, onReset, overlayTop, onSubmittedExit
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

  // Quick-submit tick button: a circle with a tick that animates into a wider
  // "Order Submitted" pill, then kicks off the confirm flow (password modal).
  const [submitted, setSubmitted] = useState(false);
  const quickSubmitTimersRef = useRef<number[]>([]);

  useEffect(() => () => {
    quickSubmitTimersRef.current.forEach(t => window.clearTimeout(t));
  }, []);

  const handleQuickSubmit = () => {
    if (submitted || orderConfirming) return;
    setSubmitted(true);
    // Let the "Order Submitted" pill read, then close the summary and return to the
    // branch home (log table) page. The tick does NOT confirm the order, add anything
    // to the log, or remove items — Confirm Order in the ⋮ popup does all of that.
    quickSubmitTimersRef.current.push(window.setTimeout(() => {
      if (onSubmittedExit) onSubmittedExit();
      else { setSubmitted(false); setExpanded(false); }
    }, 1400));
  };

  // Reset asks for confirmation ("Remove Order? Yes / No") before wiping the order.
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

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

  // The actions shown in the ⋮ popup — Confirm Order now lives here too.
  const exportItems = [
    { key: "confirm", label: "Confirm Order", icon: ClipboardCheck, onSelect: () => onConfirm() },
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
        <ArrowDown size={19} strokeWidth={2.2} style={{ color: "hsl(var(--foreground, 0 0% 100%))", flexShrink: 0 }} />
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

      {/* Pinned footer of the expanded sheet — tick circle first, then Reset (white glass;
          asks "Remove Order?" before wiping), with the ⋮ menu on the right containing
          Confirm Order / GRN PDF / Export (same staggered pills as the header dropdown). */}
      <div style={{ flexShrink: 0, paddingTop: "12px", paddingBottom: overlay ? "max(env(safe-area-inset-bottom, 8px), 8px)" : "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Quick-submit: circle with a perfectly centred tick (the label span contributes
              zero width AND zero gap while collapsed); on click it widens into an
              "Order Submitted" pill, then closes the summary back to the branch home. */}
          <button
            onClick={handleQuickSubmit}
            aria-label="Submit order"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: submitted ? "8px" : 0, height: "40px", width: submitted ? 178 : 40,
              padding: submitted ? "0 16px" : 0,
              borderRadius: "999px", border: "none",
              background: "hsl(var(--foreground, 0 0% 100%))",
              color: "hsl(var(--background, 0 0% 0%))",
              cursor: submitted ? "default" : "pointer",
              overflow: "hidden", whiteSpace: "nowrap", flexShrink: 0,
              transition: "width 0.35s cubic-bezier(0.22, 1, 0.36, 1), padding 0.35s cubic-bezier(0.22, 1, 0.36, 1), gap 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <Check size={18} strokeWidth={2.5} style={{ flexShrink: 0, marginLeft: 0 }} />
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", lineHeight: 1, display: "block", maxWidth: submitted ? 120 : 0, opacity: submitted ? 1 : 0, overflow: "hidden", transition: "max-width 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease 0.12s" }}>
              {submitted ? "Order Submitted" : ""}
            </span>
          </button>

          <button onClick={() => setConfirmResetOpen(true)} style={{
            padding: "10px 18px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit",
            // White glassmorphism — same recipe as the bottom nav but on the light side:
            // translucent white gradient, backdrop blur + saturation, faint border, soft shadow.
            background: "linear-gradient(135deg, hsl(var(--background, 0 0% 100%) / 0.6), hsl(var(--background, 0 0% 100%) / 0.35))",
            backdropFilter: "blur(14px) saturate(160%)",
            WebkitBackdropFilter: "blur(14px) saturate(160%)",
            border: "1px solid hsl(var(--foreground, 0 0% 100%) / 0.3)",
            color: "hsl(var(--foreground, 0 0% 100%))",
            borderRadius: "999px", cursor: "pointer",
            boxShadow: "0 4px 18px hsl(0 0% 0% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.5)",
          }}>Reset</button>
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

      {/* "Remove Order?" confirmation — Yes wipes the order, No closes. Portalled to the
          body so it floats above the expanded overlay sheet (same card style as the
          Order panel's password modal). */}
      {confirmResetOpen && createPortal(
        <div onClick={() => setConfirmResetOpen(false)} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 1001, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "hsl(var(--background))", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "320px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", border: "1px solid hsl(var(--border))", fontFamily: "Raleway, inherit" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", color: "hsl(var(--foreground))", marginBottom: "6px" }}>Remove Order</div>
            <div style={{ fontSize: "12px", fontWeight: 300, textAlign: "center", color: "hsl(var(--muted-foreground))", marginBottom: "16px" }}>
              Remove all {pendingOrder.entries.length} {pendingOrder.entries.length === 1 ? "item" : "items"} from this order?
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setConfirmResetOpen(false); onReset(); }} style={{ flex: 1, background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: "999px", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Yes</button>
              <button onClick={() => setConfirmResetOpen(false)} style={{ flex: 1, background: "none", color: "hsl(var(--muted-foreground))", border: "0.5px solid hsl(var(--border))", borderRadius: "999px", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>No</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};