import { createPortal } from "react-dom";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Check, Search as SearchIcon, Star, ChevronRight, ChevronDown, ChevronUp, FileText, Download } from "lucide-react";
import { chicConfig, type OfficeProduct, type LogRow } from "@/lib/branchSimple";
import { makeIsFavourite, USAGE_TYPES, THERAPISTS, isYes, typeColumnValue, usagePillValue, type UsageType } from "@/lib/branchSimpleUtils";
// Generic components
import { BranchHeader } from "@/components/branch/BranchHeader";
import { BottomNav } from "@/components/branch/BottomNav";
import { Search } from "@/components/branch/Search";
import { ProductCard } from "@/components/branch/ProductCard";
import { ProductList } from "@/components/branch/ProductList";
import { UsageTable } from "@/components/branch/UsageTable";
import { OrderPanel } from "@/components/branch/OrderPanel";
import { LogTable } from "@/components/branch/LogTable";

const isFav = makeIsFavourite(chicConfig.favouriteKey);
const BALANCE_KEY = chicConfig.balanceKey as keyof OfficeProduct;
const BRANCH_LOG_NAME = chicConfig.logBranchName;

interface ChicSimpleNewProps {
  onBack?: () => void;
  onBackToMain?: () => void;
  products?: OfficeProduct[];
}

const ChicSimpleNew = ({ onBack, onBackToMain, products: propProducts }: ChicSimpleNewProps) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<OfficeProduct[]>(propProducts || []);
  const [branchLog, setBranchLog] = useState<LogRow[]>([]);
  const [productLog, setProductLog] = useState<LogRow[]>([]);
const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);
    const [searchMode, setSearchMode] = useState<"idle" | "active" | "result">("idle");
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchActive, setSearchActive] = useState(false);
    const [activePanel, setActivePanel] = useState<"USAGE" | "ORDER" | null>(null);
    const [logView, setLogView] = useState<"all" | "week">("all");

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
     let fetchedLog = sortLog(data || []);
     
     // Filter based on logView
     if (logView === "week") {
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       // Get Monday of this week
       const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
       const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
       const monday = new Date(today);
       monday.setDate(diff);
       monday.setHours(0, 0, 0, 0);
       
       fetchedLog = fetchedLog.filter(row => {
         const rowDate = new Date(row.DATE);
         rowDate.setHours(0, 0, 0, 0);
         return rowDate >= monday;
       });
       
       // Sort chronologically (Monday first) for week view
       fetchedLog = [...fetchedLog].sort((a, b) => 
         new Date(a.DATE).getTime() - new Date(b.DATE).getTime()
       );
     }
     
     setBranchLog(fetchedLog);
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
       let fetchedLog = sortLog(data || []);
       
       // Filter based on logView
       if (logView === "week") {
         const today = new Date();
         today.setHours(0, 0, 0, 0);
         // Get Monday of this week
         const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
         const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
         const monday = new Date(today);
         monday.setDate(diff);
         monday.setHours(0, 0, 0, 0);
         
         fetchedLog = fetchedLog.filter(row => {
           const rowDate = new Date(row.DATE);
           rowDate.setHours(0, 0, 0, 0);
           return rowDate >= monday;
         });
         
         // Sort chronologically (Monday first) for week view
         fetchedLog = [...fetchedLog].sort((a, b) => 
           new Date(a.DATE).getTime() - new Date(b.DATE).getTime()
         );
       }
       
       setProductLog(fetchedLog);
     };
     fetchProductLog();
   }, [selectedProduct, logView]);

