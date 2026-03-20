import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sun, Moon, Search, Star, X, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

interface OrderSimpleProps {
  onBack: () => void;
}

interface OfficeProduct {
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

interface OrderLine {
  product: OfficeProduct;
  qty: number;
  supplierChoice: string | null;
}

async function toggleOfficeFav(
  product: OfficeProduct,
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>
): Promise<void> {
  const isFav = product["OFFICE FAVOURITE"] === "TRUE" || product["OFFICE FAVOURITE"] === "true" || product["OFFICE FAVOURITE"] === true;
  const newVal = isFav ? null : "TRUE";
  setProducts(prev => prev.map(p =>
    p.id === product.id ? { ...p, "OFFICE FAVOURITE": newVal } : p
  ));
  await supabase
    .from("AllFileProducts")
    .update({ "OFFICE FAVOURITE": newVal })
    .eq("id", product.id);
}

function checkBelowPar(balance: number | null, par: number | null): boolean {
  if (!par || par <= 0) return false;
  if (balance === null) return true;
  return balance <= par;
}

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.37 17.04 14.27C16.97 14.17 16.81 14.1 16.56 13.98C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.48 13.06 14.31 13.31C14.15 13.55 13.67 14.1 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.48 11.15 9.61 11.01 9.73 10.9C9.84 10.78 9.99 10.6 10.11 10.45C10.24 10.31 10.28 10.2 10.36 10.04C10.44 9.87 10.4 9.73 10.34 9.61C10.28 9.5 9.79 8.27 9.59 7.77C9.39 7.27 9.19 7.33 9.04 7.32C8.88 7.32 8.72 7.33 8.53 7.33Z" />
  </svg>
);

function getBalanceColor(balance: number | null, par: number | null, muted: string): string {
  if (!par || par <= 0) return muted;
  if (balance === null || balance <= par) return "hsl(0 84% 60%)";
  return "hsl(142 71% 45%)";
}

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

