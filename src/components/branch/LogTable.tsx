import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { type LogRow, type OfficeProduct, type BranchConfig, BRANCH_CONFIGS } from "@/lib/branchSimple";
import { supabase } from "@/integrations/supabase/client";
import { therapistPillStyle } from "@/lib/branchSimpleUtils";
import { useBranchTherapists } from "@/hooks/useBranchTherapists";
import { EditEntryModal, type EditEntryUpdates } from "./EditEntryModal";

interface LogTableProps {
  rows: LogRow[];
  selectedProduct: any;
  onReverse: (row: LogRow) => void | Promise<void>;
  onUpdate?: (row: LogRow, updates: EditEntryUpdates) => void | Promise<void>;
  viewType?: "all" | "week";
  /** Called when the edit-entry modal opens (true) or closes (false). */
  onEditModalChange?: (open: boolean) => void;
  /** Branch displayName (e.g. "BOUDOIR") used to fetch the live therapist list for the edit modal. */
  branchDisplayName: string;
}

export const LogTable = ({ rows, selectedProduct, onReverse, onUpdate, viewType = "all", onEditModalChange, branchDisplayName }: LogTableProps) => {
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<LogRow | null>(null);
  const [confirmPos, setConfirmPos] = useState<{ top: number; left: number } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<LogRow | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const branchTherapists = useBranchTherapists(branchDisplayName);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (viewType === "week") {
      // Return just the day name (Mon, Tue, Wed, etc.)
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      // Return day month-short format (15 Aug)
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }
  };

  const handleConfirm = async (row: LogRow) => {
    const r = row;
    setConfirmRow(null);
    setConfirmPos(null);
    setDeleting(row.id);
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
        setExpandedId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedId]);

  // Notify the parent when the edit modal opens/closes so the bottom nav can be hidden
  useEffect(() => {
    onEditModalChange?.(editRow !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRow]);

  return (
    <div ref={containerRef} style={{ flex: 1, overflowX: "hidden", overflowY: "auto", minHeight: 0, paddingBottom: "90px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>
        {selectedProduct ? (
          <div style={{ position: "sticky", top: 0, zIndex: 10, display: "grid", gridTemplateColumns: "50px 44px 52px 64px 64px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))", background: "hsl(var(--background))" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
            {/* Therapist column has no header — the name is shown as a pill */}
            <div />
          </div>
        ) : (
          <div style={{ position: "sticky", top: 0, zIndex: 10, display: "grid", gridTemplateColumns: "45px 1fr 28px 32px 70px", gap: "4px", paddingTop: "16px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))", background: "hsl(var(--background))" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>Product</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }} onClick={() => setExpandedId(null)}>
          {rows.map((row, idx) => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const cutoff = new Date(today); cutoff.setDate(today.getDate() - 6);
            const dateStr = formatDate(row.DATE);
            const prevDateStr = idx > 0 ? formatDate(rows[idx - 1].DATE) : null;
            const showDate = dateStr !== prevDateStr;
            const dateSeparator = showDate && idx > 0;
            const nextDateStr = idx < rows.length - 1 ? formatDate(rows[idx + 1].DATE) : null;
            const isLastRowBeforeDateChange = nextDateStr !== null && nextDateStr !== dateStr;
            const isDeleting = deleting === row.id;
            const expanded = expandedId === row.id;
            const withinCutoff = (() => { const rd = new Date(row.DATE); rd.setHours(0, 0, 0, 0); return rd >= cutoff; })();
            const gridCols = selectedProduct ? "50px 44px 52px 64px 64px" : "45px 1fr 28px 32px 70px";

            return (
              <div key={row.id} style={{ borderBottom: (!dateSeparator && !isLastRowBeforeDateChange) ? "0.5px solid hsl(var(--border) / 0.5)" : "none" }}>
                <div
                  onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : row.id); }}
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: gridCols, 
                    gap: "4px", 
                    padding: "8px 0", 
                    borderTop: dateSeparator ? "1px solid hsl(var(--border) / 0.9)" : "none", 
                    borderBottom: "none",
                    marginTop: dateSeparator ? "4px" : "0",  
                    alignItems: "start", 
                    cursor: "pointer" 
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
                          {viewType === "week" && !expanded && (row as any)["THERAPIST"] && (
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
                        {viewType === "week" && !expanded && (row as any)["NOTES"] && (
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
                {expanded && (
                  <div style={{ padding: "0 0 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "4px", alignItems: "center" }}>
                      {/* Edit / Delete buttons sit under the content columns (after the Date col): product view aligns under Qty (col 2), home view under Product (col 2) */}
                      <div style={{ gridColumn: selectedProduct ? "2 / 4" : "2 / 5", display: "flex", gap: "10px", alignItems: "center" }}>
                        {onUpdate && withinCutoff && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditRow(row); }}
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
                      {/* Colour-coded therapist pill, aligned under the Type column (col 4 on product view, col 5 on home view) */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {row.THERAPIST ? (
                          <span style={{ ...therapistPillStyle(row.THERAPIST, branchTherapists), padding: "3px 8px", borderRadius: "999px", fontSize: "8px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{row.THERAPIST}</span>
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



