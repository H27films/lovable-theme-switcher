import { useState, useRef, useCallback } from "react";
import { X, Upload, Plus } from "lucide-react";

interface FullListPanelProps {
  open: boolean;
  onClose: () => void;
  headers: string[];
  data: string[][];
  onImport: (file: File) => void;
  onUpdate: (productName: string, newCNY: string, qty?: number) => void;
  onClear: (productName: string) => void;
  onAddToMain: (name: string, oldPriceRM: number, cnyPrice: number, newCNY?: number, qty?: number) => void;
  rate: number;
}

const TOTAL_COLS = 10; // 9 data + 1 action

function getCellScales(hoveredCol: number | null): number[] {
  if (hoveredCol === null) return Array(TOTAL_COLS).fill(1);
  return Array.from({ length: TOTAL_COLS }, (_, i) => {
    if (i === 0) return 1.0;
    const dist = Math.abs(i - hoveredCol);
    if (dist === 0) return 1.12;
    if (dist === 1) return 1.06;
    if (dist === 2) return 1.03;
    return 1.0;
  });
}

function fmtRM(v: string) {
  const n = parseFloat(v);
  return !isNaN(n) && n !== 0 ? "RM " + n.toFixed(2) : "—";
}

function fmtCNY(v: string) {
  const n = parseFloat(v);
  return !isNaN(n) && n !== 0 ? "¥ " + n.toFixed(2) : "—";
}