export default function OrderSimple({ onBack }: OrderSimpleProps) {
  const { theme, setTheme } = useTheme();
  const isSand = theme === "sand";
  const handleToggle = () => setTheme(isSand ? "light" : "sand");

  const [products, setProducts] = useState<OfficeProduct[]>([]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [forceOrderDropdown, setForceOrderDropdown] = useState(false);
  const [orderActiveIndex, setOrderActiveIndex] = useState(-1);
  const [orderSupplierFilter, setOrderSupplierFilter] = useState<string[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [openSupplierIdx, setOpenSupplierIdx] = useState<number | null>(null);
  const [showBelowPar, setShowBelowPar] = useState(false);

  const orderSearchRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const fg = "hsl(var(--foreground))";
  const muted = "hsl(var(--muted-foreground))";
  const border = "0.5px solid hsl(var(--border))";
  const red = "hsl(0 84% 60%)";
  const hdrStyle: React.CSSProperties = {
    fontSize: "10px", fontWeight: 600, fontFamily: "Raleway, inherit",
    letterSpacing: "0.12em", textTransform: "uppercase", color: muted,
  };

  // Load products — paginated to fetch ALL rows
  useEffect(() => {
    const fetchProducts = async () => {
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("AllFileProducts")
          .select("*")
          .range(from, from + batchSize - 1);
        if (error || !data?.length) break;
        allData = allData.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      setProducts(allData);
    };
    fetchProducts();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (orderSearchRef.current && !orderSearchRef.current.contains(e.target as Node)) {
        setShowOrderDropdown(false);
        setForceOrderDropdown(false);
      }
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
      setOpenSupplierIdx(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allSuppliers = Array.from(new Set(products.map(p => p["SUPPLIER"]).filter(Boolean))).sort() as string[];

  const isOfficeFav = (p: OfficeProduct) => {
    const v = (p as any)["OFFICE FAVOURITE"];
    return v === true || v === "TRUE" || v === "true" || v === 1;
  };
  const isColourProd = (p: OfficeProduct) => {
    const v = p["Colour"];
    return v === true || v === "TRUE" || v === "true" || v === "YES" || v === "yes";
  };

  // Products below PAR (OFFICE BALANCE only, non-colour products)
  const belowParProducts: OfficeProduct[] = (() => {
    const seen = new Map<string, OfficeProduct>();
    for (const p of products) {
      if (isColourProd(p)) continue;
      const par = p["PAR"];
      if (!par || par <= 0) continue;
      const bal = p["OFFICE BALANCE"];
      if (bal !== null && bal > par) continue;
      const key = `${p["PRODUCT NAME"]}|||${p["SUPPLIER"]}`;
      if (!seen.has(key)) seen.set(key, p);
    }
    return Array.from(seen.values()).sort((a, b) => {
      const af = isOfficeFav(a) ? 0 : 1, bf = isOfficeFav(b) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]);
    });
  })();

  // Check if a product is already in orderLines
  const isInOrder = (p: OfficeProduct) =>
    orderLines.some(l => l.product["PRODUCT NAME"] === p["PRODUCT NAME"] && l.product["SUPPLIER"] === p["SUPPLIER"]);

  // Filtered products for supplier filter
  const filteredForOrder = orderSupplierFilter.length > 0
    ? products.filter(p => p["SUPPLIER"] && orderSupplierFilter.includes(p["SUPPLIER"]))
    : products;

  // Search results
  const orderDropdownResults: OfficeProduct[] = (() => {
    if (!forceOrderDropdown && orderSearch.length === 0) return [];
    const matched = filteredForOrder.filter(p =>
      (orderSearch.length === 0 || p["PRODUCT NAME"]?.toLowerCase().includes(orderSearch.toLowerCase())) &&
      !orderLines.some(l => l.product["PRODUCT NAME"] === p["PRODUCT NAME"] && l.product["SUPPLIER"] === p["SUPPLIER"])
    );
    const seen = new Map<string, OfficeProduct>();
    for (const p of matched) {
      const key = `${p["PRODUCT NAME"]}|||${p["SUPPLIER"]}`;
      const existing = seen.get(key);
      if (!existing || (p["UNITS/ORDER"] ?? 1) < (existing["UNITS/ORDER"] ?? 1)) seen.set(key, p);
    }
    return Array.from(seen.values()).sort((a, b) => {
      const af = isOfficeFav(a) ? 0 : 1, bf = isOfficeFav(b) ? 0 : 1;
      if (af !== bf) return af - bf;
      const ac = isColourProd(a) ? 1 : 0, bc = isColourProd(b) ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]);
    });
  })();

  const addToOrder = useCallback((p: OfficeProduct) => {
    setOrderLines(prev => [...prev, { product: p, qty: 1, supplierChoice: null }]);
    setOrderSearch("");
    setShowOrderDropdown(false);
    setForceOrderDropdown(false);
    setOrderActiveIndex(-1);
  }, []);

  const removeFromOrder = useCallback((p: OfficeProduct) => {
    setOrderLines(prev => prev.filter(l => !(l.product["PRODUCT NAME"] === p["PRODUCT NAME"] && l.product["SUPPLIER"] === p["SUPPLIER"])));
  }, []);

  const toggleBelowPar = useCallback((p: OfficeProduct) => {
    if (isInOrder(p)) {
      removeFromOrder(p);
    } else {
      addToOrder(p);
    }
  }, [orderLines, addToOrder, removeFromOrder]);

  const handleOrderKeyDown = (e: React.KeyboardEvent) => {
    if (!showOrderDropdown || orderDropdownResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setOrderActiveIndex(i => Math.min(i + 1, orderDropdownResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setOrderActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && orderActiveIndex >= 0) { e.preventDefault(); addToOrder(orderDropdownResults[orderActiveIndex]); }
    else if (e.key === "Escape") { setShowOrderDropdown(false); setForceOrderDropdown(false); }
  };

  const handleDraftConfirm = () => {
    setDraftReady(true);
  };

  // Balance display helper: coloured if below PAR
  const balCell = (balance: number | null, par: number | null) => (
    <span style={{
      color: checkBelowPar(balance, par) ? red : muted,
      fontWeight: checkBelowPar(balance, par) ? 600 : 300,
    }}>
      {balance ?? "—"}
    </span>
  );

  return (
    <div style={{
      height: "100dvh", overflow: "hidden",
      background: "hsl(var(--background))", color: fg,
      fontFamily: "Raleway, inherit",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 16px 16px", borderBottom: border, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            onClick={onBack}
            style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: fg, cursor: "pointer" }}
          >ORDER</span>
          {/* BELOW PAR button */}
          <button
            onClick={() => setShowBelowPar(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "10px",
              fontWeight: 600,
              fontFamily: "Raleway, inherit",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: fg,
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            BELOW PAR {products.length > 0 && `(${belowParProducts.length})`}
            <ChevronDown size={11} strokeWidth={2} style={{ color: muted }} />
          </button>
        </div>
        <button
          onClick={handleToggle}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: muted, display: "flex", alignItems: "center" }}
        >
          {isSand ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* Supplier filter */}
        <div ref={supplierDropdownRef} style={{ marginBottom: "16px" }}>
          <button
            onClick={() => setShowSupplierDropdown(o => !o)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: "10px", fontWeight: 600, fontFamily: "Raleway, inherit",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: muted, display: "flex", alignItems: "center", gap: "5px",
            }}
          >
            {orderSupplierFilter.length === 0 ? "ALL SUPPLIERS" : orderSupplierFilter.join(", ")}
            <span style={{ fontSize: "12px", lineHeight: 1 }}>›</span>
          </button>
          {orderSupplierFilter.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
              {orderSupplierFilter.map(sup => (
                <div key={sup} style={{
                  fontSize: "10px", fontFamily: "Raleway, inherit", letterSpacing: "0.05em",
                  padding: "3px 8px", borderRadius: "20px", border,
                  color: fg, display: "flex", alignItems: "center", gap: "4px",
                }}>
                  {sup}
                  <button onClick={() => setOrderSupplierFilter(prev => prev.filter(s => s !== sup))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: muted, display: "flex" }}>
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {showSupplierDropdown && (
            <div style={{ marginTop: "8px", maxHeight: "180px", overflowY: "auto", borderTop: border, paddingTop: "4px" }}>
              {allSuppliers.map((sup, i) => {
                const selected = orderSupplierFilter.includes(sup);
                return (
                  <div
                    key={sup}
                    onClick={() => { setOrderSupplierFilter(prev => selected ? prev.filter(s => s !== sup) : [...prev, sup]); setShowSupplierDropdown(false); }}
                    style={{
                      padding: "9px 0", cursor: "pointer", fontSize: "13px", fontFamily: "Raleway, inherit",
                      fontWeight: selected ? 500 : 300,
                      color: selected ? fg : muted,
                      borderBottom: i < allSuppliers.length - 1 ? border : "none",
                    }}
                  >
                    {sup}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Product search */}
        <div ref={orderSearchRef} style={{ position: "relative", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: border, paddingBottom: "8px" }}>
            <Search size={14} style={{ color: muted, flexShrink: 0 }} />
            <input
              type="text"
              value={orderSearch}
              onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); setForceOrderDropdown(false); setOrderActiveIndex(-1); }}
              onFocus={() => { if (orderSearch.length === 0) setForceOrderDropdown(true); setShowOrderDropdown(true); }}
              placeholder="Add product"
              onKeyDown={handleOrderKeyDown}
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", fontFamily: "Raleway, inherit", color: fg, caretColor: fg }}
            />
            {orderSearch && (
              <button onClick={() => { setOrderSearch(""); setShowOrderDropdown(false); setForceOrderDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: muted }}>
                <X size={13} />
              </button>
            )}
          </div>
          {showOrderDropdown && orderDropdownResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "hsl(var(--background))", maxHeight: "65vh", overflowY: "auto" }}>
              {orderDropdownResults.map((p, i) => (
                <div
                  key={p.id}
                  onMouseDown={() => addToOrder(p)}
                  style={{
                    padding: "10px 14px", cursor: "pointer",
                    background: i === orderActiveIndex ? "hsl(var(--card))" : "transparent",
                    borderBottom: i < orderDropdownResults.length - 1 ? border : "none",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {isOfficeFav(p) && <Star size={9} fill="currentColor" style={{ color: fg }} />}
                      <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: fg }}>{p["PRODUCT NAME"]}</div>
                    </div>
                    {p["SUPPLIER"] && <div style={{ fontSize: "11px", fontFamily: "Raleway, inherit", color: muted, marginTop: "1px" }}>{p["SUPPLIER"]}</div>}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: getBalanceColor(p["OFFICE BALANCE"], p["PAR"], muted), flexShrink: 0, marginLeft: "8px" }}>
                    {p["OFFICE BALANCE"] ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order lines */}
        {orderLines.length === 0 ? (
          <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, padding: "20px 0" }}>
            No items added yet
          </div>
        ) : (
          <div>
            {orderLines.map((line, idx) => {
              const siblings = products.filter(s =>
                s["PRODUCT NAME"] === line.product["PRODUCT NAME"] && s.id !== line.product.id && s["SUPPLIER"] !== line.product["SUPPLIER"]
              );
              const needsChoice = siblings.length > 0 && line.supplierChoice === null;
              const allChoices = [line.product["SUPPLIER"], ...siblings.map(s => s["SUPPLIER"])].filter(Boolean) as string[];
              const units = line.product["UNITS/ORDER"] ?? 1;
              return (
                <div key={idx} style={{ borderBottom: border, padding: "12px 0" }}>
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
                              {allChoices.map(sup => (
                                <div
                                  key={sup}
                                  onMouseDown={() => { setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, supplierChoice: sup } : l)); setOpenSupplierIdx(null); }}
                                  style={{ padding: "8px 12px", fontSize: "12px", fontFamily: "Raleway, inherit", color: line.supplierChoice === sup ? fg : muted, cursor: "pointer", borderBottom: border }}
                                >
                                  {sup}
                                </div>
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx && l.qty > 1 ? { ...l, qty: l.qty - 1 } : l))} style={{ width: "28px", height: "28px", border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Raleway, inherit" }}>−</button>
                      <span style={{ minWidth: "20px", textAlign: "center", fontSize: "14px", fontFamily: "Raleway, inherit", color: fg }}>{line.qty}</span>
                      <button onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: l.qty + 1 } : l))} style={{ width: "28px", height: "28px", border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Raleway, inherit" }}>+</button>
                      {units > 1 && <span style={{ fontSize: "10px", fontFamily: "Raleway, inherit", color: muted }}>= {line.qty * units}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ORDER SUMMARY */}
            {(() => {
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
                <div style={{ marginTop: "24px", paddingTop: "8px" }}>
                  <div style={{ ...hdrStyle, marginBottom: "16px", fontSize: "13px" }}>ORDER SUMMARY</div>
                  {supplierGroups.map((group, gi) => {
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
                      onClick={handleDraftConfirm}
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
                  <div style={{ paddingBottom: "40px" }} />
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* BELOW PAR overlay panel */}
      {showBelowPar && (
        <div style={{
          position: "absolute", inset: 0,
          background: "hsl(var(--background))",
          display: "flex", flexDirection: "column",
          zIndex: 100,
        }}>
          {/* Panel header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "24px 16px 16px", borderBottom: border, flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: fg }}>BELOW PAR</div>
              <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, marginTop: "2px" }}>
                {belowParProducts.length} {belowParProducts.length === 1 ? "product" : "products"} · tap to add/remove from order
              </div>
            </div>
            <button
              onClick={() => setShowBelowPar(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: muted, display: "flex", alignItems: "center" }}
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "28px 1fr 40px 40px 40px 40px 28px",
            gap: "4px",
            padding: "8px 16px",
            borderBottom: border,
            flexShrink: 0,
          }}>
            <div />
            <div style={{ ...hdrStyle, fontSize: "9px" }}>PRODUCT</div>
            <div style={{ ...hdrStyle, fontSize: "9px", textAlign: "center" }}>OFF</div>
            <div style={{ ...hdrStyle, fontSize: "9px", textAlign: "center" }}>BOU</div>
            <div style={{ ...hdrStyle, fontSize: "9px", textAlign: "center" }}>CHI</div>
            <div style={{ ...hdrStyle, fontSize: "9px", textAlign: "center" }}>NUR</div>
            <div />
          </div>

          {/* Product list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {belowParProducts.length === 0 ? (
              <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, padding: "24px 16px" }}>
                All products are above PAR 🎉
              </div>
            ) : (
              belowParProducts.map((p, i) => {
                const inOrder = isInOrder(p);
                const par = p["PAR"];
                return (
                  <div
                    key={`${p["PRODUCT NAME"]}|||${p["SUPPLIER"]}`}
                    onClick={() => toggleBelowPar(p)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr 40px 40px 40px 40px 28px",
                      gap: "4px",
                      alignItems: "center",
                      padding: "11px 16px",
                      borderBottom: i < belowParProducts.length - 1 ? border : "none",
                      cursor: "pointer",
                      background: inOrder ? "hsl(var(--card))" : "transparent",
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: "16px", height: "16px",
                      border: `1.5px solid ${inOrder ? red : "hsl(var(--border))"}`,
                      borderRadius: "3px",
                      background: inOrder ? red : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {inOrder && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Product name + supplier */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {isOfficeFav(p) && <Star size={8} fill="currentColor" style={{ color: fg, flexShrink: 0 }} />}
                        <div style={{ fontSize: "13px", fontWeight: inOrder ? 500 : 300, fontFamily: "Raleway, inherit", color: fg, lineHeight: 1.3 }}>{p["PRODUCT NAME"]}</div>
                      </div>
                      {p["SUPPLIER"] && <div style={{ fontSize: "10px", fontFamily: "Raleway, inherit", color: muted, marginTop: "1px" }}>{p["SUPPLIER"]}</div>}
                    </div>

                    {/* Balances */}
                    <div style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center" }}>
                      {balCell(p["OFFICE BALANCE"], par)}
                    </div>
                    <div style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", color: muted, fontWeight: 300 }}>
                      {p["BOUDOIR BALANCE"] ?? "—"}
                    </div>
                    <div style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", color: muted, fontWeight: 300 }}>
                      {p["CHIC NAILSPA BALANCE"] ?? "—"}
                    </div>
                    <div style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", color: muted, fontWeight: 300 }}>
                      {p["NUR YADI BALANCE"] ?? "—"}
                    </div>

                    {/* Favourite star */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleOfficeFav(p, setProducts); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Star
                        size={13}
                        strokeWidth={1.5}
                        fill={isOfficeFav(p) ? fg : "none"}
                        style={{ color: isOfficeFav(p) ? fg : muted }}
                      />
                    </button>
                  </div>
                );
              })
            )}
            <div style={{ paddingBottom: "40px" }} />
          </div>

          {/* Footer: done button */}
          <div style={{ padding: "12px 16px", borderTop: border, flexShrink: 0 }}>
            <button
              onClick={() => setShowBelowPar(false)}
              style={{
                width: "100%", padding: "12px",
                fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
                letterSpacing: "0.12em", textTransform: "uppercase",
                border: "0.5px solid hsl(var(--foreground))",
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                borderRadius: "6px", cursor: "pointer",
              }}
            >
              DONE · {orderLines.length} {orderLines.length === 1 ? "ITEM" : "ITEMS"} IN ORDER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
