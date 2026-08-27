import { createPortal } from "react-dom";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranchFavourites } from "@/hooks/useBranchFavourites";
import { X, Check, Search as SearchIcon, Star, ChevronRight, ChevronDown, ChevronUp, FileText, Download } from "lucide-react";
import { nuryadiConfig, type OfficeProduct, type LogRow } from "@/lib/branchSimple";
import { USAGE_TYPES, THERAPISTS, isYes, typeColumnValue, usagePillValue, sortLogByBalance, sortBranchLogTable, type UsageType } from "@/lib/branchSimpleUtils";
// Generic components
import { BranchHeader } from "@/components/branch/BranchHeader";
import { BottomNav } from "@/components/branch/BottomNav";
import { Search } from "@/components/branch/Search";
import { ProductCard } from "@/components/branch/ProductCard";
import { ProductList } from "@/components/branch/ProductList";
import { UsageTable } from "@/components/branch/UsageTable";
import { OrderPanel } from "@/components/branch/OrderPanel";
import { LogTable } from "@/components/branch/LogTable";

interface NurYadiProps {
  onBack?: () => void;
  onBackToMain?: () => void;
  products?: OfficeProduct[];
}

const NurYadi = ({ onBack, onBackToMain, products: propProducts }: NurYadiProps) => {
  const { isFav, isColour, allowedIds, nameOf, toggleFavourite } = useBranchFavourites("nuryadi");
  const BALANCE_KEY = nuryadiConfig.balanceKey as keyof OfficeProduct;
  const BRANCH_LOG_NAME = nuryadiConfig.logBranchName;

  const navigate = useNavigate();
  const location = useLocation();
  // Origin of this visit ("landing" | "sublanding" | "branches") – set via router state at navigation time
  const cameFrom = (location.state as { from?: string } | null)?.from;
  const [products, setProducts] = useState<OfficeProduct[]>(propProducts || []);
  const [branchLog, setBranchLog] = useState<LogRow[]>([]);
  const [productLog, setProductLog] = useState<LogRow[]>([]);
const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);
    const [searchMode, setSearchMode] = useState<"idle" | "active" | "result">("idle");
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchActive, setSearchActive] = useState(false);
    const [activePanel, setActivePanel] = useState<"USAGE" | "ORDER" | null>(null);
    const [logView, setLogView] = useState<"all" | "week" | "orders">("all");
    const [usageEntriesCount, setUsageEntriesCount] = useState(0);
    const [pastOrdersExpanded, setPastOrdersExpanded] = useState(false);
    const [isSearchProduct, setIsSearchProduct] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);

   // Reset Past Orders expanded flag whenever we leave the Order panel
   useEffect(() => {
     if (activePanel !== "ORDER") setPastOrdersExpanded(false);
   }, [activePanel]);


    // Filter out products with UOM = "BUNDLE" for this branch
    const filteredProducts = useMemo(() => {
      if (!products) return [];
      return products.filter((product) => product.UOM !== "BUNDLE" && product.UOM !== null);
    }, [products]);

   // Clear the search-product flag when the selected product is cleared
   useEffect(() => {
     if (!selectedProduct) setIsSearchProduct(false);
   }, [selectedProduct]);

   const resetSearchState = () => {
     setSearch("");
     setSelectedProduct(null);
     setShowDropdown(false);
     setSearchMode("idle");
   };

   const toggleSearch = () => {
     if (selectedProduct) {
       // Product card open -> open the "Select Product" search dropdown instead
       setSelectedProduct(null);
       setSearch("");
       setSearchMode("active");
       setIsSearchProduct(false);
       setSearchActive(true);
       setShowDropdown(true);
     } else if (searchActive) {
       // Search view is open -> back to default view
       resetSearchState();
       setSearchActive(false);
     } else {
       setSearchActive(true);
       setShowDropdown(true);
     }
   };

   const closeSearch = () => {
     setSearchActive(false);
     setShowDropdown(false);
     setSearchMode("idle");
   };

  // Past Data (product search): DATE desc; within the same date, lowest ending balance first
  const sortLog = (rows: LogRow[]) => sortLogByBalance(rows, r => r["ENDING BALANCE"]);
  // Main log table: DATE desc; Order type first then other types; A–Z by product name
  const sortBranchLog = (rows: LogRow[]) => sortBranchLogTable(rows);

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
     setBranchLog(sortBranchLog(data || []));
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
   }, [logView]);

  const reverseRow = async (row: LogRow) => {
    try {
      // The deletion and product balance restoration is now handled inside LogTable.tsx's handleConfirm
      // to ensure multi-column resync (like Office Balance).
      // We only need to delete the log row here if handleConfirm didn't do it, 
      // but usually onReverse is called FIRST.
      await (supabase as any).from("AllFileLog").delete().eq("id", row.id);
      
      // We don't perform the balance update here anymore because handleConfirm in LogTable.tsx
      // does a more comprehensive update (handling both Branch and Office balances).
      
      // Refresh branch log to reflect deletion
      await refreshBranchLog();
      
      // If a product is selected, refresh its specific log and state
      if (selectedProduct && selectedProduct["PRODUCT NAME"] === row["PRODUCT NAME"]) {
        const { data: freshProd } = await supabase
          .from("AllFileProducts")
          .select("*")
          .eq("PRODUCT NAME", row["PRODUCT NAME"])
          .single();
        
        if (freshProd) {
          setProducts(prev => prev.map(p => p["PRODUCT NAME"] === row["PRODUCT NAME"] ? (freshProd as unknown as OfficeProduct) : p));
          setSelectedProduct(freshProd as unknown as OfficeProduct);
        }

        const { data: freshPLog } = await (supabase as any)
          .from("AllFileLog").select("*")
          .eq("PRODUCT NAME", row["PRODUCT NAME"])
          .eq("BRANCH", BRANCH_LOG_NAME)
          .order("DATE", { ascending: false }).limit(50);
        setProductLog(sortLog(freshPLog || []));
      }
    } catch (err) {
      console.error("Reverse row error:", err);
    }
  };

  const updateLogRow = async (row: LogRow, updates: { qty: number; therapist: string | null; type: UsageType; notes: string }) => {
    try {
      await (supabase as any).from("AllFileLog")
        .update({
          QTY: updates.qty,
          THERAPIST: updates.therapist,
          TYPE: typeColumnValue(updates.type),
          "USAGE PILL": usagePillValue(updates.type),
          NOTES: updates.notes,
        })
        .eq("id", row.id);
      if (selectedProduct && selectedProduct["PRODUCT NAME"] === row["PRODUCT NAME"]) {
        const { data: freshPLog } = await (supabase as any)
          .from("AllFileLog").select("*")
          .eq("PRODUCT NAME", row["PRODUCT NAME"])
          .eq("BRANCH", BRANCH_LOG_NAME)
          .order("DATE", { ascending: false }).limit(50);
        setProductLog(sortLog(freshPLog || []));
      }
      await refreshBranchLog();
    } catch (err) {
      console.error("Update row error:", err);
    }
  };

