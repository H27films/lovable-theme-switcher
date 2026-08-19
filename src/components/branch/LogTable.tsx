import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { type LogRow } from "@/lib/branchSimple";

interface LogTableProps {
  rows: LogRow[];
  selectedProduct: any;
  onReverse: (row: LogRow) => void | Promise<void>;
}

export const LogTable = ({ rows, selectedProduct, onReverse }: LogTableProps) => {
  const [reversing, setReversing] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<LogRow | null>(null);
  const [confirmPos, setConfirmPos] = useState<{ top: number; right: number } | null>(null);

  const handleConfirm = async (row: LogRow) => {
    const r = row;
    setConfirmRow(null);
    setConfirmPos(null);
    setReversing(row.id);
    try {
      await onReverse(r);
    } finally {
      setReversing(null);
    }
  };

  return (
    <div style={{ flex: 1, overflowX: "hidden", overflowY: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>
        {selectedProduct ? (
          <div style={{ display: "grid", gridTemplateColumns: "50px 44px 52px 90px 18px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
            <div />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 28px 32px 70px 18px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>Product</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
            <div />
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {rows.map((row, idx) => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const cutoff = new Date(today); cutoff.setDate(today.getDate() - 6);
            const dateStr = new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            const prevDateStr = idx > 0 ? new Date(rows[idx - 1].DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
            const showDate = dateStr !== prevDateStr;
            const dateSeparator = showDate && idx > 0;
            const isReversing = reversing === row.id;
            return selectedProduct ? (
              <div key={row.id} style={{
                display: "grid", gridTemplateColumns: "50px 44px 52px 90px 18px", gap: "4px",
                padding: "8px 0",
                borderTop: dateSeparator ? "0.5px solid hsl(var(--border) / 0.95)" : "none",
                marginTop: dateSeparator ? "4px" : "0",
                alignItems: "center",
              }}>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>{showDate ? dateStr : ""}</div>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
                {(() => { const rd = new Date(row.DATE); rd.setHours(0, 0, 0, 0); return rd >= cutoff; })() ? (
                  <button
                    onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setConfirmPos({ top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 6 }); setConfirmRow(row); }}
                    disabled={isReversing}
                    style={{ background: "none", border: "none", cursor: isReversing ? "default" : "pointer", padding: 0, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center", opacity: isReversing ? 0.3 : 1 }}
                    onMouseEnter={(e) => { if (!isReversing) e.currentTarget.style.color = "hsl(0 70% 50%)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                  >
                    <X size={11} />
                  </button>
                ) : <div />}
              </div>
            ) : (
              <div key={row.id} style={{
                display: "grid", gridTemplateColumns: "42px 1fr 28px 32px 70px 18px", gap: "4px",
                padding: "8px 0",
                borderTop: dateSeparator ? "0.5px solid hsl(var(--border) / 0.95)" : "none",
                marginTop: dateSeparator ? "4px" : "0",
                alignItems: "center",
              }}>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>{showDate ? dateStr : ""}</div>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>{row["PRODUCT NAME"] || "—"}</div>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
                {(() => { const rd = new Date(row.DATE); rd.setHours(0, 0, 0, 0); return rd >= cutoff; })() ? (
                  <button
                    onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setConfirmPos({ top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 6 }); setConfirmRow(row); }}
                    disabled={isReversing}
                    style={{ background: "none", border: "none", cursor: isReversing ? "default" : "pointer", padding: 0, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center", opacity: isReversing ? 0.3 : 1 }}
                    onMouseEnter={(e) => { if (!isReversing) e.currentTarget.style.color = "hsl(0 70% 50%)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                  >
                    <X size={11} />
                  </button>
                ) : <div />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Popover */}
      {confirmRow && confirmPos && createPortal(
        <>
          <div
            onClick={() => { setConfirmRow(null); setConfirmPos(null); }}
            style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 499 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: confirmPos.top,
              right: confirmPos.right,
              transform: "translateY(-50%)",
              zIndex: 500,
              background: "hsl(var(--background))",
              border: "0.5px solid hsl(var(--border))",
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              padding: "10px 13px",
              minWidth: "170px",
              maxWidth: "250px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "5px" }}>
              Remove Transaction
            </div>
            <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", lineHeight: 1.4, marginBottom: "10px" }}>
              {new Date(confirmRow.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {confirmRow["PRODUCT NAME"]}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setConfirmRow(null); setConfirmPos(null); }}
                style={{ background: "none", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: "6px 10px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={13} />
              </button>
              <button
                onClick={() => handleConfirm(confirmRow)}
                style={{ background: "none", border: "0.5px solid hsl(0 70% 50%)", cursor: "pointer", padding: "6px 10px", color: "hsl(0 70% 50%)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Check size={13} />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
