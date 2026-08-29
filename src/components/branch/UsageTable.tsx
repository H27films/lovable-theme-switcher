import { createPortal } from "react-dom";
import { handleInputFocus, handleInputBlur } from "@/lib/utils";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronUp, ChevronDown, X, Star, Minus, Plus } from "lucide-react";
import { useBranchTherapists } from "@/hooks/useBranchTherapists";
import { type BranchConfig, type OfficeProduct, type EntryLine } from "@/lib/branchSimple";
import { useTabletMode } from "@/hooks/useTabletMode";
import { makeIsFavourite, isYes, USAGE_TYPES, typeColumnValue, usagePillValue, therapistValue, therapistPillStyle } from "@/lib/branchSimpleUtils";
import { useDropdownKeyboardNavigation } from "@/hooks/useDropdownKeyboardNavigation";
import { ResultRow } from "./ResultRow";


interface UsageTableProps {
  config: BranchConfig;
  products: OfficeProduct[];
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>;
  refreshBranchLog: () => void | Promise<void>;
  selectedProduct: OfficeProduct | null;
  setSelectedProduct: React.Dispatch<React.SetStateAction<OfficeProduct | null>>;
  onBack: () => void;
  onSuccess?: () => void;
  onUsageEntriesChange: (count: number) => void;
  isFav?: (p: any) => boolean;
  isColour?: (p: any) => boolean;
  nameOf?: (p: any) => string;
}

// ── Draft persistence (localStorage) ────────────────────────────
// In-progress usage entries survive navigating away / closing the panel.
// Keyed per branch ("boudoir" | "chic" | "nuryadi") + version suffix so a
// schema change can never load stale shapes. Cleared automatically on
// successful submit (entries reset to [], which overwrites the stored draft).
const usageStorageKey = (branchKey: string) => `usageEntries:${branchKey}:v1`;

const isValidEntryLine = (e: any): e is EntryLine =>
  e != null &&
  typeof e === "object" &&
  typeof e.id === "number" &&
  typeof e.productName === "string" &&
  typeof e.type === "string" &&
  typeof e.qty === "number" &&
  typeof e.therapist === "string" &&
  typeof e.note === "string" &&
  typeof e.noteOpen === "boolean" &&
  typeof e.sellingPrice === "string";

