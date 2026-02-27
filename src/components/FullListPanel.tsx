import { useState, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface FullListPanelProps {
  open: boolean;
  onClose: () => void;
  headers: string[];
  data: string[][];
  onImport: (file: File) => void;
  onUpdate: (productName: string, newCNY: string) => void;
  rate: number;
}

const TOTAL_COLS_MAX = 10;

function getCellScales(hoveredCol: number | null, totalCols: number): number[] {
  if (hoveredCol === null) return Array(totalCols).fill(1);
  return Array.from({ length: totalCols }, (_, i) => {
    const dist = Math.abs(i - hoveredCol);
    if (dist === 0) return 1.20;
    if (dist === 1) return 1.10;
    if (dist === 2) return 1.05;
    return 1.0;
  });
}

function fmtRM(v: string) {
  const n = parseFloat(v);
  return !isNaN(n) ? "RM " + n.toFixed(2) : "—";
}

function fmtCNY(v: string) {
  const n = parseFloat(v);
  return !isNaN(n) ? "¥ " + n.toFixed(2) : "—";
}

// Column format rules: index 1 = RM, index 2 = CNY, others with numbers stay plain
function formatCell(value: string, colIndex: number): string {
  if (!value || value === "—") return "—";
  if (colIndex === 1) return fmtRM(value);
  if (colIndex === 2) return fmtCNY(value);
  return value;
}

export default function FullListPanel({ open, onClose, headers, data, onImport, onUpdate, rate }: FullListPanelProps) {
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string[] | null>(null);
  const [newCNY, setNewCNY] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const totalCols = headers.length || 1;
  const cellScales = hoveredRow !== null ? getCellScales(hoveredCol, totalCols) : Array(totalCols).fill(1);

  const tdStyle = useCallback((colIdx: number, rowIdx: number) => ({
    transition: "transform 0.2s ease, color 0.15s ease",
    transform: hoveredRow === rowIdx ? `scale(${cellScales[colIdx]})` : "scale(1)",
    transformOrigin: colIdx === 0 ? "left center" : "center center",
    display: "inline-block" as const,
  }), [hoveredRow, cellScales]);

  const filtered = search
    ? data.filter(row => row[0]?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const handleRowClick = (row: string[]) => {
    setSelectedProduct(row);
    setNewCNY(row[3] || ""); // Pre-fill with existing New Price CNY
  };

  const handleCommit = () => {
    if (selectedProduct && newCNY) {
      onUpdate(selectedProduct[0], newCNY);
      setSelectedProduct(null);
      setNewCNY("");
    }
  };

  const calculatedNewRM = newCNY && !isNaN(parseFloat(newCNY)) 
    ? (parseFloat(newCNY) / rate).toFixed(2) 
    : "";
  
  const calculatedSavings = selectedProduct && calculatedNewRM
    ? (parseFloat(selectedProduct[1]) - parseFloat(calculatedNewRM)).toFixed(2)
    : "";

  if (!open) return null;

  // Sub-labels for columns
  const colSubs: Record<number, string> = { 1: "RM", 2: "CNY" };

  return (
    <>
      <div className="fixed inset-0 panel-overlay z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[900px] panel-bg z-[201] flex flex-col">
        <div className="flex justify-between items-center px-10 py-8 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-light tracking-[0.15em] uppercase text-dim">Full Product List</h2>
          <div className="flex items-center gap-4">
            <input type="text" className="minimal-input text-[13px] font-light py-1.5 w-[200px]" placeholder="Filter products..." value={search} onChange={e => setSearch(e.target.value)} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
          </div>
        </div>
        <div className="px-10 py-5 border-b border-border flex-shrink-0 flex items-center gap-4">
          <label className="minimal-btn cursor-pointer">
            Import Excel
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && onImport(e.target.files[0])} />
          </label>
          <span className="text-[11px] text-muted-foreground">{data.length ? `${data.length} products` : "No file loaded"}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-10 pb-10 scrollbar-thin">
          {!filtered.length && !headers.length ? (
            <div className="text-center text-muted-foreground text-[13px] py-16 tracking-wider">Import an Excel file to view the full product list</div>
          ) : (
            <table className="w-full border-collapse mt-6">
              <thead>
                <tr className="border-b border-border-active">
                  {headers.map((h, i) => (
                    <th key={i} className={`label-uppercase font-normal pb-3 pt-4 ${i > 0 ? "text-center" : "text-left"}`}>
                      {h}
                      {colSubs[i] && <><br /><span className="text-[9px] tracking-wider text-muted-foreground">{colSubs[i]}</span></>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-border table-row-hover cursor-pointer"
                    onClick={() => handleRowClick(row)}
                    onMouseEnter={() => setHoveredRow(ri)}
                    onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`text-[13px] font-light text-dim py-3.5 ${ci > 0 ? "text-center" : ""}`}
                        onMouseEnter={() => setHoveredCol(ci)}
                      >
                        <span style={tdStyle(ci, ri)}>{formatCell(cell, ci)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Edit Product Popup */}
        {selectedProduct && (
          <div className="fixed inset-0 panel-overlay z-[300] flex items-center justify-center" onClick={() => setSelectedProduct(null)}>
            <div className="surface-box p-9 max-w-[420px] w-[90%]" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-light tracking-[0.15em] uppercase text-dim mb-6">Edit Product</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">Product Name</label>
                  <div className="text-[15px] font-light text-foreground">{selectedProduct[0]}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">Old Price</label>
                    <div className="text-[15px] font-light text-dim">RM {parseFloat(selectedProduct[1]).toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">China Price</label>
                    <div className="text-[15px] font-light text-dim">¥ {parseFloat(selectedProduct[2]).toFixed(2)}</div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">New Price (CNY)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="minimal-input text-[15px] font-light w-full"
                    value={newCNY}
                    onChange={e => setNewCNY(e.target.value)}
                    autoFocus
                    placeholder="Enter new CNY price"
                  />
                </div>

                {calculatedNewRM && (
                  <>
                    <div>
                      <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">New Price (RM)</label>
                      <div className="text-[15px] font-light text-foreground">RM {calculatedNewRM}</div>
                    </div>

                    <div>
                      <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">Savings</label>
                      <div className={`text-[15px] font-light ${parseFloat(calculatedSavings) > 0 ? 'text-green' : parseFloat(calculatedSavings) < 0 ? 'text-red' : 'text-foreground'}`}>
                        RM {calculatedSavings}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2.5 justify-end">
                <button onClick={() => setSelectedProduct(null)} className="minimal-btn">Cancel</button>
                <button onClick={handleCommit} className="minimal-btn !border-foreground !text-foreground hover:!bg-foreground hover:!text-background" disabled={!newCNY || isNaN(parseFloat(newCNY))}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