const handleHeaderBack = () => {
    if (searchMode !== "idle" || searchActive || selectedProduct) {
        // Title press from the search view or a product card -> branch home
        goHome();
    } else if (cameFrom === "landing") {
        // Arrived directly from Landing -> back to Landing
        navigate("/");
    } else if (cameFrom === "sublanding") {
        // Arrived via Admin Portal (SubLanding) -> back to SubLanding
        navigate("/simple/branches/admin");
    } else if (cameFrom === "branches") {
        // Arrived via Admin Portal > Branches -> back to Branches page
        navigate("/simple/branches");
    } else {
        // Fallback (e.g. direct deep link) -> Admin Portal
        navigate("/simple/branches/admin");
    }
};

const goHome = () => {
    setActivePanel(null);
    resetSearchState();
    setSearchActive(false);
    setLogView("all");
};

const setLogViewToAll = () => {
    setLogView("all");
};

const setLogViewToWeek = () => {
    setLogView("week");
};

const setLogViewToOrders = () => {
    setLogView("orders");
};

  const activeLog = useMemo(() => {
    const base = selectedProduct ? productLog : branchLog;
    if (!selectedProduct && logView === "week") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoff = new Date(today);
      cutoff.setDate(today.getDate() - 6);
      return base.filter(row => {
        const rowDate = new Date(row.DATE);
        rowDate.setHours(0, 0, 0, 0);
        return rowDate >= cutoff;
      });
    }
    return base;
  }, [selectedProduct, productLog, branchLog, logView]);

  // Usage and Order filtered lists (for search in dropdowns)
  const usageFiltered = useMemo(() => {
    if (searchMode === "active" || searchMode === "result") {
      return filteredProducts.filter(p =>
        p["PRODUCT NAME"].toLowerCase().includes(search.toLowerCase()) &&
        (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
      );
    }
    return filteredProducts.filter(p => p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1);
  }, [search, searchMode, filteredProducts]);

  const orderFiltered = useMemo(() => {
    if (searchMode === "active" || searchMode === "result") {
      return filteredProducts.filter(p => 
        p["PRODUCT NAME"].toLowerCase().includes(search.toLowerCase())
      );
    }
    return filteredProducts;
  }, [search, searchMode, filteredProducts]);

  const usageFavs    = usageFiltered.filter(p => isFav(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));
  const usageColours = usageFiltered.filter(p => !isFav(p) && isColour(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));
  const usageRegular = usageFiltered.filter(p => !isFav(p) && !isColour(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));

  const orderFavs    = orderFiltered.filter(p => isFav(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));
  const orderColours = orderFiltered.filter(p => !isFav(p) && isColour(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));
  const orderRegular = orderFiltered.filter(p => !isFav(p) && !isColour(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));

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
        <BranchHeader branch={nuryadiConfig.displayName} onBack={handleHeaderBack} titleOverride={searchActive ? "SEARCH" : undefined} secondaryLabel={searchActive ? nuryadiConfig.displayName : undefined} />

       
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
       <div style={{ flex: 1, overflowX: "hidden", overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px" }}>
        {showDropdown && searchMode !== "result" && (
          <ProductList
            products={products}
            isFav={isFav}
            balanceKey={BALANCE_KEY}
            favouritesLabel={nuryadiConfig.favouritesLabel}
            search={search}
            showDropdown={showDropdown}
            onSelect={(p) => {
              setSelectedProduct(p);
              setSearch(p["PRODUCT NAME"]);
              setShowDropdown(false);
              setIsSearchProduct(true);
              closeSearch();
            }}
            alreadyAdded={alreadyAdded}
            isColour={isColour}
            allowedIds={allowedIds}
            nameOf={nameOf}
          />
        )}
        {!searchActive && (
          <div style={{ paddingTop: "0px", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
            {selectedProduct && (
              <ProductCard 
                selectedProduct={selectedProduct} 
                balanceKey={BALANCE_KEY} 
                favouriteKey={nuryadiConfig.favouriteKey} 
                onToggleFav={toggleFavourite}
                isFavourite={isFav}
                branchLogName={BRANCH_LOG_NAME}
              />
            )}
{!selectedProduct && (
  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
    <button
      onClick={setLogViewToAll}
      style={{
        background: "none",
        border: "none",
        borderBottom: `2px solid ${logView === "all" ? "hsl(var(--foreground))" : "transparent"}`,
        cursor: "pointer",
        padding: "0 0 6px 0",
        fontSize: logView === "all" ? "16px" : "14px",
        fontWeight: logView === "all" ? 400 : 300,
        letterSpacing: "0.06em",
        fontFamily: "Raleway, inherit",
        color: "hsl(var(--foreground))",
        opacity: logView === "all" ? 1 : 0.6,
        marginBottom: "-1px",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => { if (logView !== "all") e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={(e) => { if (logView !== "all") e.currentTarget.style.opacity = "0.6"; }}
    >
      All Data
    </button>
    <button
      onClick={() => setLogViewToWeek()}
      style={{
        background: "none",
        border: "none",
        borderBottom: `2px solid ${logView === "week" ? "hsl(var(--foreground))" : "transparent"}`,
        cursor: "pointer",
        padding: "0 0 6px 0",
        fontSize: logView === "week" ? "16px" : "14px",
        fontWeight: logView === "week" ? 400 : 300,
        letterSpacing: "0.06em",
        fontFamily: "Raleway, inherit",
        color: "hsl(var(--foreground))",
        opacity: logView === "week" ? 1 : 0.6,
        marginBottom: "-1px",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => { if (logView !== "week") e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={(e) => { if (logView !== "week") e.currentTarget.style.opacity = "0.6"; }}
    >
      7 Days
    </button>
    <button
      onClick={setLogViewToOrders}
      style={{
        background: "none",
        border: "none",
        borderBottom: `2px solid ${logView === "orders" ? "hsl(var(--foreground))" : "transparent"}`,
        cursor: "pointer",
        padding: "0 0 6px 0",
        fontSize: logView === "orders" ? "16px" : "14px",
        fontWeight: logView === "orders" ? 400 : 300,
        letterSpacing: "0.06em",
        fontFamily: "Raleway, inherit",
        color: "hsl(var(--foreground))",
        opacity: logView === "orders" ? 1 : 0.6,
        marginBottom: "-1px",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => { if (logView !== "orders") e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={(e) => { if (logView !== "orders") e.currentTarget.style.opacity = "0.6"; }}
    >
      Orders
    </button>
  </div>
)}
            <LogTable rows={activeLog} selectedProduct={selectedProduct} onReverse={reverseRow} onUpdate={updateLogRow} viewType={selectedProduct ? "all" : logView} onEditModalChange={setEditModalOpen} branchDisplayName={nuryadiConfig.displayName} branchLogName={BRANCH_LOG_NAME} />
          </div>
        )}
      </div>

      {!editModalOpen && (activePanel !== "ORDER" && !isSearchProduct && (searchActive || (!selectedProduct && !(activePanel === "USAGE" && usageEntriesCount > 0)))) && (
        <BottomNav
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          isSearchActive={searchActive || !!selectedProduct}
          toggleSearch={toggleSearch}
          goHome={goHome}
          isHome={!activePanel && !searchActive && !selectedProduct}
        />
      )}

      {!editModalOpen && ((activePanel === "ORDER" && pastOrdersExpanded) || (activePanel !== "ORDER" && isSearchProduct)) && (
        <BottomNav
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          isSearchActive={searchActive || !!selectedProduct}
          toggleSearch={toggleSearch}
          goHome={goHome}
          isHome={!activePanel && !searchActive && !selectedProduct}
          compact
        />
      )}

      {/* USAGE Panel */}
      {activePanel === "USAGE" && createPortal(
        <UsageTable 
          config={nuryadiConfig} 
          products={products} 
          setProducts={setProducts} 
          refreshBranchLog={refreshBranchLog} 
          selectedProduct={selectedProduct} 
          setSelectedProduct={setSelectedProduct} 
          onBack={() => setActivePanel(null)}
          onSuccess={goHome}
          onUsageEntriesChange={setUsageEntriesCount}
        />,
        document.body
      )}

      {/* ORDER Panel */}
      {activePanel === "ORDER" && createPortal(
        <OrderPanel 
          config={nuryadiConfig} 
          products={products} 
          setProducts={setProducts} 
          branchLog={branchLog} 
          refreshBranchLog={refreshBranchLog} 
          onBack={() => setActivePanel(null)}
          onSuccess={goHome}
          onPastOrdersChange={setPastOrdersExpanded}
          isFav={isFav}
          isColour={isColour}
          nameOf={nameOf}
          allowedIds={allowedIds}
        />,
        document.body
      )}

      
    </div>
  );
};

export default NurYadi;
