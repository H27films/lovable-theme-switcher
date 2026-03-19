import React, { useState, useRef, useEffect } from "react";
import { X, Search, Building2, ChevronDown, ChevronUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface OfficeProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "STAFF PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "OFFICE BALANCE": number | null;
  "OFFICE SECTION": string | null;
  "UNITS/ORDER": number | null;
  "BOUDOIR BALANCE": number | null;
  "CHIC NAILSPA BALANCE": number | null;
  "NUR YADI BALANCE": number | null;
  "Colour": string | null;
  "OFFICE FAVOURITE": string | null;
}

interface LogRow {
  id: number;
  DATE: string;
  "PRODUCT NAME": string;
  BRANCH: string;
  TYPE: string;
  SUPPLIER: string | null;
  QTY: number;
  GRN?: string;
  "OFFICE BALANCE"?: number;
}

interface OrderLine {
  product: OfficeProduct;
  supplierChoice: string | null;
  qty: number;
}

interface OfficeSimpleProps {
  onBack: () => void;
  onBackToMain: () => void;
  products: OfficeProduct[];
}

const hdrStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: "hsl(var(--muted-foreground))", textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const OfficeSimple = ({ onBack, onBackToMain, products }: OfficeSimpleProps) => {
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === "sand" ? "light" : "sand");
  const [showOrderPanel, setShowOrderPanel] = useState(false);

  // ── Search state ────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState<"idle" | "active" | "result" | "supplier">("idle");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const BRANCH_NAME = "OFFICE";
  const BALANCE_KEY = "OFFICE BALANCE" as keyof OfficeProduct;

  // ── Local products (synced from prop, refreshed after order) ─
  const [localProducts, setLocalProducts] = useState<OfficeProduct[]>(products);
  useEffect(() => { setLocalProducts(products); }, [products]);

  const refreshLocalProducts = async () => {
    let allData: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("AllFileProducts").select("*").range(from, from + 999);
      if (error || !data?.length) break;
      allData = allData.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    setLocalProducts(allData);
  };

  // ── Recent log state ─────────────────────────────────────────
  const [logRows, setLogRows] = useState<LogRow[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoadingLog(true);
    (supabase as any)
      .from("AllFileLog").select("*").eq("TYPE", "Order")
      .order("DATE", { ascending: false }).limit(300)
      .then(({ data }: { data: LogRow[] | null }) => {
        setLogRows(data || []);
        setLoadingLog(false);
      });
  }, []);

  // ── Product log (for selected product card) ──────────────────
  const [productLog, setProductLog] = useState<LogRow[]>([]);
  const [productLogLoading, setProductLogLoading] = useState(false);

  useEffect(() => {
    if (!selectedProduct) { setProductLog([]); return; }
    setProductLogLoading(true);
    (supabase as any)
      .from("AllFileLog").select("*")
      .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"])
      .order("DATE", { ascending: false }).limit(30)
      .then(({ data }: any) => {
        setProductLog(data || []);
        setProductLogLoading(false);
      });
  }, [selectedProduct]);

  // ── Favourite state ──────────────────────────────────────────
  const [isFav, setIsFav] = useState(false);
  useEffect(() => {
    const v = selectedProduct ? (selectedProduct as any)["OFFICE FAVOURITE"] : null;
    setIsFav(v === true || v === "TRUE" || v === "true" || v === 1);
  }, [selectedProduct]);

  const toggleFav = async () => {
    if (!selectedProduct) return;
    const newVal = !isFav;
    setIsFav(newVal);
    const updated = { ...selectedProduct, "OFFICE FAVOURITE": newVal ? "TRUE" : null } as any;
    setSelectedProduct(updated);
    setLocalProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, "OFFICE FAVOURITE": newVal ? "TRUE" : null } : p));
    await (supabase as any).from("AllFileProducts")
      .update({ "OFFICE FAVOURITE": newVal ? "TRUE" : null }).eq("id", selectedProduct.id);
  };

  // ── Usage form state ─────────────────────────────────────────
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageType, setUsageType] = useState<"Personal Use" | "Expired">("Personal Use");
  const [usageQty, setUsageQty] = useState("");
  const [usageSubmitting, setUsageSubmitting] = useState(false);

  const submitUsage = async () => {
    if (!selectedProduct || !usageQty || isNaN(Number(usageQty)) || Number(usageQty) <= 0) return;
    setUsageSubmitting(true);
    const qty = Number(usageQty);
    const currentBal = selectedProduct["OFFICE BALANCE"] ?? 0;
    const newBal = currentBal - qty;
    const today = new Date().toISOString().split("T")[0];
    await (supabase as any).from("AllFileLog").insert({
      BRANCH: "Office", "PRODUCT NAME": selectedProduct["PRODUCT NAME"],
      QTY: -qty, TYPE: usageType, DATE: today, "OFFICE BALANCE": newBal,
    });
    await (supabase as any).from("AllFileProducts")
      .update({ "OFFICE BALANCE": newBal }).eq("id", selectedProduct.id);
    const updated = { ...selectedProduct, "OFFICE BALANCE": newBal };
    setSelectedProduct(updated);
    setUsageQty(""); setUsageOpen(false); setUsageSubmitting(false);
    const { data } = await (supabase as any).from("AllFileLog").select("*")
      .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"])
      .order("DATE", { ascending: false }).limit(30);
    setProductLog(data || []);
  };

  // ── ORDER TAB STATE ──────────────────────────────────────────
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [forceOrderDropdown, setForceOrderDropdown] = useState(false);
  const [orderActiveIndex, setOrderActiveIndex] = useState(-1);
  const [orderSupplierFilter, setOrderSupplierFilter] = useState<string[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const orderSearchRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const isOfficeFav = (p: OfficeProduct) => {
    const v = (p as any)["OFFICE FAVOURITE"];
    return v === true || v === "TRUE" || v === "true" || v === 1;
  };
  const isColourProd = (p: OfficeProduct) => {
    const v = p["Colour"];
    return v === true || v === "TRUE" || v === "true" || v === "YES" || v === "yes";
  };

  const allSuppliers = [...new Set(localProducts.map(p => p["SUPPLIER"]).filter(Boolean))].sort() as string[];

  const orderPanelProducts = orderSupplierFilter.length === 0
    ? localProducts
    : localProducts.filter(p => orderSupplierFilter.includes(p["SUPPLIER"] ?? ""));

  const orderDropdownResults = (orderSearch.length > 0 || forceOrderDropdown)
    ? (() => {
        const matched = orderPanelProducts.filter(p =>
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
        }).slice(0, forceOrderDropdown && orderSearch.length === 0 ? 15 : 30);
      })()
    : [];

  const addToOrder = (p: OfficeProduct) => {
    const siblings = localProducts.filter(s =>
      s["PRODUCT NAME"] === p["PRODUCT NAME"] && s.id !== p.id && s["SUPPLIER"] !== p["SUPPLIER"]
    );
    setOrderLines(prev => [...prev, {
      product: p,
      supplierChoice: siblings.length > 0 ? null : p["SUPPLIER"],
      qty: 1,
    }]);
    setOrderSearch(""); setShowOrderDropdown(false); setForceOrderDropdown(false); setOrderActiveIndex(-1);
  };

  const handleOrderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showOrderDropdown || orderDropdownResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setOrderActiveIndex(i => (i + 1) % orderDropdownResults.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setOrderActiveIndex(i => (i <= 0 ? orderDropdownResults.length - 1 : i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const target = orderActiveIndex >= 0 ? orderDropdownResults[orderActiveIndex] : orderDropdownResults[0];
      if (target) addToOrder(target);
    } else if (e.key === "Escape") { setShowOrderDropdown(false); setOrderActiveIndex(-1); }
  };

  const handleOrderConfirm = async () => {
    if (orderLines.length === 0 || orderLines.some(l => l.supplierChoice === null)) return;
    setConfirmError(null);
    setOrderSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const dd = today.slice(8, 10), mm = today.slice(5, 7), yy = today.slice(2, 4);
      const baseGRN = `OFFICE ${dd}${mm}${yy}`;

      type ResolvedLine = { chosenProduct: OfficeProduct; qty: number };
      const supplierGroups: Record<string, ResolvedLine[]> = {};
      for (const line of orderLines) {
        const chosenProduct = line.supplierChoice
          ? localProducts.find(p => p["PRODUCT NAME"] === line.product["PRODUCT NAME"] && p["SUPPLIER"] === line.supplierChoice) ?? line.product
          : line.product;
        const key = chosenProduct["SUPPLIER"] ?? "Unknown";
        if (!supplierGroups[key]) supplierGroups[key] = [];
        supplierGroups[key].push({ chosenProduct, qty: line.qty });
      }

      const supplierKeys = Object.keys(supplierGroups);
      const multiSupplier = supplierKeys.length > 1;

      const { data: maxLogRow } = await (supabase as any)
        .from("AllFileLog").select("id").order("id", { ascending: false }).limit(1).single();
      let nextLogId = ((maxLogRow?.id as number) ?? 0) + 1;

      for (let gi = 0; gi < supplierKeys.length; gi++) {
        const grn = multiSupplier ? `${baseGRN} (${gi + 1})` : baseGRN;
        for (const { chosenProduct, qty } of supplierGroups[supplierKeys[gi]]) {
          const unitsPerOrder = chosenProduct["UNITS/ORDER"] ?? 1;
          const actualQty = qty * unitsPerOrder;
          const currentBalance = Number(chosenProduct["OFFICE BALANCE"] ?? 0);
          const endingBalance = currentBalance + actualQty;

          await (supabase as any).from("AllFileProducts")
            .update({ "OFFICE BALANCE": endingBalance })
            .eq("PRODUCT NAME", chosenProduct["PRODUCT NAME"]);

          const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
            "id": nextLogId++,
            "DATE": today,
            "PRODUCT NAME": chosenProduct["PRODUCT NAME"],
            "BRANCH": "Office",
            "SUPPLIER": chosenProduct["SUPPLIER"] ?? null,
            "TYPE": "Order",
            "STARTING BALANCE": currentBalance,
            "QTY": actualQty,
            "ENDING BALANCE": endingBalance,
            "OFFICE BALANCE": endingBalance,
            "GRN": grn,
          });
          if (logErr) { setConfirmError(logErr.message || "Log write failed"); }
        }
      }

      await refreshLocalProducts();
      setOrderLines([]);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) {
      console.error("Order confirm error:", err);
      setConfirmError("Submit failed");
    }
    setOrderSubmitting(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (orderSearchRef.current && !orderSearchRef.current.contains(e.target as Node)) {
        setShowOrderDropdown(false); setOrderActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── GRN groups for Recent section ────────────────────────────
  interface GrnGroup {
    grn: string; date: string; branch: string; supplier: string; rows: LogRow[];
  }
  const grnGroups: GrnGroup[] = (() => {
    const map = new Map<string, GrnGroup>();
    for (const row of logRows) {
      const grn = row.GRN || `no-grn-${row.id}`;
      if (!map.has(grn)) map.set(grn, { grn, date: row.DATE, branch: row.BRANCH, supplier: row.SUPPLIER ?? "—", rows: [] });
      map.get(grn)!.rows.push(row);
    }
    return Array.from(map.values());
  })();

  const toggleGRN = (grn: string) => {
    setExpandedGRNs(prev => { const next = new Set(prev); next.has(grn) ? next.delete(grn) : next.add(grn); return next; });
  };

  const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  return (
    <div style={{
      minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))",
      fontFamily: "'Raleway', sans-serif", display: "flex", flexDirection: "column",
    }}>

      {/* ── TOP AREA ── */}
      <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", flexShrink: 0 }}>

        {/* Branch name header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
          <button
            onClick={() => {
              if (searchMode !== "idle") {
                setSearchMode("idle"); setSearch(""); setSelectedProduct(null);
                setSelectedSupplier(null); setShowDropdown(false); setUsageOpen(false);
              } else { onBack(); }
            }}
            style={{
              display: "block", fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300,
              letterSpacing: "0.08em", color: "hsl(var(--foreground))",
              background: "none", border: "none", cursor: "pointer", textAlign: "left",
              padding: 0, fontFamily: "Raleway, inherit", lineHeight: 1,
            }}
          >
            {BRANCH_NAME}
          </button>
          {!showOrderPanel && (
            <span
              onClick={toggleTheme}
              style={{ cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", paddingTop: "6px" }}
              title="Switch theme"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </span>
          )}
        </div>

        {/* ORDER button */}
        <div style={{ display: "flex", gap: "28px", borderBottom: "0.5px solid hsl(var(--border))", marginBottom: "20px" }}>
          <button
            onClick={() => setShowOrderPanel(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0 0 12px 0",
              fontSize: "clamp(16px, 4.5vw, 24px)", fontWeight: 300,
              letterSpacing: "0.08em", fontFamily: "Raleway, inherit",
              color: "hsl(var(--foreground))",
              opacity: 0.28,
              borderBottom: "2px solid transparent",
              marginBottom: "-1px",
              transition: "opacity 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = "0.8";
              e.currentTarget.style.borderBottomColor = "hsl(var(--foreground))";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = "0.28";
              e.currentTarget.style.borderBottomColor = "transparent";
            }}
          >
            ORDER
          </button>
        </div>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Search size={15} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={searchMode === "result" || searchMode === "supplier" ? "" : search}
            onChange={e => {
              const val = e.target.value;
              setSearch(val); setSelectedProduct(null); setSelectedSupplier(null);
              setSearchMode("active"); setShowDropdown(val.length > 0); setUsageOpen(false);
            }}
            placeholder="Enter Product / Supplier"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: "15px", fontFamily: "Raleway, inherit",
              color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))",
            }}
          />
          {search.length > 0 && searchMode !== "result" && searchMode !== "supplier" && (
            <button
              onClick={() => { setSearch(""); setSelectedProduct(null); setSelectedSupplier(null); setShowDropdown(false); setSearchMode("active"); setUsageOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── MIDDLE SCROLLABLE ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px" }}>

        {/* ══ SEARCH + RECENT ══════════════════════════════════════ */}
        <>

            {/* Dropdown */}
            {showDropdown && search.length > 0 && (() => {
              const q = search.toLowerCase();
              const allMatched = localProducts.filter(p =>
                p["PRODUCT NAME"].toLowerCase().includes(q) && (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
              );
              const isTrue = (v: any) => v === true || v === "TRUE" || v === "true" || v === 1;
              const favourites = allMatched.filter(p => isTrue(p["OFFICE FAVOURITE"])).slice(0, 6);
              const colours = allMatched.filter(p => !isTrue(p["OFFICE FAVOURITE"]) && isTrue(p["Colour"])).slice(0, 6);
              const regular = allMatched.filter(p => !isTrue(p["OFFICE FAVOURITE"]) && !isTrue(p["Colour"])).slice(0, 6);
              const matchedSuppliers = Array.from(new Set(
                localProducts.map(p => p["SUPPLIER"]).filter((s): s is string => !!s && s.toLowerCase().includes(q))
              )).sort().slice(0, 5);
              const hasResults = favourites.length > 0 || colours.length > 0 || regular.length > 0 || matchedSuppliers.length > 0;

              const SectionHeader = ({ label }: { label: string }) => (
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit", paddingTop: "14px", paddingBottom: "4px" }}>
                  {label}
                </div>
              );
              const ProductRow = ({ p, last }: { p: OfficeProduct; last: boolean }) => (
                <div
                  onClick={() => { setSelectedProduct(p); setSearch(p["PRODUCT NAME"]); setShowDropdown(false); setSearchMode("result"); }}
                  style={{ padding: "12px 0", borderBottom: last ? "none" : "0.5px solid hsl(var(--border))", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{p["PRODUCT NAME"]}</div>
                    {(p as any)[BALANCE_KEY] != null && (
                      <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginLeft: "8px", flexShrink: 0 }}>{(p as any)[BALANCE_KEY]}</div>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", marginTop: "2px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{p["SUPPLIER"]}</div>
                </div>
              );

              return (
                <div>
                  {favourites.length > 0 && (<><SectionHeader label="Office Favourites" />{favourites.map((p, i) => <ProductRow key={p.id} p={p} last={i === favourites.length - 1} />)}</>)}
                  {matchedSuppliers.map(supplier => (
                    <div
                      key={`sup-${supplier}`}
                      onClick={() => { setSelectedSupplier(supplier); setSearch(supplier); setShowDropdown(false); setSearchMode("supplier"); }}
                      style={{ padding: "12px 0", borderBottom: "0.5px solid hsl(var(--border))", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <span style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{supplier}</span>
                      <Building2 size={11} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4, flexShrink: 0, marginLeft: "5px" }} />
                    </div>
                  ))}
                  {regular.length > 0 && (<><SectionHeader label="Products" />{regular.map((p, i) => <ProductRow key={p.id} p={p} last={i === regular.length - 1} />)}</>)}
                  {colours.length > 0 && (<><SectionHeader label="Colours" />{colours.map((p, i) => <ProductRow key={p.id} p={p} last={i === colours.length - 1} />)}</>)}
                  {!hasResults && <div style={{ padding: "20px 0", fontSize: "15px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>No results found</div>}
                </div>
              );
            })()}

            {/* Product result card */}
            {searchMode === "result" && selectedProduct && !showDropdown && (
              <div style={{ paddingTop: "20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, fontFamily: "Raleway, inherit", lineHeight: 1.3, color: "hsl(var(--foreground))", flex: 1 }}>
                    {selectedProduct["PRODUCT NAME"]}
                  </div>
                  <button onClick={toggleFav} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: isFav ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", flexShrink: 0, marginTop: "4px" }}>
                    <Star size={16} fill={isFav ? "currentColor" : "none"} />
                  </button>
                </div>
                <div style={{ borderBottom: "0.5px solid hsl(var(--border))", margin: "16px 0" }} />

                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "6px" }}>Supplier</div>
                  <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["SUPPLIER"] || "—"}</div>
                </div>

                {/* 2-col grid: prices + Office Balance + Store Room */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "18px", columnGap: "12px", marginBottom: "20px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Supplier Price</div>
                    <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["SUPPLIER PRICE"] != null ? `RM ${selectedProduct["SUPPLIER PRICE"].toFixed(2)}` : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Branch Price</div>
                    <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["BRANCH PRICE"] != null ? `RM ${selectedProduct["BRANCH PRICE"].toFixed(2)}` : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Customer Price</div>
                    <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["CUSTOMER PRICE"] != null ? `RM ${selectedProduct["CUSTOMER PRICE"].toFixed(2)}` : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Staff Price</div>
                    <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["STAFF PRICE"] != null ? `RM ${selectedProduct["STAFF PRICE"].toFixed(2)}` : "—"}</div>
                  </div>
                  {/* Office Balance + USE chevron */}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Office Balance</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["OFFICE BALANCE"] ?? "—"}</div>
                      <button
                        onClick={() => { setUsageOpen(o => !o); setUsageQty(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center" }}
                      >
                        {usageOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                    {usageOpen && (
                      <div style={{ marginTop: "10px", padding: "10px 12px", border: "0.5px solid hsl(var(--border))", borderRadius: "8px", background: "hsl(var(--background))" }}>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                          {(["Personal Use", "Expired"] as const).map(t => (
                            <button key={t} onClick={() => setUsageType(t)} style={{
                              flex: 1, padding: "4px 0", fontSize: "10px", fontWeight: 600, fontFamily: "Raleway, inherit",
                              letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", borderRadius: "4px",
                              border: usageType === t ? "1px solid hsl(var(--foreground))" : "0.5px solid hsl(var(--border))",
                              background: usageType === t ? "hsl(var(--foreground))" : "none",
                              color: usageType === t ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                            }}>{t}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <input type="number" min="1" value={usageQty} onChange={e => setUsageQty(e.target.value)} placeholder="Qty"
                            style={{ flex: 1, background: "none", border: "0.5px solid hsl(var(--border))", borderRadius: "4px", padding: "4px 8px", outline: "none", fontSize: "13px", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }} />
                          <button onClick={() => setUsageOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
                            <X size={14} />
                          </button>
                          <button onClick={submitUsage} disabled={usageSubmitting} style={{
                            background: "none", border: "1px solid hsl(var(--destructive))", borderRadius: "4px",
                            padding: "3px 10px", cursor: "pointer", fontSize: "13px", fontFamily: "Raleway, inherit",
                            color: "hsl(var(--destructive))", opacity: usageSubmitting ? 0.5 : 1,
                          }}>✓</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Store Room */}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Store Room</div>
                    <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["OFFICE SECTION"] || "—"}</div>
                  </div>
                </div>

                {/* Branch balances */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", paddingBottom: "20px" }}>
                  {([
                    { label: "Boudoir", key: "BOUDOIR BALANCE" },
                    { label: "Chic Nailspa", key: "CHIC NAILSPA BALANCE" },
                    { label: "Nur Yadi", key: "NUR YADI BALANCE" },
                  ] as { label: string; key: keyof OfficeProduct }[]).map(({ label, key }) => (
                    <div key={label}>
                      <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{(selectedProduct as any)[key] ?? "—"}</div>
                    </div>
                  ))}
                </div>

                {/* Recent transactions for this product */}
                <div style={{ borderTop: "0.5px solid hsl(var(--border))", paddingTop: "16px", paddingBottom: "24px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "10px" }}>Recent</div>
                  <div style={{ display: "grid", gridTemplateColumns: "54px 86px 1fr 32px 38px", columnGap: "8px" }}>
                    <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))" }}>Date</div>
                    <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))" }}>GRN</div>
                    <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))", textAlign: "center" }}>Supplier</div>
                    <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))", textAlign: "center" }}>Qty</div>
                    <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))", textAlign: "right" }}>Bal</div>
                    {productLogLoading && <div style={{ gridColumn: "1/-1", fontSize: "11px", color: "hsl(var(--muted-foreground))", padding: "8px 0" }}>Loading...</div>}
                    {!productLogLoading && productLog.filter(r => r.GRN).length === 0 && (
                      <div style={{ gridColumn: "1/-1", fontSize: "11px", color: "hsl(var(--muted-foreground))", padding: "8px 0" }}>No entries</div>
                    )}
                    {!productLogLoading && productLog.filter(r => r.GRN).map((row, i, arr) => {
                      const isOffice = (row.BRANCH || "").toLowerCase() === "office";
                      const qty = Math.abs(row.QTY);
                      const qtyDisplay = isOffice ? `+${qty}` : `-${qty}`;
                      const cellStyle: React.CSSProperties = {
                        fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit",
                        padding: "6px 0", borderBottom: i < arr.length - 1 ? "0.5px solid hsl(var(--border) / 0.3)" : "none",
                      };
                      return (
                        <React.Fragment key={row.id}>
                          <div style={{ ...cellStyle, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{fmtDate(row.DATE)}</div>
                          <div style={{ ...cellStyle, color: "hsl(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.GRN}</div>
                          <div style={{ ...cellStyle, color: "hsl(var(--muted-foreground))", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.SUPPLIER || "—"}</div>
                          <div style={{ ...cellStyle, color: "hsl(var(--foreground))", textAlign: "center" }}>{qtyDisplay}</div>
                          <div style={{ ...cellStyle, color: "hsl(var(--muted-foreground))", textAlign: "right" }}>{row["OFFICE BALANCE"] ?? "—"}</div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Supplier result */}
            {searchMode === "supplier" && selectedSupplier && !showDropdown && (
              <div style={{ paddingTop: "20px" }}>
                <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "20px" }}>
                  {selectedSupplier}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", paddingBottom: "8px", borderBottom: "0.5px solid hsl(var(--border))", marginBottom: "4px" }}>
                  <div style={{ ...hdrStyle }}>Product</div>
                  <div style={{ ...hdrStyle, textAlign: "right", minWidth: "64px" }}>Price</div>
                  <div style={{ ...hdrStyle, textAlign: "right", minWidth: "36px" }}>Bal</div>
                </div>
                {localProducts
                  .filter(p => p["SUPPLIER"] === selectedSupplier && (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1))
                  .sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]))
                  .map((p, i, arr) => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setSelectedSupplier(null); setSearchMode("result"); }}
                      style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", padding: "11px 0", borderBottom: i < arr.length - 1 ? "0.5px solid hsl(var(--border))" : "none", cursor: "pointer", alignItems: "center" }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{p["PRODUCT NAME"]}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "right", minWidth: "64px" }}>{p["SUPPLIER PRICE"] != null ? `RM ${p["SUPPLIER PRICE"].toFixed(2)}` : "—"}</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "right", minWidth: "36px" }}>{(p as any)[BALANCE_KEY] ?? "—"}</div>
                    </div>
                  ))}
              </div>
            )}

            {/* Recent section (idle only) */}
            {searchMode === "idle" && !showDropdown && (
              <div style={{ paddingTop: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "12px" }}>
                  Recent
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px", gap: "6px", paddingBottom: "8px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                  <div style={hdrStyle}>Date</div>
                  <div style={hdrStyle}>GRN</div>
                  <div style={hdrStyle}>Supplier</div>
                  <div style={{ ...hdrStyle, textAlign: "center" }}>Items</div>
                  <div style={{ ...hdrStyle, textAlign: "center", visibility: expandedGRNs.size > 0 ? "visible" : "hidden" }}>Bal</div>
                  <div />
                </div>
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                  {loadingLog && <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading...</div>}
                  {!loadingLog && grnGroups.length === 0 && <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>}
                  {!loadingLog && grnGroups.map(group => {
                    const isOpen = expandedGRNs.has(group.grn);
                    return (
                      <div key={group.grn}>
                        <div
                          onClick={() => toggleGRN(group.grn)}
                          style={{ display: "grid", gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px", gap: "6px", padding: "9px 0", borderBottom: isOpen ? "none" : "0.5px solid hsl(var(--border) / 0.4)", cursor: "pointer", alignItems: "center" }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{fmtDate(group.date)}</div>
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>{group.grn}</div>
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.supplier}</div>
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{group.rows.length}</div>
                          <div />
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))" }}>
                            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </div>
                        </div>
                        {isOpen && (
                          <div style={{ paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border) / 0.4)" }}>
                            {group.rows.map((row, idx) => (
                              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px", gap: "6px", padding: "5px 0", borderTop: idx > 0 ? "0.5px solid hsl(var(--border) / 0.25)" : "none", alignItems: "center" }}>
                                <div style={{ visibility: "hidden", fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit" }}>{fmtDate(group.date)}</div>
                                <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", gridColumn: "2 / 4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row["PRODUCT NAME"]}</div>
                                <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>
                                  {(row.BRANCH || "").toLowerCase() === "office" ? `+${Math.abs(row.QTY)}` : `-${Math.abs(row.QTY)}`}
                                </div>
                                <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{row["OFFICE BALANCE"] ?? "—"}</div>
                                <div />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </>

        {/* ══ ORDER PANEL OVERLAY ══════════════════════════════════ */}
        {showOrderPanel && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "hsl(var(--background))", zIndex: 100,
            display: "flex", flexDirection: "column",
            fontFamily: "Raleway, inherit",
          }}>
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 16px 16px", borderBottom: "0.5px solid hsl(var(--border))", flexShrink: 0 }}>
              <span style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))" }}>ORDER</span>
              <button
                onClick={() => { setShowOrderPanel(false); setOrderSuccess(false); setConfirmError(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

            {/* Success / Error */}
            {orderSuccess && (
              <div style={{ fontSize: "13px", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "16px", padding: "8px 12px", border: "0.5px solid hsl(var(--border))", borderRadius: "6px" }}>
                ✓ Order confirmed
              </div>
            )}
            {confirmError && (
              <div style={{ fontSize: "12px", color: "hsl(var(--destructive))", marginBottom: "12px", fontFamily: "Raleway, inherit" }}>{confirmError}</div>
            )}

            {/* Supplier filter */}
            <div ref={supplierDropdownRef} style={{ marginBottom: "16px", position: "relative" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                <button
                  onClick={() => setShowSupplierDropdown(o => !o)}
                  style={{
                    fontSize: "10px", fontWeight: 600, fontFamily: "Raleway, inherit", letterSpacing: "0.08em",
                    textTransform: "uppercase", padding: "4px 10px", borderRadius: "20px",
                    border: "0.5px solid hsl(var(--border))", background: "none", cursor: "pointer",
                    color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "4px",
                  }}
                >
                  Supplier <ChevronDown size={10} />
                </button>
                {orderSupplierFilter.map(sup => (
                  <div key={sup} style={{
                    fontSize: "10px", fontFamily: "Raleway, inherit", letterSpacing: "0.06em",
                    padding: "4px 8px", borderRadius: "20px", border: "0.5px solid hsl(var(--foreground))",
                    color: "hsl(var(--foreground))", display: "flex", alignItems: "center", gap: "4px",
                  }}>
                    {sup}
                    <button onClick={() => setOrderSupplierFilter(prev => prev.filter(s => s !== sup))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", display: "flex" }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
              {showSupplierDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", minWidth: "160px" }}>
                  {allSuppliers.map((sup, i) => {
                    const selected = orderSupplierFilter.includes(sup);
                    return (
                      <div
                        key={sup}
                        onClick={() => setOrderSupplierFilter(prev => selected ? prev.filter(s => s !== sup) : [...prev, sup])}
                        style={{
                          padding: "10px 14px", cursor: "pointer", fontSize: "13px", fontFamily: "Raleway, inherit",
                          fontWeight: selected ? 500 : 300,
                          color: selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                          borderBottom: i < allSuppliers.length - 1 ? "0.5px solid hsl(var(--border))" : "none",
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "8px" }}>
                <Search size={14} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); setForceOrderDropdown(false); setOrderActiveIndex(-1); }}
                  onFocus={() => { if (orderSearch.length === 0) setForceOrderDropdown(true); setShowOrderDropdown(true); }}
                  placeholder="Add product"
                  onKeyDown={handleOrderKeyDown}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))" }}
                />
                {orderSearch && (
                  <button onClick={() => { setOrderSearch(""); setShowOrderDropdown(false); setForceOrderDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}>
                    <X size={13} />
                  </button>
                )}
              </div>
              {showOrderDropdown && orderDropdownResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))", borderRadius: "8px", marginTop: "2px", maxHeight: "220px", overflowY: "auto" }}>
                  {orderDropdownResults.map((p, i) => (
                    <div
                      key={`${p.id}`}
                      onMouseDown={() => addToOrder(p)}
                      style={{
                        padding: "10px 14px", cursor: "pointer",
                        background: i === orderActiveIndex ? "hsl(var(--card))" : "transparent",
                        borderBottom: i < orderDropdownResults.length - 1 ? "0.5px solid hsl(var(--border))" : "none",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isOfficeFav(p) && <Star size={9} fill="currentColor" style={{ color: "hsl(var(--foreground))" }} />}
                          <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{p["PRODUCT NAME"]}</div>
                        </div>
                        {p["SUPPLIER"] && <div style={{ fontSize: "11px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>{p["SUPPLIER"]}</div>}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", flexShrink: 0, marginLeft: "8px" }}>
                        {p["OFFICE BALANCE"] ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order lines */}
            {orderLines.length === 0 ? (
              <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", padding: "20px 0" }}>
                No items added yet
              </div>
            ) : (
              <div>
                {orderLines.map((line, idx) => {
                  const siblings = localProducts.filter(s =>
                    s["PRODUCT NAME"] === line.product["PRODUCT NAME"] && s.id !== line.product.id && s["SUPPLIER"] !== line.product["SUPPLIER"]
                  );
                  const needsChoice = siblings.length > 0 && line.supplierChoice === null;
                  const allChoices = [line.product["SUPPLIER"], ...siblings.map(s => s["SUPPLIER"])].filter(Boolean) as string[];
                  const units = line.product["UNITS/ORDER"] ?? 1;
                  return (
                    <div key={idx} style={{ borderBottom: "0.5px solid hsl(var(--border))", padding: "12px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{line.product["PRODUCT NAME"]}</div>
                          {line.supplierChoice && <div style={{ fontSize: "11px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>{line.supplierChoice}</div>}
                          {units > 1 && <div style={{ fontSize: "10px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginTop: "2px", letterSpacing: "0.04em", textTransform: "uppercase" }}>× {units} units/order</div>}
                        </div>
                        <button onClick={() => setOrderLines(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                          <X size={13} />
                        </button>
                      </div>
                      {needsChoice && (
                        <div style={{ marginBottom: "8px" }}>
                          <div style={{ ...hdrStyle, marginBottom: "6px" }}>Choose Supplier</div>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {allChoices.map(sup => (
                              <button key={sup} onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, supplierChoice: sup } : l))} style={{ fontSize: "11px", fontFamily: "Raleway, inherit", padding: "3px 10px", borderRadius: "20px", border: "0.5px solid hsl(var(--border))", background: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>
                                {sup}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <button onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx && l.qty > 1 ? { ...l, qty: l.qty - 1 } : l))} style={{ width: "28px", height: "28px", border: "0.5px solid hsl(var(--border))", borderRadius: "4px 0 0 4px", background: "none", cursor: "pointer", fontSize: "16px", color: "hsl(var(--foreground))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Raleway, inherit" }}>−</button>
                          <input
                            type="number" min="1" value={line.qty}
                            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: v } : l)); }}
                            style={{ width: "40px", height: "28px", textAlign: "center", border: "0.5px solid hsl(var(--border))", borderLeft: "none", borderRight: "none", background: "none", outline: "none", fontSize: "14px", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}
                          />
                          <button onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: l.qty + 1 } : l))} style={{ width: "28px", height: "28px", border: "0.5px solid hsl(var(--border))", borderRadius: "0 4px 4px 0", background: "none", cursor: "pointer", fontSize: "16px", color: "hsl(var(--foreground))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Raleway, inherit" }}>+</button>
                        </div>
                        <div style={{ fontSize: "11px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                          Bal: {line.product["OFFICE BALANCE"] ?? "—"}
                          {units > 1 ? `  ·  Total: ${line.qty * units}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Order Summary + Confirm */}
                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "0.5px solid hsl(var(--border))" }}>
                  <div style={{ ...hdrStyle, marginBottom: "12px" }}>Order Summary</div>
                  {orderLines.map((line, idx) => {
                    const units = line.product["UNITS/ORDER"] ?? 1;
                    const total = line.qty * units;
                    return (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", flex: 1, marginRight: "8px" }}>{line.product["PRODUCT NAME"]}</div>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                          {line.qty}{units > 1 ? ` × ${units} = ${total}` : ""}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={handleOrderConfirm}
                    disabled={orderSubmitting || orderLines.some(l => l.supplierChoice === null)}
                    style={{
                      marginTop: "16px", width: "100%", padding: "12px",
                      fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      border: "0.5px solid hsl(var(--foreground))",
                      background: "hsl(var(--foreground))",
                      color: "hsl(var(--background))",
                      borderRadius: "6px",
                      cursor: orderSubmitting ? "default" : "pointer",
                      opacity: (orderSubmitting || orderLines.some(l => l.supplierChoice === null)) ? 0.5 : 1,
                    }}
                  >
                    {orderSubmitting ? "Confirming…" : "Confirm Order"}
                  </button>
                  <div style={{ paddingBottom: "40px" }} />
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficeSimple;
