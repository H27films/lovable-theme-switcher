import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Star, X, ChevronDown, MoreVertical, Building2 } from "lucide-react";
import { useDropdownKeyboardNavigation } from "@/hooks/useDropdownKeyboardNavigation";
import { useLocation } from "react-router-dom";
import { useSlideExit, useSlideEnter, slideExitStyle } from "@/hooks/useSlideTransition";
import { supabase } from "@/integrations/supabase/client";
import { useTabletMode } from "@/hooks/useTabletMode";
import { TABLET_FIT_HEIGHT } from "@/components/TabletScaler";
import OrderSummaryOffice, { type OfficeProduct, type OrderLine } from "@/components/office/OrderSummaryOffice";
import { BottomNavOffice } from "@/components/office/BottomNavOffice";
import { BelowParOverlay } from "@/components/office/BelowParOverlay";
import OrderList from "@/components/office/OrderList";
import type { OrderOtherRow } from "@/components/office/OrderSummaryOffice";
import { OrderLineItem } from "@/components/office/OrderLineItem";

// ── DRAFT ORDER PERSISTENCE ───────────────────────────────
// The draft order survives leaving and re-entering the Order section: every change to
// orderLines is written to localStorage, and the state is rehydrated (with validation)
// when the page mounts again.
const ORDER_LINES_STORAGE_KEY = "office-order-lines-v1";

