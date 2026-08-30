import React, { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export type ImportType = "balance" | "log" | "cash";

interface ImportFormProps {
  type: ImportType;
  /** Called after a Balance import so the product list can refresh. */
  onProductsUpdated?: () => Promise<void>;
  /** Called after any successful import so the office log can refresh. */
  onImported?: () => void;
}

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += line[i]; }
  }
  result.push(current);
  return result;
};

const parseCSV = (text: string): Record<string, string>[] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.every(v => !v.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] ?? "").trim().replace(/^"|"$/g, ""); });
    if (Object.values(row).some(v => v.toLowerCase().startsWith("e.g."))) continue;
    rows.push(row);
  }
  return rows;
};

const excelSerialToDateStr = (serial: number): string => {
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const ImportForm = ({ type, onProductsUpdated, onImported }: ImportFormProps) => {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setSuccess(null);
    setRows([]);
    const isExcel = file.name.match(/\.xlsx?$/i);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        if (isExcel) {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
          const parsedRows = json
            .map(row => {
              const result: Record<string, string> = {};
              for (const [k, v] of Object.entries(row)) {
                const key = k.trim();
                if (key.toLowerCase() === "date" && typeof v === "number") {
                  result[key] = excelSerialToDateStr(v);
                } else {
                  result[key] = String(v).trim();
                }
              }
              return result;
            })
            .filter(row => !Object.values(row).some(v => v.toLowerCase().startsWith("e.g.")))
            .filter(row => Object.values(row).some(v => v !== ""));
          if (parsedRows.length === 0) { setError("No valid rows found in the file."); return; }
          setRows(parsedRows);
        } else {
          const text = ev.target?.result as string;
          const parsedRows = parseCSV(text);
          if (parsedRows.length === 0) { setError("No valid rows found in the file."); return; }
          setRows(parsedRows);
        }
      } catch { setError("Failed to parse file. Please check the format."); }
    };
    if (isExcel) { reader.readAsArrayBuffer(file); } else { reader.readAsText(file); }
  };

  // ── BALANCE IMPORT ────────────────────────────────────────────────
  const handleBalanceImport = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError(null);
    let successCount = 0;
    let errorCount = 0;
    for (const row of rows) {
      const productName = row["PRODUCT NAME"]?.trim();
      if (!productName) { errorCount++; continue; }
      const update: Record<string, number | null> = {};
      if (row["OFFICE BALANCE"] !== "") update["OFFICE BALANCE"] = Number(row["OFFICE BALANCE"]) || 0;
      if (row["BOUDOIR BALANCE"] !== "") update["BOUDOIR BALANCE"] = Number(row["BOUDOIR BALANCE"]) || 0;
      if (row["CHIC NAILSPA BALANCE"] !== "") update["CHIC NAILSPA BALANCE"] = Number(row["CHIC NAILSPA BALANCE"]) || 0;
      if (row["NUR YADI BALANCE"] !== "") update["NUR YADI BALANCE"] = Number(row["NUR YADI BALANCE"]) || 0;
      if (Object.keys(update).length === 0) { errorCount++; continue; }
      const { error } = await (supabase as any).from("AllFileProducts").update(update).eq("PRODUCT NAME", productName);
      if (error) { errorCount++; } else { successCount++; }
    }
    setLoading(false);
    setSuccess(errorCount > 0 ? `${successCount} updated, ${errorCount} failed` : `✓ ${successCount} products updated`);
    if (onProductsUpdated) await onProductsUpdated();
    if (onImported) onImported();
  };

  // ── LOG IMPORT ────────────────────────────────────────────────────
  const handleLogImport = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError(null);
    const { data: maxRow } = await (supabase as any).from("AllFileLog").select("id").order("id", { ascending: false }).limit(1).single();
    let nextId = ((maxRow?.id as number) ?? 0) + 1;
    let successCount = 0;
    let errorCount = 0;
    for (const row of rows) {
      const productName = row["PRODUCT NAME"]?.trim();
      if (!productName) { errorCount++; continue; }
      const insertRow: Record<string, any> = {
        id: nextId++,
        DATE: row["DATE"] || null,
        "PRODUCT NAME": productName,
        BRANCH: row["BRANCH"] || null,
        SUPPLIER: row["SUPPLIER"] || null,
        TYPE: row["TYPE"] || null,
        "STARTING BALANCE": row["STARTING BALANCE"] !== "" ? Number(row["STARTING BALANCE"]) : null,
        QTY: row["QTY"] !== "" ? Number(row["QTY"]) : null,
        "ENDING BALANCE": row["ENDING BALANCE"] !== "" ? Number(row["ENDING BALANCE"]) : null,
        "OFFICE BALANCE": row["OFFICE BALANCE"] !== "" ? Number(row["OFFICE BALANCE"]) : null,
        GRN: row["GRN"] || null,
      };
      const { error } = await (supabase as any).from("AllFileLog").insert(insertRow);
      if (error) { errorCount++; } else { successCount++; }
    }
    setLoading(false);
    setSuccess(errorCount > 0 ? `${successCount} inserted, ${errorCount} failed` : `✓ ${successCount} log entries added`);
    if (onImported) onImported();
  };

  // ── CASH IMPORT ───────────────────────────────────────────────────
  const handleCashImport = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError(null);
    const { data: maxRow } = await (supabase as any).from("Cash").select("id").order("id", { ascending: false }).limit(1).single();
    let nextId = ((maxRow?.id as number) ?? 0) + 1;
    let successCount = 0;
    let errorCount = 0;
    for (const row of rows) {
      const branch = row["Branch"]?.trim();
      const date = row["Date"]?.trim();
      if (!branch || !date) { errorCount++; continue; }
      const { data: existing } = await (supabase as any).from("Cash").select("id").eq("Branch", branch).eq("Date", date);
      const insertRow: Record<string, any> = {
        Branch: branch, Date: date,
        "Total GST": row["Total GST"] !== "" ? Number(row["Total GST"]) : null,
        Credit: row["Credit"] !== "" ? Number(row["Credit"]) : null,
        QR: row["QR"] !== "" ? Number(row["QR"]) : null,
        Cash: row["Cash"] !== "" ? Number(row["Cash"]) : null,
        Error: row["Error"] !== "" ? Number(row["Error"]) : null,
        Explanation: row["Explanation"] || null,
      };
      let error;
      if (existing && existing.length > 0) {
        const res = await (supabase as any).from("Cash").update(insertRow).eq("id", existing[0].id);
        error = res.error;
      } else {
        const res = await (supabase as any).from("Cash").insert({ id: nextId++, ...insertRow });
        error = res.error;
      }
      if (error) { errorCount++; } else { successCount++; }
    }
    setLoading(false);
    setSuccess(errorCount > 0 ? `${successCount} saved, ${errorCount} failed` : `✓ ${successCount} cash entries saved`);
    if (onImported) onImported();
  };

  const reset = () => {
    setRows([]);
    setError(null);
    setSuccess(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  };
const runImport = () => {
    if (type === "balance") handleBalanceImport();
    else if (type === "log") handleLogImport();
    else handleCashImport();
  };

  return (
    <div>
      {!success ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            style={{ display: "none" }}
            id={`importFileInput-${type}`}
          />
          <label
            htmlFor={`importFileInput-${type}`}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "10px", padding: "24px 16px",
              border: "0.5px dashed hsl(var(--border-active))", borderRadius: "10px",
              background: "hsl(var(--surface))",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(var(--foreground))")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border-active))")}
          >
            <Upload size={20} style={{ color: "hsl(var(--muted-foreground))" }} />
            <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
              {fileName ?? "Choose CSV file"}
            </div>
            {!fileName && (
              <div style={{ fontSize: "11px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                Upload your Excel template (.xlsx) or a CSV file
              </div>
            )}
          </label>

          {error && (
            <div style={{ fontSize: "12px", color: "hsl(var(--destructive))", margin: "12px 0", fontFamily: "Raleway, inherit" }}>{error}</div>
          )}

          {rows.length > 0 && (
            <div style={{ margin: "16px 0" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "8px", letterSpacing: "0.06em" }}>
                PREVIEW — {rows.length} row{rows.length !== 1 ? "s" : ""}
              </div>
              <div style={{ overflowX: "auto", border: "0.5px solid hsl(var(--border))", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "Raleway, inherit" }}>
                  <thead>
                    <tr>
                      {Object.keys(rows[0]).map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderBottom: "0.5px solid hsl(var(--border))", whiteSpace: "nowrap", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "10px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < Math.min(rows.length, 8) - 1 ? "0.5px solid hsl(var(--border) / 0.4)" : "none" }}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} style={{ padding: "7px 10px", color: "hsl(var(--foreground))", fontWeight: 300, whiteSpace: "nowrap" }}>{v || "—"}</td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 8 && (
                      <tr>
                        <td colSpan={Object.keys(rows[0]).length} style={{ padding: "7px 10px", color: "hsl(var(--muted-foreground))", fontStyle: "italic", fontSize: "10px" }}>
                          + {rows.length - 8} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <button
              onClick={runImport}
              disabled={loading}
              style={{
                width: "100%", padding: "12px",
                fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
                letterSpacing: "0.12em", textTransform: "uppercase",
                border: "0.5px solid hsl(var(--foreground))",
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                borderRadius: "6px",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? "Importing…" : `Import ${rows.length} row${rows.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0 8px", gap: "12px" }}>
          <div style={{ fontSize: "28px" }}>✓</div>
          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{success}</div>
          <button
            onClick={reset}
            style={{ marginTop: "8px", padding: "8px 20px", fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", letterSpacing: "0.1em", textTransform: "uppercase", border: "0.5px solid hsl(var(--border))", background: "none", color: "hsl(var(--foreground))", borderRadius: "6px", cursor: "pointer" }}
          >
            Import Another
          </button>
        </div>
      )}
    </div>
  );
};