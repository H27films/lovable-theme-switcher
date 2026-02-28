import { useState, useRef, useCallback } from "react";
import { type ProductRow } from "@/hooks/usePriceLookup";
import { X, Download } from "lucide-react";

interface PriceTableProps {
  data: ProductRow[];
  rate: number;
  overrideCNY: Record<string, string>;
  overrideQty: Record<string, number>;
  newProducts: Set<string>;
  onRowClick: (row: ProductRow) => void;
  onClearPrice: (name: string) => void;
  onRemoveProduct: (name: string) => void;
  onSort: (col: string, dir: number) => void;
  onImport: (file: File) => void;
  onClearAll: () => void;
  onExport: () => void;
  expanded: boolean;
}

const TOTAL_COLS = 10;

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

export default function PriceTable({
  data, rate, overrideCNY, overrideQty, newProducts, onRowClick, onClearPrice,
  onRemoveProduct, onSort, onImport, onClearAll, onExport, expanded,
}: PriceTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState(1);
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cellScales = hoveredRow ? getCellScales(hoveredCol) : Array(TOTAL_COLS).fill(1);

  const tdStyle = useCallback((colIdx: number, rowName: string) => ({
    transition: "transform 0.2s ease, color 0.15s ease",
    transform: hoveredRow === rowName
      ? (colIdx === 0 ? "translateX(2px) scale(1)" : `scale(${cellScales[colIdx]})`)
      : "scale(1)",
    transformOrigin: colIdx === 0 ? "0% center" : "center center",
    display: "inline-block" as const,
    whiteSpace: "nowrap" as const,
  }), [hoveredRow, cellScales]);

  const handleSort = (col: string) => {
    const newDir = sortCol === col ? sortDir * -1 : 1;
    setSortCol(col);
    setSortDir(newDir);
    onSort(col, newDir);
  };

  const toRM = (cny: string) => {
    const v = parseFloat(cny);
    return isNaN(v) ? null : (v / rate).toFixed(2);
  };

  const getSavings = (oldRM: string, newRM: string) => {
    const o = parseFloat(oldRM), n = parseFloat(newRM);
    return (isNaN(o) || isNaN(n)) ? null : (o - n).toFixed(2);
  };

  const fmtRM = (v: string) => v && !isNaN(parseFloat(v)) ? "RM " + parseFloat(v).toFixed(2) : "—";
  const fmtCNY = (v: string) => v && !isNaN(parseFloat(v)) ? "¥ " + parseFloat(v).toFixed(2) : "—";

  const thClass = "label-uppercase font-normal text-left py-0 pb-4 cursor-pointer transition-all hover:text-foreground";

  return (
    <div className={`w-full max-w-[760px] transition-all ${expanded ? "mt-12" : "mt-6"}`}>
      <div className="flex justify-between items-center mb-5">
        <span className="label-uppercase">{data.length} products</span>
        <label className="minimal-btn cursor-pointer">
          Import Excel
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onClick={e => { (e.target as HTMLInputElement).value = ""; }} onChange={e => e.target.files?.[0] && onImport(e.target.files[0])} />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: "1050px" }}>
          <thead>
            <tr className="border-b border-border-active">
              {[
                { col: "name", label: "Product Name" },
                { col: "oldPrice", label: "Old Price", sub: "RM" },
                { col: "cnyPrice", label: "China Price", sub: "CNY" },
                { col: "newCNY", label: "New Price", sub: "CNY" },
                { col: "newRM", label: "New Price", sub: "RM" },
                { col: "savings", label: "Savings", sub: "RM" },
                { col: "qty", label: "Qty" },
                { col: "totalRM", label: "Total Value", sub: "RM" },
                { col: "officeStock", label: "Office Stock" },
              ].map(h => (
                <th key={h.col} onClick={() => handleSort(h.col)} className={`${thClass} ${h.col !== "name" ? "text-center" : ""} align-top group`}>
                  <span className="block">{h.label}</span>
                  {h.sub ? <span className="block text-[9px] tracking-wider text-muted-foreground group-hover:text-foreground mt-0.5">{h.sub}</span> : <span className="block text-[9px] mt-0.5">&nbsp;</span>}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const isNew = newProducts.has(row.name);
              const cny = overrideCNY[row.name] || "";
              const rm = cny ? toRM(cny) : null;
              const sav = rm ? getSavings(row.oldPrice, rm) : null;
              const hasEntry = !!cny && !isNaN(parseFloat(cny));
              const qty = overrideQty[row.name] || 0;
              const totalRM = rm && qty > 0 ? (parseFloat(rm) * qty).toFixed(2) : null;

              if (isNew) {
                const unitCNY = parseFloat(row.cnyPrice) || 0;
                const unitRM = unitCNY ? (unitCNY / rate).toFixed(2) : null;
                const newTotalRM = unitRM && qty > 0 ? (parseFloat(unitRM) * qty).toFixed(2) : null;
                return (
                  <tr key={row.name} className="border-b border-border table-row-hover cursor-pointer font-normal text-foreground"
                    onClick={() => onRowClick(row)}
                    onMouseEnter={() => setHoveredRow(row.name)}
                    onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}
                  >
                    <td className="text-[13px] font-light py-3.5 text-dim pl-3" onMouseEnter={() => setHoveredCol(0)}><span style={tdStyle(0, row.name)}>{row.name}</span></td>
                    <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(1)}><span style={tdStyle(1, row.name)}>{unitRM ? "RM " + unitRM : "—"}</span></td>
                    <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(2)}><span style={tdStyle(2, row.name)}>{unitCNY ? "¥ " + unitCNY.toFixed(2) : "—"}</span></td>
                    <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(3)}><span style={tdStyle(3, row.name)}>{unitCNY ? "¥ " + unitCNY.toFixed(2) : "—"}</span></td>
                    <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(4)}><span style={tdStyle(4, row.name)}>{unitRM ? "RM " + unitRM : "—"}</span></td>
                    <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(5)}><span style={tdStyle(5, row.name)}>—</span></td>
                    <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(6)}><span style={tdStyle(6, row.name)}>{qty > 0 ? qty : "—"}</span></td>
                    <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(7)}><span style={tdStyle(7, row.name)}>{newTotalRM ? "RM " + newTotalRM : "—"}</span></td>
                    <td className="text-[13px] font-light py-3.5 text-center text-dim" onMouseEnter={() => setHoveredCol(8)}><span style={tdStyle(8, row.name)}>{row.officeStock || "—"}</span></td>
                    <td className="text-[13px] py-3.5 text-center w-8 min-w-8" onMouseEnter={() => setHoveredCol(9)}>
                      <button onClick={e => { e.stopPropagation(); setConfirmName(row.name); }} className="text-muted-foreground hover:text-red transition-colors text-xs">›</button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={row.name} className={`border-b border-border table-row-hover cursor-pointer ${hasEntry ? "font-normal" : ""}`}
                  onClick={() => onRowClick(row)}
                  onMouseEnter={() => setHoveredRow(row.name)}
                  onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}
                >
                  <td className="text-[13px] font-light py-3.5 text-dim pl-3" onMouseEnter={() => setHoveredCol(0)}><span style={tdStyle(0, row.name)}>{row.name}</span></td>
                  <td className="text-[13px] font-light py-3.5 text-center text-dim" onMouseEnter={() => setHoveredCol(1)}><span style={tdStyle(1, row.name)}>{fmtRM(row.oldPrice)}</span></td>
                  <td className="text-[13px] font-light py-3.5 text-center text-dim" onMouseEnter={() => setHoveredCol(2)}><span style={tdStyle(2, row.name)}>{fmtCNY(row.cnyPrice)}</span></td>
                  <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(3)}><span style={tdStyle(3, row.name)}>{hasEntry ? "¥ " + parseFloat(cny).toFixed(2) : "—"}</span></td>
                  <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(4)}><span style={tdStyle(4, row.name)}>{rm ? "RM " + rm : "—"}</span></td>
                  <td className={`text-[13px] font-light py-3.5 text-center ${sav ? (parseFloat(sav) > 0 ? "text-green" : "text-red") : ""}`} onMouseEnter={() => setHoveredCol(5)}><span style={tdStyle(5, row.name)}>{sav ? "RM " + sav : "—"}</span></td>
                  <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(6)}><span style={tdStyle(6, row.name)}>{qty > 0 ? qty : "—"}</span></td>
                  <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(7)}><span style={tdStyle(7, row.name)}>{totalRM ? "RM " + totalRM : "—"}</span></td>
                  <td className="text-[13px] font-light py-3.5 text-center text-dim" onMouseEnter={() => setHoveredCol(8)}><span style={tdStyle(8, row.name)}>{row.officeStock || "—"}</span></td>
                  <td className="text-[13px] py-3.5 text-center w-8 min-w-8" onMouseEnter={() => setHoveredCol(9)}>
                    {hasEntry && (
                      <button onClick={e => { e.stopPropagation(); onClearPrice(row.name); }} className="text-muted-foreground hover:text-red transition-colors">
                        <X size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6 pb-2">
        <span onClick={onExport} className="text-[10px] text-muted-foreground cursor-pointer tracking-wider uppercase select-none hover:text-dim transition-colors flex items-center gap-1.5">
          Export <Download size={11} className="inline -mt-0.5" />
        </span>
        <span onClick={() => { if (confirm("Clear all saved data?")) onClearAll(); }} className="text-[10px] text-muted-foreground cursor-pointer tracking-wider uppercase select-none hover:text-dim transition-colors">
          Reset saved data
        </span>
      </div>

      {confirmName && (
        <div className="fixed inset-0 panel-overlay z-[300] flex items-center justify-center" onClick={() => setConfirmName(null)}>
          <div className="surface-box p-9 max-w-[360px] w-[90%] text-center" onClick={e => e.stopPropagation()}>
            <p className="text-[13px] font-light text-dim mb-2">Remove item from list?</p>
            <p className="text-base font-light text-foreground mb-7">{confirmName}</p>
            <div className="flex gap-2.5 justify-center">
              <button onClick={() => { onRemoveProduct(confirmName); setConfirmName(null); }} className="minimal-btn !border-red !text-red hover:!bg-red hover:!text-foreground">Remove</button>
              <button onClick={() => setConfirmName(null)} className="minimal-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
