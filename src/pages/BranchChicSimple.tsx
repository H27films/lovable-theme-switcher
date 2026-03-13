import { createPortal } from "react-dom";
import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Search, Star, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

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
  "OfficeFavourites": string | null;
  "Chic Nailspa Favourites": string | null;
}

interface LogRow {
  id: number;
  DATE: string;
  "PRODUCT NAME": string;
  BRANCH: string;
  TYPE: string;
  QTY: number;
  "STARTING BALANCE": number;
  "ENDING BALANCE": number;
}

interface EntryLine {
  id: number;
  productName: string;
  type: "Salon Use" | "Customer" | "Staff";
  qty: number;
}

interface BranchChicSimpleProps {
  onBack: () => void;
  onBackToMain: () => void;
  products: OfficeProduct[];
}

const USAGE_TYPES: Array<"Salon Use" | "Customer" | "Staff"> = ["Salon Use", "Customer", "Staff"];

const BranchChicSimple = ({ onBack, onBackToMain, products }: BranchChicSimpleProps) => {
  const [searchMode, setSearchMode] = useState<"idle" | "active" | "result">("idle");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);
  const [savedFavourites, setSavedFavourites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("boudoir_favourites") || "[]"); } catch { return []; }
  });
  const toggleFavourite = (name: string) => {
    setSavedFavourites(prev => {
      const next = prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name];
      localStorage.setItem("boudoir_favourites", JSON.stringify(next));
      return next;
    });
  };

  // Panel state
  const [activePanel, setActivePanel] = useState<"USAGE" | "ORDER" | "CASH" | null>(null);

  // Usage entry state
  const [usageEntries, setUsageEntries] = useState<EntryLine[]>([]);
  const [usageSearch, setUsageSearch] = useState("");
  const [showUsageDropdown, setShowUsageDropdown] = useState(false);
  const [usageSubmitting, setUsageSubmitting] = useState(false);
  const [usageSuccess, setUsageSuccess] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const usageInputRef = useRef<HTMLInputElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const BRANCH_NAME = "BOUDOIR";
  const BALANCE_KEY = "BOUDOIR BALANCE" as keyof OfficeProduct;
  const BRANCH_LOG_NAME = "Boudoir";

  // Branch-wide log (loaded on mount)
  const [branchLog, setBranchLog] = useState<LogRow[]>([]);
  const [loadingBranchLog, setLoadingBranchLog] = useState(true);

  // Product-specific log (loaded when product selected)
  const [productLog, setProductLog] = useState<LogRow[]>([]);
  const [loadingProductLog, setLoadingProductLog] = useState(false);

  // Load branch-wide log on mount
  useEffect(() => {
    setLoadingBranchLog(true);
    (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("BRANCH", BRANCH_LOG_NAME)
      .order("DATE", { ascending: false })
      .limit(50)
      .then(({ data }: { data: LogRow[] | null }) => {
        setBranchLog(data || []);
        setLoadingBranchLog(false);
      });
  }, []);

  // Load product log when product selected
  useEffect(() => {
    if (!selectedProduct) { setProductLog([]); return; }
    setLoadingProductLog(true);
    (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"])
      .eq("BRANCH", BRANCH_LOG_NAME)
      .order("DATE", { ascending: false })
      .limit(50)
      .then(({ data }: { data: LogRow[] | null }) => {
        setProductLog(data || []);
        setLoadingProductLog(false);
      });
  }, [selectedProduct]);

  const activeLog = selectedProduct ? productLog : branchLog;
  const loadingLog = selectedProduct ? loadingProductLog : loadingBranchLog;

  // Usage: filtered product list
  const usageFiltered = usageSearch.length > 0
    ? products.filter(p =>
        p["PRODUCT NAME"].toLowerCase().includes(usageSearch.toLowerCase()) &&
        (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
      )
    : products.filter(p => p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1).slice(0, 40);

  const handleAddUsageProduct = (p: OfficeProduct) => {
    const existing = usageEntries.find(e => e.productName === p["PRODUCT NAME"]);
    if (!existing) {
      setUsageEntries(prev => [...prev, {
        id: Date.now(),
        productName: p["PRODUCT NAME"],
        type: "Salon Use",
        qty: 1,
      }]);
    }
    setUsageSearch("");
    setShowUsageDropdown(false);
    setTimeout(() => usageInputRef.current?.focus(), 50);
  };

  const cycleType = (id: number) => {
    setUsageEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const idx = USAGE_TYPES.indexOf(e.type);
      return { ...e, type: USAGE_TYPES[(idx + 1) % USAGE_TYPES.length] };
    }));
  };

  const handleUsageSubmit = async () => {
    const valid = usageEntries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    setUsageError(null);
    setUsageSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      for (const entry of valid) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const currentBalance = Number((product as any)?.[BALANCE_KEY] ?? 0);
        const endingBalance = currentBalance - entry.qty;
        const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": today,
          "PRODUCT NAME": entry.productName,
          "BRANCH": BRANCH_LOG_NAME,
          "SUPPLIER": null,
          "TYPE": entry.type,
          "STARTING BALANCE": currentBalance,
          "QTY": -entry.qty,
          "ENDING BALANCE": endingBalance,
          "GRN": null,
          "OFFICE BALANCE": Number(product?.["OFFICE BALANCE"] ?? 0),
        });
        if (logErr) { setUsageError(logErr.message || "Write failed"); break; }
        await (supabase as any).from("AllFileProducts")
          .update({ [BALANCE_KEY]: endingBalance })
          .eq("PRODUCT NAME", entry.productName);
      }
      if (!usageError) {
        setUsageEntries([]);
        setUsageSuccess(true);
        setTimeout(() => setUsageSuccess(false), 3000);
        // Refresh branch log
        const { data } = await (supabase as any)
          .from("AllFileLog").select("*").eq("BRANCH", BRANCH_LOG_NAME)
          .order("DATE", { ascending: false }).limit(50);
        setBranchLog(data || []);
      }
    } catch (err: any) {
      setUsageError(err?.message || "Unknown error");
    }
    setUsageSubmitting(false);
  };

  const openPanel = (panel: "USAGE" | "ORDER" | "CASH") => {
    setActivePanel(panel);
    setShowDropdown(false);
    setShowUsageDropdown(false);

  };

  const closePanel = () => {
    setActivePanel(null);
    setUsageSearch("");
    setShowUsageDropdown(false);
  };

  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  return (
    <div style={{
      position: "relative", height: "100dvh",
      background: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      fontFamily: "'Raleway', sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* TOP AREA */}
      <div style={{ paddingLeft: "20px", paddingRight: "20px", paddingTop: "28px", flexShrink: 0 }}>

        {/* Branch name header */}
        <button
          onClick={() => {
            if (searchMode !== "idle") {
              setSearchMode("idle");
              setSearch("");
              setSelectedProduct(null);
              setShowDropdown(false);
            } else {
              onBack();
            }
          }}
          style={{
            display: "block", fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300,
            letterSpacing: "0.08em", color: "hsl(var(--foreground))",
            background: "none", border: "none", cursor: "pointer", textAlign: "left",
            padding: 0, fontFamily: "Raleway, inherit", lineHeight: 1, marginBottom: "16px", width: "100%",
          }}
        >
          {BRANCH_NAME}
        </button>

        {/* Search input row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Search size={15} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={searchMode === "result" ? "" : search}
            onChange={e => {
              const val = e.target.value;
              setSearch(val);
              setSelectedProduct(null);
              setSearchMode("active");
              setShowDropdown(val.length > 0);
            }}
            placeholder={selectedProduct ? selectedProduct["PRODUCT NAME"] : "Enter Product"}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: "15px", fontFamily: "Raleway, inherit",
              color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))",
            }}
          />
          {search.length > 0 && searchMode !== "result" && (
            <button
              onClick={() => { setSearch(""); setSelectedProduct(null); setShowDropdown(false); setSearchMode("idle"); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* USAGE / ORDER / CASH buttons — only on landing, no dropdown */}
        {!showDropdown && !selectedProduct && (
          <div style={{ display: "flex", gap: "28px", borderTop: "0.5px solid hsl(var(--border))", paddingTop: "16px" }}>
            {(["USAGE", "ORDER", "CASH"] as const).map(btn => (
              <button
                key={btn}
                onClick={() => openPanel(btn)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: "clamp(16px, 4.5vw, 24px)", fontWeight: 300,
                  letterSpacing: "0.08em", fontFamily: "Raleway, inherit",
                  color: "hsl(var(--foreground))",
                  opacity: 0.28,
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.28")}
              >
                {btn}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MIDDLE SCROLLABLE */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column", paddingLeft: "20px", paddingRight: "20px", paddingTop: "8px" }}>

        {/* Dropdown */}
        {showDropdown && search.length > 0 && (() => {
          const q = search.toLowerCase();
          const allMatched = products.filter(p =>
            p["PRODUCT NAME"].toLowerCase().includes(q) &&
            (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
          );
          const isTrue = (v: any) => v === true || v === "TRUE" || v === "true" || v === 1;
          const favourites = allMatched.filter(p => isTrue(p["OfficeFavourites"]));
          const colours = allMatched.filter(p => !isTrue(p["OfficeFavourites"]) && isTrue(p["Colour"]));
          const regular = allMatched.filter(p => !isTrue(p["OfficeFavourites"]) && !isTrue(p["Colour"]));
          const hasResults = favourites.length > 0 || colours.length > 0 || regular.length > 0;

          const SectionHeader = ({ label }: { label: string }) => (
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit", paddingTop: "14px", paddingBottom: "4px" }}>
              {label}
            </div>
          );

          const ProductRow = ({ p, last }: { p: OfficeProduct; last: boolean }) => (
            <div
              key={p.id}
              onClick={() => { setSelectedProduct(p); setSearch(p["PRODUCT NAME"]); setShowDropdown(false); setSearchMode("result"); }}
              style={{ padding: "12px 0", borderBottom: last ? "none" : "0.5px solid hsl(var(--border))", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{p["PRODUCT NAME"]}</div>
                {(p as any)[BALANCE_KEY] != null && (
                  <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginLeft: "8px", flexShrink: 0 }}>{(p as any)[BALANCE_KEY]}</div>
                )}
              </div>
            </div>
          );

          return (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {favourites.length > 0 && (
                <>
                  <SectionHeader label="Office Favourites" />
                  {favourites.map((p, i) => <ProductRow key={p.id} p={p} last={i === favourites.length - 1} />)}
                </>
              )}
              {regular.length > 0 && (
                <>
                  <SectionHeader label="Products" />
                  {regular.map((p, i) => <ProductRow key={p.id} p={p} last={i === regular.length - 1} />)}
                </>
              )}
              {colours.length > 0 && (
                <>
                  <SectionHeader label="Colours" />
                  {colours.map((p, i) => <ProductRow key={p.id} p={p} last={i === colours.length - 1} />)}
                </>
              )}
              {!hasResults && (
                <div style={{ padding: "20px 0", fontSize: "15px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>No results found</div>
              )}
            </div>
          );
        })()}

        {/* Content area */}
        {!showDropdown && (
          <div style={{ paddingTop: "16px", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>

            {/* Product card */}
            {selectedProduct && (
              <div style={{ flexShrink: 0, marginBottom: "24px", paddingBottom: "20px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "12px" }}>
                  <div style={{ fontSize: "clamp(16px, 4.5vw, 22px)", fontWeight: 400, fontFamily: "Raleway, inherit", lineHeight: 1.3, color: "hsl(var(--foreground))", flex: 1 }}>
                    {selectedProduct["PRODUCT NAME"]}
                  </div>
                  {(selectedProduct as any)[BALANCE_KEY] != null && (
                    <div style={{ fontSize: "clamp(16px, 4.5vw, 22px)", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                      {(selectedProduct as any)[BALANCE_KEY]}
                    </div>
                  )}
                  <button
                    onClick={() => toggleFavourite(selectedProduct["PRODUCT NAME"])}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
                  >
                    <Star
                      size={16}
                      fill={savedFavourites.includes(selectedProduct["PRODUCT NAME"]) ? "hsl(var(--foreground))" : "none"}
                      color="hsl(var(--foreground))"
                    />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Staff</div>
                    <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                      {selectedProduct["STAFF PRICE"] != null ? `RM ${Number(selectedProduct["STAFF PRICE"]).toFixed(2)}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Customer</div>
                    <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                      {selectedProduct["CUSTOMER PRICE"] != null ? `RM ${Number(selectedProduct["CUSTOMER PRICE"]).toFixed(2)}` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Spacer + Recent label (landing only) */}
            {!selectedProduct && <div style={{ flexShrink: 0, height: "16vh" }} />}
            {!selectedProduct && (
              <div style={{ flexShrink: 0, fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "10px" }}>
                Recent
              </div>
            )}

            {/* Log table */}
            <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", display: "flex", flexDirection: "column", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: selectedProduct ? "345px" : "479px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {selectedProduct ? (
                  <div style={{ display: "grid", gridTemplateColumns: "65px 55px 75px 140px", gap: "6px", minWidth: "345px", marginBottom: "6px" }}>
                    {["Date", "Qty", "End Bal", "Type"].map(h => (
                      <div key={h} style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>{h}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "50px 160px 50px 65px 130px", gap: "6px", minWidth: "479px", marginBottom: "6px" }}>
                    {["Date", "Product", "Qty", "End Bal", "Type"].map(h => (
                      <div key={h} style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>{h}</div>
                    ))}
                  </div>
                )}
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                  {loadingLog && (
                    <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading...</div>
                  )}
                  {!loadingLog && activeLog.length === 0 && (
                    <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>
                  )}
                  {!loadingLog && activeLog.map((row, idx) => {
                    const dateStr = new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                    const prevDateStr = idx > 0 ? new Date(activeLog[idx - 1].DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
                    const showDate = dateStr !== prevDateStr;
                    return selectedProduct ? (
                      <div key={row.id} style={{ display: "grid", gridTemplateColumns: "65px 55px 75px 140px", gap: "6px", minWidth: "345px", padding: "8px 0" }}>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                          {showDate ? dateStr : ""}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))" }}>
                          {row.QTY > 0 ? "+" : ""}{row.QTY}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{row.TYPE || "—"}</div>
                      </div>
                    ) : (
                      <div key={row.id} style={{ display: "grid", gridTemplateColumns: "50px 160px 50px 65px 130px", gap: "6px", minWidth: "479px", padding: "8px 0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                          {showDate ? dateStr : ""}
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row["PRODUCT NAME"] || "—"}</div>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))" }}>
                          {row.QTY > 0 ? "+" : ""}{row.QTY}
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{row.TYPE || "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM BLUR BAR */}
      <div style={{
        flexShrink: 0, paddingLeft: "20px", paddingRight: "20px",
        paddingTop: "4px", paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)",
        filter: "blur(1px)", opacity: 0.25,
      }}>
        {(["SEARCH", "ORDER"] as const).map(item => (
          <button
            key={item}
            onClick={item === "SEARCH" ? onBackToMain : undefined}
            style={{
              display: "block", fontSize: "clamp(10px, 2.8vw, 15px)", fontWeight: 300,
              letterSpacing: "0.06em", color: "hsl(var(--foreground))",
              background: "none", border: "none", cursor: item === "SEARCH" ? "pointer" : "default", textAlign: "left",
              fontFamily: "Raleway, inherit", lineHeight: 1.35, padding: 0,
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* ── PANELS ── */}

      {/* USAGE Panel */}
      {activePanel === "USAGE" && createPortal(
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100dvh",
        background: "hsl(var(--background))",
        zIndex: 200,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* USAGE top bar */}
        <div style={{ paddingLeft: "20px", paddingRight: "20px", paddingTop: "28px", paddingBottom: "0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>USAGE</span>
            <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
              <X size={18} />
            </button>
          </div>

          {/* ENTER TODAY'S STOCK MOVEMENTS header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textTransform: "uppercase" }}>
              Enter Today's Stock Movements
            </span>
            <span style={{ fontSize: "11px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}
            </span>
          </div>

          {/* Select product line */}
          <div style={{ borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "12px", marginBottom: "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                ref={usageInputRef}
                type="text"
                inputMode="search"
                value={usageSearch}
                onChange={e => { setUsageSearch(e.target.value); setShowUsageDropdown(true); }}
                onFocus={() => setShowUsageDropdown(true)}
                placeholder="Select product..."
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: "14px", fontFamily: "Raleway, inherit", fontWeight: 300,
                  color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))",
                }}
              />
              <ChevronDown size={14} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
              {usageSearch.length > 0 && (
                <button onClick={() => { setUsageSearch(""); setShowUsageDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Type + Qty selector row — only when a product is being selected (search has text) */}
          <div style={{ borderBottom: "0.5px solid hsl(var(--border))", paddingTop: "12px", paddingBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>Salon Use</span>
                <ChevronDown size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <ChevronLeft size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", minWidth: "28px", textAlign: "center", color: "hsl(var(--foreground))" }}>1</span>
                <ChevronRight size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Usage dropdown */}
        {showUsageDropdown && (
          <div style={{
            flexShrink: 0,
            background: "hsl(var(--background))",
            maxHeight: "55vh", overflowY: "auto",
            paddingLeft: "20px", paddingRight: "20px",
          }}>
            {(() => {
              const isChicFav = (p: any) => p["Chic Nailspa Favourites"] === true || p["Chic Nailspa Favourites"] === "TRUE" || p["Chic Nailspa Favourites"] === "true";
              const favs = usageFiltered.filter(p => isChicFav(p));
              const isColour = (p: any) => p["Colour"] === true || p["Colour"] === "TRUE" || p["Colour"] === "true";
              const colours = usageFiltered.filter(p => isColour(p) && !isChicFav(p));
              const regular = usageFiltered.filter(p => !isChicFav(p) && !isColour(p));
              const renderRow = (p: any, showStar?: boolean) => (
                <div
                  key={p.id}
                  onMouseDown={() => handleAddUsageProduct(p)}
                  style={{
                    padding: "11px 0",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit",
                    color: usageEntries.find(e => e.productName === p["PRODUCT NAME"]) ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {showStar && <Star size={11} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6, flexShrink: 0 }} />}
                    {p["PRODUCT NAME"]}
                  </span>
                  {(p as any)[BALANCE_KEY] != null && (
                    <span style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginLeft: "8px" }}>{(p as any)[BALANCE_KEY]}</span>
                  )}
                </div>
              );
              const sectionLabel = (label: string) => (
                <div key={label} style={{ paddingTop: "12px", paddingBottom: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>{label}</div>
              );
              const sections: React.ReactNode[] = [];
              if (favs.length > 0) { sections.push(sectionLabel("Chic Nailspa Favourites")); favs.forEach(p => sections.push(renderRow(p, true))); }
              if (regular.length > 0) { sections.push(sectionLabel("Products")); regular.forEach(p => sections.push(renderRow(p))); }
              if (colours.length > 0) { sections.push(sectionLabel("Colours")); colours.forEach(p => sections.push(renderRow(p))); }
              if (sections.length === 0) return <div style={{ padding: "14px 0", fontSize: "13px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>No products found</div>;
              return sections;
            })()}
          </div>
        )}

        {/* Entry list */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingLeft: "20px", paddingRight: "20px", paddingTop: "12px" }}
          onClick={() => setShowUsageDropdown(false)}>
          {usageEntries.length === 0 && (
            <div style={{ paddingTop: "24px", fontSize: "13px", fontWeight: 300, color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>
              Select a product above to add it
            </div>
          )}
          {usageEntries.map(entry => (
            <div key={entry.id} style={{ paddingTop: "12px", paddingBottom: "12px", borderBottom: "0.5px solid hsl(var(--border))" }}>
              {/* Product name row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", flex: 1 }}>{entry.productName}</span>
                <button
                  onClick={() => setUsageEntries(prev => prev.filter(e => e.id !== entry.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
              {/* Type + Qty row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* Type - tap to cycle */}
                <button
                  onClick={() => cycleType(entry.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontSize: "11px", fontWeight: 300, letterSpacing: "0.06em",
                    fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {entry.type}
                </button>
                {/* Qty */}
                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  <button
                    onClick={() => setUsageEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: Math.max(1, e.qty - 1) } : e))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", minWidth: "28px", textAlign: "center" }}>{entry.qty}</span>
                  <button
                    onClick={() => setUsageEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: e.qty + 1 } : e))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        {usageEntries.length > 0 && (
          <div style={{ flexShrink: 0, paddingLeft: "20px", paddingRight: "20px", paddingTop: "12px", paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)", borderTop: "0.5px solid hsl(var(--border))" }}>
            <button
              onClick={handleUsageSubmit}
              disabled={usageSubmitting}
              style={{
                background: "hsl(var(--foreground))", color: "hsl(var(--background))",
                border: "none", cursor: usageSubmitting ? "default" : "pointer",
                padding: "10px 24px", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "Raleway, inherit",
                opacity: usageSubmitting ? 0.5 : 1,
              }}
            >
              {usageSubmitting ? "Saving..." : "Submit"}
            </button>
            {usageSuccess && (
              <span style={{ marginLeft: "16px", fontSize: "11px", color: "hsl(var(--green, 120 60% 40%))", letterSpacing: "0.06em" }}>✓ Saved</span>
            )}
            {usageError && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em" }}>✗ {usageError}</div>
            )}
          </div>
        )}
      </div>, document.body
      )}

      {/* ORDER Panel (placeholder) */}
      {activePanel === "ORDER" && createPortal(
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100dvh",
        background: "hsl(var(--background))",
        zIndex: 200,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{ paddingLeft: "20px", paddingRight: "20px", paddingTop: "28px", paddingBottom: "16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>ORDER</span>
            <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, paddingLeft: "20px", paddingRight: "20px", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 300, color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>Order entry — coming soon</span>
        </div>
      </div>, document.body
      )}

      {/* CASH Panel (placeholder) */}
      {activePanel === "CASH" && createPortal(
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100dvh",
        background: "hsl(var(--background))",
        zIndex: 200,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{ paddingLeft: "20px", paddingRight: "20px", paddingTop: "28px", paddingBottom: "16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>CASH</span>
            <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, paddingLeft: "20px", paddingRight: "20px", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 300, color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>Cash entry — coming soon</span>
        </div>
      </div>, document.body
      )}

    </div>
  );
};

export default BranchChicSimple;
