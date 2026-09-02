import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Star, X, ChevronDown } from "lucide-react";
import { useDropdownKeyboardNavigation } from "@/hooks/useDropdownKeyboardNavigation";
import { ResultRow } from "@/components/branch/ResultRow";
import { useLocation } from "react-router-dom";
import { useSlideExit, useSlideEnter, slideExitStyle } from "@/hooks/useSlideTransition";
import { supabase } from "@/integrations/supabase/client";
import { useTabletMode } from "@/hooks/useTabletMode";
import { TABLET_FIT_HEIGHT } from "@/components/TabletScaler";
import OrderSummaryOffice, { type OfficeProduct, type OrderLine } from "@/components/office/OrderSummaryOffice";
import { BottomNavOffice } from "@/components/office/BottomNavOffice";

interface OrderProps {
  onBack?: () => void;
}

async function toggleOfficeFav(
  product: OfficeProduct,
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>
): Promise<void> {
  const isFav = product["OFFICE FAVOURITE"] === "TRUE" || product["OFFICE FAVOURITE"] === "true" || (product as any)["OFFICE FAVOURITE"] === true;
  const newVal = isFav ? null : "TRUE";
  setProducts(prev => prev.map(p =>
    p.id === product.id ? { ...p, "OFFICE FAVOURITE": newVal } : p
  ));
  await supabase
    .from("AllFileProducts")
    .update({ "OFFICE FAVOURITE": newVal })
    .eq("id", product.id);
}

async function saveParValue(
  product: OfficeProduct,
  newPar: number | null,
  setBelowParList: React.Dispatch<React.SetStateAction<OfficeProduct[]>>,
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>
): Promise<void> {
  await (supabase as any)
    .from("AllFileProducts")
    .update({ "PAR": newPar })
    .eq("id", product.id);
  setBelowParList(prev => prev.map(p => p.id === product.id ? { ...p, "PAR": newPar } : p));
  setProducts(prev => prev.map(p => p.id === product.id ? { ...p, "PAR": newPar } : p));
}

function checkBelowPar(balance: number | null, par: number | null): boolean {
  if (!par || par <= 0) return false;
  if (balance === null) return true;
  return balance <= par;
}

function getBalanceColor(balance: number | null, par: number | null, muted: string): string {
  if (!par || par <= 0) return muted;
  if (balance === null || balance <= par) return "hsl(0 84% 60%)";
  return "hsl(142 71% 45%)";
}