const loadStoredEntries = (branchKey: string): EntryLine[] => {
  try {
    const raw = localStorage.getItem(usageStorageKey(branchKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntryLine);
  } catch {
    return [];
  }
};

export const UsageTable = ({ config, products, setProducts, refreshBranchLog, selectedProduct, setSelectedProduct, onBack, onSuccess, onUsageEntriesChange, isFav: propIsFav, isColour: propIsColour, nameOf: propNameOf }: UsageTableProps) => {
  const checkFav = propIsFav || makeIsFavourite(config.favouriteKey);
  const checkColour = propIsColour || ((p: any) => isYes(p["Colour"]));
  const getName = propNameOf || ((p: any) => p["PRODUCT NAME"]);
  const therapists = useBranchTherapists(config.displayName);
  const BALANCE_KEY = config.balanceKey as keyof OfficeProduct;
  const { tablet } = useTabletMode();

  // Restore any in-progress draft from localStorage (per branch), then save on every change
  const [usageEntries, setUsageEntries] = useState<EntryLine[]>(() => loadStoredEntries(config.key));
  const [usageSearch, setUsageSearch] = useState("");
  const [showUsageDropdown, setShowUsageDropdown] = useState(false);
  const [usageSubmitting, setUsageSubmitting] = useState(false);
  const [usageSuccess, setUsageSuccess] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const usageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onUsageEntriesChange(usageEntries.length);
  }, [usageEntries, onUsageEntriesChange]);

  // Persist the draft so it survives leaving the page / closing the panel.
  // Submitting resets entries to [], which also clears the stored draft.
  useEffect(() => {
    try {
      localStorage.setItem(usageStorageKey(config.key), JSON.stringify(usageEntries));
    } catch {}
  }, [usageEntries, config.key]);

  const uniqueProducts = useMemo(() => {
    const map = new Map<string, OfficeProduct>();
    products.forEach(p => {
      if (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1) {
        const name = getName(p);
        if (name && !map.has(name)) {
          map.set(name, p);
        }
      }
    });
    return Array.from(map.values());
  }, [products, getName]);

  const usageFiltered = usageSearch.length > 0
    ? uniqueProducts.filter(p => getName(p).toLowerCase().includes(usageSearch.toLowerCase()))
    : uniqueProducts;

  const usageFavs    = usageFiltered.filter(p =>  checkFav(p)).sort((a, b) => getName(a).localeCompare(getName(b)));
  const usageColours = usageFiltered.filter(p => !checkFav(p) && checkColour(p)).sort((a, b) => getName(a).localeCompare(getName(b)));
  const usageRegular = usageFiltered.filter(p => !checkFav(p) && !checkColour(p)).sort((a, b) => getName(a).localeCompare(getName(b)));

  const handleAddUsageProduct = (p: OfficeProduct) => {
    const existing = usageEntries.find(e => e.productName === p["PRODUCT NAME"]);
    if (!existing) {
      setUsageEntries(prev => [...prev, {
        id: Date.now(),
        productName: p["PRODUCT NAME"],
        type: "Salon Use",
        qty: -1,
        therapist: "THERAPIST",
        note: "",
        noteOpen: false,
        sellingPrice: "",
      }]);
    }
    setUsageSearch("");
    setShowUsageDropdown(false);
    usageInputRef.current?.blur();
  };

  const dismissUsageDropdown = () => {
    setShowUsageDropdown(false);
    setUsageSearch("");
    usageInputRef.current?.blur();
  };

  // Flat result list in exact render order (Favourites → Products → Colours)
  // plus an id→index map so each row knows its keyboard highlight position.
  const usageFlatItems = useMemo(
    () => [...usageFavs, ...usageRegular, ...usageColours],
    [usageFavs, usageRegular, usageColours]
  );
  const usageRowIndexById = useMemo(() => {
    const map = new Map<number, number>();
    usageFlatItems.forEach((p, i) => map.set(p.id, i));
    return map;
  }, [usageFlatItems]);

  const { activeIndex: usageActiveIdx, handleKeyDown: handleUsageKeyNav } =
    useDropdownKeyboardNavigation({
      itemCount: showUsageDropdown ? usageFlatItems.length : 0,
      onSelect: idx => {
        const p = usageFlatItems[idx];
        if (p) handleAddUsageProduct(p);
      },
      onClose: () => dismissUsageDropdown(),
    });

  const cycleType = (id: number) => {
    setUsageEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const list = USAGE_TYPES && USAGE_TYPES.length > 0 ? USAGE_TYPES : ["Salon Use", "Staff", "Customer", "FOC", "Transfer"];
      const idx = list.indexOf(e.type);
      const nextType = list[(idx + 1) % list.length];
      // Auto-populate the unit price when a sale type is selected:
      // Customer → the product's CUSTOMER PRICE, Staff → its STAFF PRICE.
      // The user can still override the box by typing; the value is only ever
      // saved to the log's SELLING PRICE column (never back to the product).
      if (nextType === "Customer" || nextType === "Staff") {
        const product = products.find(p => p["PRODUCT NAME"] === e.productName);
        const price = nextType === "Customer" ? product?.["CUSTOMER PRICE"] : product?.["STAFF PRICE"];
        const prefilled = price != null && Number.isFinite(Number(price)) ? Number(price).toFixed(2) : "";
        return { ...e, type: nextType as any, sellingPrice: prefilled };
      }
      return { ...e, type: nextType as any };
    }));
  };

  const cycleTherapist = (id: number) => {
    setUsageEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const list = therapists.length > 0 ? therapists : ["AILING", "ANNIE", "HAMZA", "SZI WAH"];
      const idx = list.indexOf(e.therapist);
      const nextTh = list[(idx + 1) % list.length];
      return { ...e, therapist: nextTh };
    }));
  };

  const toggleNote = (id: number) => {
    setUsageEntries(prev => prev.map(e => e.id === id ? { ...e, noteOpen: !e.noteOpen } : e));
  };

  const closePanel = () => {
    onBack();
    setUsageSearch("");
    setShowUsageDropdown(false);
  };

  const handleUsageSubmit = async () => {
    const valid = usageEntries.filter(e => e.productName);
    if (!valid.length) return;
    setUsageError(null);
    setUsageSubmitting(true);
    let hadError = false;
    try {
      const today = new Date().toISOString().split("T")[0];
      for (const entry of valid) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const currentBalance = Number((product as any)?.[BALANCE_KEY] ?? 0);
        const endingBalance = currentBalance + entry.qty;
        const isSale = entry.type === "Customer" || entry.type === "Staff";
        const parsedPrice = Number.parseFloat(entry.sellingPrice);
        const sellingPrice = isSale && Number.isFinite(parsedPrice) ? Number(parsedPrice.toFixed(2)) : null;
        const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": today,
          "PRODUCT NAME": entry.productName,
          "BRANCH": config.logBranchName,
          "SUPPLIER": null,
          "TYPE": typeColumnValue(entry.type),
          "USAGE PILL": usagePillValue(entry.type),
          "THERAPIST": therapistValue(entry.therapist),
          "NOTES": entry.note,
          "STARTING BALANCE": currentBalance,
          "QTY": entry.qty,
          "ENDING BALANCE": endingBalance,
          "GRN": null,
          "OFFICE BALANCE": Number(product?.["OFFICE BALANCE"] ?? 0),
          ...(sellingPrice != null ? { "SELLING PRICE": sellingPrice } : {}),
        });
        if (logErr) { setUsageError(logErr.message || "Write failed"); hadError = true; break; }
        await (supabase as any).from("AllFileProducts")
          .update({ [BALANCE_KEY]: endingBalance })
          .eq("PRODUCT NAME", entry.productName);
      }
      if (!hadError) {
        setUsageEntries([]);
        setUsageSuccess(true);
        setTimeout(() => setUsageSuccess(false), 3000);
        const { data } = await (supabase as any)
          .from("AllFileLog").select("*").eq("BRANCH", config.logBranchName)
          .order("DATE", { ascending: false }).limit(50);
        setProducts(prev => prev.map(p => {
          const entry = valid.find(e => e.productName === p["PRODUCT NAME"]);
          if (!entry) return p;
          const cur = Number((p as any)?.[BALANCE_KEY] ?? 0);
          return { ...p, [BALANCE_KEY]: cur + entry.qty };
        }));
        if (selectedProduct) {
          const entry = valid.find(e => e.productName === selectedProduct["PRODUCT NAME"]);
          if (entry) {
            const cur = Number((selectedProduct as any)?.[BALANCE_KEY] ?? 0);
            setSelectedProduct({ ...selectedProduct, [BALANCE_KEY]: cur - entry.qty });
          }
        }
        refreshBranchLog();
        if (onSuccess) {
          onSuccess();
        } else {
          onBack();
        }
      }
    } catch (err: any) {
      setUsageError(err?.message || "Unknown error");
    }
    setUsageSubmitting(false);
  };

  return createPortal(
    <div style={{
      position: "fixed", top: 0, left: 0,
      width: tablet ? "76.92308vw" : "100vw",
      height: tablet ? "76.92308dvh" : "100dvh",
      background: "hsl(var(--background))", zIndex: 200,
      zoom: tablet ? 1.3 : 1,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", paddingBottom: "0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <button onClick={onBack} title="Back to home" style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>USAGE</button>
          <button onClick={closePanel} aria-label="Back to menu" title="Back" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--foreground))", display: "flex", alignItems: "center" }}>
            <svg width="36" height="16" viewBox="0 0 36 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="30" y1="8" x2="1" y2="8" />
              <polyline points="9,1 1,8 9,15" />
            </svg>
          </button>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", cursor: showUsageDropdown ? "pointer" : "default" }}
          onClick={() => { if (showUsageDropdown) dismissUsageDropdown(); }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textTransform: "uppercase" }}>
            Enter Today's Stock Movements
          </span>
          <span style={{ fontSize: "15px", fontWeight: 400, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>
            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}
          </span>
        </div>

        <div style={{ borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "12px", marginBottom: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              ref={usageInputRef}
              type="text"
              inputMode="search"
              value={usageSearch}
              onChange={e => { setUsageSearch(e.target.value); setShowUsageDropdown(true); }}
              onFocus={() => setShowUsageDropdown(true)}
              onKeyDown={handleUsageKeyNav}
              placeholder="Select Product..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))" }}
            />
            <button
              onMouseDown={e => { e.preventDefault(); if (showUsageDropdown) { dismissUsageDropdown(); } else { setShowUsageDropdown(true); usageInputRef.current?.focus(); } }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", flexShrink: 0, display: "flex", alignItems: "center" }}
            >
              {showUsageDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {usageSearch.length > 0 && (
              <button onClick={() => { setUsageSearch(""); setShowUsageDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showUsageDropdown && (
        <div style={{ flex: "1 1 auto", minHeight: 0, marginBottom: usageEntries.length > 0 ? "0px" : "44px", background: "hsl(var(--background))", overflowY: "auto", paddingLeft: "12px", paddingRight: "12px", paddingTop: "0", paddingBottom: "env(safe-area-inset-bottom, 12px)" }}>
          {(() => {
            const sectionLabel = (label: string) => (
              <div key={label} style={{ paddingTop: "12px", paddingBottom: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>{label}</div>
            );
            const renderRow = (p: OfficeProduct, showStar?: boolean) => (
              <ResultRow
                key={p.id}
                isActive={showUsageDropdown && usageRowIndexById.get(p.id) === usageActiveIdx}
                onSelect={() => handleAddUsageProduct(p)}
                style={{ padding: "11px 0", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: usageEntries.find(e => e.productName === p["PRODUCT NAME"]) ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {showStar && <Star aria-label="favourite" size={11} fill="hsl(var(--foreground))" color="hsl(var(--foreground))" style={{ flexShrink: 0 }} />}
                  {p["PRODUCT NAME"]}
                </span>
                {(p as any)[BALANCE_KEY] != null && (
                  <span style={{ fontSize: "13px", color: Number((p as any)[BALANCE_KEY]) <= 0 ? "hsl(0 70% 40%)" : "hsl(var(--muted-foreground))", marginLeft: "8px" }}>{(p as any)[BALANCE_KEY]}</span>
                )}
              </ResultRow>
            );
            const sections: React.ReactNode[] = [];
            if (usageFavs.length > 0)    { sections.push(sectionLabel(config.favouritesLabel)); usageFavs.forEach(p => sections.push(renderRow(p, true))); }
            if (usageRegular.length > 0) { sections.push(sectionLabel("Products"));           usageRegular.forEach(p => sections.push(renderRow(p))); }
            if (usageColours.length > 0) { sections.push(sectionLabel("Colours"));            usageColours.forEach(p => sections.push(renderRow(p))); }
            if (sections.length === 0) return <div style={{ padding: "14px 0", fontSize: "13px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>No products found</div>;
            return sections;
          })()}
        </div>
      )}

      <div style={{ flex: 1, display: showUsageDropdown ? "none" : "block", overflowY: "auto", minHeight: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px" }} onClick={() => setShowUsageDropdown(false)}>
        {usageEntries.map(entry => {
          const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
          const currentBalance = Number((product as any)?.[BALANCE_KEY] ?? 0);
          const projectedBalance = currentBalance + entry.qty;
          const isSaleType = entry.type === "Customer" || entry.type === "Staff";
          const saleQty = Math.abs(entry.qty);
          const parsed = Number.parseFloat(entry.sellingPrice);
          const totalSale = (Number.isFinite(parsed) ? parsed : 0) * saleQty;

          return (
            <div key={entry.id} style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
              {/* Product row */}
              <div style={{ paddingTop: "12px", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: "10px", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", maxWidth: "60%" }}>{entry.productName}</span>
                    <span style={{ fontSize: "17px", fontWeight: 500, fontFamily: "Raleway, inherit", color: projectedBalance <= 0 ? "hsl(0 70% 50%)" : "hsl(var(--green, 120 60% 40%))", flexShrink: 0 }}>{projectedBalance}</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <button onClick={() => setUsageEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: e.qty - 1 } : e))} aria-label="Decrease quantity" style={{ background: "hsl(var(--raised, 38 30% 97.5%))", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: "16px", fontWeight: 400, fontFamily: "Raleway, inherit", minWidth: "34px", textAlign: "center" }}>{entry.qty > 0 ? `+${entry.qty}` : entry.qty}</span>
                    <button onClick={() => setUsageEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: e.qty + 1 } : e))} aria-label="Increase quantity" style={{ background: "hsl(var(--raised, 38 30% 97.5%))", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                    <button onClick={() => cycleType(entry.id)} style={{ background: "#ffffff", color: "hsl(var(--foreground))", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: "5px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", textTransform: "uppercase" }}>{entry.type}</button>
                    <button onClick={() => cycleTherapist(entry.id)} style={{ ...(entry.therapist !== "THERAPIST" ? therapistPillStyle(entry.therapist, therapists) : { background: "none", color: "hsl(var(--muted-foreground))" }), border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: "5px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", textTransform: "uppercase" }}>{entry.therapist}</button>
                    <button onClick={() => toggleNote(entry.id)} style={{ background: entry.noteOpen || entry.note.trim().length > 0 ? "hsl(24 35% 28%)" : "none", color: entry.noteOpen || entry.note.trim().length > 0 ? "#ffffff" : "hsl(var(--muted-foreground))", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: "5px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", textTransform: "uppercase" }}>+NOTE</button>
                  </div>
                  <button onClick={() => setUsageEntries(prev => prev.filter(e => e.id !== entry.id))} style={{ background: "none", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: 0, color: "hsl(0 60% 35%)", flexShrink: 0, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

{isSaleType && (
  <div style={{
    display: "flex",
    alignItems: "flex-end",
    marginLeft: "-12px",
    marginRight: "-12px",
    background: "hsl(var(--muted) / 0.5)",
    padding: "10px 16px",
    gap: "12px",
  }}>

    {/* Unit Price */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>Unit Price</span>
      <input
        type="text"
        inputMode="decimal"
        value={entry.sellingPrice}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onChange={e => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          setUsageEntries(prev => prev.map(x => x.id === entry.id ? { ...x, sellingPrice: v } : x));
        }}
        placeholder="0.00"
        style={{ width: "90px", background: "hsl(var(--background))", color: "hsl(var(--foreground))", border: "0.5px solid hsl(var(--border))", borderRadius: "6px", outline: "none", fontSize: "14px", fontWeight: 500, fontFamily: "Raleway, inherit", caretColor: "hsl(var(--foreground))", padding: "5px 8px", textAlign: "center" }}
      />
    </div>

    {/* × */}
    <span style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", paddingBottom: "7px" }}>×</span>

    {/* Qty */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>Qty</span>
      <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", padding: "5px 0" }}>{saleQty}</span>
    </div>

    {/* = */}
    <span style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", paddingBottom: "7px" }}>=</span>

    {/* Total Sale */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>Total Sale</span>
      <span style={{ fontSize: "14px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", padding: "5px 0" }}>RM {totalSale.toFixed(2)}</span>
    </div>

  </div>
)}

              {/* Note input */}
              {entry.noteOpen && (
                <div style={{ paddingLeft: "0", paddingRight: "0", borderBottom: "0.5px solid hsl(var(--border))", padding: "10px 0 8px" }}>
                  <input
                    type="text"
                    value={entry.note}
                    onChange={e => setUsageEntries(prev => prev.map(x => x.id === entry.id ? { ...x, note: e.target.value } : x))}
                    placeholder="Add note..."
                    style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: "14px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {usageEntries.length > 0 && (
        <div style={{ flexShrink: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px", paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)", borderTop: "0.5px solid hsl(var(--border))", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={handleUsageSubmit} disabled={usageSubmitting} style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", cursor: usageSubmitting ? "default" : "pointer", padding: "10px 24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", opacity: usageSubmitting ? 0.5 : 1, borderRadius: "999px" }}>{usageSubmitting ? "Saving..." : "Submit"}</button>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {usageSuccess && <span style={{ fontSize: "11px", color: "hsl(var(--green, 120 60% 40%))", letterSpacing: "0.06em" }}>✓ Saved</span>}
              <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{usageEntries.length} {usageEntries.length === 1 ? "Product" : "Products"}</span>
            </div>
          </div>
          {usageError && <div style={{ marginTop: "8px", fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em" }}>✗ {usageError}</div>}
        </div>
      )}
    </div>,
    document.body
  );
};