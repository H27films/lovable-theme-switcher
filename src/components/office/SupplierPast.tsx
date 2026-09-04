import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SupplierLogRow {
  id: string;
  DATE: string;
  "PRODUCT NAME": string;
  QTY: number;
  BRANCH?: string;
  TYPE?: string;
  "OFFICE BALANCE"?: number | null;
}

interface SupplierPastProps {
  /** Supplier name to show past transactions for. */
  supplier: string;
  /** Max rows to fetch (default 100, newest first). */
  limit?: number;
}

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("en-MY", { month: "short", day: "2-digit" });
  } catch {
    return d;
  }
};

/**
 * Supplier "Past Data" box — shown in the Office Search page's supplier result
 * when the Products / Past Data toggle is switched to Past Data (replaces the
 * product dropdown). Lists the supplier's transactions from AllFileLog,
 * newest first, styled like the product card's Past Data box:
 * Date | Product | Qty | Bal.
 */
export const SupplierPast = ({ supplier, limit = 100 }: SupplierPastProps) => {
  const [rows, setRows] = useState<SupplierLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fg = "hsl(var(--foreground))";
  const dimColor = "hsl(var(--muted-foreground))";
  const border = "hsl(var(--border))";

  useEffect(() => {
    let cancelled = false;
    const fetchLog = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("AllFileLog")
          .select(`id, DATE, "PRODUCT NAME", QTY, BRANCH, TYPE, "OFFICE BALANCE"`)
          .eq("SUPPLIER", supplier)
          .order("DATE", { ascending: false })
          .limit(limit);
        if (error) throw error;
        // Newest date first; A–Z by product within the same date
        const sorted = (data || []).slice().sort((a, b) => {
          if (a.DATE !== b.DATE) return a.DATE < b.DATE ? 1 : -1;
          return (a["PRODUCT NAME"] || "").localeCompare(b["PRODUCT NAME"] || "");
        });
        if (!cancelled) setRows(sorted);
      } catch (err) {
        console.error("Error fetching supplier past data:", err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLog();
    return () => { cancelled = true; };
  }, [supplier, limit]);

  const hdrStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    fontFamily: "Raleway, inherit",
    color: fg,
    textTransform: "capitalize",
    paddingBottom: "6px",
  };

  const cellStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 300,
    fontFamily: "Raleway, inherit",
    padding: "8px 0",
  };

  return (
    <div style={{ background: "hsl(var(--muted) / 0.3)", borderRadius: "16px", padding: "12px" }}>
      <div style={{ fontSize: "14px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: fg, marginBottom: "10px" }}>
        Past Data
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "54px minmax(0, 1fr) 32px 38px", columnGap: "4px" }}>
        {/* Column headers */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: "54px minmax(0, 1fr) 32px 38px",
            columnGap: "4px",
            borderBottom: `0.5px solid ${border}`,
          }}
        >
          <div style={hdrStyle}>Date</div>
          <div style={hdrStyle}>Product</div>
          <div style={{ ...hdrStyle, textAlign: "center" }}>Qty</div>
          <div style={{ ...hdrStyle, textAlign: "right" }}>Bal</div>
        </div>

        {loading && <div style={{ gridColumn: "1 / -1", fontSize: "11px", color: dimColor, padding: "8px 0" }}>Loading...</div>}
        {!loading && rows.length === 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: "11px", color: dimColor, padding: "8px 0" }}>No past data</div>
        )}
        {!loading && rows.map((row, i, arr) => {
          const qty = row.QTY;
          // Intake (positive) green, out-flow/usage (negative) red — same
          // colour language as the product card's Past Data rows.
          const qtyColor = qty < 0 ? "hsl(0 70% 50%)" : "hsl(142 65% 30%)";
          return (
            <div
              key={row.id}
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gridTemplateColumns: "54px minmax(0, 1fr) 32px 38px",
                columnGap: "4px",
                borderBottom: i < arr.length - 1 ? `0.5px solid ${border}` : "none",
              }}
            >
              <div style={{ ...cellStyle, fontWeight: 400, color: fg, whiteSpace: "nowrap" }}>{fmtDate(row.DATE)}</div>
              <div style={{ ...cellStyle, color: fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row["PRODUCT NAME"]}</div>
              <div style={{ ...cellStyle, color: qtyColor, textAlign: "center" }}>{qty > 0 ? `+${qty}` : qty}</div>
              <div style={{ ...cellStyle, color: fg, textAlign: "right" }}>{row["OFFICE BALANCE"] ?? "—"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};