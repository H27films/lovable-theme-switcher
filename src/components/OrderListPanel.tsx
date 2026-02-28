import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { type ProductRow } from "@/hooks/usePriceLookup";

interface OrderListPanelProps {
  open: boolean;
  onClose: () => void;
  data: ProductRow[];
  overrideCNY: Record<string, string>;
  overrideQty: Record<string, number>;
  rate: number;
}

const TOTAL_COLS = 5;

function getCellScales(hoveredCol: number | null): number[] {
  if (hoveredCol === null) return Array(TOTAL_COLS).fill(1);
  return Array.from({ length: TOTAL_COLS }, (_, i) => {
    const dist = Math.abs(i - hoveredCol);
    if (dist === 0) return 1.12;
    if (dist === 1) return 1.06;
    if (dist === 2) return 1.03;
    return 1.0;
  });
}

export default function OrderListPanel({ open, onClose, data, overrideCNY, overrideQty, rate }: OrderListPanelProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const cellScales = hoveredRow ? getCellScales(hoveredCol) : Array(TOTAL_COLS).fill(1);

  const tdStyle = useCallback((colIdx: number, rowName: string) => ({
    transition: "transform 0.2s ease",
    transform: hoveredRow === rowName ? `scale(${cellScales[colIdx]})` : "scale(1)",
    transformOrigin: colIdx === 0 ? "left center" : "center center",
    display: "inline-block" as const,
    whiteSpace: "nowrap" as const,
  }), [hoveredRow, cellScales]);

  // Only show rows where both QTY and Total Value RM are present
  const orderRows = data.filter(row => {
    const qty = overrideQty[row.name] || 0;
    const cny = overrideCNY[row.name];
    const hasRM = cny && !isNaN(parseFloat(cny));
    return qty > 0 && hasRM;
  });

  const totalOrderValue = orderRows.reduce((sum, row) => {
    const cny = overrideCNY[row.name];
    const qty = overrideQty[row.name] || 0;
    const rm = cny ? parseFloat(cny) / rate : 0;
    return sum + rm * qty;
  }, 0);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 panel-overlay z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[900px] panel-bg z-[201] flex flex-col">
        <div className="flex justify-between items-center px-10 py-8 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-light tracking-[0.15em] uppercase text-dim">Order List</h2>
            <p className="text-[11px] text-muted-foreground mt-1">{orderRows.length} items with qty &amp; value</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-10 scrollbar-thin">
          {orderRows.length === 0 ? (
            <div className="text-center text-muted-foreground text-[13px] py-16 tracking-wider">
              No items have both Qty and Total Value RM set yet
            </div>
          ) : (
            <>
              <table className="w-full border-collapse mt-6">
                <thead>
                  <tr className="border-b border-border-active">
                    <th className="label-uppercase font-normal text-left pb-4 pt-2">Product Name</th>
                    <th className="label-uppercase font-normal text-center pb-4 pt-2">
                      New Price<br /><span className="text-[9px] tracking-wider text-muted-foreground">CNY</span>
                    </th>
                    <th className="label-uppercase font-normal text-center pb-4 pt-2">
                      New Price<br /><span className="text-[9px] tracking-wider text-muted-foreground">RM</span>
                    </th>
                    <th className="label-uppercase font-normal text-center pb-4 pt-2">Qty</th>
                    <th className="label-uppercase font-normal text-center pb-4 pt-2">
                      Total Value<br /><span className="text-[9px] tracking-wider text-muted-foreground">RM</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderRows.map(row => {
                    const cny = overrideCNY[row.name];
                    const qty = overrideQty[row.name];
                    const unitRM = parseFloat(cny) / rate;
                    const totalRM = unitRM * qty;

                    return (
                      <tr
                        key={row.name}
                        className="border-b border-border table-row-hover"
                        onMouseEnter={() => setHoveredRow(row.name)}
                        onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}
                      >
                        <td className="text-[13px] font-light py-3.5 text-dim" onMouseEnter={() => setHoveredCol(0)}>
                          <span style={tdStyle(0, row.name)}>{row.name}</span>
                        </td>
                        <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(1)}>
                          <span style={tdStyle(1, row.name)}>¥ {parseFloat(cny).toFixed(2)}</span>
                        </td>
                        <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(2)}>
                          <span style={tdStyle(2, row.name)}>RM {unitRM.toFixed(2)}</span>
                        </td>
                        <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(3)}>
                          <span style={tdStyle(3, row.name)}>{qty}</span>
                        </td>
                        <td className="text-[13px] font-light py-3.5 text-center" onMouseEnter={() => setHoveredCol(4)}>
                          <span style={tdStyle(4, row.name)}>RM {totalRM.toFixed(2)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Total order value summary */}
              <div className="flex justify-end mt-8 pt-5 border-t border-border">
                <div className="text-right">
                  <div className="label-uppercase mb-1">Total Order Value</div>
                  <div className="text-[22px] font-light tracking-tight">RM {totalOrderValue.toFixed(2)}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
