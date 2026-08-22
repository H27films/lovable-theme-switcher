import { X } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { type BranchConfig } from "@/lib/branchSimple";
import { OrderExportActions } from "./OrderExportActions";

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
}

// "Order Summary" block of the Order panel, shown while a submitted order is
// awaiting confirmation: GRN header, editable quantity rows, notes textarea,
// confirm/reset actions and the GRN PDF / Excel export pair.
export const OrderSummary = ({
  pendingOrder, setPendingOrder, grnNotes, setGrnNotes, orderConfirming, orderError, config, onConfirm, onReset
}: OrderSummaryProps) => {
  const [editingPendingIdx, setEditingPendingIdx] = useState<number | null>(null);
  const [editingPendingQty, setEditingPendingQty] = useState("");

  return (
    <div style={{ marginTop: "32px", borderTop: "0.5px solid hsl(var(--border, 0 0% 50%))", paddingTop: "20px", paddingBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
        <div style={{ fontSize: "22px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "-0.02em" }}>Order Summary</div>
        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))", letterSpacing: "0.08em" }}>{pendingOrder.grn}</div>
      </div>
      <div style={{ fontSize: "11px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))", textTransform: "uppercase", marginBottom: "16px" }}>
        Pending · Tap qty to edit · Click × to remove
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
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px" }}>
        <button onClick={onConfirm} disabled={orderConfirming} style={{ background: "hsl(var(--foreground, 0 0% 100%))", color: "hsl(var(--background, 0 0% 0%))", border: "none", cursor: orderConfirming ? "default" : "pointer", padding: "10px 24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", opacity: orderConfirming ? 0.5 : 1 }}>{orderConfirming ? "Saving..." : "Confirm Order"}</button>
        <button onClick={onReset} style={{ background: "none", border: "0.5px solid hsl(var(--border, 0 0% 50%))", cursor: "pointer", padding: "10px 20px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))" }}>Reset</button>
      </div>
      <OrderExportActions entries={pendingOrder.entries} grn={pendingOrder.grn} config={config} grnNotes={grnNotes} exportDate={pendingOrder.date} />
      {orderError && <div style={{ fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em", marginBottom: "8px" }}>✗ {orderError}</div>}
    </div>
  );
};