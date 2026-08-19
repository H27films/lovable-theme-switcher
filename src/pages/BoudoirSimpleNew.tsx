import { createPortal } from "react-dom";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Check, Search as SearchIcon, Star, ChevronRight, ChevronDown, ChevronUp, FileText, Download } from "lucide-react";
import { boudoirConfig, type OfficeProduct, type LogRow } from "@/lib/branchSimple";
import { makeIsFavourite, USAGE_TYPES, THERAPISTS, isYes, type UsageType } from "@/lib/branchSimpleUtils";
// Generic components
import { Header } from "@/components/branch/Header";
import { Tabs } from "@/components/branch/Tabs";
import { Search } from "@/components/branch/Search";
import { ProductCard } from "@/components/branch/ProductCard";
import { ProductList } from "@/components/branch/ProductList";
import { UsageTable } from "@/components/branch/UsageTable";
import { OrderPanel } from "@/components/branch/OrderPanel";

const isFav = makeIsFavourite(boudoirConfig.favouriteKey);
const BALANCE_KEY = boudoirConfig.balanceKey as keyof OfficeProduct;
const BRANCH_LOG_NAME = boudoirConfig.logBranchName;

interface BoudoirSimpleNewProps {
  onBack?: () => void;
  onBackToMain?: () => void;
  products?: OfficeProduct[];
}