export default function FullListPanel({ open, onClose, headers, data, onImport, onUpdate, onClear, onAddToMain, rate }: FullListPanelProps) {
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string[] | null>(null);
  const [newCNY, setNewCNY] = useState("");
  const [newQty, setNewQty] = useState("");
  const [addedToMain, setAddedToMain] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cellScales = hoveredRow !== null ? getCellScales(hoveredCol) : Array(TOTAL_COLS).fill(1);

  const tdStyle = useCallback((colIdx: number, rowIdx: number) => ({
    transition: "transform 0.2s ease, color 0.15s ease",
    transform: hoveredRow === rowIdx
      ? (colIdx === 0 ? "scale(1)" : `scale(${cellScales[colIdx]})`)
      : "scale(1)",
    transformOrigin: colIdx === 0 ? "left center" : "center center",
    display: "inline-block" as const,
    whiteSpace: "nowrap" as const,
  }), [hoveredRow, cellScales]);

  const filtered = search
    ? data.filter(row => row[0]?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const handleRowClick = (row: string[]) => {
    setSelectedProduct(row);
    setNewCNY(row[3] || "");
    setNewQty(row[6] || "");
    setAddedToMain(false);
    setShowAddConfirm(false);
  };

  const handleCommit = () => {
    if (!selectedProduct || !newCNY) return;
    const oldPriceRM = parseFloat(selectedProduct[1]) || 0;
    const cnyPrice = parseFloat(selectedProduct[2]) || 0;
    const cnyVal = parseFloat(newCNY);
    const qtyVal = parseInt(newQty) || 0;
    onUpdate(selectedProduct[0], newCNY, qtyVal > 0 ? qtyVal : undefined);
    onAddToMain(selectedProduct[0], oldPriceRM, cnyPrice, cnyVal, qtyVal);
    setSelectedProduct(null);
    setNewCNY("");
    setNewQty("");
  };

  const handleAddToMain = () => {
    if (!selectedProduct) return;
    const oldPriceRM = parseFloat(selectedProduct[1]) || 0;
    const cnyPrice = parseFloat(selectedProduct[2]) || 0;
    const cnyVal = newCNY ? parseFloat(newCNY) : undefined;
    const qtyVal = newQty ? parseInt(newQty) : undefined;
    onAddToMain(selectedProduct[0], oldPriceRM, cnyPrice, cnyVal, qtyVal);
    setAddedToMain(true);
    setShowAddConfirm(false);
  };

  const calculatedNewRM = newCNY && !isNaN(parseFloat(newCNY))
    ? (parseFloat(newCNY) / rate).toFixed(2)
    : "";

  const calculatedSavings = selectedProduct && calculatedNewRM
    ? (parseFloat(selectedProduct[1]) - parseFloat(calculatedNewRM)).toFixed(2)
    : "";

  const calculatedTotalRM = calculatedNewRM && newQty && parseInt(newQty) > 0
    ? (parseFloat(calculatedNewRM) * parseInt(newQty)).toFixed(2)
    : "";

  if (!open) return null;

  // Column definitions matching PriceTable exactly
  const columns = [
    { label: "Product Name", sub: "" },
    { label: "Old Price", sub: "RM" },
    { label: "China Price", sub: "CNY" },
    { label: "New Price", sub: "CNY" },
    { label: "New Price", sub: "RM" },
    { label: "Savings", sub: "RM" },
    { label: "Qty", sub: "" },
    { label: "Total Value", sub: "RM" },
    { label: "Office Stock", sub: "" },
  ];

  const thClass = "label-uppercase font-normal text-left py-0 pb-4 transition-all";

  const formatCellValue = (value: string, colIdx: number): string => {
    if (!value || value === "—" || value === "0") return "—";
    const n = parseFloat(value);
    if (isNaN(n)) return value;
    // RM columns: 1 (old price), 4 (new RM), 5 (savings), 7 (total value)
    if ([1, 4, 5, 7].includes(colIdx)) return "RM " + n.toFixed(2);
    // CNY columns: 2 (china price), 3 (new CNY)
    if ([2, 3].includes(colIdx)) return "¥ " + n.toFixed(2);
    // Qty, Office Stock: integer
    if ([6, 8].includes(colIdx)) return String(Math.round(n));
    return value;
  };

  return (
    <>
      <div className="fixed inset-0 panel-overlay z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[1100px] panel-bg z-[201] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-10 py-8 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-light tracking-[0.15em] uppercase text-dim">Full Product List</h2>
            <p className="text-[11px] text-muted-foreground mt-1">{data.length ? `${data.length} products` : "No products loaded"}</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              className="minimal-input text-[13px] font-light py-1.5 w-[200px]"
              placeholder="Filter products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto px-10 pb-10 scrollbar-thin">
          {!filtered.length && !headers.length ? (
            <div className="text-center text-muted-foreground text-[13px] py-16 tracking-wider">Import an Excel file to view the full product list</div>
          ) : (
            <>
              <table className="w-full border-collapse mt-6" style={{ minWidth: "1050px" }}>
                <thead>
                  <tr className="border-b border-border-active">
                    {columns.map((h, i) => (
                      <th key={i} className={`${thClass} ${i > 0 ? "text-center" : ""} align-top group`}>
                        <span className="block">{h.label}</span>
                        {h.sub ? <span className="block text-[9px] tracking-wider text-muted-foreground mt-0.5">{h.sub}</span> : <span className="block text-[9px] mt-0.5">&nbsp;</span>}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, ri) => {
                    const hasNewPrice = row[3] && parseFloat(row[3]) > 0;
                    const savings = row[5] ? parseFloat(row[5]) : null;
                    return (
                      <tr
                        key={ri}
                        className={`border-b border-border table-row-hover cursor-pointer ${hasNewPrice ? "font-normal" : ""}`}
                        onClick={() => handleRowClick(row)}
                        onMouseEnter={() => setHoveredRow(ri)}
                        onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}
                      >
                        {columns.map((_, ci) => {
                          const cellValue = row[ci] || "";
                          let colorClass = "text-dim";
                          if (ci === 5 && savings !== null) {
                            colorClass = savings > 0 ? "text-green" : savings < 0 ? "text-red" : "text-dim";
                          }
                          if ([3, 4].includes(ci) && hasNewPrice) colorClass = "";
                          return (
                            <td key={ci} className={`text-[13px] font-light ${colorClass} py-3.5 ${ci > 0 ? "text-center" : "pl-3"}`} onMouseEnter={() => setHoveredCol(ci)}>
                              <span style={tdStyle(ci, ri)}>{formatCellValue(cellValue, ci)}</span>
                            </td>
                          );
                        })}
                        <td className="text-[13px] py-3.5 text-center w-8 min-w-8">
                          {hasNewPrice && (
                            <button onClick={e => { e.stopPropagation(); onClear(row[0]); }} className="text-muted-foreground hover:text-red transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-6 pt-2">
                <label className="text-[10px] text-muted-foreground cursor-pointer tracking-wider uppercase select-none hover:text-dim transition-colors flex items-center gap-1.5">
                  Import Excel <Upload size={11} className="-mt-0.5" />
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && onImport(e.target.files[0])} />
                </label>
              </div>
            </>
          )}
        </div>

        {/* Edit Product Popup */}
        {selectedProduct && (
          <div className="fixed inset-0 panel-overlay z-[300] flex items-center justify-center" onClick={() => setSelectedProduct(null)}>
            <div className="surface-box p-9 max-w-[460px] w-[90%] relative" onClick={e => e.stopPropagation()}>

              {/* + button */}
              <button
                onClick={() => !addedToMain && setShowAddConfirm(true)}
                className={`absolute top-9 right-9 transition-colors ${addedToMain ? "text-green" : "text-muted-foreground hover:text-foreground"}`}
                title="Add to main table"
              >
                {addedToMain ? <span className="text-[11px] tracking-wider uppercase">✓ Added</span> : <Plus size={18} />}
              </button>

              {/* Add confirm popup */}
              {showAddConfirm && (
                <div className="fixed inset-0 panel-overlay z-[400] flex items-center justify-center" onClick={() => setShowAddConfirm(false)}>
                  <div className="surface-box p-9 max-w-[360px] w-[90%] text-center" onClick={e => e.stopPropagation()}>
                    <p className="text-[13px] font-light text-dim mb-2">Add this product to the main table?</p>
                    <p className="text-base font-light text-foreground mb-7">{selectedProduct?.[0]}</p>
                    <div className="flex gap-2.5 justify-center">
                      <button onClick={handleAddToMain} className="minimal-btn !border-foreground !text-foreground">Add</button>
                      <button onClick={() => setShowAddConfirm(false)} className="minimal-btn">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

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
                <div>
                  <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">Quantity <span className="text-muted-foreground">(optional)</span></label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="minimal-input text-[15px] font-light w-full"
                    value={newQty}
                    onChange={e => setNewQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
                {calculatedNewRM && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">New Price (RM)</label>
                        <div className="text-[15px] font-light text-foreground">RM {calculatedNewRM}</div>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">Savings</label>
                        <div className={`text-[15px] font-light ${parseFloat(calculatedSavings) > 0 ? "text-green" : parseFloat(calculatedSavings) < 0 ? "text-red" : "text-foreground"}`}>
                          RM {calculatedSavings}
                        </div>
                      </div>
                    </div>
                    {calculatedTotalRM && (
                      <div>
                        <label className="text-[11px] text-muted-foreground tracking-wider uppercase block mb-1.5">Total Value (RM)</label>
                        <div className="text-[15px] font-light text-foreground">RM {calculatedTotalRM}</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2.5 justify-end">
                <button onClick={() => setSelectedProduct(null)} className="minimal-btn">Cancel</button>
                <button
                  onClick={handleCommit}
                  className="minimal-btn !border-foreground !text-foreground"
                  disabled={!newCNY || isNaN(parseFloat(newCNY))}
                >
                  Save & Add to Main Table
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
