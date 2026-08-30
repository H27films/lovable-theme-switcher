import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import MiniCalendar from "./MiniCalendar";

interface ExportPanelProps {
  onClose: () => void;
  /** Optional: start directly at a specific export sub-screen instead of the type menu. */
  initialType?: "log" | "cash" | "order";
}

const ExportPanel = ({ onClose, initialType = null }: ExportPanelProps) => {
  const [exportType, setExportType] = useState<"log" | "cash" | "order" | null>(initialType);
  const [exportDateFrom, setExportDateFrom] = useState<string>("");
  const [exportDateTo, setExportDateTo] = useState<string>("");
  const [quickSelect, setQuickSelect] = useState<"7d"|"month"|null>(null);

  const applyQuickSelect = (key: "7d" | "month") => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const toStr = fmt(today);
    let fromStr = "";
    if (key === "7d") {
      const from = new Date(today);
      from.setDate(today.getDate() - 6); // 6 days back + today = 7 days
      fromStr = fmt(from);
    } else {
      fromStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-01`;
    }
    setExportDateFrom(fromStr);
    setExportDateTo(toStr);
    setQuickSelect(key);
  };
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const resetExport = () => {
    setExportType(null);
    setExportDateFrom("");
    setExportDateTo("");
    setExportError(null);
  };

  const handleExport = async () => {
    if (!exportType) return;
    setExportLoading(true);
    setExportError(null);
    try {
      if (exportType === "log") {
        // ── LOG EXPORT ──────────────────────────────────────────────
        let query = (supabase as any).from("AllFileLog").select("*").order("DATE", { ascending: true });
        if (exportDateFrom) query = query.gte("DATE", exportDateFrom);
        if (exportDateTo)   query = query.lte("DATE", exportDateTo);
        const { data, error } = await query;
        if (error) { setExportError(error.message); setExportLoading(false); return; }
        if (!data || data.length === 0) { setExportError("No data found for the selected range."); setExportLoading(false); return; }

        const branchMap: Record<string, string> = {
          "Boudoir": "BOUDOIR", "Chic Nailspa": "CHIC", "Nur Yadi": "NUR YADI", "Office": "OFFICE",
        };
        const toExcelDate = (dateStr: string) => {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          const epoch = new Date(Date.UTC(1899, 11, 30));
          return Math.floor((d.getTime() - epoch.getTime()) / 86400000);
        };

        const transformedData = data.map((row: any) => {
          const branch = branchMap[row["BRANCH"]] || row["BRANCH"];
          const rawType = (row["TYPE"] || "").trim();
          const qty = Number(row["QTY"] || 0);
          const isOfficeRow = branch === "OFFICE";
          let type = "", subType = "", productSold = "";
        
          if (rawType === "Order") {
            type = "ORDER";
          } else if (rawType.toLowerCase() === "transfer") {
            type = "USAGE";
            subType = qty > 0 ? "TRANSFER IN" : qty < 0 ? "TRANSFER OUT" : "TRANSFER";
          } else if (isOfficeRow) {
            type = "USAGE";
            subType = rawType === "Error" ? "Expired" : rawType;
          } else {
            type = "USAGE";
            if (rawType === "Customer") productSold = "CUSTOMER";
            else if (rawType === "Staff") productSold = "STAFF";
          }
        
          const dateVal = toExcelDate(row["DATE"]);
          return {
            "PRODUCT NAME": row["PRODUCT NAME"],
            "DATE": dateVal,
            "BRANCH": branch,
            "TYPE": type,
            "QTY": row["QTY"],
            "SUB TYPE": subType,
            "PRODUCT SOLD": productSold,
            "THERAPIST": row["THERAPIST"] || "",
            "NOTES": row["NOTES"] || "",
            "SELLING PRICE": row["SELLING PRICE"] ?? "",
          };
        });
        
        const ws = XLSX.utils.json_to_sheet(transformedData, {
          header: ["PRODUCT NAME","DATE","BRANCH","TYPE","QTY","SUB TYPE","PRODUCT SOLD","THERAPIST","NOTES","SELLING PRICE"],
        });
        // Format DATE column as dd/mm/yyyy
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: 1 })];
          if (cell && typeof cell.v === "number") {
            cell.t = "n"; cell.z = "dd/mm/yyyy";
          }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Log");
        XLSX.writeFile(wb, `logexport.xlsx`);
        setExportLoading(false);
        onClose();
        return;
      } else if (exportType === "order") {
        // ── ORDER SUBMIT EXPORT ──────────────────────────────────────────────
        const { data, error } = await (supabase as any).from("OrderSubmit").select("*").order("DATE", { ascending: true });
        if (error) { setExportError(error.message); setExportLoading(false); return; }
        if (!data || data.length === 0) { setExportError("No order submissions found."); setExportLoading(false); return; }

        const toExcelDate = (dateStr: string) => {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          const epoch = new Date(Date.UTC(1899, 11, 30));
          return Math.floor((d.getTime() - epoch.getTime()) / 86400000);
        };

        const branchMap: Record<string, string> = {
          "Boudoir": "BOUDOIR", "Chic Nailspa": "CHIC", "Nur Yadi": "NUR YADI", "Office": "OFFICE",
        };

        const transformedData = data.map((row: any) => {
          const branch = branchMap[row["BRANCH"]] || row["BRANCH"];
          return {
            "PRODUCT NAME": row["PRODUCT NAME"],
            "DATE": toExcelDate(row["DATE"]),
            "BRANCH": branch,
            "TYPE": "ORDER",
            "QTY": row["QTY"],
          };
        });

        const ws = XLSX.utils.json_to_sheet(transformedData, {
          header: ["PRODUCT NAME", "DATE", "BRANCH", "TYPE", "QTY"],
        });
        // Format DATE column
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: 1 })];
          if (cell && typeof cell.v === "number") {
            cell.t = "n"; cell.z = "dd/mm/yyyy";
          }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Orders");
        XLSX.writeFile(wb, `order_forms_export.xlsx`);
        setExportLoading(false);
        onClose();
        return;

      } else {
        // ── CASH EXPORT ─────────────────────────────────────────────
        // Paginate to get all rows (Supabase default cap is 1000)
        let allCashData: any[] = [];
        let pageFrom = 0;
        const pageSize = 1000;
        while (true) {
          let query = (supabase as any).from("Cash").select("*").range(pageFrom, pageFrom + pageSize - 1);
          if (exportDateFrom) query = query.gte("Date", exportDateFrom);
          if (exportDateTo)   query = query.lte("Date", exportDateTo);
          const { data: pageData, error } = await query;
          if (error) { setExportError(error.message); setExportLoading(false); return; }
          if (!pageData || pageData.length === 0) break;
          allCashData = allCashData.concat(pageData);
          if (pageData.length < pageSize) break;
          pageFrom += pageSize;
        }
        const data = allCashData;
        if (!data || data.length === 0) { setExportError("No data found for the selected range."); setExportLoading(false); return; }

        const branchOrder: Record<string, number> = { "Boudoir": 0, "Chic Nailspa": 1, "Nur Yadi": 2 };
        const toExcelDate = (dateStr: string) => {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          const epoch = new Date(Date.UTC(1899, 11, 30));
          return Math.floor((d.getTime() - epoch.getTime()) / 86400000);
        };

        // Sort: branch order first, then date ascending
        const sorted = [...data].sort((a: any, b: any) => {
          const bo = (branchOrder[a["Branch"]] ?? 99) - (branchOrder[b["Branch"]] ?? 99);
          if (bo !== 0) return bo;
          return (a["Date"] || "").localeCompare(b["Date"] || "");
        });

        const transformedData = sorted.map((row: any) => ({
          "Date":        toExcelDate(row["Date"]),
          "Branch":      row["Branch"],
          "Total GST":   row["Total GST"],
          "Credit":      row["Credit"],
          "QR":          row["QR"],
          "Cash":        row["Cash"],
          "Explanation": row["Explanation"],
          "Error":       row["Error"],
        }));

        const ws = XLSX.utils.json_to_sheet(transformedData, {
          header: ["Date","Branch","Total GST","Credit","QR","Cash","Explanation","Error"],
        });
        // Format Date column as dd/mm/yyyy
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
          if (cell && typeof cell.v === "number") {
            cell.t = "n"; cell.z = "dd/mm/yyyy";
          }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cash");
        const from = exportDateFrom || "start";
        const to   = exportDateTo   || "end";
        XLSX.writeFile(wb, `cash_export_${from}_to_${to}.xlsx`);
      }
    } catch (e) {
      setExportError("Export failed. Please try again.");
    }
    setExportLoading(false);
  };

  return (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "hsl(var(--background))", zIndex: 100,
            display: "flex", flexDirection: "column",
            fontFamily: "Raleway, inherit",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 16px 16px", borderBottom: "0.5px solid hsl(var(--border))", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => { onClose(); resetExport(); }}
                  title="Back to Office"
                  style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                >
                  {exportType === "log" ? "LOG EXPORT" : exportType === "cash" ? "CASH EXPORT" : "EXPORT"}
                </button>
              </div>
              <button
                onClick={() => { onClose(); resetExport(); }}
                aria-label="Back"
                title="Back"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--foreground))", display: "flex", alignItems: "center" }}
              >
                <svg width="36" height="16" viewBox="0 0 36 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="30" y1="8" x2="1" y2="8" />
                  <polyline points="9,1 1,8 9,15" />
                </svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>

              {/* Choice selection */}
              {!exportType && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "8px", letterSpacing: "0.04em" }}>
                    Choose what to export. Select a date range to filter results.
                  </div>
                  {([
                    { key: "log",  label: "Log",  desc: "Export entries from AllFileLog (orders, usage, etc.)" },
                    { key: "cash", label: "Cash", desc: "Export entries from the Cash table" },
                    { key: "order", label: "Order Forms", desc: "Export entries from the Order Submit table" },
                  ] as { key: "log" | "cash" | "order"; label: string; desc: string }[]).map(opt => (


                    <button
                      key={opt.key}
                      onClick={() => { setExportType(opt.key); setExportError(null); }}
                      style={{
                        background: "none", border: "0.5px solid hsl(var(--border))", borderRadius: "10px",
                        padding: "16px", cursor: "pointer", textAlign: "left",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "border-color 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "hsl(var(--foreground))"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "hsl(var(--border))"}
                    >
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.06em", marginBottom: "4px" }}>{opt.label}</div>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{opt.desc}</div>
                      </div>
                      <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "20px", lineHeight: 1 }}>›</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Export form */}
              {exportType && (
                <div style={{ paddingTop: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "20px", letterSpacing: "0.04em" }}>
                    Select a date range to filter the export. Leave blank to export all records.
                  </div>

                  {/* Quick select pills */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                    {([
                      { key: "7d",    label: "Last 7 days" },
                      { key: "month", label: "This month"  },
                    ] as { key: "7d"|"month"; label: string }[]).map(p => (
                      <button
                        key={p.key}
                        onClick={() => applyQuickSelect(p.key)}
                        style={{
                          padding: "6px 14px",
                          fontSize: "11px", fontWeight: 500, fontFamily: "Raleway, inherit",
                          letterSpacing: "0.04em",
                          border: "0.5px solid " + (quickSelect === p.key ? "hsl(var(--foreground))" : "hsl(var(--border))"),
                          borderRadius: "20px",
                          background: quickSelect === p.key ? "hsl(var(--foreground))" : "none",
                          color: quickSelect === p.key ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >{p.label}</button>
                    ))}
                  </div>

                  {/* Date range */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>From</div>
                      <MiniCalendar
                        value={exportDateFrom}
                        onChange={v => { setExportDateFrom(v); setQuickSelect(null); }}
                        placeholder="dd/mm/yy"
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>To</div>
                      <MiniCalendar
                        value={exportDateTo}
                        onChange={v => { setExportDateTo(v); setQuickSelect(null); }}
                        placeholder="dd/mm/yy"
                      />
                    </div>
                  </div>

                  {exportError && (
                    <div style={{ fontSize: "12px", color: "hsl(var(--destructive))", marginBottom: "12px", fontFamily: "Raleway, inherit" }}>{exportError}</div>
                  )}

                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    style={{
                      width: "100%", padding: "12px",
                      fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      border: "0.5px solid hsl(var(--foreground))",
                      background: "hsl(var(--foreground))",
                      color: "hsl(var(--background))",
                      borderRadius: "6px",
                      cursor: exportLoading ? "default" : "pointer",
                      opacity: exportLoading ? 0.5 : 1,
                    }}
                  >
                    {exportLoading ? "Exporting…" : `Export ${exportType === "log" ? "Log" : exportType === "cash" ? "Cash" : "Order Forms"} as Excel`}
                  </button>
                </div>
              )}

            </div>
          </div>
  );
};

export default ExportPanel;
