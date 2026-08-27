import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ImportPanelProps {
  onClose: () => void;
  onProductsUpdated: () => Promise<void>;
}

const ImportPanel = ({ onClose, onProductsUpdated }: ImportPanelProps) => {
  const [importType, setImportType] = useState<"balance" | "log" | "cash" | null>(null);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

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

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError(null);
    setImportSuccess(null);
    setImportRows([]);
    const isExcel = file.name.match(/\.xlsx?$/i);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        if (isExcel) {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
          const excelSerialToDateStr = (serial: number): string => {
            const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          const rows = json
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
          if (rows.length === 0) { setImportError("No valid rows found in the file."); return; }
          setImportRows(rows);
        } else {
          const text = ev.target?.result as string;
          const rows = parseCSV(text);
          if (rows.length === 0) { setImportError("No valid rows found in the file."); return; }
          setImportRows(rows);
        }
      } catch { setImportError("Failed to parse file. Please check the format."); }
    };
    if (isExcel) { reader.readAsArrayBuffer(file); } else { reader.readAsText(file); }
  };

  const handleBalanceImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    setImportError(null);
    let successCount = 0;
    let errorCount = 0;
    for (const row of importRows) {
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
    setImportLoading(false);
    setImportSuccess(errorCount > 0 ? `${successCount} updated, ${errorCount} failed` : `✓ ${successCount} products updated`);
    await onProductsUpdated();
  };

  const handleLogImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    setImportError(null);
    const { data: maxRow } = await (supabase as any).from("AllFileLog").select("id").order("id", { ascending: false }).limit(1).single();
    let nextId = ((maxRow?.id as number) ?? 0) + 1;
    let successCount = 0;
    let errorCount = 0;
    for (const row of importRows) {
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
    setImportLoading(false);
    setImportSuccess(errorCount > 0 ? `${successCount} inserted, ${errorCount} failed` : `✓ ${successCount} log entries added`);
  };

  const handleCashImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    setImportError(null);
    const { data: maxRow } = await (supabase as any).from("Cash").select("id").order("id", { ascending: false }).limit(1).single();
    let nextId = ((maxRow?.id as number) ?? 0) + 1;
    let successCount = 0;
    let errorCount = 0;
    for (const row of importRows) {
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
    setImportLoading(false);
    setImportSuccess(errorCount > 0 ? `${successCount} saved, ${errorCount} failed` : `✓ ${successCount} cash entries saved`);
  };

  const resetImport = () => {
    setImportType(null);
    setImportRows([]);
    setImportError(null);
    setImportSuccess(null);
    setImportFileName(null);
    if (importFileRef.current) importFileRef.current.value = "";
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
                {importType && (
                  <button onClick={resetImport} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))", fontSize: "18px", lineHeight: 1 }}>‹</button>
                )}
                <button
                  onClick={() => { onClose(); resetImport(); }}
                  title="Back to Office"
                  style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                >
                  {importType === "balance" ? "BALANCE IMPORT" : importType === "log" ? "LOG IMPORT" : importType === "cash" ? "CASH IMPORT" : "IMPORT"}
                </button>
              </div>
              <button
                onClick={() => { onClose(); resetImport(); }}
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
              {!importType && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "8px", letterSpacing: "0.04em" }}>
                    Choose what to import. Upload a CSV file using the provided templates.
                  </div>
                  {([
                    { key: "balance", label: "Balance", desc: "Update Office, Boudoir, Chic & Nur Yadi balances in AllFileProducts" },
                    { key: "log",     label: "Log",     desc: "Add new entries to AllFileLog (usage, orders, etc.)" },
                    { key: "cash",    label: "Cash",    desc: "Add or update cash entries in the Cash table" },
                  ] as { key: "balance" | "log" | "cash"; label: string; desc: string }[]).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setImportType(opt.key); setImportRows([]); setImportError(null); setImportSuccess(null); setImportFileName(null); }}
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

              {/* Import form */}
              {importType && (
                <div>
                  {/* File upload area */}
                  {!importSuccess && (
                    <div>
                      <input
                        ref={importFileRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleImportFile}
                        style={{ display: "none" }}
                        id="importFileInput"
                      />
                      <label
                        htmlFor="importFileInput"
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: "10px", padding: "28px 16px",
                          border: "0.5px dashed hsl(var(--border))", borderRadius: "10px",
                          cursor: "pointer", marginBottom: "16px",
                          transition: "border-color 0.2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
                      >
                        <Upload size={20} style={{ color: "hsl(var(--muted-foreground))" }} />
                        <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                          {importFileName ?? "Choose CSV file"}
                        </div>
                        {!importFileName && (
                          <div style={{ fontSize: "11px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                            Upload your Excel template (.xlsx) or a CSV file
                          </div>
                        )}
                      </label>

                      {importError && (
                        <div style={{ fontSize: "12px", color: "hsl(var(--destructive))", marginBottom: "12px", fontFamily: "Raleway, inherit" }}>{importError}</div>
                      )}

                      {/* Preview table */}
                      {importRows.length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "8px", letterSpacing: "0.06em" }}>
                            PREVIEW — {importRows.length} row{importRows.length !== 1 ? "s" : ""}
                          </div>
                          <div style={{ overflowX: "auto", border: "0.5px solid hsl(var(--border))", borderRadius: "8px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "Raleway, inherit" }}>
                              <thead>
                                <tr>
                                  {Object.keys(importRows[0]).map(h => (
                                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderBottom: "0.5px solid hsl(var(--border))", whiteSpace: "nowrap", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "10px" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {importRows.slice(0, 8).map((row, i) => (
                                  <tr key={i} style={{ borderBottom: i < Math.min(importRows.length, 8) - 1 ? "0.5px solid hsl(var(--border) / 0.4)" : "none" }}>
                                    {Object.values(row).map((v, j) => (
                                      <td key={j} style={{ padding: "7px 10px", color: "hsl(var(--foreground))", fontWeight: 300, whiteSpace: "nowrap" }}>{v || "—"}</td>
                                    ))}
                                  </tr>
                                ))}
                                {importRows.length > 8 && (
                                  <tr>
                                    <td colSpan={Object.keys(importRows[0]).length} style={{ padding: "7px 10px", color: "hsl(var(--muted-foreground))", fontStyle: "italic", fontSize: "10px" }}>
                                      + {importRows.length - 8} more rows
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Confirm button */}
                      {importRows.length > 0 && (
                        <button
                          onClick={importType === "balance" ? handleBalanceImport : importType === "log" ? handleLogImport : handleCashImport}
                          disabled={importLoading}
                          style={{
                            width: "100%", padding: "12px",
                            fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            border: "0.5px solid hsl(var(--foreground))",
                            background: "hsl(var(--foreground))",
                            color: "hsl(var(--background))",
                            borderRadius: "6px",
                            cursor: importLoading ? "default" : "pointer",
                            opacity: importLoading ? 0.5 : 1,
                          }}
                        >
                          {importLoading ? "Importing…" : `Import ${importRows.length} row${importRows.length !== 1 ? "s" : ""}`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Success state */}
                  {importSuccess && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "40px", gap: "16px" }}>
                      <div style={{ fontSize: "32px" }}>✓</div>
                      <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{importSuccess}</div>
                      <button
                        onClick={resetImport}
                        style={{ marginTop: "16px", padding: "10px 24px", fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", letterSpacing: "0.1em", textTransform: "uppercase", border: "0.5px solid hsl(var(--border))", background: "none", color: "hsl(var(--foreground))", borderRadius: "6px", cursor: "pointer" }}
                      >
                        Import Another
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
  );
};

export default ImportPanel;
