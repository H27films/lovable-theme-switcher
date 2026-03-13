import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Search, Star } from "lucide-react";

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

interface BranchBoudoirSimpleProps {
  onBack: () => void;
  onBackToMain: () => void;
  products: OfficeProduct[];
}

const BranchBoudoirSimple = ({ onBack, onBackToMain, products }: BranchBoudoirSimpleProps) => {
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
  const [activeTab, setActiveTab] = useState<"RECENT" | "ORDER" | "USAGE">("RECENT");
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
    setActiveTab("RECENT");
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

  const filterLog = (rows: LogRow[]) => {
    if (activeTab === "ORDER") return rows.filter(r => {
      const t = (r.TYPE || "").toLowerCase();
      return t.includes("order") || t.includes("grn") || t.includes("received") || t.includes("stock");
    });
    if (activeTab === "USAGE") return rows.filter(r => {
      const t = (r.TYPE || "").toLowerCase();
      return t.includes("salon") || t.includes("customer") || t.includes("staff") || t.includes("use");
    });
    return rows;
  };

  const activeLog = selectedProduct ? productLog : filterLog(branchLog);
  const loadingLog = selectedProduct ? loadingProductLog : loadingBranchLog;
  return (
    <div style={{
      height: "100dvh",
      background: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      fontFamily: "'Raleway', sans-serif",
      display: "flex",
      flexDirection: "column",
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

        {/* Tab switcher — only when no product selected */}
        {!showDropdown && !selectedProduct && (
          <div style={{ display: "flex", gap: "28px", borderTop: "0.5px solid hsl(var(--border))", paddingTop: "16px" }}>
            {(["RECENT", "ORDER", "USAGE"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: "clamp(16px, 4.5vw, 24px)", fontWeight: 300,
                  letterSpacing: "0.08em", fontFamily: "Raleway, inherit",
                  color: "hsl(var(--foreground))",
                  opacity: activeTab === tab ? 1 : 0.28,
                  transition: "opacity 0.2s ease",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MIDDLE SCROLLABLE */}
      <div style={{ flex: 1, overflowY: "auto", paddingLeft: "20px", paddingRight: "20px", paddingTop: "8px" }}>

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
            <div>
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

        {/* Content area — tabs log (always shown when no dropdown) */}
        {!showDropdown && (
          <div style={{ paddingTop: "16px" }}>

            {/* Product card (when product selected) */}
            {selectedProduct && (
              <div style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                {/* Product name + balance + star */}
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
                {/* Staff + Customer price */}
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

            {/* Log table */}
            <div>
              {/* Column headers */}
              {selectedProduct ? (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr 0.7fr 1fr", gap: "6px", marginBottom: "6px" }}>
                  {["Date", "Type", "Qty", "End Bal"].map(h => (
                    <div key={h} style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>{h}</div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1.1fr 0.6fr 0.9fr", gap: "6px", marginBottom: "6px" }}>
                  {["Date", "Product", "Type", "Qty", "End Bal"].map(h => (
                    <div key={h} style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>{h}</div>
                  ))}
                </div>
              )}
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
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr 0.7fr 1fr", gap: "6px", padding: "8px 0", borderTop: "0.5px solid hsl(var(--border))" }}>
                    <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                      {showDate ? dateStr : ""}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{row.TYPE || "—"}</div>
                    <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))" }}>
                      {row.QTY > 0 ? "+" : ""}{row.QTY}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                  </div>
                ) : (
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1.1fr 0.6fr 0.9fr", gap: "6px", padding: "8px 0", borderTop: "0.5px solid hsl(var(--border))" }}>
                    <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                      {showDate ? dateStr : ""}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row["PRODUCT NAME"] || "—"}</div>
                    <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{row.TYPE || "—"}</div>
                    <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))" }}>
                      {row.QTY > 0 ? "+" : ""}{row.QTY}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM BLUR BAR */}
      <div style={{
        flexShrink: 0, paddingLeft: "20px", paddingRight: "20px",
        paddingTop: "8px", paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)",
        filter: "blur(1px)", opacity: 0.25,
      }}>
        {(["SEARCH", "ORDER"] as const).map(item => (
          <button
            key={item}
            onClick={item === "SEARCH" ? onBackToMain : undefined}
            style={{
              display: "block", fontSize: "clamp(13px, 3.5vw, 20px)", fontWeight: 300,
              letterSpacing: "0.06em", color: "hsl(var(--foreground))",
              background: "none", border: "none", cursor: item === "SEARCH" ? "pointer" : "default", textAlign: "left",
              fontFamily: "Raleway, inherit", lineHeight: 1.35, padding: 0,
            }}
          >
            {item}
          </button>
        ))}
      </div>

    </div>
  );
};

export default BranchBoudoirSimple;
