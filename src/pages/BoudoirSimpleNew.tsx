import { createPortal } from "react-dom";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Check, Search as SearchIcon, Star, ChevronRight, ChevronDown, ChevronUp, FileText, Download } from "lucide-react";
import { boudoirConfig, type OfficeProduct, type LogRow } from "@/lib/branchSimple";
import { makeIsFavourite, USAGE_TYPES, THERAPISTS, isYes, typeColumnValue, usagePillValue, type UsageType } from "@/lib/branchSimpleUtils";
// Generic components
import { Header } from "@/components/branch/Header";
import { Tabs } from "@/components/branch/Tabs";
import { Search } from "@/components/branch/Search";
import { ProductCard } from "@/components/branch/ProductCard";
import { ProductList } from "@/components/branch/ProductList";
import { UsageTable } from "@/components/branch/UsageTable";
import { OrderPanel } from "@/components/branch/OrderPanel";
import { LogTable } from "@/components/branch/LogTable";

const isFav = makeIsFavourite(boudoirConfig.favouriteKey);
const BALANCE_KEY = boudoirConfig.balanceKey as keyof OfficeProduct;
const BRANCH_LOG_NAME = boudoirConfig.logBranchName;

interface BoudoirSimpleNewProps {
  onBack?: () => void;
  onBackToMain?: () => void;
  products?: OfficeProduct[];
}

const BoudoirSimpleNew = ({ onBack, onBackToMain, products: propProducts }: BoudoirSimpleNewProps) => {
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
            <LogTable rows={activeLog} selectedProduct={selectedProduct} onReverse={reverseRow} onUpdate={updateLogRow} />
          </div>
        )}
      </div>

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