// Initial fetches
   useEffect(() => {
     refreshBranchLog();
   }, [logView]);

  const toggleFavourite = async (product: OfficeProduct) => {
    const currentlyFav = isFav(product);
    const newVal = !currentlyFav;
    await (supabase as any)
      .from("AllFileProducts")
      .update({ [chicConfig.favouriteKey]: newVal })
      .eq("id", product.id);
    setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, [chicConfig.favouriteKey]: newVal } : p)
    );
    setSelectedProduct(prev =>
      prev && prev.id === product.id ? { ...prev, [chicConfig.favouriteKey]: newVal } : prev
    );
  };

  const reverseRow = async (row: LogRow) => {
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
  };

  const updateLogRow = async (row: LogRow, updates: { qty: number; therapist: string | null; type: UsageType; notes: string }) => {
    try {
      await (supabase as any).from("AllFileLog")
        .update({
          QTY: updates.qty,
          Therapist: updates.therapist,
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
    if (searchMode !== "idle") {
        setSearchMode("idle");
        setSearch("");
        setSelectedProduct(null);
        setShowDropdown(false);
    } else {
        navigate("/simple/office");
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
        <BranchHeader branch={chicConfig.displayName} onBack={handleHeaderBack} />

       
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
       <div style={{ flex: 1, overflow: "auto", minHeight: 0, display: "flex", flexDirection: "column", paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px", scrollPaddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}>
        {showDropdown && searchMode !== "result" && (
          <ProductList
            products={products}
            isFav={isFav}
            balanceKey={BALANCE_KEY}
            favouritesLabel={chicConfig.favouritesLabel}
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
                favouriteKey={chicConfig.favouriteKey} 
                onToggleFav={toggleFavourite} 
              />
            )}
{!selectedProduct && (
  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
    {logView === "all" ? (
      <>
        <button
          onClick={setLogViewToAll}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 12px 0",
            fontSize: "16px",
            fontWeight: 400,
            letterSpacing: "0.06em",
            fontFamily: "Raleway, inherit",
            color: "hsl(var(--foreground))",
            opacity: 1,
            borderBottom: "2px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.borderBottom = "2px solid hsl(0 0% 20%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.borderBottom = "2px solid transparent";
          }}
        >
          All Data
        </button>
        <button
          onClick={setLogViewToWeek}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 12px 0",
            fontSize: "14px",
            fontWeight: 300,
            letterSpacing: "0.06em",
            fontFamily: "Raleway, inherit",
            color: "hsl(var(--foreground))",
            opacity: 0.6,
            borderBottom: "2px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.8";
            e.currentTarget.style.borderBottom = "2px solid hsl(0 0% 20%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.6";
            e.currentTarget.style.borderBottom = "2px solid transparent";
          }}
        >
          Week
        </button>
      </>
    ) : (
      <>
        <button
          onClick={setLogViewToWeek}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 12px 0",
            fontSize: "16px",
            fontWeight: 400,
            letterSpacing: "0.06em",
            fontFamily: "Raleway, inherit",
            color: "hsl(var(--foreground))",
            opacity: 1,
            borderBottom: "2px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.borderBottom = "2px solid hsl(0 0% 20%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.borderBottom = "2px solid transparent";
          }}
        >
          Week
        </button>
        <button
          onClick={setLogViewToAll}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 12px 0",
            fontSize: "14px",
            fontWeight: 300,
            letterSpacing: "0.06em",
            fontFamily: "Raleway, inherit",
            color: "hsl(var(--foreground))",
            opacity: 0.6,
            borderBottom: "2px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.8";
            e.currentTarget.style.borderBottom = "2px solid hsl(0 0% 20%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.6";
            e.currentTarget.style.borderBottom = "2px solid transparent";
          }}
        >
          All Data
        </button>
      </>
    )}
  </div>
)}
            <LogTable rows={activeLog} selectedProduct={selectedProduct} onReverse={reverseRow} onUpdate={updateLogRow} viewType={logView} />
          </div>
        )}
      </div>

      <BottomNav
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        isSearchActive={searchActive || !!selectedProduct}
        toggleSearch={toggleSearch}
        goHome={goHome}
        isHome={!activePanel && !searchActive && !selectedProduct}
      />

      {/* USAGE Panel */}
      {activePanel === "USAGE" && createPortal(
        <UsageTable 
          config={chicConfig} 
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
          config={chicConfig} 
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

export default ChicSimpleNew;