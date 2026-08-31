import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";

export interface OfficeProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "STAFF PRICE": number | null;
  "Colour": string | null;
  "OFFICE BALANCE": number | null;
  "BOUDOIR BALANCE": number | null;
  "CHIC NAILSPA BALANCE": number | null;
  "NUR YADI BALANCE": number | null;
  "OFFICE FAVOURITE": string | null;
  "UNITS/ORDER": number | null;
  "PAR": number | null;
}

export interface OrderLine {
  product: OfficeProduct;
  qty: number;
  supplierChoice: string | null;
}

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.37 17.04 14.27C16.97 14.17 16.81 14.1 16.56 13.98C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.48 13.06 14.31 13.31C14.15 13.55 13.67 14.1 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.48 11.15 9.61 11.01 9.73 10.9C9.84 10.78 9.99 10.6 10.11 10.45C10.24 10.31 10.28 10.2 10.36 10.04C10.44 9.87 10.4 9.73 10.34 9.61C10.28 9.5 9.79 8.27 9.59 7.77C9.39 7.27 9.19 7.33 9.04 7.32C8.88 7.32 8.72 7.33 8.53 7.33Z" />
  </svg>
);

async function generateAndSharePDF(supplier: string, lines: { productName: string; qty: number }[]): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("CHIC NAILSPA SDN BHD", 15, 20);
  doc.text("ORDER SHEET", 195, 20, { align: "right" });

  doc.setLineWidth(0.3);
  doc.line(15, 24, 195, 24);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, 15, 30);
  doc.text("Contact: Soong Ailing", 15, 36);
  doc.text("Phone Number: +60123333128", 15, 42);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(supplier, 15, 52);

  doc.setLineWidth(0.3);
  doc.line(15, 56, 195, 56);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("#", 15, 64);
  doc.text("PRODUCT", 25, 64);
  doc.text("QTY", 185, 64, { align: "right" });
  doc.setLineWidth(0.2);
  doc.line(15, 66, 195, 66);

  doc.setFont("helvetica", "normal");
  let y = 74;
  lines.forEach((item, i) => {
    doc.text(String(i + 1), 15, y);
    const name = doc.splitTextToSize(item.productName, 145);
    doc.text(name, 25, y);
    doc.text(String(item.qty), 185, y, { align: "right" });
    y += name.length > 1 ? name.length * 6 + 2 : 8;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  const blob = doc.output("blob");
  const filename = supplier.replace(/\s+/g, "") + "Order.pdf";
  const file = new File([blob], filename, { type: "application/pdf" });

  try {
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Order for " + supplier });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch {
    // user cancelled share, ignore
  }
}

interface OrderSummaryProps {
  orderLines: OrderLine[];
  setOrderLines: React.Dispatch<React.SetStateAction<OrderLine[]>>;
  products: OfficeProduct[];
  /** Ref to the page's scrollable order-lines area — scrolled back to top on expand so the Add product row stays visible above the summary. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

// "Order Summary" block of the office Order page (extracted from src/pages/Order.tsx). Mirrors the
// branch OrderSummary behaviour: collapsed by default into a slim footer bar pinned to the bottom of
// the page; tapping it expands in-flow — the section is a normal flex child that pushes the order list
// above it up, scrolling internally like part of the page rather than an overlay. Tapping the expanded
// "Order Summary" header row collapses it back down.
export default function OrderSummaryOffice({ orderLines, setOrderLines, products, scrollRef }: OrderSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const fg = "hsl(var(--foreground))";
  const muted = "hsl(var(--muted-foreground))";
  const border = "0.5px solid hsl(var(--border))";

  const toggleExpand = () => {
    const next = !expanded;
    // Keep the Add product row visible: since the summary expands in-flow and compresses the list
    // above it, scroll the list back to its top so the search row sits right above the summary.
    if (next) scrollRef.current?.scrollTo({ top: 0 });
    setExpanded(next);
  };

  // Order lines grouped by the chosen / default supplier.
  type SupplierGroup = { supplier: string; lines: { line: OrderLine; idx: number }[] };
  const supplierGroups: SupplierGroup[] = [];
  const supplierMap = new Map<string, SupplierGroup>();
  orderLines.forEach((line, idx) => {
    const supplier = line.supplierChoice ?? line.product["SUPPLIER"] ?? "Unknown";
    if (!supplierMap.has(supplier)) {
      const entry: SupplierGroup = { supplier, lines: [] };
      supplierMap.set(supplier, entry);
      supplierGroups.push(entry);
    }
    supplierMap.get(supplier)!.lines.push({ line, idx });
  });
  const multiSupplier = supplierGroups.length > 1;
  const totalItems = orderLines.length;
  const totalPrice = orderLines.reduce((s, l) => s + l.qty * (l.product["UNITS/ORDER"] ?? 1) * (l.product["SUPPLIER PRICE"] ?? 0), 0);
  const hasUnresolved = orderLines.some(l => {
    const sibs = products.filter(s => s["PRODUCT NAME"] === l.product["PRODUCT NAME"] && s.id !== l.product.id && s["SUPPLIER"] !== l.product["SUPPLIER"]);
    return sibs.length > 0 && l.supplierChoice === null;
  });

  return (
    <div style={expanded ? { flexShrink: 1, minHeight: 0, overflowY: "auto", paddingLeft: "12px", paddingRight: "12px", borderTop: border, paddingTop: "20px", paddingBottom: "8px" } : { flexShrink: 0 }}>
      {expanded ? (
        /* Expanded — in-flow block mirroring the branch OrderSummary: a normal flex child that pushes
           the order list above it up, scrolling internally instead of overlaying. */
        <>
          <div onClick={() => setExpanded(false)} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px", cursor: "pointer" }}>
            <div style={{ fontSize: "22px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "-0.02em" }}>Order Summary</div>
            <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, letterSpacing: "0.08em" }}>{totalItems} {totalItems === 1 ? "Product" : "Products"}</div>
          </div>
            {supplierGroups.map((group) => {
              const groupTotal = group.lines.reduce((s, { line }) => s + line.qty * (line.product["UNITS/ORDER"] ?? 1) * (line.product["SUPPLIER PRICE"] ?? 0), 0);
              return (
                <div key={group.supplier} style={{ marginBottom: multiSupplier ? "40px" : "8px" }}>
                  <div style={{ marginBottom: "6px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: fg }}>{group.supplier}</div>
                  </div>
                  {group.lines.map(({ line, idx }) => {
                    const units = line.product["UNITS/ORDER"] ?? 1;
                    const price = line.product["SUPPLIER PRICE"];
                    const lineTotal = price != null ? line.qty * units * price : null;
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: border }}>
                        <div style={{ flex: 1, fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: fg }}>{line.product["PRODUCT NAME"]}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx && l.qty > 1 ? { ...l, qty: l.qty - 1 } : l))} style={{ width: "22px", height: "22px", border: "none", background: "none", cursor: "pointer", fontSize: "16px", color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Raleway, inherit" }}>−</button>
                          <div style={{ minWidth: "20px", textAlign: "center", fontSize: "13px", fontFamily: "Raleway, inherit", color: fg }}>{line.qty}</div>
                          <button onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: l.qty + 1 } : l))} style={{ width: "22px", height: "22px", border: "none", background: "none", cursor: "pointer", fontSize: "16px", color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Raleway, inherit" }}>+</button>
                        </div>
                        {lineTotal != null && (
                          <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, minWidth: "60px", textAlign: "right" }}>RM {lineTotal.toFixed(2)}</div>
                        )}
                        <button onClick={() => setOrderLines(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(var(--destructive, 0 84% 60%))", flexShrink: 0 }}><X size={12} /></button>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: border }}>
                    <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{group.lines.length} {group.lines.length === 1 ? "ORDER" : "ORDERS"}</div>
                    {groupTotal > 0 && <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "Raleway, inherit", color: fg }}>RM {groupTotal.toFixed(2)}</div>}
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", marginTop: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"} · {supplierGroups.length} {supplierGroups.length === 1 ? "SUPPLIER" : "SUPPLIERS"}</div>
              {totalPrice > 0 && <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: fg }}>RM {totalPrice.toFixed(2)}</div>}
            </div>
            {!draftReady ? (
              <button
                onClick={() => setDraftReady(true)}
                disabled={hasUnresolved}
                style={{
                  marginTop: "16px", width: "100%", padding: "12px",
                  fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  border: "0.5px solid hsl(var(--foreground))",
                  background: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                  borderRadius: "6px",
                  cursor: hasUnresolved ? "default" : "pointer",
                  opacity: hasUnresolved ? 0.5 : 1,
                }}
              >
                DRAFT ORDER
              </button>
            ) : (
              <div style={{ marginTop: "16px" }}>
                {supplierGroups.map((group) => (
                  <button
                    key={group.supplier}
                    onClick={() => generateAndSharePDF(
                      group.supplier,
                      group.lines.map(({ line }) => ({
                        productName: line.product["PRODUCT NAME"],
                        qty: line.qty * (line.product["UNITS/ORDER"] ?? 1),
                      }))
                    )}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: "8px", width: "100%", padding: "12px",
                      fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      border: "none", background: "#25D366",
                      color: "#fff", borderRadius: "6px", cursor: "pointer",
                      marginBottom: "10px",
                    }}
                  >
                    <WhatsAppIcon />
                    Send {group.supplier} to WhatsApp
                  </button>
                ))}
                <button
                  onClick={() => { setDraftReady(false); setOrderLines([]); }}
                  style={{
                    width: "100%", padding: "10px",
                    fontSize: "11px", fontWeight: 400, fontFamily: "Raleway, inherit",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    border: "0.5px solid " + muted, background: "none",
                    color: muted, borderRadius: "6px", cursor: "pointer",
                  }}
                >
                  Clear Order
                </button>
              </div>
            )}
            </>
      ) : (
        /* Collapsed footer bar */
        <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "6px", paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)", borderTop: border }}>
          <button
            onClick={toggleExpand}
            aria-expanded={expanded}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "none", border: "none", cursor: "pointer",
              padding: "5px 0",
              fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 300, letterSpacing: "0.08em",
              fontFamily: "Raleway, inherit", color: "hsl(var(--foreground) / 0.85)",
            }}
          >
            <span>Order Summary</span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                {totalItems} {totalItems === 1 ? "Product" : "Products"}
              </span>
              <ChevronDown size={14} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}