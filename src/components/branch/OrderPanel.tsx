import { createPortal } from "react-dom";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, FileText, Download, Star } from "lucide-react";
import { makeIsFavourite, USAGE_TYPES, THERAPISTS, isYes } from "@/lib/branchSimpleUtils";
import { type BranchConfig, type OfficeProduct, type LogRow } from "@/lib/branchSimple";
import { generateGRNPdf, exportToExcel } from "@/lib/grn";
import { OrderSubmitFooter } from "./OrderSubmitFooter";
import { useTabletMode } from "@/hooks/useTabletMode";

type PersistedPendingOrder = {
  grn: string;
  date: string;
  entries: { id: number; productName: string; starting: number; qty: number; ending: number }[];
  notes?: string;
};

interface OrderPanelProps {
  config: BranchConfig;
  products: OfficeProduct[];
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>;
  branchLog: LogRow[];
  refreshBranchLog: () => void | Promise<void>;
  onBack: () => void;
  onPastOrdersChange?: (expanded: boolean) => void;
}

export const OrderPanel = ({ config, products, setProducts, branchLog, refreshBranchLog, onBack, onPastOrdersChange }: OrderPanelProps) => {
  const isFav = makeIsFavourite(config.favouriteKey);
  const BALANCE_KEY = config.balanceKey as keyof OfficeProduct;
  const { tablet } = useTabletMode();

  const [orderEntries, setOrderEntries] = useState<{ id: number; productName: string; qty: number }[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);

  const [pendingOrder, setPendingOrder] = useState<PersistedPendingOrder | null>(null);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [orderConfirming, setOrderConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());
  const [editingPendingIdx, setEditingPendingIdx] = useState<number | null>(null);
  const [editingPendingQty, setEditingPendingQty] = useState("");
  const [grnNotes, setGrnNotes] = useState("");
  const [lastConfirmedEntries, setLastConfirmedEntries] = useState<Array<{productName: string; starting: number; qty: number; ending: number}> | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);

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
    if (pendingOrder && pendingOrder.entries.length > 0) {
      (supabase as any)
        .from("OrderSubmit")
        .delete()
        .eq("BRANCH", config.logBranchName)
        .then(() =>
          (supabase as any).from("OrderSubmit").insert(
            pendingOrder.entries.map(e => ({
              BRANCH: config.logBranchName,
              "PRODUCT NAME": e.productName,
              QTY: e.qty,
              DATE: pendingOrder.date,
              GRN: pendingOrder.grn,
              NOTES: grnNotes,
            }))
          )
        )
        .catch(() => {});
    } else {
      (supabase as any)
        .from("OrderSubmit")
        .delete()
        .eq("BRANCH", config.logBranchName)
        .catch(() => {});
    }
  }, [pendingLoaded, pendingOrder, grnNotes, config.logBranchName]);

  const orderFiltered = orderSearch.length > 0
    ? products.filter(p => p["PRODUCT NAME"].toLowerCase().includes(orderSearch.toLowerCase()))
    : products;
  const orderFavs    = orderFiltered.filter(p =>  isFav(p));
