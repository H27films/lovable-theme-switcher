import { useState } from "react";
import { X } from "lucide-react";

interface NewProductPanelProps {
  open: boolean;
  onClose: () => void;
  rate: number;
  onAdd: (name: string, finalCNY: number, qty: number) => void;
}

export default function NewProductPanel({ open, onClose, rate, onAdd }: NewProductPanelProps) {
  const [name, setName] = useState("");
  const [cny, setCny] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const cnyVal = parseFloat(cny) || 0;
  const qtyVal = parseInt(qty) || 0;

  const unitRM = cnyVal > 0 ? cnyVal / rate : 0;
  const totalRM = unitRM * (qtyVal > 0 ? qtyVal : 1);

  const liveRM = cnyVal > 0 ? `RM ${unitRM.toFixed(2)}` : "";

  const handleAdd = () => {
    if (!name.trim() || !cnyVal) { setError(true); return; }
    setError(false);
    onAdd(name.trim(), cnyVal, qtyVal);
    setName(""); setCny(""); setQty("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 panel-overlay z-[200]" onClick={onClose} />

      {/* Panel — pure black background like main page */}
      <div
        className="fixed top-0 right-0 bottom-0 w-full max-w-[900px] z-[201] flex flex-col transform transition-transform duration-300"
        style={{ background: "hsl(0 0% 3%)", borderLeft: "1px solid hsl(var(--border-active))" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-10 py-8 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-light tracking-[0.15em] uppercase text-dim">New Product</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 scrollbar-thin">

          {/* Product Name */}
          <div className="mb-8">
            <span className="label-uppercase block mb-2.5">Product Name</span>
            <input
              type="text"
              className="minimal-input text-xl font-light py-2.5"
              placeholder="Enter product name..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* CNY Price input — card-background box like main page surface */}
          <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border-active))" }} className="p-5 mb-0">
            <span className="text-[13px] font-light tracking-wider uppercase text-dim block mb-4">New Price CNY</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">CNY ¥</span>
              <input
                type="text"
                inputMode="decimal"
                className="minimal-input text-[22px] font-light py-1"
                style={{ width: "100%" }}
                placeholder="0.00"
                value={cny}
                onChange={e => setCny(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
          
            </div>
            <div className="text-[13px] text-dim mt-2.5">
              {cnyVal > 0
                ? `¥${cnyVal.toFixed(2)} ÷ ${rate} = RM ${unitRM.toFixed(2)}`
                : "Enter CNY price — RM will calculate automatically"}
            </div>
          </div>

          {/* Quantity — same card style, no top border to connect with above */}
          <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border-active))", borderTop: "none" }} className="p-5 pb-7 mb-8">
            <span className="label-uppercase block mb-2.5">Quantity <span className="text-muted-foreground">(optional)</span></span>
            <input
              type="number"
              className="minimal-input text-base font-light py-1"
              placeholder="0"
              step="1"
              min="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
            <div className="text-xs text-muted-foreground mt-1.5">Number of units</div>
          </div>

          {/* Preview boxes — card colour on black background, same as main table */}
          {cnyVal > 0 && (
            <div className="mb-7">
              <div className="label-uppercase mb-3">Preview</div>
              {/* gap-px with price-grid-gap background creates the visible divider lines between boxes */}
              <div className={`grid gap-px price-grid-gap ${qtyVal > 0 ? "grid-cols-5" : "grid-cols-2"}`}>
                <div style={{ background: "hsl(var(--card))" }} className="py-6 px-4">
                  <span className="label-uppercase block mb-2.5">New Price CNY</span>
                  <span className="value-display">¥ {cnyVal.toFixed(2)}</span>
                  <div className="currency-label">CNY</div>
                </div>
                <div style={{ background: "hsl(var(--card))" }} className="py-6 px-4">
                  <span className="label-uppercase block mb-2.5">New Price RM</span>
                  <span className="value-display">RM {unitRM.toFixed(2)}</span>
                  <div className="currency-label">1 RM = ¥{rate.toFixed(2)}</div>
                </div>
                {qtyVal > 0 && (
                  <div style={{ background: "hsl(var(--card))" }} className="py-6 px-4">
                    <span className="label-uppercase block mb-2.5">Quantity</span>
                    <span className="value-display">{qtyVal}</span>
                    <div className="currency-label">Units</div>
                  </div>
                )}
                {qtyVal > 0 && (
                  <div style={{ background: "hsl(var(--card))" }} className="py-6 px-4">
                    <span className="label-uppercase block mb-2.5">Total Value RM</span>
                    <span className="value-display">RM {totalRM.toFixed(2)}</span>
                    <div className="currency-label">RM</div>
                  </div>
                )}
                {qtyVal > 0 && (
                  <div style={{ background: "hsl(var(--card))" }} className="py-6 px-4">
                    <span className="label-uppercase block mb-2.5">Total Value CNY</span>
                    <span className="value-display">¥ {(cnyVal * qtyVal).toFixed(2)}</span>
                    <div className="currency-label">CNY</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red text-xs mb-4">Please enter at least a product name and new CNY price.</div>
          )}

          <button onClick={handleAdd} className="minimal-btn">Add to Table</button>

          {success && (
            <div className="text-green text-xs mt-4 tracking-wider">✓ Product added to table and saved to database</div>
          )}

        </div>
      </div>
    </>
  );
}
