import { useState, useEffect, useCallback } from "react";
import { type ProductRow } from "@/hooks/usePriceLookup";
import { X } from "lucide-react";

interface ResultCardProps {
  row: ProductRow | null;
  rate: number;
  getRowCNY: (row: ProductRow) => string;
  toRM: (cny: string | number) => string | null;
  getSavings: (oldRM: string, newRM: string) => string | null;
  onCommit: (name: string, cnyValue: string, mode: "unit" | "bundle", bundleQty: number, delivery: number, qty: number) => void;
  onDone: () => void;
}

export default function ResultCard({ row, rate, getRowCNY, toRM, getSavings, onCommit, onDone }: ResultCardProps) {
  const [priceMode, setPriceMode] = useState<"unit" | "bundle">("unit");
  const [newPriceInput, setNewPriceInput] = useState("");
  const [qty, setQty] = useState("");
  const [bundleQty, setBundleQty] = useState("");
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    if (row) {
      const cny = getRowCNY(row);
      setNewPriceInput(cny || "");
      setQty("");
      setBundleQty("");
      setPriceMode("unit");
      setCommitted(false);
    }
  }, [row, getRowCNY]);

  const calcValues = useCallback(() => {
    if (!row) return { cnyDisplay: "—", rmDisplay: "—", savDisplay: "—", savClass: "value-dim", totalRMDisplay: "—" };
    const rawCNY = parseFloat(newPriceInput);
    if (isNaN(rawCNY)) return { cnyDisplay: "—", rmDisplay: "—", savDisplay: "—", savClass: "value-dim", totalRMDisplay: "—" };

    const bq = parseFloat(bundleQty) || 0;
    const q = parseFloat(qty) || 0;

    let unitCNY = priceMode === "bundle" && bq > 0 ? rawCNY / bq : rawCNY;

    const unitRM = unitCNY / rate;
    const sav = parseFloat(row.oldPrice) - unitRM;
    const effectiveQty = priceMode === "bundle" ? bq : q;
    const totalRM = effectiveQty > 0 ? unitRM * effectiveQty : 0;

    return {
      cnyDisplay: "¥ " + unitCNY.toFixed(2),
      rmDisplay: "RM " + unitRM.toFixed(2),
      savDisplay: "RM " + sav.toFixed(2),
      savClass: sav >= 0 ? "value-green" : "value-red",
      totalRMDisplay: totalRM > 0 ? "RM " + totalRM.toFixed(2) : "—",
      unitCNY, unitRM, sav,
    };
  }, [row, newPriceInput, qty, bundleQty, priceMode, rate]);

  if (!row) return null;

  const vals = calcValues();
  const rawCNY = parseFloat(newPriceInput);
  const liveRM = !isNaN(rawCNY) ? "RM " + (rawCNY / rate).toFixed(2) : "";

  const handleCommit = () => {
    if (!newPriceInput) return;
    onCommit(row.name, newPriceInput, priceMode, parseFloat(bundleQty) || 0, 0, parseFloat(qty) || 0);
    setCommitted(true);
    setTimeout(() => onDone(), 300);
  };

  const hasQty = parseFloat(qty) > 0 || (priceMode === "bundle" && parseFloat(bundleQty) > 0);
  const showUnitResult = (priceMode === "bundle" && parseFloat(bundleQty) > 0);

  return (
    <div className="animate-slide-in mb-0">
      {/* Product name */}
      <div className="flex items-center justify-between mb-8 pb-5 border-b border-border">
        <span className="text-[22px] font-light tracking-tight">{row.name}</span>
        <button onClick={onDone} className="text-foreground/70 hover:text-foreground transition-colors p-1.5" aria-label="Close">
          <X size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* Price cards */}
      <div className="grid grid-cols-5 gap-px price-grid-gap mb-8">
        <div className="price-box">
          <span className="label-uppercase block mb-2.5">Old Price</span>
          <span className="value-display value-dim">{row.oldPrice ? "RM " + parseFloat(row.oldPrice).toFixed(2) : "—"}</span>
          <div className="currency-label">RM</div>
        </div>
        <div className="price-box">
          <span className="label-uppercase block mb-2.5">China Price</span>
          <span className="value-display value-dim">{row.cnyPrice ? "¥ " + parseFloat(row.cnyPrice).toFixed(2) : "—"}</span>
          <div className="currency-label">CNY</div>
        </div>
        <div className="price-box price-box-highlight">
          <span className="label-uppercase block mb-2.5">New Price CNY</span>
          <span className="value-display">{showUnitResult ? vals.cnyDisplay : (!isNaN(rawCNY) ? "¥ " + rawCNY.toFixed(2) : "—")}</span>
          <div className="currency-label">CNY</div>
        </div>
        <div className="price-box price-box-highlight">
          <span className="label-uppercase block mb-2.5">New Price RM</span>
          <span className="value-display">{showUnitResult ? vals.rmDisplay : (!isNaN(rawCNY) ? "RM " + (rawCNY / rate).toFixed(2) : "—")}</span>
          <div className="currency-label">1 RM = ¥{rate.toFixed(2)}</div>
        </div>
        <div className="price-box">
          <span className="label-uppercase block mb-2.5">Savings</span>
          <span className={`value-display ${vals.savClass}`}>{vals.savDisplay}</span>
          <div className="currency-label">RM</div>
        </div>
      </div>

      {/* CNY Price input with live RM conversion */}
      <div className="surface-box p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[13px] font-light tracking-wider uppercase text-dim">
            {priceMode === "bundle" ? "Enter Bundle Price in CNY" : "Enter New Price in CNY"}
          </span>
          <div className="flex items-center gap-2.5">
            <span onClick={() => setPriceMode("unit")} className={`text-[10px] tracking-[0.15em] uppercase cursor-pointer select-none ${priceMode === "unit" ? "text-foreground" : "text-muted-foreground"}`}>Unit</span>
            <div onClick={() => setPriceMode(m => m === "unit" ? "bundle" : "unit")} className="w-12 h-[26px] rounded-full relative cursor-pointer transition-colors flex-shrink-0" style={{ background: priceMode === "bundle" ? "hsl(var(--foreground))" : "hsl(var(--border-active))" }}>
              <div className="absolute top-[3px] w-5 h-5 rounded-full shadow transition-transform" style={{ background: priceMode === "bundle" ? "hsl(var(--background))" : "hsl(var(--foreground))", transform: priceMode === "bundle" ? "translateX(25px)" : "translateX(3px)" }} />
            </div>
            <span onClick={() => setPriceMode("bundle")} className={`text-[10px] tracking-[0.15em] uppercase cursor-pointer select-none ${priceMode === "bundle" ? "text-foreground" : "text-muted-foreground"}`}>Bundle</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">CNY ¥</span>
          <input
            type="number"
            className="minimal-input text-[22px] font-light py-1"
            placeholder="0.00"
            step="0.01"
            value={newPriceInput}
            onChange={e => { setNewPriceInput(e.target.value); setCommitted(false); }}
            onKeyDown={e => e.key === "Enter" && handleCommit()}
          />
          <span className="text-[15px] font-light text-dim whitespace-nowrap">{liveRM}</span>
          <button onClick={handleCommit} className={`minimal-btn h-11 flex-shrink-0 ${committed ? "!border-green !text-green" : ""}`}>
            {committed ? "✓" : "Enter"}
          </button>
        </div>
        <div className="text-[13px] text-dim mt-2.5">
          {newPriceInput ? `¥${parseFloat(newPriceInput).toFixed(2)} ÷ ${rate} = RM ${(parseFloat(newPriceInput) / rate).toFixed(2)}` : "Enter CNY price — RM and Savings will calculate automatically"}
        </div>
        {priceMode === "bundle" && (
          <div className="mt-5 pt-4 border-t border-border">
            <span className="label-uppercase block mb-2">Quantity in Bundle</span>
            <input type="number" className="minimal-input text-base font-light py-1" placeholder="0" step="1" min="1" value={bundleQty} onChange={e => { setBundleQty(e.target.value); setQty(e.target.value); }} />
          </div>
        )}
      </div>

      {/* Quantity input (optional) */}
      <div className="surface-box border-t-0 p-5 pb-7">
        <span className="label-uppercase block mb-2.5">Quantity <span className="text-muted-foreground">(optional)</span></span>
        <input type="number" className="minimal-input text-base font-light py-1" placeholder="0" step="1" min="1" value={qty} onChange={e => setQty(e.target.value)} />
        <div className="text-xs text-muted-foreground mt-1.5">Number of units</div>
      </div>

      {/* Unit result with optional Total Value */}
      {(showUnitResult || hasQty) && (
        <div className="border border-border border-t-0 p-0" style={{ background: "hsl(var(--card))" }}>
          <div className={`grid ${hasQty ? "grid-cols-4" : "grid-cols-3"} gap-px price-grid-gap`}>
            <div className="price-box-highlight p-4">
              <span className="label-uppercase block mb-2">Unit Cost CNY</span>
              <span className="value-display text-[17px]">{vals.cnyDisplay}</span>
              <div className="currency-label">CNY</div>
            </div>
            <div className="price-box-highlight p-4">
              <span className="label-uppercase block mb-2">Unit Cost RM</span>
              <span className="value-display text-[17px]">{vals.rmDisplay}</span>
              <div className="currency-label">1 RM = ¥{rate.toFixed(2)}</div>
            </div>
            <div className="price-box-highlight p-4">
              <span className="label-uppercase block mb-2">Unit Savings</span>
              <span className={`value-display text-[17px] ${vals.savClass}`}>{vals.savDisplay}</span>
              <div className="currency-label">RM</div>
            </div>
            {hasQty && (
              <div className="price-box-highlight p-4">
                <span className="label-uppercase block mb-2">Total Value</span>
                <span className="value-display text-[17px]">{vals.totalRMDisplay}</span>
                <div className="currency-label">RM</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