const orderColours = orderFiltered.filter(p => !isFav(p) && isYes(p["Colour"]));
   const orderRegular = orderFiltered.filter(p => !isFav(p) && !isYes(p["Colour"]));

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

  const handleConfirmOrder = async () => {
    if (!pendingOrder) return;
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
      groups.push({ key, date, grn, rows });
    });
    return groups.sort((a, b) => b.date.localeCompare(a.date));
  }, [branchLog]);

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
          <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>ORDER</span>
          <button onClick={closePanel} aria-label="Back to menu" title="Back" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center" }}>
            <svg width="30" height="20" viewBox="0 0 30 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M27 10H6" />
              <path d="M13 3l-7 7 7 7" />
            </svg>
          </button>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", cursor: showOrderDropdown ? "pointer" : "default" }}
          onClick={() => { if (showOrderDropdown) dismissOrderDropdown(); }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textTransform: "uppercase" }}>
            Enter Today's Order
          </span>
          <span style={{ fontSize: "11px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>
            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}
          </span>
        </div>
        <div style={{ borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "12px", marginBottom: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
             <input
               ref={orderInputRef}
               type="text"
               inputMode="search"
               value={orderSearch}
               onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }}
               onFocus={() => { setShowOrderDropdown(true); setShowAllOrders(false); }}
               placeholder="Select product..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))" }}
            />
            <button
              onMouseDown={e => { e.preventDefault(); if (showOrderDropdown) dismissOrderDropdown(); else { setShowOrderDropdown(true); orderInputRef.current?.focus(); } }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", flexShrink: 0, display: "flex", alignItems: "center" }}
            >
              {showOrderDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {orderSearch.length > 0 && (
              <button onClick={() => { setOrderSearch(""); setShowOrderDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showOrderDropdown && (
        <div style={{ flexShrink: 0, background: "hsl(var(--background))", maxHeight: "55vh", overflowY: "auto", paddingLeft: "12px", paddingRight: "12px" }}>
          {(() => {
            const sectionLabel = (label: string) => (
              <div key={label} style={{ paddingTop: "12px", paddingBottom: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>{label}</div>
            );
            const renderRow = (p: OfficeProduct, showStar?: boolean) => (
              <div
                key={p.id}
                onMouseDown={() => handleAddOrderProduct(p)}
                style={{ padding: "11px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: orderEntries.find(e => e.productName === p["PRODUCT NAME"]) ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {showStar && <Star aria-label="favourite" size={11} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6, flexShrink: 0 }} />}
                  {p["PRODUCT NAME"]}
                </span>
                {(p as any)[BALANCE_KEY] != null && (
                  <span style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginLeft: "8px" }}>{(p as any)[BALANCE_KEY]}</span>
                )}
              </div>
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
        <div style={{ flex: 1, minHeight: 0, background: "hsl(var(--background))", paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px",         paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)", borderTop: "0.5px solid hsl(var(--border))", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ fontSize: "22px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "-0.02em" }}>Past Orders</div>
            <button onClick={() => setShowAllOrders(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", marginLeft: "auto" }}>
              <ChevronDown size={14} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "8px", marginBottom: "4px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>Date</div>
            <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>GRN</div>
            <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>Items</div>
            {expandedGRNs.size > 0 ? <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>Bal</div> : <div />}
          </div>
          {allOrderGroups.map(group => (
            <React.Fragment key={group.key}>
              <div onClick={() => toggleGRN(group.key)} style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", padding: "10px 0", alignItems: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{new Date(group.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{group.grn}</div>
                <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{group.rows.length}</div>
                <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", textAlign: "center", transition: "transform 0.15s", transform: expandedGRNs.has(group.key) ? "rotate(180deg)" : "rotate(0deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>▾</div>
              </div>
              {expandedGRNs.has(group.key) && group.rows.map(row => (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", padding: "8px 0", alignItems: "center", background: "hsl(var(--card))" }}>
                  <div style={{ fontSize: "10px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", paddingLeft: "8px" }}>—</div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["PRODUCT NAME"]}</div>
                  <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(120 60% 40%)", textAlign: "center" }}>+{row.QTY}</div>
                  <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{row["ENDING BALANCE"]}</div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}

      {!showAllOrders && (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px" }} onClick={() => { setShowOrderDropdown(false); setShowAllOrders(false); }}>
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
                <button onClick={handleResetOrder} style={{ background: "none", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: "8px 14px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>Reset</button>
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                <button onClick={() => generateGRNPdf(lastConfirmedEntries, confirmedGrn, config, grnNotes)} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}><FileText size={10} />GRN PDF</button>
                <button onClick={() => exportToExcel(lastConfirmedEntries, confirmedGrn)} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}><Download size={10} />Export</button>
              </div>
            </div>
          );
        })()}

        {orderEntries.map(entry => {
          const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
          const balance = product ? (product as any)[BALANCE_KEY] : null;
          return (
            <div key={entry.id} style={{ paddingTop: "12px", paddingBottom: "12px", borderBottom: "0.5px solid hsl(var(--border))" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", flex: 1 }}>{entry.productName}</span>
                <button onClick={() => setOrderEntries(prev => prev.filter(e => e.id !== entry.id))} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>Balance</span>
                  <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{balance ?? "—"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  <button onClick={() => setOrderEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: Math.max(1, e.qty - 1) } : e))} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}><ChevronLeft size={14} /></button>
                  <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", minWidth: "28px", textAlign: "center" }}>{entry.qty}</span>
                  <button onClick={() => setOrderEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: e.qty + 1 } : e))} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}><ChevronRight size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}

        {pendingOrder && (
          <div style={{ marginTop: "32px", borderTop: "0.5px solid hsl(var(--border))", paddingTop: "20px", paddingBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ fontSize: "22px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "-0.02em" }}>Order Summary</div>
              <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", letterSpacing: "0.08em" }}>{pendingOrder.grn}</div>
            </div>
            <div style={{ fontSize: "11px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", marginBottom: "16px" }}>
              Pending · Tap qty to edit · Click × to remove
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 56px 48px 20px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "8px", marginBottom: "4px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>Product</div>
              <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>Cur Bal</div>
              <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>Qty</div>
              <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>End Bal</div>
              <div />
            </div>
            {pendingOrder.entries.map((entry, idx) => {
              const isEditing = editingPendingIdx === idx;
              const parsedEdit = parseInt(editingPendingQty);
              const displayQty = isEditing && !isNaN(parsedEdit) && parsedEdit > 0 ? parsedEdit : entry.qty;
              return (
                <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr 48px 56px 48px 20px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", padding: "8px 0", alignItems: "center" }}>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", wordBreak: "break-word" }}>{entry.productName}</div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{entry.starting}</div>
                  <div style={{ textAlign: "center" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editingPendingQty}
                        onChange={e => setEditingPendingQty(e.target.value)}
                        onBlur={() => {
                          if (!isNaN(parsedEdit) && parsedEdit > 0) {
                            setPendingOrder(prev => {
                              if (!prev) return prev;
                              const entries = prev.entries.map((e, i) => i === idx ? { ...e, qty: parsedEdit, ending: e.starting + parsedEdit } : e);
                              return { ...prev, entries };
                            });
                          }
                          setEditingPendingIdx(null);
                          setEditingPendingQty("");
                        }}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setEditingPendingIdx(null); setEditingPendingQty(""); } }}
                        autoFocus
                        style={{ width: "44px", textAlign: "center", fontSize: "13px", fontFamily: "Raleway, inherit", fontWeight: 300, background: "none", border: "0.5px solid hsl(var(--border))", color: "hsl(var(--foreground))", padding: "2px", outline: "none" }}
                      />
                    ) : (
                      <span onClick={() => { setEditingPendingIdx(idx); setEditingPendingQty(String(entry.qty)); }} style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(120 60% 40%)", cursor: "pointer", display: "inline-block", minWidth: "32px" }}>+{entry.qty}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{entry.starting + displayQty}</div>
                  <button onClick={() => { setPendingOrder(prev => { if (!prev) return prev; const entries = prev.entries.filter((_, i) => i !== idx); return entries.length === 0 ? null : { ...prev, entries }; }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 70% 50%)")} onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}><X size={11} /></button>
                </div>
              );
            })}
            <div style={{ marginTop: "16px", marginBottom: "16px" }}>
              <textarea value={grnNotes} onChange={e => setGrnNotes(e.target.value)} placeholder="Add notes (optional)" rows={2} style={{ width: "100%", background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: "13px", fontFamily: "Raleway, inherit", fontWeight: 300, padding: "8px", resize: "none", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px" }}>
              <button onClick={handleConfirmOrder} disabled={orderConfirming} style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", cursor: orderConfirming ? "default" : "pointer", padding: "10px 24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", opacity: orderConfirming ? 0.5 : 1 }}>{orderConfirming ? "Saving..." : "Confirm Order"}</button>
              <button onClick={handleResetOrder} style={{ background: "none", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: "10px 20px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>Reset</button>
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <button onClick={() => generateGRNPdf(pendingOrder.entries.map(e => ({ productName: e.productName, starting: e.starting, qty: e.qty, ending: e.starting + e.qty })), pendingOrder.grn, config, grnNotes)} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}><FileText size={10} />GRN PDF</button>
              <button onClick={() => exportToExcel(pendingOrder.entries.map(e => ({ productName: e.productName, starting: e.starting, qty: e.qty, ending: e.starting + e.qty })), pendingOrder.grn)} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}><Download size={10} />Export</button>
            </div>
            {orderError && <div style={{ fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em", marginBottom: "8px" }}>✗ {orderError}</div>}
          </div>
        )}

       </div>
      )}
      {!showAllOrders && orderEntries.length > 0 && (
        <OrderSubmitFooter count={orderEntries.length} onSubmit={handleOrderSubmit} />
      )}
      {!showAllOrders && allOrderGroups.length > 0 && orderEntries.length === 0 && (
        <div style={{ flexShrink: 0, paddingLeft: "12px", paddingRight: "12px", paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)", paddingTop: "6px", borderTop: "0.5px solid hsl(var(--border))" }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowAllOrders(true)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "5px 0", fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground) / 0.85)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Past Orders</span>
            <ChevronUp size={14} />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};