function loadStoredOrderLines(): OrderLine[] {
  try {
    const raw = window.localStorage.getItem(ORDER_LINES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l: any): l is OrderLine =>
      l != null &&
      typeof l === "object" &&
      l.product != null &&
      typeof l.product === "object" &&
      typeof l.product.id === "number" &&
      typeof l.product["PRODUCT NAME"] === "string" &&
      typeof l.qty === "number" &&
      l.qty > 0 &&
      (l.supplierChoice === null || typeof l.supplierChoice === "string")
    );
  } catch {
    // Corrupt JSON or storage unavailable — start with an empty order.
    return [];
  }
}

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
  // Draft order rehydrated from localStorage so items persist across visits.
  const [orderLines, setOrderLines] = useState<OrderLine[]>(loadStoredOrderLines);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [forceOrderDropdown, setForceOrderDropdown] = useState(false);
  const [orderActiveIndex, setOrderActiveIndex] = useState(-1);
  const [orderSupplierFilter, setOrderSupplierFilter] = useState<string[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  // ⋮ toggle — when true the ALL SUPPLIERS filter replaces BELOW PAR in the header.
  const [supplierFilterOpen, setSupplierFilterOpen] = useState(false);
  const [openSupplierIdx, setOpenSupplierIdx] = useState<number | null>(null);
  const [showBelowPar, setShowBelowPar] = useState(false);
  const [belowParList, setBelowParList] = useState<OfficeProduct[]>([]);
  const [editParProduct, setEditParProduct] = useState<OfficeProduct | null>(null);
  const [editParValue, setEditParValue] = useState<string>("");
  // Expanded Order Summary sheet state + bottom-nav reveal (swipe up from the page bottom).
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryNavVisible, setSummaryNavVisible] = useState(false);
  // ── ORDER LIST PANEL ("Send Order List to Ailing") ──
  // The summary's send button now opens this panel instead of sharing the PDF directly.
  // It collects the two PDF inputs: URGENT ticks (product ids) and the OTHER write-in rows
  // (Product + Notes). Both persist while the draft order lives, so re-opening the panel
  // keeps the previous selections until Clear Order wipes the order.
  const [showOrderList, setShowOrderList] = useState(false);
  const [urgentIds, setUrgentIds] = useState<Set<number>>(new Set());
  // OTHER rows — starts with one empty Product + Notes row; "+ ROW" appends more.
  const [otherRows, setOtherRows] = useState<OrderOtherRow[]>([{ product: "", notes: "" }]);
  const toggleUrgent = (productId: number) =>
    setUrgentIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  // Measured height of the ORDER top bar — the summary sheet starts just below it.
  const [topBarH, setTopBarH] = useState(0);
  // Measured height of the Enter Product bar — added to the supplier dropdown's
  // max-height so it extends down exactly as far as the product dropdown does.
  const [enterBarH, setEnterBarH] = useState(0);

  const orderSearchRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const orderScrollRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const summaryNavSwipe = useRef<{ startY: number } | null>(null);

  const fg = "hsl(var(--foreground))";
  const muted = "hsl(var(--muted-foreground))";
  const border = "0.5px solid hsl(var(--border))";
  const red = "hsl(0 84% 60%)";
  const hdrStyle: React.CSSProperties = {
    fontSize: "10px", fontWeight: 600, fontFamily: "Raleway, inherit",
    letterSpacing: "0.12em", textTransform: "uppercase", color: fg,
  };

  // ── ORDER SUMMARY SHEET ──────────────────────────────────
  // Measure the ORDER top bar so the expanded Order Summary sheet starts exactly
  // below it — covering the Enter Product search line and everything below it.
  // (ResizeObserver keeps the offset correct across widths / font-size clamps.)
  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const measure = () => setTopBarH(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure the Enter Product bar height so the supplier dropdown (anchored below the
  // header) extends down exactly as far as the product dropdown (which starts at the
  // bottom of that bar) does — both end at the same point on screen.

  useEffect(() => {
    const el = orderSearchRef.current;
    if (!el) return;
    const measure = () => setEnterBarH(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Collapse the sheet if the order is emptied while it is open (e.g. Clear Order)..
  useEffect(() => {
    if (orderLines.length === 0 && summaryExpanded) setSummaryExpanded(false);
  }, [orderLines.length, summaryExpanded]);

  // Persist the draft order to localStorage on every change so items, quantities and
  // supplier choices are still there after leaving and re-entering the Order section.
  // (Clearing the order writes an empty list, which correctly resets the saved draft.)
  useEffect(() => {
    try {
      window.localStorage.setItem(ORDER_LINES_STORAGE_KEY, JSON.stringify(orderLines));
    } catch {
      // Storage unavailable (e.g. private browsing) — the order just won't persist.
    }
  }, [orderLines]);

  // ── SUMMARY SHEET NAV GESTURE ────────────────────────────
  // The bottom nav is hidden while the expanded Order Summary sheet is open:
  // swipe up from the bottom edge of the screen to reveal it, swipe down to hide
  // it again. (Same pattern as the Sales panel on the Office page.)
  useEffect(() => {
    if (from !== "office" || !summaryExpanded) { setSummaryNavVisible(false); return; }
    const EDGE_ZONE = 64;  // gesture only starts within this many px of the screen bottom
    const THRESHOLD = 36;  // swipe distance (px) needed to toggle the nav
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      summaryNavSwipe.current = t.clientY > window.innerHeight - EDGE_ZONE ? { startY: t.clientY } : null;
    };
    const onMove = (e: TouchEvent) => {
      const start = summaryNavSwipe.current;
      if (!start) return;
      const dy = start.startY - e.touches[0].clientY; // positive = swiping up
      if (dy > THRESHOLD && !summaryNavVisible) { setSummaryNavVisible(true); summaryNavSwipe.current = null; }
      else if (dy < -THRESHOLD && summaryNavVisible) { setSummaryNavVisible(false); summaryNavSwipe.current = null; }
    };
    const opts = { capture: true, passive: true };
    window.addEventListener("touchstart", onStart, opts);
    window.addEventListener("touchmove", onMove, opts);
    return () => {
      window.removeEventListener("touchstart", onStart, opts);
      window.removeEventListener("touchmove", onMove, opts);
    };
  }, [from, summaryExpanded, summaryNavVisible]);

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
      if (supplierDropdownRef.current &&
          !supplierDropdownRef.current.contains(e.target as Node) &&
          !(topBarRef.current && topBarRef.current.contains(e.target as Node))) {
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
    // Colour flag lives in the uppercase "COLOUR" column with uppercase "NO"/"YES"
    // values (same check as the Search page's isYes(p["COLOUR"])). The old code read
    // the mixed-case "Colour" key, which doesn't exist in the data, so no product was
    // ever classified as colour and colours blended into the A–Z product list.
    const v = (p as any)["COLOUR"];
    return v === true || v === 1 || (typeof v === "string" && v.toUpperCase() === "YES");
  };

  // Products below PAR (OFFICE BALANCE only, non-colour products).
  // Only UOM = "UNIT" rows are orderable — BUNDLE rows (and UOM-less rows) are
  // never shown here (same rule as the branch pages' product lists), so a
  // duplicate product+supplier row can never add a bundle to the order.
  const belowParProducts: OfficeProduct[] = (() => {
    const seen = new Map<string, OfficeProduct>();
    for (const p of products) {
      if (isColourProd(p)) continue;
      if (p["UOM"] !== "UNIT") continue;
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

  // Dropdown sections with Search-page style headers: FAVOURITES → PRODUCTS → COLOURS.
  // Filtering the already-sorted flat list preserves the A–Z order within each section,
  // and reconstructing flat indices across these sections in this order matches
  // orderDropdownResults exactly (keyboard navigation stays aligned).
  const orderDropdownSections = {
    favourites: orderDropdownResults.filter(p => isOfficeFav(p)),
    products: orderDropdownResults.filter(p => !isOfficeFav(p) && !isColourProd(p)),
    colours: orderDropdownResults.filter(p => !isOfficeFav(p) && isColourProd(p)),
  };

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
      <div ref={topBarRef} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 16px 16px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, overflow: "hidden" }}>
          <span
            onClick={() => {
              if (from === "office") slideTo("/simple/office", undefined, "back");
              else if (from === "adminportal") slideTo("/simple/admin", undefined, "back");
              else onBack?.();
            }}
            style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: fg, cursor: "pointer", flexShrink: 0 }}
          >ORDER</span>
          {/* BELOW PAR button — temporarily replaced by ALL SUPPLIERS while the ⋮ filter is open */}
          {supplierFilterOpen ? (
            <button
              onClick={() => setShowSupplierDropdown(o => !o)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: "10px", fontWeight: 600, fontFamily: "Raleway, inherit",
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: fg, display: "flex", alignItems: "center", gap: "5px",
                minWidth: 0, overflow: "hidden",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {orderSupplierFilter.length === 0 ? "ALL SUPPLIERS" : orderSupplierFilter.join(", ")}
              </span>
              {/* Caret — points right when closed, turns DOWN while the dropdown is open */}
              <ChevronDown
                size={12}
                strokeWidth={2.5}
                style={{
                  flexShrink: 0,
                  transform: `rotate(${showSupplierDropdown ? 0 : -90}deg)`,
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          ) : (
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
          )}
        </div>
        {/* ⋮ — opens/closes the ALL SUPPLIERS filter shown in the header */}
        <button
          onClick={() => {
            setSupplierFilterOpen(o => {
              const next = !o;
              if (!next) setShowSupplierDropdown(false);
              return next;
            });
          }}
          aria-label={supplierFilterOpen ? "Close suppliers" : "Open suppliers"}
          title={supplierFilterOpen ? "Close suppliers" : "Open suppliers"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: supplierFilterOpen ? fg : muted, display: "flex", alignItems: "center",
            flexShrink: 0,
          }}
        >
          <MoreVertical size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Selected supplier pills — above the Enter Product line (grey pills, Past Data box style) */}
      {supplierFilterOpen && orderSupplierFilter.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "0 20px 10px" }}>
          {orderSupplierFilter.map(sup => (
            <div key={sup} style={{
              fontSize: "10px", fontFamily: "Raleway, inherit", letterSpacing: "0.05em",
              padding: "4px 10px", borderRadius: "999px",
              background: "hsl(var(--muted) / 0.3)",
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

      {/* ALL SUPPLIERS dropdown — part of the page (same background, no floating panel),
          extends down as far as the product dropdown does — ending at the same point. */}
      {showSupplierDropdown && supplierFilterOpen && (
        <div
          ref={supplierDropdownRef}
          style={{
            position: "absolute", top: topBarH, left: 0, right: 0,
            zIndex: 50, background: "hsl(var(--background))",
            maxHeight: `calc(65vh + ${enterBarH}px)`, overflowY: "auto", padding: "4px 0",
          }}
        >
          {allSuppliers.map((sup, i) => {
            const selected = orderSupplierFilter.includes(sup);
            return (
              <div
                key={sup}
                onClick={() => { setOrderSupplierFilter(prev => selected ? prev.filter(s => s !== sup) : [...prev, sup]); setShowSupplierDropdown(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 20px", cursor: "pointer",
                  fontSize: "14px", fontFamily: "Raleway, inherit",
                  fontWeight: selected ? 500 : 300,
                  color: fg,
                  borderBottom: i < allSuppliers.length - 1 ? border : "none",
                }}
              >
                <Building2 size={14} strokeWidth={1.5} style={{ color: "inherit", opacity: 0.4, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sup}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Enter Product — full width search line (mirrors the Search page) */}
      <div ref={orderSearchRef} style={{ position: "relative", padding: "16px 20px 12px", borderBottom: "1px solid hsl(var(--border))", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Search size={15} style={{ color: muted, flexShrink: 0 }} />
          <input
            type="text"
            value={orderSearch}
            onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); setForceOrderDropdown(false); setOrderActiveIndex(-1); }}
            onFocus={() => { if (orderSearch.length === 0) setForceOrderDropdown(true); setShowOrderDropdown(true); }}
            placeholder="Enter Product"
            onKeyDown={handleOrderKeyDown}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "15px", fontFamily: "Raleway, inherit", color: fg, caretColor: fg }}
          />
          {orderSearch && (
            <button onClick={() => { setOrderSearch(""); setShowOrderDropdown(false); setForceOrderDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: muted }}>
              <X size={14} />
            </button>
          )}
        </div>
        {showOrderDropdown && orderDropdownResults.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "hsl(var(--background))", maxHeight: "65vh", overflowY: "auto" }}>
            {(() => {
              // Sections mirror the Search page (FAVOURITES → PRODUCTS → COLOURS);
              // flatIdx keeps keyboard-highlight indices aligned with orderDropdownResults.
              let flatIdx = 0;
              const sections: [string, OfficeProduct[]][] = [
                ["FAVOURITES", orderDropdownSections.favourites],
                ["PRODUCTS", orderDropdownSections.products],
                ["COLOURS", orderDropdownSections.colours],
              ];
              return sections.map(([title, items]) =>
                items.length === 0 ? null : (
                  <React.Fragment key={title}>
                    <div style={{ ...hdrStyle, fontWeight: 700, paddingTop: 14, paddingBottom: 4, paddingLeft: 20, paddingRight: 20 }}>{title}</div>
                    {items.map((p, j) => {
                      const i = flatIdx++;
                      return (
                        <div
                          key={p.id}
                          onMouseDown={() => addToOrder(p)}
                          style={{
                            padding: "10px 20px", cursor: "pointer",
                            background: i === orderActiveIndex ? "hsl(var(--card))" : "transparent",
                            borderBottom: j < items.length - 1 ? border : "none",
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
                      );
                    })}
                  </React.Fragment>
                )
              );
            })()}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div ref={orderScrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px", paddingBottom: from === "office" ? "calc(env(safe-area-inset-bottom, 0px) + 96px)" : "16px" }}>

        {/* Order lines */}
        {orderLines.length > 0 && (
          <div>
            {orderLines.map((line, idx) => (
              <OrderLineItem
                key={idx}
                line={line}
                idx={idx}
                products={products}
                openSupplierIdx={openSupplierIdx}
                setOpenSupplierIdx={setOpenSupplierIdx}
                supplierChoiceIdx={supplierChoiceIdx}
                handleSupplierChoiceKeyNav={handleSupplierChoiceKeyNav}
                chooseSupplierForOpenLine={chooseSupplierForOpenLine}
                setOrderLines={setOrderLines}
                getBalanceColor={getBalanceColor}
                fg={fg}
                muted={muted}
                border={border}
              />
            ))}

            <div style={{ paddingBottom: "24px" }} />
          </div>
        )}
      </div>

      {/* Order Summary footer — collapsible bottom sheet (overlay mode: expands into a
          full-height sheet starting just below the ORDER header, covering everything below it) */}
      {orderLines.length > 0 && (
        <OrderSummaryOffice
          orderLines={orderLines}
          setOrderLines={setOrderLines}
          products={products}
          scrollRef={orderScrollRef}
          expanded={summaryExpanded}
          onExpandedChange={setSummaryExpanded}
          onSendToAiling={() => setShowOrderList(true)}
          overlay
          overlayTop={topBarH}
        />
      )}

      {/* BELOW PAR overlay panel */}
      {showBelowPar && (
        <BelowParOverlay
          belowParList={belowParList}
          orderLines={orderLines}
          isInOrder={isInOrder}
          toggleBelowPar={toggleBelowPar}
          isOfficeFav={isOfficeFav}
          toggleOfficeFav={toggleOfficeFav}
          setProducts={setProducts}
          setBelowParList={setBelowParList}
          setEditParProduct={setEditParProduct}
          setEditParValue={setEditParValue}
          balCell={balCell}
          onClose={() => setShowBelowPar(false)}
          onOpenOrderList={() => { setShowBelowPar(false); setShowOrderList(true); }}
          fg={fg}
          muted={muted}
          border={border}
          hdrStyle={hdrStyle}
        />
      )}

      {/* ORDER LIST overlay panel — opened from the Order Summary draft footer's
          "Send Order List to Ailing" button. Ticked products print URGENT (dark red)
          in the PDF; the Other write-ins print under OTHER at the bottom. */}
      {showOrderList && (
        <OrderList
          orderLines={orderLines}
          urgentIds={urgentIds}
          onToggleUrgent={toggleUrgent}
          otherRows={otherRows}
          onOtherRowsChange={setOtherRows}
          onClose={() => setShowOrderList(false)}
        />
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
          raised={orderLines.length > 0 && !summaryExpanded}
          // The nav is ONLY shown while the order is empty. As soon as a product
          // is selected the Order Summary footer exists and the nav hides. While
          // the expanded sheet is open the bottom-edge swipe can still reveal it
          // (swipe up shows / swipe down hides); the Below Par overlay always
          // hides it (the nav would otherwise float above it).
          hidden={(orderLines.length > 0 && !summaryNavVisible) || showBelowPar || showOrderList}
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