const BoudoirSimpleNew = ({ onBack, onBackToMain, products: propProducts }: BoudoirSimpleNewProps) => {
  const [products, setProducts] = useState<OfficeProduct[]>(propProducts || []);
  const [branchLog, setBranchLog] = useState<LogRow[]>([]);
  const [productLog, setProductLog] = useState<LogRow[]>([]);
const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);
   const [searchMode, setSearchMode] = useState<"idle" | "active" | "result">("idle");
   const [search, setSearch] = useState("");
   const [showDropdown, setShowDropdown] = useState(false);
   const [searchActive, setSearchActive] = useState(false);
   const [activePanel, setActivePanel] = useState<"USAGE" | "ORDER" | null>(null);
   const [reversing, setReversing] = useState<number | null>(null);
   const [confirmRow, setConfirmRow] = useState<LogRow | null>(null);
   const [confirmPos, setConfirmPos] = useState<{ top: number; right: number } | null>(null);

   const resetSearchState = () => {
     setSearch("");
     setSelectedProduct(null);
     setShowDropdown(false);
     setSearchMode("idle");
   };

   const toggleSearch = () => {
     if (selectedProduct || searchActive) {
       // Icon is in "X" state (product selected or search open) -> back to default view
       resetSearchState();
       setSearchActive(false);
     } else {
       setSearchActive(true);
     }
   };

   const closeSearch = () => {
     setSearchActive(false);
     setShowDropdown(false);
     setSearchMode("idle");
   };

  // Sort log: DATE desc, within same date Order rows first (logged last at night)
  const sortLog = (rows: LogRow[]) => [...rows].sort((a, b) => {
    const dateDiff = b.DATE.localeCompare(a.DATE);
    if (dateDiff !== 0) return dateDiff;
    const aOrder = a.TYPE === 'Order' ? 0 : 1;
    const bOrder = b.TYPE === 'Order' ? 0 : 1;
    return aOrder - bOrder;
  });

  // Product fetch
  useEffect(() => {
    if (propProducts && propProducts.length > 0) {
      setProducts(propProducts);
      return;
    }
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
  }, [propProducts]);

  // Branch log fetch
  const refreshBranchLog = async () => {
    const { data } = await (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("BRANCH", BRANCH_LOG_NAME)
      .order("DATE", { ascending: false })
      .limit(200);
    setBranchLog(sortLog(data || []));
  };

  // Product log fetch
  useEffect(() => {
    if (!selectedProduct) { 
      setProductLog([]); 
      return; 
    }
    const fetchProductLog = async () => {
      const { data } = await (supabase as any)
        .from("AllFileLog")
        .select("*")
        .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"])
        .eq("BRANCH", BRANCH_LOG_NAME)
        .order("DATE", { ascending: false })
        .limit(200);
      setProductLog(sortLog(data || []));
    };
    fetchProductLog();
  }, [selectedProduct]);

  // Initial fetches
  useEffect(() => {
    refreshBranchLog();
  }, []);

  const toggleFavourite = async (product: OfficeProduct) => {
    const currentlyFav = isFav(product);
    const newVal = !currentlyFav;
    await (supabase as any)
      .from("AllFileProducts")
      .update({ [boudoirConfig.favouriteKey]: newVal })
      .eq("id", product.id);
    setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, [boudoirConfig.favouriteKey]: newVal } : p)
    );
    setSelectedProduct(prev =>
      prev && prev.id === product.id ? { ...prev, [boudoirConfig.favouriteKey]: newVal } : prev
    );
  };

  const reverseRow = async (row: LogRow) => {
    setReversing(row.id);
    try {
      await (supabase as any).from("AllFileProducts")
        .update({ [BALANCE_KEY]: row["STARTING BALANCE"] })
        .eq("PRODUCT NAME", row["PRODUCT NAME"]);
      await (supabase as any).from("AllFileLog").delete().eq("id", row.id);
      // Update product balance in local state
      setProducts(prev => prev.map(p =>
        p["PRODUCT NAME"] === row["PRODUCT NAME"]
          ? { ...p, [BALANCE_KEY]: row["STARTING BALANCE"] }
          : p
      ));
      if (selectedProduct && selectedProduct["PRODUCT NAME"] === row["PRODUCT NAME"]) {
        setSelectedProduct(prev => prev ? { ...prev, [BALANCE_KEY]: row["STARTING BALANCE"] } : prev);
        // Refresh product log
        const { data: freshPLog } = await (supabase as any)
          .from("AllFileLog").select("*")
          .eq("PRODUCT NAME", row["PRODUCT NAME"])
          .eq("BRANCH", BRANCH_LOG_NAME)
          .order("DATE", { ascending: false }).limit(50);
        setProductLog(sortLog(freshPLog || []));
      }
      // Refresh branch log
      await refreshBranchLog();
    } catch (err) {
      console.error("Reverse row error:", err);
    }
    setReversing(null);
  };

  const handleHeaderBack = () => {
    if (searchMode !== "idle") {
      setSearchMode("idle");
      setSearch("");
      setSelectedProduct(null);
      setShowDropdown(false);
    } else {
      onBack?.();
    }
  };

  const activeLog = selectedProduct ? productLog : branchLog;

  // Usage and Order filtered lists (for search in dropdowns)
  const usageFiltered = useMemo(() => {
    if (searchMode === "active" || searchMode === "result") {
      return products.filter(p =>
        p["PRODUCT NAME"].toLowerCase().includes(search.toLowerCase()) &&
        (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
      );
    }
    return products.filter(p => p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1);
  }, [search, searchMode, products]);

  const orderFiltered = useMemo(() => {
    if (searchMode === "active" || searchMode === "result") {
      return products.filter(p => 
        p["PRODUCT NAME"].toLowerCase().includes(search.toLowerCase())
      );
    }
    return products;
  }, [search, searchMode, products]);

  const usageFavs = usageFiltered.filter(p => isFav(p));
  const usageColours = usageFiltered.filter(p => !isFav(p) && isYes(p["Colour"]));
  const usageRegular = usageFiltered.filter(p => !isFav(p) && !isYes(p["Colour"]));

  const orderFavs = orderFiltered.filter(p => isFav(p));
  const orderColours = orderFiltered.filter(p => !isFav(p) && isYes(p["Colour"]));
  const orderRegular = orderFiltered.filter(p => !isFav(p) && !isYes(p["Colour"]));

  // Product list already added state (for grey-out) - not used in thin version
  const alreadyAdded = undefined;

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
{/* Header */}
       <Header branch={boudoirConfig.displayName} onBack={handleHeaderBack} />

       {/* Tabs with search icon */}
        <Tabs 
          activePanel={activePanel} 
          setActivePanel={setActivePanel}
          isSearchActive={searchActive || !!selectedProduct}
          toggleSearch={toggleSearch}
        />

{/* Search input - only show when search is active */}
        {searchActive && (
          <Search
            search={search}
            setSearch={setSearch}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            autoFocus={true}
            closeSearch={closeSearch}
          />
        )}

      {/* MIDDLE SCROLLABLE */}
       <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column", paddingLeft: "12px", paddingRight: "12px", paddingTop: "0px" }}>
        {showDropdown && searchMode !== "result" && (
          <ProductList
            products={products}
            isFav={isFav}
            balanceKey={BALANCE_KEY}
            favouritesLabel={boudoirConfig.favouritesLabel}
            search={search}
            showDropdown={showDropdown}
            onSelect={(p) => {
              setSelectedProduct(p);
              setSearch(p["PRODUCT NAME"]);
              setShowDropdown(false);
              setSearchMode("result");
              closeSearch();
            }}
            alreadyAdded={alreadyAdded}
          />
        )}
        {!searchActive && (
          <div style={{ paddingTop: "0px", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
            {selectedProduct && (
              <ProductCard 
                selectedProduct={selectedProduct} 
                balanceKey={BALANCE_KEY} 
                favouriteKey={boudoirConfig.favouriteKey} 
                onToggleFav={toggleFavourite} 
              />
            )}
            {!selectedProduct && (
              <div style={{ flexShrink: 0, fontSize: "16px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "12px" }}>
                Recent
              </div>
            )}
            <div style={{ flex: 1, overflowX: "hidden", overflowY: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>
                {selectedProduct ? (
                  <div style={{ display: "grid", gridTemplateColumns: "50px 44px 52px 90px 18px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
                    <div />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 28px 32px 70px 18px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Date</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>Product</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Qty</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Bal</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>Type</div>
                    <div />
                  </div>
                )}
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                  {activeLog.map((row, idx) => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const cutoff = new Date(today); cutoff.setDate(today.getDate() - 6);
                    const dateStr = new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                    const prevDateStr = idx > 0 ? new Date(activeLog[idx - 1].DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
                    const showDate = dateStr !== prevDateStr;
                    const dateSeparator = showDate && idx > 0;
                    const isReversing = reversing === row.id;
                    return selectedProduct ? (
                      <div key={row.id} style={{
                        display: "grid", gridTemplateColumns: "50px 44px 52px 90px 18px", gap: "4px",
                        padding: "8px 0",
                        borderTop: dateSeparator ? "0.5px solid hsl(var(--border) / 0.5)" : "none",
                        marginTop: dateSeparator ? "4px" : "0",
                        alignItems: "center",
                      }}>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{showDate ? dateStr : ""}</div>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
                        {(() => { const rd = new Date(row.DATE); rd.setHours(0,0,0,0); return rd >= cutoff; })() ? (
                          <button
                            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setConfirmPos({ top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 6 }); setConfirmRow(row); }}
                            disabled={isReversing}
                            style={{ background: "none", border: "none", cursor: isReversing ? "default" : "pointer", padding: 0, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center", opacity: isReversing ? 0.3 : 1 }}
                            onMouseEnter={e => { if (!isReversing) e.currentTarget.style.color = "hsl(0 70% 50%)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                          >
                            <X size={11} />
                          </button>
                        ) : <div />}
                      </div>
                    ) : (
                      <div key={row.id} style={{
                        display: "grid", gridTemplateColumns: "42px 1fr 28px 32px 70px 18px", gap: "4px",
                        padding: "8px 0",
                        borderTop: dateSeparator ? "0.5px solid hsl(var(--border) / 0.5)" : "none",
                        marginTop: dateSeparator ? "4px" : "0",
                        alignItems: "center",
                      }}>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{showDate ? dateStr : ""}</div>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>{row["PRODUCT NAME"] || "—"}</div>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                        <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
                        {(() => { const rd = new Date(row.DATE); rd.setHours(0,0,0,0); return rd >= cutoff; })() ? (
                          <button
                            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setConfirmPos({ top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 6 }); setConfirmRow(row); }}
                            disabled={isReversing}
                            style={{ background: "none", border: "none", cursor: isReversing ? "default" : "pointer", padding: 0, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center", opacity: isReversing ? 0.3 : 1 }}
                            onMouseEnter={e => { if (!isReversing) e.currentTarget.style.color = "hsl(0 70% 50%)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                          >
                            <X size={11} />
                          </button>
                        ) : <div />}
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
        flexShrink: 0, paddingLeft: "12px", paddingRight: "12px",
        paddingTop: "4px", paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)",
        filter: "blur(1px)", opacity: 0.25,
      }}>
        {(["SEARCH", "ORDER"] as const).map(item => (
          <button
            key={item}
            onClick={item === "SEARCH" ? () => onBackToMain?.() : undefined}
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

      {/* Confirmation Popover */}
      {confirmRow && confirmPos && createPortal(
        <>
          <div
            onClick={() => { setConfirmRow(null); setConfirmPos(null); }}
            style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 499 }}
          />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "fixed",
              top: confirmPos.top,
              right: confirmPos.right,
              transform: "translateY(-50%)",
              zIndex: 500,
              background: "hsl(var(--background))",
              border: "0.5px solid hsl(var(--border))",
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              padding: "10px 13px",
              minWidth: "170px",
              maxWidth: "250px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "5px" }}>
              Remove Transaction
            </div>
            <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", lineHeight: 1.4, marginBottom: "10px" }}>
              {new Date(confirmRow.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {confirmRow["PRODUCT NAME"]}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setConfirmRow(null); setConfirmPos(null); }}
                style={{ background: "none", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: "6px 10px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={13} />
              </button>
              <button
                onClick={async () => { const r = confirmRow; setConfirmRow(null); setConfirmPos(null); await reverseRow(r); }}
                style={{ background: "none", border: "0.5px solid hsl(0 70% 50%)", cursor: "pointer", padding: "6px 10px", color: "hsl(0 70% 50%)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Check size={13} />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* USAGE Panel */}
      {activePanel === "USAGE" && createPortal(
        <UsageTable 
          config={boudoirConfig} 
          products={products} 
          setProducts={setProducts} 
          refreshBranchLog={refreshBranchLog} 
          selectedProduct={selectedProduct} 
          setSelectedProduct={setSelectedProduct} 
          onBack={() => setActivePanel(null)} 
        />,
        document.body
      )}

      {/* ORDER Panel */}
      {activePanel === "ORDER" && createPortal(
        <OrderPanel 
          config={boudoirConfig} 
          products={products} 
          setProducts={setProducts} 
          branchLog={branchLog} 
          refreshBranchLog={refreshBranchLog} 
          onBack={() => setActivePanel(null)} 
        />,
        document.body
      )}

      
    </div>
  );
};

export default BoudoirSimpleNew;