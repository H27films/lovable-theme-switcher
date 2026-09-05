import { createPortal } from "react-dom";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronUp, ChevronDown, Star, Minus, Plus } from "lucide-react";
import { makeIsFavourite, USAGE_TYPES, THERAPISTS, isYes } from "@/lib/branchSimpleUtils";
import { type BranchConfig, type OfficeProduct, type LogRow } from "@/lib/branchSimple";
import { OrderSubmitFooter } from "./OrderSubmitFooter";
import { OrderExportActions } from "./OrderExportActions";
import { OrderSummary, type PersistedPendingOrder } from "./OrderSummary";
import { useDropdownKeyboardNavigation } from "@/hooks/useDropdownKeyboardNavigation";
import { ResultRow } from "./ResultRow";
import { useTabletMode } from "@/hooks/useTabletMode";
import { LowBalancePanel } from "./LowBalancePanel";

interface OrderPanelProps {
  config: BranchConfig;
  products: OfficeProduct[];
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>;
  branchLog: LogRow[];
  refreshBranchLog: () => void | Promise<void>;
  onBack: () => void;
  onSuccess?: () => void;
  onPastOrdersChange?: (expanded: boolean) => void;
  /** Branch favourite check (useBranchFavourites.isFav) */
  isFav?: (p: any) => boolean;
  /** Branch low-balance threshold lookup (useBranchFavourites.lowBalanceOf) — used by the Low Balance overlay. */
  lowBalanceOf?: (p: any) => number | null;
  isColour?: (p: any) => boolean;
  nameOf?: (p: any) => string;
  allowedIds?: Set<number>;
  /** Branch favourite toggle (useBranchFavourites.toggleFavourite) — used by the Low Balance overlay star buttons. */
  toggleFavourite?: (p: any) => void | Promise<void>;
}

