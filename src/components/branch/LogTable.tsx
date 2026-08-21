import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { type LogRow, type OfficeProduct, type BranchConfig, BRANCH_CONFIGS } from "@/lib/branchSimple";
import { supabase } from "@/integrations/supabase/client";
import { EditEntryModal, type EditEntryUpdates } from "./EditEntryModal";

interface LogTableProps {
  rows: LogRow[];
  selectedProduct: any;
  onReverse: (row: LogRow) => void | Promise<void>;
  onUpdate?: (row: LogRow, updates: EditEntryUpdates) => void | Promise<void>;
  viewType?: "all" | "week";
}

export const LogTable = ({ rows, selectedProduct, onReverse, onUpdate, viewType = "all" }: LogTableProps) => {
  const [reversing, setReversing] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<LogRow | null>(null);
  const [confirmPos, setConfirmPos] = useState<{ top: number; left: number } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<LogRow | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setReversing(row.id);
    setExpandedId(null);
    try {
      await onReverse(r);

      // --- Start of new Supabase update logic ---
      const productName = r["PRODUCT NAME"];
      const quantity = r.QTY; // The quantity of the action being reversed
      const branchName = r.BRANCH;

      let balanceKey: keyof OfficeProduct | null = null;
      for (const key in BRANCH_CONFIGS) {
        if (BRANCH_CONFIGS[key as keyof typeof BRANCH_CONFIGS].logBranchName === branchName) {
          balanceKey = BRANCH_CONFIGS[key as keyof typeof BRANCH_CONFIGS].balanceKey;
          break;
        }
      }

      if (balanceKey) {
        // Fetch the current product record from AllFileProducts for the specific branch
        const { data, error } = await supabase
          .from("AllFileProducts")
          .select(`${balanceKey}, "PRODUCT NAME"`)
          .eq("PRODUCT NAME", productName)
          .single();

        if (error) {
          console.error("Error fetching product for balance update:", error);
        } else if (data) {
          // Reversing a usage (negative QTY) means adding back the amount.
          // Reversing an addition (positive QTY) means subtracting the amount.
          // Note: If onReverse already updated the balance to STARTING BALANCE, 
          // this additional update might be redundant or could lead to incorrect results.
          const currentBalance = data[balanceKey] ?? 0;
          const newBalance = (currentBalance as number) - quantity;

          const { error: updateError } = await (supabase as any)
            .from("AllFileProducts")
            .update({ [balanceKey]: newBalance })
            .eq("PRODUCT NAME", productName);

          if (updateError) {
            console.error("Error updating product balance:", updateError);
          } else {
            console.log(`Product balance for ${productName} updated successfully.`);
          }
        }
      } else {
        console.warn(`Could not find balanceKey for branch: ${branchName}`);
      }
      // --- End of new Supabase update logic ---

    } finally {
      setReversing(null);
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

  return (
    <div ref={containerRef} style={{ flex: 1, overflowX: "hidden", overflowY: "auto", minHeight: 0, paddingBottom: "90px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>
        {selectedProduct ? (
          <div style={{ display: "grid", gridTemplateColumns: "50px 44px 52px 90px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 28px 32px 70px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))" }}>
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
            const isReversing = reversing === row.id;
            const expanded = expandedId === row.id;
            const withinCutoff = (() => { const rd = new Date(row.DATE); rd.setHours(0, 0, 0, 0); return rd >= cutoff; })();
            const gridCols = selectedProduct ? "50px 44px 52px 90px" : "42px 1fr 28px 32px 70px";

            return (
              <div key={row.id}>
                <div
                  onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : row.id); }}
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: gridCols, 
                    gap: "4px", 
                    padding: "8px 0", 
                    borderTop: dateSeparator ? "0.5px solid hsl(var(--border) / 0.95)" : "none", 
                    marginTop: dateSeparator ? "4px" : "0", 
                    alignItems: "center", 
                    cursor: "pointer" 
                  }}
                >
                  {selectedProduct ? (
                    <>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>{showDate ? dateStr : ""}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>{showDate ? dateStr : ""}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>
                          {row["PRODUCT NAME"] || "—"}
                        </div>
                        {viewType === "week" && ((row as any)["THERAPIST"] || (row as any)["NOTES"]) && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                            {(row as any)["THERAPIST"] && (
                              <span style={{ 
                                background: "hsl(var(--secondary))", 
                                color: "hsl(var(--secondary-foreground))", 
                                padding: "2px 8px", 
                                borderRadius: "999px", 
                                fontSize: "10px", 
                                fontWeight: 600, 
                                fontFamily: "Raleway, inherit",
                                textTransform: "uppercase",
                                letterSpacing: "0.02em"
                              }}>
                                {(row as any)["THERAPIST"]}
                              </span>
                            )}
                            {(row as any)["NOTES"] && (
                              <span style={{ 
                                fontSize: "11px", 
                                fontWeight: 400, 
                                fontFamily: "Raleway, inherit", 
                                color: "hsl(var(--muted-foreground))",
                                lineHeight: 1.2
                              }}>
                                Note: {(row as any)["NOTES"]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
                    </>
                  )}
                </div>
                {expanded && (
                  <div style={{ padding: "8px 0 16px", borderBottom: "0.5px solid hsl(var(--border) / 0.5)", display: "flex", gap: "10px", alignItems: "center" }}>
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
                        disabled={isReversing}
                        style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))", border: "none", cursor: isReversing ? "default" : "pointer", padding: "6px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase", opacity: isReversing ? 0.5 : 1 }}
                      >
                        {isReversing ? "Reversing..." : "Reverse"}
                      </button>
                    )}
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



