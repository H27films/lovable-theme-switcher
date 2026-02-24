import { useState } from "react";
import { X } from "lucide-react";

interface NewProductPanelProps {
  open: boolean;
  onClose: () => void;
  rate: number;
  onAdd: (name: string, finalCNY: number) => void;
}

export default function NewProductPanel({ open, onClose, rate, onAdd }: NewProductPanelProps) {
  const [name, setName] = useState("");
  const [cny, setCny] = useState("");
  const [delivery, setDelivery] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const cnyVal = parseFloat(cny) || 0;
  const deliveryVal = parseFloat(delivery) || 0;
  const qtyVal = parseFloat(qty) || 0;

  let finalCNY = cnyVal;
  if (deliveryVal > 0 && qtyVal > 0) finalCNY = cnyVal + deliveryVal / qtyVal;
  const finalRM = finalCNY / rate;

  const handleAdd = () => {
    if (!name.trim() || !cnyVal) { setError(true); return; }
    setError(false);
    onAdd(name.trim(), finalCNY);
    setName(""); setCny(""); setDelivery(""); setQty("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 panel-overlay z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[900px] panel-bg z-[201] flex flex-col transform transition-transform duration-300">
        <div className="flex justify-between items-center px-10 py-8 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-light tracking-[0.15em] uppercase text-dim">New Product</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-10 scrollbar-thin">
          <div className="mb-8">
            <span className="label-uppercase block mb-2.5">Product Name</span>
            <input type="text" className="minimal-input text-xl font-light py-2.5" placeholder="Enter product name..." value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="mb-6">
            <span className="label-uppercase block mb-2.5">New Price CNY</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">CNY ¥</span>
              <input type="number" className="minimal-input text-xl font-light py-2.5" placeholder="0.00" step="0.01" value={cny} onChange={e => setCny(e.target.value)} />
            </div>
          </div>
          <div className="surface-box p-5 mb-6">
            <div className="label-uppercase mb-4">Optional — Delivery & Quantity</div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="label-uppercase block mb-2">Delivery Charge <span className="text-muted-foreground">(CNY)</span></span>
                <input type="number" className="minimal-input text-base font-light py-2" placeholder="0.00" step="0.01" value={delivery} onChange={e => setDelivery(e.target.value)} />
              </div>
              <div>
                <span className="label-uppercase block mb-2">Quantity</span>
                <input type="number" className="minimal-input text-base font-light py-2" placeholder="0" step="1" min="1" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
            </div>
          </div>
          {cnyVal > 0 && (
            <div className="mb-7">
              <div className="label-uppercase mb-3">Preview</div>
              <div className="grid grid-cols-2 gap-px price-grid-gap">
                <div className="price-box p-4">
                  <div className="label-uppercase mb-2">Unit Cost CNY</div>
                  <div className="text-lg font-light">¥ {finalCNY.toFixed(2)}</div>
                </div>
                <div className="price-box p-4">
                  <div className="label-uppercase mb-2">Unit Cost RM</div>
                  <div className="text-lg font-light">RM {finalRM.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                {deliveryVal > 0 && qtyVal > 0
                  ? `¥${cnyVal.toFixed(2)} + (¥${deliveryVal.toFixed(2)} ÷ ${qtyVal}) = ¥${finalCNY.toFixed(2)} unit cost`
                  : `¥${finalCNY.toFixed(2)} ÷ ${rate} = RM ${finalRM.toFixed(2)}`}
              </div>
            </div>
          )}
          {error && <div className="text-red text-xs mb-4">Please enter at least a product name and new CNY price.</div>}
          <button onClick={handleAdd} className="minimal-btn">Add to Table</button>
          {success && <div className="text-green text-xs mt-4 tracking-wider">✓ Product added to table</div>}
        </div>
      </div>
    </>
  );
}
