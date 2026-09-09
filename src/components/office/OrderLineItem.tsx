import React from "react";
import { X, ChevronDown, Minus, Plus } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { ResultRow } from "@/components/branch/ResultRow";
import type { OfficeProduct, OrderLine } from "@/components/office/OrderSummaryOffice";

interface OrderLineItemProps {
  line: OrderLine;
  idx: number;
  products: OfficeProduct[];
  openSupplierIdx: number | null;
  setOpenSupplierIdx: React.Dispatch<React.SetStateAction<number | null>>;
  supplierChoiceIdx: number;
  handleSupplierChoiceKeyNav: (e: React.KeyboardEvent<HTMLElement>) => void;
  chooseSupplierForOpenLine: (choice: string) => void;
  setOrderLines: React.Dispatch<React.SetStateAction<OrderLine[]>>;
  getBalanceColor: (balance: number | null, par: number | null, muted: string) => string;
  fg: string;
  muted: string;
  border: string;
}

/**
 * A single order row (product name + balance, remove button, supplier-choice
 * dropdown, quantity stepper) for the Office Order page — extracted verbatim
 * from the orderLines .map() callback in src/pages/Order.tsx as a pure refactor
 * (no visual or behavioural change). key={idx} stays on the mapped element.
 */
export function OrderLineItem({
  line,
  idx,
  products,
  openSupplierIdx,
  setOpenSupplierIdx,
  supplierChoiceIdx,
  handleSupplierChoiceKeyNav,
  chooseSupplierForOpenLine,
  setOrderLines,
  getBalanceColor,
  fg,
  muted,
  border,
}: OrderLineItemProps) {
  const siblings = products.filter(s =>
    s["PRODUCT NAME"] === line.product["PRODUCT NAME"] && s.id !== line.product.id && s["SUPPLIER"] !== line.product["SUPPLIER"]
  );
  const needsChoice = siblings.length > 0 && line.supplierChoice === null;
  const allChoices = [line.product["SUPPLIER"], ...siblings.map(s => s["SUPPLIER"])].filter(Boolean) as string[];
  const units = line.product["UNITS/ORDER"] ?? 1;
  return (
    <div style={{ borderBottom: border, padding: "12px 0" }}>
      {/* Row 1: product name + inline balance + remove */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: fg, flex: 1, marginRight: "8px" }}>
          {line.product["PRODUCT NAME"]}
          <span style={{ fontSize: "13px", color: getBalanceColor(line.product["OFFICE BALANCE"], line.product["PAR"], muted) }}>{"     "}{line.product["OFFICE BALANCE"] ?? "—"}</span>
        </div>
        <button onClick={() => setOrderLines(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: muted, flexShrink: 0 }}>
          <X size={13} />
        </button>
      </div>
      {/* Row 2: supplier + qty stepper */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          {siblings.length > 0 ? (
            <div>
              <button
                onClick={() => setOpenSupplierIdx(prev => prev === idx ? null : idx)}
                onKeyDown={handleSupplierChoiceKeyNav}
                aria-expanded={openSupplierIdx === idx}
                aria-haspopup="listbox"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "4px", fontFamily: "Raleway, inherit" }}
              >
                <span style={{ fontSize: "11px", fontWeight: 300, color: needsChoice ? "hsl(var(--destructive, 0 84% 60%))" : muted }}>
                  {line.supplierChoice ?? "Select supplier"}
                </span>
                <ChevronDown size={10} style={{ color: muted }} />
              </button>
              {needsChoice && (
                <div style={{ fontSize: "10px", color: "hsl(var(--destructive, 0 84% 60%))", marginTop: "2px", letterSpacing: "0.04em" }}>Please select supplier</div>
              )}
              {openSupplierIdx === idx && (
                <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))", borderRadius: "6px", marginTop: "2px", minWidth: "160px" }}>
                  {allChoices.map((sup, choiceIdx) => (
                    <ResultRow
                      key={sup}
                      isActive={supplierChoiceIdx === choiceIdx}
                      onSelect={() => chooseSupplierForOpenLine(sup)}
                      style={{ padding: "8px 12px", fontSize: "12px", fontFamily: "Raleway, inherit", color: line.supplierChoice === sup ? fg : muted, borderBottom: border }}
                    >
                      {sup}
                    </ResultRow>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted }}>
              {line.product["SUPPLIER"] ?? "—"}
              {units > 1 && <span style={{ marginLeft: "6px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>× {units} units</span>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx && l.qty > 1 ? { ...l, qty: l.qty - 1 } : l))} aria-label="Decrease quantity" style={{ background: "rgba(222, 214, 207, 0.5)", border: "0.5px solid rgba(180, 165, 152, 0.45)", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Minus size={14} strokeWidth={2.5} />
          </button>
          {/* Same magnitude-based spin as the UsageTable qty: digits roll the short way. */}
          <span style={{ minWidth: "20px", textAlign: "center", fontSize: "14px", fontFamily: "Raleway, inherit", color: fg }}>
            <NumberFlow value={line.qty} trend={(old, val) => (Math.abs(val) >= Math.abs(old) ? 1 : -1)} format={{ useGrouping: false }} willChange />
          </span>
          <button onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: l.qty + 1 } : l))} aria-label="Increase quantity" style={{ background: "rgba(222, 214, 207, 0.5)", border: "0.5px solid rgba(180, 165, 152, 0.45)", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Plus size={14} strokeWidth={2.5} />
          </button>
          {units > 1 && <span style={{ fontSize: "10px", fontFamily: "Raleway, inherit", color: muted }}>= {line.qty * units}</span>}
        </div>
      </div>
    </div>
  );
}
