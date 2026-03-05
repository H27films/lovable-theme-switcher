import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Home, X, ChevronLeft, ChevronRight, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";

interface OfficeProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string;
  "UNITS PER ORDER": number | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "STAFF PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "OFFICE BALANCE": number | null;
  "PAR LEVEL": number | null;
  "COLOUR": string | null;
  "OFFICE SECTION": string | null;
}

type SortKey = "PRODUCT NAME" | "SUPPLIER" | null;
type SortDir = "asc" | "desc";

const getBranchPrice = (supplierPrice: number | null): number | null => {
  if (supplierPrice === null || supplierPrice === undefined) return null;
  if (supplierPrice <= 10) return supplierPrice + 0.50;
  if (supplierPrice <= 20) return supplierPrice + 1.00;
  if (supplierPrice <= 50) return supplierPrice + 2.50;
  if (supplierPrice <= 100) return supplierPrice + 5.00;
  return supplierPrice + 7.50;
};

const fmtPrice = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "—";
  return val.toFixed(2);
};

// Below par only if par > 0 and balance < par
const checkBelowPar = (balance: number | null, par: number | null): boolean => {
  if (balance === null || par === null) return false;
  if (par <= 0) return false;
  return balance < par;
};

const PAGE_SIZE = 200;

const Index = () => {
  const { theme, toggle, font, cycleFont } = useTheme();
  const navigate = useNavigate();

  const [products, setProducts] = useState<OfficeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);
  const [page, setPage] = useState(0);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterColour, setFilterColour] = useState<"all" | "yes" | "no">("all");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };
  const border = "hsl(var(--border))";
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("OfficeBalance")
        .select("*");
      if (error) console.error("Fetch error:", error);
      if (data) setProducts(data);
    } catch (err) {
      console.error("Error fetching office products:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item]");
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => { setPage(0); }, [search, filterLowStock, filterColour, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filteredProducts = products
    .filter(p => {
      const matchSearch = search.length === 0 ||
        p["PRODUCT NAME"]?.toLowerCase().includes(search.toLowerCase()) ||
        p["SUPPLIER"]?.toLowerCase().includes(search.toLowerCase()) ||
        p["OFFICE SECTION"]?.toLowerCase().includes(search.toLowerCase());
      const matchLow = !filterLowStock || checkBelowPar(p["OFFICE BALANCE"], p["PAR LEVEL"]);
      const matchColour =
        filterColour === "all" ? true :
        filterColour === "yes" ? p["COLOUR"]?.toLowerCase() === "yes" :
        p["COLOUR"]?.toLowerCase() !== "yes";
      return matchSearch && matchLow && matchColour;
    })
    .sort((a, b) => {
      const key = sortKey ?? "PRODUCT NAME";
      let av: any = a[key];
      let bv: any = b[key];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const dir = sortKey ? sortDir : "asc";
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const pagedProducts = filteredProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const lowStockCount = products.filter(p => checkBelowPar(p["OFFICE BALANCE"], p["PAR LEVEL"])).length;

  const dropdownResults = search.length > 0
    ? products.filter(p => p["PRODUCT NAME"]?.toLowerCase().includes(search.toLowerCase())).slice(0, 30)
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || dropdownResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => (i + 1) % dropdownResults.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => (i <= 0 ? dropdownResults.length - 1 : i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? dropdownResults[activeIndex] : dropdownResults[0];
      if (target) { setSelectedProduct(target); setSearch(target["PRODUCT NAME"]); setShowDropdown(false); }
    } else if (e.key === "Escape") { setShowDropdown(false); setActiveIndex(-1); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp size={10} style={{ opacity: 0.25, display: "inline", marginLeft: "3px" }} />;
    return sortDir === "asc"
      ? <ChevronUp size={10} style={{ display: "inline", marginLeft: "3px" }} />
      : <ChevronDown size={10} style={{ display: "inline", marginLeft: "3px" }} />;
  };

  const thBase = "pb-3 pt-2 text-[10px] tracking-wider uppercase font-normal select-none transition-colors";

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <div className="max-w-[1100px] mx-auto px-5">

        {/* ── Top bar ── */}
        <div className="flex justify-between items-center py-6 border-b" style={{ borderColor: border }}>
          <div className="flex items-center gap-4">
            <ThemeToggle theme={theme} toggle={toggle} font={font} cycleFont={cycleFont} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "hsl(var(--foreground))" }}>
                OFFICE
              </span>
              <button
                onClick={() => navigate("/")}
                className="flex items-center justify-center w-7 h-7 rounded-full border transition-colors"
                style={{ ...dim, borderColor: border }}
                onMouseEnter={e => { e.currentTarget.style.color = "hsl(var(--foreground))"; e.currentTarget.style.backgroundColor = cardBg; }}
                onMouseLeave={e => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; e.currentTarget.style.backgroundColor = "transparent"; }}
                aria-label="Go to home"
              >
                <Home size={14} />
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate("/stock")}
            className="flex items-center gap-2 text-[13px] tracking-[0.15em] uppercase transition-colors"
            style={{ color: "hsl(var(--foreground))" }}
          >
            <span>STOCK</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="py-12">

          {/* ── Page header ── */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-[11px] font-normal tracking-[0.2em] uppercase mb-1" style={dim}>Office Central</h1>
              <p className="text-[28px] font-light tracking-tight">Stock Inventory</p>
              <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>
                {products.length} products
                {lowStockCount > 0 && (
                  <span className="ml-3" style={{ color: "hsl(var(--red))" }}>· {lowStockCount} below par</span>
                )}
              </p>
            </div>
            <button
              onClick={fetchProducts}
              className="text-[11px] tracking-wider uppercase transition-colors"
              style={dim}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
            >
              Refresh
            </button>
          </div>

          {/* ── Search bar — large style ── */}
          <div ref={searchRef} className="relative mb-8">
            <p className="text-[10px] tracking-[0.2em] uppercase mb-3" style={dim}>Search Product</p>
            <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: borderActive }}>
              <input
                type="text"
                className="flex-1 bg-transparent outline-none text-[22px] font-light"
                placeholder="Type product name..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedProduct(null); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                style={{ color: search ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setSelectedProduct(null); setShowDropdown(false); }}
                  style={dim}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {showDropdown && dropdownResults.length > 0 && (
              <div
                ref={listRef}
                className="absolute top-full left-0 right-0 z-50 border max-h-[240px] overflow-y-auto scrollbar-thin"
                style={{ background: "hsl(var(--popover))", borderColor: borderActive, marginTop: "2px" }}
              >
                {dropdownResults.map((p, i) => (
                  <div
                    key={p.id}
                    data-item
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
                    style={{ borderBottom: `1px solid ${border}`, background: i === activeIndex ? cardBg : "transparent" }}
                    onMouseDown={() => { setSelectedProduct(p); setSearch(p["PRODUCT NAME"]); setShowDropdown(false); }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-light">{p["PRODUCT NAME"]}</span>
                      {p["SUPPLIER"] && <span className="text-[11px]" style={dim}>{p["SUPPLIER"]}</span>}
                      {p["COLOUR"]?.toLowerCase() === "yes" && (
                        <span className="text-[10px] tracking-wider uppercase" style={dim}>Colour</span>
                      )}
                    </div>
                    <span className="text-[12px] font-light" style={{
                      color: checkBelowPar(p["OFFICE BALANCE"], p["PAR LEVEL"])
                        ? "hsl(var(--red))" : "hsl(var(--foreground))"
                    }}>
                      {p["OFFICE BALANCE"] ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Selected product card ── */}
          {selectedProduct && (
            <div className="surface-box p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[11px] tracking-wider uppercase mb-1" style={dim}>
                    {selectedProduct["COLOUR"]?.toLowerCase() === "yes" ? "Colour Product" : "Product"}
                    {selectedProduct["OFFICE SECTION"] && ` · Section ${selectedProduct["OFFICE SECTION"]}`}
                  </p>
                  <p className="text-[20px] font-light tracking-tight">{selectedProduct["PRODUCT NAME"]}</p>
                  {selectedProduct["SUPPLIER"] && (
                    <p className="text-[12px] mt-0.5" style={dim}>{selectedProduct["SUPPLIER"]}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedProduct(null); setSearch(""); }}
                  style={dim}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Balance + Par Level */}
              <div className="flex items-center gap-8 mb-5 pb-5 border-b" style={{ borderColor: border }}>
                <div>
                  <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Office Balance</p>
                  <p className="text-[22px] font-light" style={{
                    color: checkBelowPar(selectedProduct["OFFICE BALANCE"], selectedProduct["PAR LEVEL"])
                      ? "hsl(var(--red))" : "hsl(var(--foreground))"
                  }}>
                    {selectedProduct["OFFICE BALANCE"] ?? "—"}
                    {checkBelowPar(selectedProduct["OFFICE BALANCE"], selectedProduct["PAR LEVEL"]) && (
                      <AlertTriangle size={14} className="inline ml-2 mb-1" style={{ color: "hsl(var(--red))" }} />
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Par Level</p>
                  <p className="text-[22px] font-light">{selectedProduct["PAR LEVEL"] ?? "—"}</p>
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-4 gap-6 mb-5">
                <div>
                  <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Supplier Price</p>
                  <p className="text-[15px] font-light">RM {fmtPrice(selectedProduct["SUPPLIER PRICE"])}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Branch Price</p>
                  <p className="text-[15px] font-light">RM {fmtPrice(getBranchPrice(selectedProduct["SUPPLIER PRICE"]))}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Staff Price</p>
                  <p className="text-[15px] font-light">RM {fmtPrice(selectedProduct["STAFF PRICE"])}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Customer Price</p>
                  <p className="text-[15px] font-light">RM {fmtPrice(selectedProduct["CUSTOMER PRICE"])}</p>
                </div>
              </div>

              {/* Multi-supplier price comparison */}
              {(() => {
                const sameProduct = products.filter(
                  p => p["PRODUCT NAME"] === selectedProduct["PRODUCT NAME"] && p.id !== selectedProduct.id
                );
                if (sameProduct.length === 0) return null;
                const allSuppliers = [selectedProduct, ...sameProduct];
                return (
                  <div className="pt-4 border-t" style={{ borderColor: border }}>
                    <p className="text-[10px] tracking-wider uppercase mb-3" style={dim}>
                      Supplier Comparison · {allSuppliers.length} suppliers
                    </p>
                    <div className="flex items-center gap-6">
                      {allSuppliers.map(s => (
                        <div key={s.id} className="flex items-center gap-3">
                          <div
                            className="px-3 py-2"
                            style={{ border: `1px solid ${s.id === selectedProduct.id ? borderActive : border}` }}
                          >
                            <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>{s["SUPPLIER"] || "Unknown"}</p>
                            <p className="text-[15px] font-light">RM {fmtPrice(s["SUPPLIER PRICE"])}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Filters ── */}
          <div className="flex items-center gap-6 mb-5">
            <div className="flex items-center gap-3">
              {(["all", "no", "yes"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterColour(f)}
                  className="text-[11px] tracking-wider uppercase transition-colors"
                  style={{ color: filterColour === f ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                  onMouseLeave={e => (e.currentTarget.style.color = filterColour === f ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))")}
                >
                  {f === "all" ? "All" : f === "yes" ? "Colours" : "Products"}
                </button>
              ))}
            </div>
            <div style={{ width: "1px", height: "14px", background: border }} />
            <button
              onClick={() => setFilterLowStock(v => !v)}
              className="flex items-center gap-1.5 text-[11px] tracking-wider uppercase transition-colors"
              style={{ color: filterLowStock ? "hsl(var(--red))" : "hsl(var(--muted-foreground))" }}
              onMouseEnter={e => (e.currentTarget.style.color = filterLowStock ? "hsl(var(--red))" : "hsl(var(--foreground))")}
              onMouseLeave={e => (e.currentTarget.style.color = filterLowStock ? "hsl(var(--red))" : "hsl(var(--muted-foreground))")}
            >
              <AlertTriangle size={11} />
              Below Par {lowStockCount > 0 && `(${lowStockCount})`}
            </button>
            <div className="ml-auto text-[11px] tracking-wider uppercase" style={dim}>
              {filteredProducts.length} results
            </div>
          </div>

          {/* ── Table ── */}
          {loading ? (
            <p className="text-[13px]" style={dim}>Loading...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-[13px]" style={dim}>No products found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: "1050px" }}>
                  <thead>
                    <tr className="border-b" style={{ borderColor: borderActive }}>

                      {/* Sortable: Product Name */}
                      <th
                        className={`${thBase} text-left pr-4 cursor-pointer align-top`}
                        style={{ color: sortKey === "PRODUCT NAME" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                        onClick={() => handleSort("PRODUCT NAME")}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = sortKey === "PRODUCT NAME" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))")}
                      >
                        Product <SortIcon col="PRODUCT NAME" />
                      </th>

                      {/* Sortable: Supplier */}
                      <th
                        className={`${thBase} text-left pr-4 cursor-pointer align-top`}
                        style={{ color: sortKey === "SUPPLIER" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                        onClick={() => handleSort("SUPPLIER")}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = sortKey === "SUPPLIER" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))")}
                      >
                        Supplier <SortIcon col="SUPPLIER" />
                      </th>

                      {/* Balance */}
                      <th className={`${thBase} text-center pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Balance
                      </th>

                      {/* Par */}
                      <th className={`${thBase} text-center pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Par
                      </th>

                      {/* Supplier Price — always bright white, NOT sortable */}
                      <th className={`${thBase} text-center pr-4 align-top`}
                        style={{ color: "hsl(var(--foreground))", cursor: "default" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}>
                        Supplier<br /><span style={{ color: "hsl(var(--foreground))" }}>RM</span>
                      </th>

                      {/* Branch Price — dim */}
                      <th className={`${thBase} text-center pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Branch<br /><span>RM</span>
                      </th>

                      {/* Staff RM */}
                      <th className={`${thBase} text-center pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Staff<br /><span>RM</span>
                      </th>

                      {/* Customer RM */}
                      <th className={`${thBase} text-center pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Customer<br /><span>RM</span>
                      </th>

                      {/* Section */}
                      <th className={`${thBase} text-left pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Section
                      </th>

                      {/* Type */}
                      <th className={`${thBase} text-center pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Type
                      </th>

                      {/* Units/Order */}
                      <th className={`${thBase} text-center align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Units/<br /><span>Order</span>
                      </th>

                    </tr>
                  </thead>
                  <tbody>
                    {pagedProducts.map(p => {
                      const belowPar = checkBelowPar(p["OFFICE BALANCE"], p["PAR LEVEL"]);
                      const branchPrice = getBranchPrice(p["SUPPLIER PRICE"]);
                      return (
                        <tr
                          key={p.id}
                          className="border-b cursor-pointer"
                          style={{ borderColor: border }}
                          onClick={() => { setSelectedProduct(p); setSearch(p["PRODUCT NAME"]); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          onMouseEnter={e => (e.currentTarget.style.background = cardBg)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="text-[13px] font-light py-3 pr-4">{p["PRODUCT NAME"]}</td>
                          <td className="text-[12px] font-light py-3 pr-4" style={dim}>{p["SUPPLIER"] || "—"}</td>
                          <td className="text-[13px] font-light py-3 pr-4 text-center" style={{ color: belowPar ? "hsl(var(--red))" : "hsl(var(--foreground))" }}>
                            {p["OFFICE BALANCE"] ?? "—"}
                            {belowPar && <AlertTriangle size={10} className="inline ml-1 mb-0.5" />}
                          </td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={dim}>{p["PAR LEVEL"] ?? "—"}</td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={{ color: "hsl(var(--foreground))" }}>{fmtPrice(p["SUPPLIER PRICE"])}</td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={dim}>{fmtPrice(branchPrice)}</td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={dim}>{fmtPrice(p["STAFF PRICE"])}</td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={dim}>{fmtPrice(p["CUSTOMER PRICE"])}</td>
                          <td className="text-[12px] font-light py-3 pr-4" style={dim}>{p["OFFICE SECTION"] || "—"}</td>
                          <td className="text-[11px] font-light py-3 pr-4 text-center tracking-wider uppercase" style={dim}>
                            {p["COLOUR"]?.toLowerCase() === "yes" ? "Colour" : "Product"}
                          </td>
                          <td className="text-[12px] font-light py-3 text-center" style={dim}>{p["UNITS PER ORDER"] ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: border }}>
                  <p className="text-[11px] tracking-wider uppercase" style={dim}>
                    Page {page + 1} of {totalPages} · {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 text-[11px] tracking-wider uppercase transition-colors"
                      style={{ color: page === 0 ? "hsl(var(--border))" : "hsl(var(--muted-foreground))" }}
                      onMouseEnter={e => { if (page > 0) e.currentTarget.style.color = "hsl(var(--foreground))"; }}
                      onMouseLeave={e => { if (page > 0) e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                      className="flex items-center gap-1 text-[11px] tracking-wider uppercase transition-colors"
                      style={{ color: page === totalPages - 1 ? "hsl(var(--border))" : "hsl(var(--muted-foreground))" }}
                      onMouseEnter={e => { if (page < totalPages - 1) e.currentTarget.style.color = "hsl(var(--foreground))"; }}
                      onMouseLeave={e => { if (page < totalPages - 1) e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;