export const OrderPanel = ({
  config, products, setProducts, branchLog, refreshBranchLog, onBack, onSuccess, onPastOrdersChange,
  isFav: propIsFav, lowBalanceOf, isColour: propIsColour, nameOf: propNameOf, allowedIds, toggleFavourite
}: OrderPanelProps) => {
  const checkFav = propIsFav || makeIsFavourite(config.favouriteKey);
  const checkColour = propIsColour || ((p: any) => isYes(p["Colour"]));
  const getName = propNameOf || ((p: any) => p["PRODUCT NAME"]);
  const BALANCE_KEY = config.balanceKey as keyof OfficeProduct;
  const { tablet } = useTabletMode();

  const [orderEntries, setOrderEntries] = useState<{ id: number; productName: string; qty: number }[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  // "Low Balance" overlay (branch counterpart of the Office Below Par section).
  const [showLowBalance, setShowLowBalance] = useState(false);
  const orderInputRef = useRef<HTMLInputElement>(null);

  const [pendingOrder, setPendingOrder] = useState<PersistedPendingOrder | null>(null);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [orderConfirming, setOrderConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());
  const [grnNotes, setGrnNotes] = useState("");
  const [lastConfirmedEntries, setLastConfirmedEntries] = useState<Array<{productName: string; starting: number; qty: number; ending: number}> | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdError, setPwdError] = useState(false);


  useEffect(() => {
    onPastOrdersChange?.(showAllOrders);
  }, [showAllOrders, onPastOrdersChange]);

  // Load the submitted-but-unconfirmed order lines for this branch so they're visible
  // across devices (one shared submit per branch, one row per product line).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("OrderSubmit")
        .select("*")
        .eq("BRANCH", config.logBranchName)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error && Array.isArray(data) && data.length > 0) {
        const entries = data.map(r => {
          const product = products.find(p => p["PRODUCT NAME"] === r["PRODUCT NAME"]);
          const starting = Number((product as any)?.[BALANCE_KEY] ?? 0);
          const qty = Number(r.QTY) || 0;
          return { id: r.id, productName: r["PRODUCT NAME"], starting, qty, ending: starting + qty };
        });
        setPendingOrder({ grn: data[0].GRN || "", date: data[0].DATE || "", entries });
        setGrnNotes(data[0].NOTES || "");
      }
      setPendingLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [config.logBranchName]);

  // Persist the submitted-but-unconfirmed order as one row per product line in the
  // shared database, and remove it once the order is confirmed or reset (cancelled).
  useEffect(() => {
    if (!pendingLoaded) return;
    (async () => {
      try {
        await (supabase as any)
          .from("OrderSubmit")
          .delete()
          .eq("BRANCH", config.logBranchName);
        if (pendingOrder && pendingOrder.entries.length > 0) {
          await (supabase as any).from("OrderSubmit").insert(
            pendingOrder.entries.map(e => ({
              BRANCH: config.logBranchName,
              "PRODUCT NAME": e.productName,
              QTY: e.qty,
              DATE: pendingOrder.date,
              GRN: pendingOrder.grn,
              NOTES: grnNotes,
            }))
          );
        }
      } catch {
        /* ignore */
      }
    })();
  }, [pendingLoaded, pendingOrder, grnNotes, config.logBranchName]);

  const uniqueProducts = useMemo(() => {
    const map = new Map<string, OfficeProduct>();
    products.forEach(p => {
      if (!allowedIds || allowedIds.has(Number(p.id))) {
        const name = getName(p);
        if (name && !map.has(name)) {
          map.set(name, p);
        }
      }
    });
    return Array.from(map.values());
  }, [products, getName, allowedIds]);

  const orderFiltered = orderSearch.length > 0
    ? uniqueProducts.filter(p => getName(p).toLowerCase().includes(orderSearch.toLowerCase()))
    : uniqueProducts;

  const orderFavs    = orderFiltered.filter(p => checkFav(p)).sort((a, b) => getName(a).localeCompare(getName(b)));
  const orderColours = orderFiltered.filter(p => !checkFav(p) && checkColour(p)).sort((a, b) => getName(a).localeCompare(getName(b)));
  const orderRegular = orderFiltered.filter(p => !checkFav(p) && !checkColour(p)).sort((a, b) => getName(a).localeCompare(getName(b)));

  // Flat result list in exact render order (Favourites → Products → Colours)
  // plus an id→index map so each row knows its keyboard highlight position.
  const orderFlatItems = useMemo(
    () => [...orderFavs, ...orderRegular, ...orderColours],
    [orderFavs, orderRegular, orderColours]
  );
  const orderRowIndexById = useMemo(() => {
    const map = new Map<number, number>();
    orderFlatItems.forEach((p, i) => map.set(p.id, i));
    return map;
  }, [orderFlatItems]);

  const { activeIndex: orderActiveIdx, handleKeyDown: handleOrderListKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount: showOrderDropdown ? orderFlatItems.length : 0,
      onSelect: idx => {
        const p = orderFlatItems[idx];
        if (p) handleAddOrderProduct(p);
      },
      onClose: () => dismissOrderDropdown(),
    });

  const handleAddOrderProduct = (p: OfficeProduct) => {
    const existing = orderEntries.find(e => e.productName === p["PRODUCT NAME"]);
    if (!existing) {
      setOrderEntries(prev => [...prev, { id: Date.now(), productName: p["PRODUCT NAME"], qty: 1 }]);
    }
    setOrderSearch("");
    setShowOrderDropdown(false);
    orderInputRef.current?.blur();
  };

  const dismissOrderDropdown = () => {
    setShowOrderDropdown(false);
    setOrderSearch("");
    orderInputRef.current?.blur();
  };

  const closePanel = () => {
    onBack();
    setOrderSearch("");
    setShowOrderDropdown(false);
  };

  const handleOrderSubmit = () => {
    const valid = orderEntries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yy = String(today.getFullYear()).slice(-2);
    const grn = `${config.grnPrefix} ${dd}${mm}${yy}`;
    const dateStr = today.toISOString().split("T")[0];
    // Merge the newly added items into any existing submitted order instead of overwriting it.
    const merged = new Map<string, PersistedPendingOrder["entries"][number]>(
      (pendingOrder?.entries ?? []).map(e => [e.productName, { ...e }])
    );
    for (const entry of valid) {
      const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
      const starting = Number((product as any)?.[BALANCE_KEY] ?? 0);
      const existing = merged.get(entry.productName);
      if (existing) {
        existing.qty += entry.qty;
        existing.ending = existing.starting + existing.qty;
      } else {
        merged.set(entry.productName, {
          id: Date.now() + Math.floor(Math.random() * 1000),
          productName: entry.productName,
          starting,
          qty: entry.qty,
          ending: starting + entry.qty,
        });
      }
    }
    setPendingOrder({ grn, date: dateStr, entries: Array.from(merged.values()) });
    setOrderEntries([]);
    setOrderError(null);
  };

  const handleConfirmOrder = () => {
    if (!pendingOrder) return;
    setShowPwdModal(true);
    setPwdValue("");
    setPwdError(false);
  };

  const executeConfirmOrder = async () => {
    if (pwdValue !== "128128") {
      setPwdError(true);
      return;
    }
    setShowPwdModal(false);
    setOrderConfirming(true);
    setOrderError(null);
    let hasError = false;
    try {
      for (const entry of pendingOrder.entries) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const currentOfficeBalance = Number(product?.["OFFICE BALANCE"] ?? 0);
        const endingOfficeBalance = currentOfficeBalance - entry.qty;
        const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": pendingOrder.date,
          "PRODUCT NAME": entry.productName,
          "BRANCH": config.logBranchName,
          "SUPPLIER": "Office",
          "TYPE": "Order",
          "THERAPIST": "Hamza",
          "STARTING BALANCE": entry.starting,
          "QTY": entry.qty,
          "ENDING BALANCE": entry.ending,
          "GRN": pendingOrder.grn,
          "OFFICE BALANCE": endingOfficeBalance,
        });
        if (logErr) { setOrderError(logErr.message || "Write failed"); hasError = true; break; }
        await (supabase as any).from("AllFileProducts")
          .update({ [BALANCE_KEY]: entry.ending })
          .eq("PRODUCT NAME", entry.productName);
        await (supabase as any).from("AllFileProducts")
          .update({ "OFFICE BALANCE": endingOfficeBalance })
          .eq("PRODUCT NAME", entry.productName);
        setProducts(prev => prev.map(p =>
          p["PRODUCT NAME"] === entry.productName
            ? { ...p, [BALANCE_KEY]: entry.ending, "OFFICE BALANCE": endingOfficeBalance }
            : p
        ));
      }
      if (!hasError) {
        setOrderEntries([]);
        setPendingOrder(null);
        setGrnNotes("");
        setConfirmSuccess(true);
        setLastConfirmedEntries(pendingOrder.entries);
        setTimeout(() => setConfirmSuccess(false), 3000);
        await refreshBranchLog();
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setOrderError(err?.message || "Unknown error");
    }
    setOrderConfirming(false);
  };

  const handleResetOrder = () => {
    setPendingOrder(null);
    setOrderError(null);
    setGrnNotes("");
  };

  const toggleGRN = (key: string) => {
    setExpandedGRNs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allOrderGroups = useMemo(() => {
    const orders = branchLog.filter(r => r.TYPE === "Order");
    const seen = new Map<string, LogRow[]>();
    orders.forEach(r => {
      const grn = r.GRN || r.DATE;
      const key = `${r.DATE}__${grn}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(r);
    });
    const groups: { key: string; date: string; grn: string; rows: LogRow[] }[] = [];
    seen.forEach((rows, key) => {
      const [date, grn] = key.split("__");
      // Products inside an expanded order are listed A–Z by product name
      rows.sort((a, b) =>
        String(a["PRODUCT NAME"] ?? "").localeCompare(String(b["PRODUCT NAME"] ?? ""), undefined, { sensitivity: "base" })
      );
      groups.push({ key, date, grn, rows });
    });
    // Past Orders groups: newest date first
    return groups.sort((a, b) => b.date.localeCompare(a.date));
  }, [branchLog]);

return createPortal(
  <div style={{
    position: "fixed", top: 0, left: 0,
    width: tablet ? "76.92308vw" : "100vw",
    height: tablet ? "76.92308dvh" : "100dvh",
    background: "hsl(var(--background, 0 0% 0%))", zIndex: 200,
    zoom: tablet ? 1.3 : 1,
    display: "flex", flexDirection: "column", overflow: "hidden",
  }}>
      <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", paddingBottom: "0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          {/* Title + today's date on one line (same arrangement/sizing as the Usage panel) */}
          <span style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <button onClick={onBack} title="Back to home" style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>ORDER</button>
            <span style={{ fontSize: "13px", fontWeight: 300, letterSpacing: "0.01em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()}
            </span>
          </span>
          <button onClick={closePanel} aria-label="Back to menu" title="Back" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--foreground))", display: "flex", alignItems: "center" }}>
            <svg width="36" height="16" viewBox="0 0 36 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="30" y1="8" x2="1" y2="8" />
              <polyline points="9,1 1,8 9,15" />
            </svg>
          </button>
        </div>
        <div style={{ borderBottom: "0.5px solid hsl(var(--border, 0 0% 50%))", paddingBottom: "12px", marginBottom: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
<input
                ref={orderInputRef}
                type="text"
                inputMode="search"
                value={orderSearch}
                onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }}
                onFocus={() => { setShowOrderDropdown(true); setShowAllOrders(false); }}
                onClick={e => e.stopPropagation()}
                onKeyDown={handleOrderListKeyDown}
                placeholder="Select Product..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "15px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground, 0 0% 100%))", caretColor: "hsl(var(--foreground, 0 0% 100%))" }}
              />
<button
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); if (showOrderDropdown) dismissOrderDropdown(); else { setShowOrderDropdown(true); orderInputRef.current?.focus(); } }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground, 0 0% 50%))", flexShrink: 0, display: "flex", alignItems: "center" }}
              >
                {showOrderDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
{orderSearch.length > 0 && (
                <button onClick={() => { setOrderSearch(""); setShowOrderDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground, 0 0% 50%))" }}>
                  <X size={13} />
                </button>
              )}
          </div>
        </div>
      </div>

      {showOrderDropdown && (
        <div style={{ flex: 1, minHeight: 0, background: "hsl(var(--background, 0 0% 0%))", overflowY: "auto", paddingLeft: "12px", paddingRight: "12px" }}>
          {(() => {
            const sectionLabel = (label: string) => (
              <div key={label} style={{ paddingTop: "12px", paddingBottom: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>{label}</div>
            );
            const renderRow = (p: OfficeProduct, showStar?: boolean) => (
              <ResultRow
                key={p.id}
                isActive={showOrderDropdown && orderRowIndexById.get(p.id) === orderActiveIdx}
                onSelect={() => handleAddOrderProduct(p)}
                style={{ padding: "11px 0", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: orderEntries.find(e => e.productName === p["PRODUCT NAME"]) ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}
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
            if (orderFavs.length > 0)    { sections.push(sectionLabel(config.favouritesLabel)); orderFavs.forEach(p => sections.push(renderRow(p, true))); }
            if (orderRegular.length > 0) { sections.push(sectionLabel("Products"));            orderRegular.forEach(p => sections.push(renderRow(p))); }
            if (orderColours.length > 0) { sections.push(sectionLabel("Colours"));             orderColours.forEach(p => sections.push(renderRow(p))); }
            if (sections.length === 0) return <div style={{ padding: "14px 0", fontSize: "13px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>No products found</div>;
            return sections;
          })()}
        </div>
      )}

      {showAllOrders && allOrderGroups.length > 0 && (
        <div style={{ flex: 1, minHeight: 0, background: "hsl(var(--background, 0 0% 0%))", paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px",         paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)", borderTop: "0.5px solid hsl(var(--border, 0 0% 50%))", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
          <div onClick={() => setShowAllOrders(false)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", cursor: "pointer" }}>
            <div style={{ fontSize: "22px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "-0.02em" }}>Past Orders</div>
            <span style={{ padding: "4px", color: "hsl(var(--muted-foreground, 0 0% 50%))", display: "flex", alignItems: "center", marginLeft: "auto" }}>
              <ChevronDown size={14} />
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border, 0 0% 50%))", paddingBottom: "8px", marginBottom: "4px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", letterSpacing: "0.02em" }}>Date</div>
            <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", letterSpacing: "0.02em", textAlign: "center" }}>GRN</div>
            <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", letterSpacing: "0.02em", textAlign: "center" }}>Items</div>
            {expandedGRNs.size > 0 ? <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", letterSpacing: "0.02em", textAlign: "center" }}>Bal</div> : <div />}
          </div>
          {allOrderGroups.map(group => (
            <React.Fragment key={group.key}>
              <div onClick={() => toggleGRN(group.key)} style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border, 0 0% 50%))", padding: "10px 0", alignItems: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))" }}>{new Date(group.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", textAlign: "center" }}>{group.grn}</div>
                <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))", textAlign: "center" }}>{group.rows.length}</div>
                <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground, 0 0% 50%))", textAlign: "center", transition: "transform 0.15s", transform: expandedGRNs.has(group.key) ? "rotate(180deg)" : "rotate(0deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>▾</div>
              </div>
              {expandedGRNs.has(group.key) && group.rows.map(row => (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border, 0 0% 50%))", padding: "8px 0", alignItems: "center", background: "hsl(var(--card, 0 0% 10%))" }}>
                  <div style={{ paddingLeft: "8px" }} />
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", textAlign: "center" }}>{row["PRODUCT NAME"]}</div>
                  <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(120 60% 40%)", textAlign: "center" }}>+{row.QTY}</div>
                  <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))", textAlign: "center" }}>{row["ENDING BALANCE"]}</div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}

      {!showAllOrders && (
        <div style={{ flex: showOrderDropdown ? "0 0 0%" : 1, overflowY: showOrderDropdown ? "hidden" : "auto", minHeight: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px" }} onClick={() => { setShowOrderDropdown(false); setShowAllOrders(false); }}>
        {orderEntries.length === 0 && !pendingOrder && !confirmSuccess && null}
        {confirmSuccess && lastConfirmedEntries && (() => {
          const d = new Date();
          const dd = String(d.getDate()).padStart(2,"0");
          const mm = String(d.getMonth()+1).padStart(2,"0");
          const yy = String(d.getFullYear()).slice(-2);
          const confirmedGrn = `${config.grnPrefix} ${dd}${mm}${yy}`;
          return (
            <div style={{ paddingTop: "24px" }}>
              <div style={{ fontSize: "13px", fontWeight: 300, color: "hsl(120 60% 40%)", fontFamily: "Raleway, inherit", marginBottom: "12px" }}>✓ Order confirmed</div>
<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button onClick={handleResetOrder} style={{ background: "none", border: "0.5px solid hsl(var(--border, 0 0% 50%))", cursor: "pointer", padding: "8px 14px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))" }}>Reset</button>
                </div>
<OrderExportActions entries={lastConfirmedEntries} grn={confirmedGrn} config={config} grnNotes={grnNotes} exportDate={new Date().toISOString().split("T")[0]} />
            </div>
          );
        })()}

{orderEntries.map(entry => {
            const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
            const balance = product ? (product as any)[BALANCE_KEY] : null;
            return (
              <div key={entry.id} style={{ paddingTop: "12px", paddingBottom: "12px", borderBottom: "0.5px solid hsl(var(--border, 0 0% 50%))" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))", flex: 1, minWidth: 0 }}>{entry.productName}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <button onClick={() => setOrderEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: Math.max(1, e.qty - 1) } : e))} aria-label="Decrease quantity" style={{ background: "rgba(222, 214, 207, 0.5)", border: "0.5px solid rgba(180, 165, 152, 0.45)", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: "16px", fontWeight: 400, fontFamily: "Raleway, inherit", minWidth: "34px", textAlign: "center" }}>{entry.qty}</span>
                    <button onClick={() => setOrderEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: e.qty + 1 } : e))} aria-label="Increase quantity" style={{ background: "rgba(222, 214, 207, 0.5)", border: "0.5px solid rgba(180, 165, 152, 0.45)", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))", textTransform: "uppercase" }}>Balance</span>
                    <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: balance != null && Number(balance) <= 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground, 0 0% 100%))" }}>{balance ?? "—"}</span>
                  </div>
                  <button onClick={() => setOrderEntries(prev => prev.filter(e => e.id !== entry.id))} aria-label="Remove product" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(0 60% 35%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}

       </div>
      )}
      {!showAllOrders && pendingOrder && (
        <OrderSummary
          pendingOrder={pendingOrder}
          setPendingOrder={setPendingOrder}
          grnNotes={grnNotes}
          setGrnNotes={setGrnNotes}
          orderConfirming={orderConfirming}
          orderError={orderError}
          config={config}
          onConfirm={handleConfirmOrder}
          onReset={handleResetOrder}
        />
      )}
      {!showAllOrders && orderEntries.length > 0 && (
        <OrderSubmitFooter count={orderEntries.length} onSubmit={handleOrderSubmit} />
      )}
      {!showAllOrders && allOrderGroups.length > 0 && orderEntries.length === 0 && (
        <div style={{ flexShrink: 0, paddingLeft: "12px", paddingRight: "12px", paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)", paddingTop: "6px", borderTop: "0.5px solid hsl(var(--border))", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
      {showPwdModal && createPortal(
        <div 
          onClick={() => setShowPwdModal(false)}
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: "hsl(var(--background))", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "320px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", border: "1px solid hsl(var(--border))" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", letterSpacing: "0.1em", textTransform: "uppercase" }}>Enter Password</span>
              <button onClick={() => setShowPwdModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>
                <X size={20} />
              </button>
            </div>
            
            <input 
              type="password" 
              autoFocus
              value={pwdValue}
              onChange={e => { setPwdValue(e.target.value); setPwdError(false); }}
              onKeyDown={e => { if (e.key === "Enter") executeConfirmOrder(); }}
              placeholder="••••••"
              style={{ width: "100%", background: "hsl(var(--card))", border: pwdError ? "1px solid hsl(0 70% 50%)" : "1px solid hsl(var(--border))", borderRadius: "10px", padding: "12px", fontSize: "18px", textAlign: "center", letterSpacing: "0.3em", marginBottom: "12px", outline: "none", color: "hsl(var(--foreground))" }}
            />
            
            {pwdError && <div style={{ color: "hsl(0 70% 50%)", fontSize: "12px", textAlign: "center", marginBottom: "12px" }}>Incorrect password</div>}
            
            <button 
              onClick={executeConfirmOrder}
              style={{ width: "100%", background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: "999px", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Confirm
            </button>
          </div>
        </div>,
        document.body
      )}

          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
            <button onClick={() => { setShowAllOrders(true); setShowOrderDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground) / 0.85)" }}>
              Past Orders
            </button>
            <button onClick={() => setShowLowBalance(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground) / 0.85)" }}>
              Low Balance
            </button>
          </div>
        </div>
      )}

      {/* LOW BALANCE overlay panel — the branch's favourites + below-low-balance products; rows toggle order entries; title/DONE/✕ close it */}
      {showLowBalance && (
        <LowBalancePanel
          config={config}
          products={products}
          setProducts={setProducts}
          isFav={checkFav}
          lowBalanceOf={lowBalanceOf}
          toggleFavourite={toggleFavourite}
          isProductInOrder={(productName) => orderEntries.some(e => e.productName === productName)}
          onToggleProduct={(p) => {
            const name = p["PRODUCT NAME"];
            setOrderEntries(prev =>
              prev.some(e => e.productName === name)
                ? prev.filter(e => e.productName !== name)
                : [...prev, { id: Date.now(), productName: name, qty: 1 }]
            );
          }}
          orderItemCount={orderEntries.length}
          onClose={() => setShowLowBalance(false)}
        />
      )}
    </div>,
    document.body
  );
};
