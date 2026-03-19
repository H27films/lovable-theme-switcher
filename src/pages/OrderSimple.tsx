import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sun, Moon, Search, Star, X, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";

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
  "OFFICE FAVOURITE": boolean | null;
  "UNITS/ORDER": number | null;
  "PAR": number | null;
}

interface OrderLine {
  product: OfficeProduct;
  qty: number;
  supplierChoice: string | null;
}

function checkBelowPar(balance: number | null, par: number | null): boolean {
  if (!par || par <= 0) return false;
  if (balance === null) return true;
  return balance <= par;
}

export default function OrderSimple({ onBack }: OrderSimpleProps) {
  const { theme, setTheme } = useTheme();
  const isSand = theme === "sand";
  const handleToggle = () => setTheme(isSand ? "light" : "sand");

  const [products, setProducts] = useState<OfficeProduct[]>([]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [forceOrderDropdown, setForceOrderDropdown] = useState(false);
  const [orderActiveIndex, setOrderActiveIndex] = useState(-1);
  const [orderSupplierFilter, setOrderSupplierFilter] = useState<string[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [openSupplierIdx, setOpenSupplierIdx] = useState<number | null>(null);

  const orderSearchRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const fg = "hsl(var(--foreground))";
  const muted = "hsl(var(--muted-foreground))";
  const border = "0.5px solid hsl(var(--border))";
  const hdrStyle: React.CSSProperties = {
    fontSize: "10px", fontWeight: 600, fontFamily: "Raleway, inherit",
    letterSpacing: "0.12em", textTransform: "uppercase", color: muted,
  };

  // Load products
  useEffect(() => {
    (supabase as any).from("AllFileProducts").select("*").then(({ data }: { data: OfficeProduct[] | null }) => {
      if (data) setProducts(data);
    });
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

  const allSuppliers = Array.from(new Set(products.map(p => p["SUPPLIER"]).filter(Boolean))) as string[];

  const isOfficeFav = (p: OfficeProduct) => p["OFFICE FAVOURITE"] === true;

  // Filtered products for supplier filter
  const filteredForOrder = orderSupplierFilter.length > 0
    ? products.filter(p => p["SUPPLIER"] && orderSupplierFilter.includes(p["SUPPLIER"]))
    : products;

  // Search results
  const orderDropdownResults: OfficeProduct[] = (() => {
    const q = orderSearch.trim().toLowerCase();
    const alreadyAdded = new Set(orderLines.map(l => l.product.id));
    let pool = filteredForOrder.filter(p => !alreadyAdded.has(p.id));
    if (!q && !forceOrderDropdown) return [];
    if (q) {
      pool = pool.filter(p =>
        (p["PRODUCT NAME"]?.toLowerCase().includes(q)) ||
        (p["SUPPLIER"]?.toLowerCase().includes(q))
      );
    }
    // Sort: favourites first, then products, then colours
    pool.sort((a, b) => {
      const rank = (p: OfficeProduct) => {
        if (isOfficeFav(p)) return 0;
        if (p["Colour"]?.toUpperCase() === "YES") return 2;
        return 1;
      };
      return rank(a) - rank(b);
    });
    return pool.slice(0, 30);
  })();

  const addToOrder = useCallback((p: OfficeProduct) => {
    setOrderLines(prev => [...prev, { product: p, qty: 1, supplierChoice: null }]);
    setOrderSearch("");
    setShowOrderDropdown(false);
    setForceOrderDropdown(false);
    setOrderActiveIndex(-1);
  }, []);

  const handleOrderKeyDown = (e: React.KeyboardEvent) => {
    if (!showOrderDropdown || orderDropdownResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setOrderActiveIndex(i => Math.min(i + 1, orderDropdownResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setOrderActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && orderActiveIndex >= 0) { e.preventDefault(); addToOrder(orderDropdownResults[orderActiveIndex]); }
    else if (e.key === "Escape") { setShowOrderDropdown(false); setForceOrderDropdown(false); }
  };

  const handleDraftConfirm = () => {
    setOrderLines([]);
  };

  return (
    <div style={{
      height: "100dvh", overflow: "hidden",
      background: "hsl(var(--background))", color: fg,
      fontFamily: "Raleway, inherit",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 16px 16px", borderBottom: border, flexShrink: 0,
      }}>
        <span
          onClick={onBack}
          style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: fg, cursor: "pointer" }}
        >DRAFT ORDER</span>
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
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "hsl(var(--background))", maxHeight: "220px", overflowY: "auto" }}>
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
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: checkBelowPar(p["OFFICE BALANCE"], p["PAR"]) ? "hsl(var(--destructive, 0 84% 60%))" : muted, flexShrink: 0, marginLeft: "8px" }}>
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
                      <span style={{ fontSize: "13px", color: checkBelowPar(line.product["OFFICE BALANCE"], line.product["PAR"]) ? "hsl(var(--destructive, 0 84% 60%))" : muted }}>{"  "}{line.product["OFFICE BALANCE"] ?? "—"}</span>
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
              const today = new Date();
              const dd = String(today.getDate()).padStart(2, "0");
              const mm = String(today.getMonth() + 1).padStart(2, "0");
              const yy = String(today.getFullYear()).slice(2);
              const baseGRN = `OFFICE ${dd}${mm}${yy}`;
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
                    const grn = multiSupplier ? `${baseGRN} (${gi + 1})` : baseGRN;
                    const groupTotal = group.lines.reduce((s, { line }) => s + line.qty * (line.product["UNITS/ORDER"] ?? 1) * (line.product["SUPPLIER PRICE"] ?? 0), 0);
                    return (
                      <div key={group.supplier} style={{ marginBottom: multiSupplier ? "40px" : "8px" }}>
                        {/* Supplier header row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: fg }}>{group.supplier}</div>
                          <div style={{ fontSize: "11px", fontFamily: "monospace", color: muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{grn}</div>
                        </div>
                        {/* Product lines */}
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
                        {/* Subtotal */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: border }}>
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{group.lines.length} {group.lines.length === 1 ? "ORDER" : "ORDERS"}</div>
                          {groupTotal > 0 && <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "Raleway, inherit", color: fg }}>RM {groupTotal.toFixed(2)}</div>}
                        </div>
                      </div>
                    );
                  })}
                  {/* Grand total */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", marginTop: "24px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"} · {supplierGroups.length} {supplierGroups.length === 1 ? "SUPPLIER" : "SUPPLIERS"}</div>
                    {totalPrice > 0 && <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: fg }}>RM {totalPrice.toFixed(2)}</div>}
                  </div>
                  {/* Confirm Order button */}
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
                    Confirm Order
                  </button>
                  <div style={{ paddingBottom: "40px" }} />
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