export default function Order({ onBack }: OrderProps) {
  const location = useLocation();
  const { exiting, slideTo } = useSlideExit();
  const enterStyle = useSlideEnter();
  // Origin of this visit ("office" | "adminportal") – set via router state at navigation time
  const from = location.state?.from;
  const { tablet } = useTabletMode();
  const [products, setProducts] = useState<OfficeProduct[]>([]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [forceOrderDropdown, setForceOrderDropdown] = useState(false);
  const [orderActiveIndex, setOrderActiveIndex] = useState(-1);
  const [orderSupplierFilter, setOrderSupplierFilter] = useState<string[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [openSupplierIdx, setOpenSupplierIdx] = useState<number | null>(null);
  const [showBelowPar, setShowBelowPar] = useState(false);
  const [belowParList, setBelowParList] = useState<OfficeProduct[]>([]);
  const [editParProduct, setEditParProduct] = useState<OfficeProduct | null>(null);
  const [editParValue, setEditParValue] = useState<string>("");

  const orderSearchRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const orderScrollRef = useRef<HTMLDivElement>(null);

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
    const v = (p as any)["Colour"];
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

  // ── Per-line supplier-choice dropdown (keyboard support) ─────────────────
  // Mirrors the choices computed during rendering so ↑/↓/Enter operate on the
  // exact list of suppliers shown for the currently-open line.
  const getSupplierChoices = (idx: number): string[] => {
    const line = orderLines[idx];
    if (!line) return [];
    const sibs = products.filter(s =>
      s["PRODUCT NAME"] === line.product["PRODUCT NAME"] && s.id !== line.product.id && s["SUPPLIER"] !== line.product["SUPPLIER"]
    );
    return ([line.product["SUPPLIER"], ...sibs.map(s => s["SUPPLIER"])].filter(Boolean)) as string[];
  };

  const chooseSupplierForOpenLine = (choice: string) => {
    if (openSupplierIdx == null) return;
    setOrderLines(prev => prev.map((l, i) => i === openSupplierIdx ? { ...l, supplierChoice: choice } : l));
    setOpenSupplierIdx(null);
  };

  const openSupplierChoices = openSupplierIdx != null ? getSupplierChoices(openSupplierIdx) : [];

  const { activeIndex: supplierChoiceIdx, handleKeyDown: handleSupplierChoiceKeyNav } =
    useDropdownKeyboardNavigation({
      itemCount: openSupplierIdx != null ? openSupplierChoices.length : 0,
      onSelect: i => {
        const choice = openSupplierChoices[i];
        if (choice) chooseSupplierForOpenLine(choice);
      },
      onClose: () => setOpenSupplierIdx(null),
    });

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
      height: tablet ? TABLET_FIT_HEIGHT : "100dvh", overflow: "hidden",
      background: "hsl(var(--background))", color: fg,
      fontFamily: "Raleway, inherit",
      display: "flex", flexDirection: "column",
      position: "relative",
      ...enterStyle,
      ...slideExitStyle(exiting),
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 16px 16px", borderBottom: border, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            onClick={() => {
              if (from === "office") slideTo("/simple/office", undefined, "back");
              else if (from === "adminportal") slideTo("/simple/admin", undefined, "back");
              else onBack?.();
            }}
            style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: fg, cursor: "pointer" }}
          >ORDER</span>
          {/* BELOW PAR button */}
          <button
            onClick={() => { setBelowParList(belowParProducts); setShowBelowPar(true); }}
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
      </div>

      {/* Scrollable content */}
      <div ref={orderScrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px", paddingBottom: from === "office" ? "calc(env(safe-area-inset-bottom, 0px) + 96px)" : "16px" }}>

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
                    padding: "10px 0", cursor: "pointer",
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

            <div style={{ paddingBottom: "24px" }} />
          </div>
        )}
      </div>

      {/* Order Summary footer — collapsible bottom sheet */}
      {orderLines.length > 0 && (
        <OrderSummaryOffice
          orderLines={orderLines}
          setOrderLines={setOrderLines}
          products={products}
          scrollRef={orderScrollRef}
        />
      )}

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
                {belowParList.length} {belowParList.length === 1 ? "product" : "products"} · tap to add/remove from order
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
            {belowParList.length === 0 ? (
              <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, padding: "24px 16px" }}>
                All products are above PAR 🎉
              </div>
            ) : (
              belowParList.map((p, i) => {
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
                      borderBottom: i < belowParList.length - 1 ? border : "none",
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

                    {/* Balances — tap to edit PAR */}
                    <div
                      onClick={e => { e.stopPropagation(); setEditParProduct(p); setEditParValue(String(par ?? "")); }}
                      style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", cursor: "pointer", position: "relative" }}
                    >
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
                      onClick={e => { e.stopPropagation(); toggleOfficeFav(p, setProducts); setBelowParList(prev => prev.map(x => x.id === p.id ? { ...x, "OFFICE FAVOURITE": (isOfficeFav(p) ? null : "TRUE") } : x)); }}
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

      {/* PAR edit popover */}
      {editParProduct && (
        <div
          onClick={() => setEditParProduct(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              padding: "20px 20px 16px",
              width: "260px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            {/* Product name */}
            <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}>
              {editParProduct["SUPPLIER"]}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "16px", lineHeight: 1.3 }}>
              {editParProduct["PRODUCT NAME"]}
            </div>

            {/* PAR label + input */}
            <div style={{ fontSize: "11px", fontWeight: 600, fontFamily: "Raleway, inherit", letterSpacing: "0.1em", color: "hsl(var(--muted-foreground))", marginBottom: "6px", textTransform: "uppercase" }}>
              PAR
            </div>
            <input
              autoFocus
              type="number"
              value={editParValue}
              onChange={e => setEditParValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const val = editParValue.trim() === "" ? null : Number(editParValue);
                  saveParValue(editParProduct, isNaN(val as number) ? null : val, setBelowParList, setProducts);
                  setEditParProduct(null);
                }
                if (e.key === "Escape") setEditParProduct(null);
              }}
              style={{
                width: "100%", padding: "10px 12px",
                fontSize: "18px", fontFamily: "Raleway, inherit", fontWeight: 300,
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="0"
            />

            {/* Buttons */}
            <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
              <button
                onClick={() => setEditParProduct(null)}
                style={{
                  flex: 1, padding: "9px",
                  fontSize: "12px", fontWeight: 500, fontFamily: "Raleway, inherit", letterSpacing: "0.08em",
                  background: "transparent",
                  border: "0.5px solid hsl(var(--border))",
                  borderRadius: "6px", cursor: "pointer",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  const val = editParValue.trim() === "" ? null : Number(editParValue);
                  saveParValue(editParProduct, isNaN(val as number) ? null : val, setBelowParList, setProducts);
                  setEditParProduct(null);
                }}
                style={{
                  flex: 1, padding: "9px",
                  fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", letterSpacing: "0.08em",
                  background: "hsl(var(--foreground))",
                  border: "0.5px solid hsl(var(--foreground))",
                  borderRadius: "6px", cursor: "pointer",
                  color: "hsl(var(--background))",
                }}
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV (Home / Order / Sales / Search / Admin Portal) — Office visits only ── */}
      {from === "office" && (
        <BottomNavOffice
          active="order"
          raised={orderLines.length > 0}
          onSelect={(key) => {
            if (key === "order") return; // already on the Order page
            if (key === "home") slideTo("/simple/office", undefined, "back");
            else if (key === "sales") slideTo("/simple/office", { openPanel: "sales" }, "back");
            else if (key === "admin") slideTo("/simple/admin", undefined, "back");
            else if (key === "search") slideTo("/simple/search", { from: "office" }, "forward");
          }}
        />
      )}
    </div>
  );
}
