import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Home, X, ChevronLeft, ChevronRight, AlertTriangle, ChevronUp, ChevronDown, ClipboardList, Plus, RefreshCw } from "lucide-react";

interface OfficeProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string | null;
  "UNITS/ORDER": number | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "STAFF PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "OFFICE BALANCE": number | null;
  "PAR": number | null;
  "COLOUR": boolean | null;
  "OFFICE SECTION": string | null;
}

type SortKey = "PRODUCT NAME" | "SUPPLIER" | null;
type SortDir = "asc" | "desc";

interface AllFileLogRow {
  id: number;
  DATE: string;
  "PRODUCT NAME": string;
  BRANCH: string | null;
  SUPPLIER: string | null;
  TYPE: string;
  "STARTING BALANCE": number;
  QTY: number;
  "ENDING BALANCE": number;
  GRN?: string | null;
  "OFFICE BALANCE"?: number | null;
}

const fmtActivityDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

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
  const location = useLocation();
  const fromBranch = (location.state as { fromBranch?: string } | null)?.fromBranch ?? null;
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const branchRoutes: Record<string, string> = {
    "Boudoir": "/stock",
    "Nur Yadi": "/stocknuryadi",
    "Chic Nailspa": "/stockchicnailspa",
  };

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

  // Recent activity state (product popup)
  const [recentActivity, setRecentActivity] = useState<AllFileLogRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // All-orders recent activity (main page, 14 days)
  const [allActivity, setAllActivity] = useState<AllFileLogRow[]>([]);
  const [allActivityLoading, setAllActivityLoading] = useState(false);
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());

  // Order panel state
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [orderSupplierFilter, setOrderSupplierFilter] = useState<string[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [orderLines, setOrderLines] = useState<{ product: OfficeProduct; supplierChoice: string | null; qty: number }[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [orderActiveIndex, setOrderActiveIndex] = useState(-1);
  const orderSearchRef = useRef<HTMLDivElement>(null);
  const orderListRef = useRef<HTMLDivElement>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };
  const border = "hsl(var(--border))";
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("AllFileProducts")
          .select("*")
          .range(from, from + batchSize - 1);
        if (error) { console.error("Fetch error:", error); break; }
        if (data && data.length > 0) {
          allData = allData.concat(data);
          if (data.length < batchSize) break;
          from += batchSize;
        } else {
          break;
        }
      }
      setProducts(allData);
      // Refresh selectedProduct with latest balance if one is selected
      setSelectedProduct(prev => {
        if (!prev) return prev;
        const updated = allData.find((p: any) => p.id === prev.id);
        return updated ?? prev;
      });
    } catch (err) {
      console.error("Error fetching products:", err);
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

  // Fetch recent activity from AllFileLog when a product is selected
  // Only show Order-type entries (supplier orders IN and branch orders OUT)
  useEffect(() => {
    if (!selectedProduct) { setRecentActivity([]); return; }
    const fetchActivity = async () => {
      setActivityLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("AllFileLog")
          .select("*")
          .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"])
          .eq("TYPE", "Order")
          .order("DATE", { ascending: false })
          .limit(20);
        if (!error && data) setRecentActivity(data);
      } catch (err) { console.error("Activity fetch error:", err); }
      setActivityLoading(false);
    };
    fetchActivity();
  }, [selectedProduct]);

  // Fetch 14-day all-orders activity for main page
  useEffect(() => {
    const fetchAllActivity = async () => {
      setAllActivityLoading(true);
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 14);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        const { data, error } = await (supabase as any)
          .from("AllFileLog")
          .select("*")
          .gte("DATE", cutoffStr)
          .eq("TYPE", "Order")
          .order("DATE", { ascending: false })
          .order("id", { ascending: false });
        if (!error && data) setAllActivity(data);
      } catch (err) { console.error("All activity fetch error:", err); }
      setAllActivityLoading(false);
    };
    fetchAllActivity();
  }, []);

  // Confirm supplier order from office order panel
  const handleOrderConfirm = async () => {
    if (orderLines.length === 0) return;
    const hasUnresolved = orderLines.some(
      l => l.supplierChoice === null &&
        products.filter(s => s["PRODUCT NAME"] === l.product["PRODUCT NAME"] && s.id !== l.product.id).length > 0
    );
    if (hasUnresolved) return;
    setConfirmError(null);
    setOrderSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const dd = today.slice(8,10), mm = today.slice(5,7), yy = today.slice(2,4);
      const baseGRN = `OFFICE ${dd}${mm}${yy}`;

      // Resolve each line to its chosen product and supplier
      type ResolvedLine = { chosenProduct: typeof products[0]; qty: number };
      const supplierGroups: Record<string, ResolvedLine[]> = {};
      for (const line of orderLines) {
        const chosenProduct = line.supplierChoice
          ? products.find(p => p["PRODUCT NAME"] === line.product["PRODUCT NAME"] && p["SUPPLIER"] === line.supplierChoice) ?? line.product
          : line.product;
        const supplierKey = chosenProduct["SUPPLIER"] ?? "Unknown";
        if (!supplierGroups[supplierKey]) supplierGroups[supplierKey] = [];
        supplierGroups[supplierKey].push({ chosenProduct, qty: line.qty });
      }

      const supplierKeys = Object.keys(supplierGroups);
      const multiSupplier = supplierKeys.length > 1;

      for (let gi = 0; gi < supplierKeys.length; gi++) {
        const supplierKey = supplierKeys[gi];
        const grn = multiSupplier ? `${baseGRN} (${gi + 1})` : baseGRN;
        for (const { chosenProduct, qty } of supplierGroups[supplierKey]) {
          const unitsPerOrder = chosenProduct["UNITS/ORDER"] ?? 1;
          const actualQty = qty * unitsPerOrder;
          const currentBalance = Number(chosenProduct["OFFICE BALANCE"] ?? 0);
          const endingBalance = currentBalance + actualQty;

          // Update ALL rows for this product name
          await (supabase as any)
            .from("AllFileProducts")
            .update({ "OFFICE BALANCE": endingBalance })
            .eq("PRODUCT NAME", chosenProduct["PRODUCT NAME"]);

          // Log to AllFileLog
          const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
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
          if (logErr) { console.error("AllFileLog confirm error:", logErr); setConfirmError(logErr.message || "Log write failed — check console"); }
        }
      }
      await fetchProducts();
      setOrderLines([]);
      setOrderSuccess(true);
      setTimeout(() => { setOrderSuccess(false); setShowOrderPanel(false); }, 2000);
    } catch (err) { console.error("Order confirm error:", err); }
    setOrderSubmitting(false);
  };

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
      const matchLow = !filterLowStock || checkBelowPar(p["OFFICE BALANCE"], p["PAR"]);
      const matchColour =
        filterColour === "all" ? true :
        filterColour === "yes" ? p["COLOUR"] === true :
        p["COLOUR"] !== true;
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
  const lowStockCount = products.filter(p => checkBelowPar(p["OFFICE BALANCE"], p["PAR"])).length;

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

  // All unique suppliers
  const allSuppliers = [...new Set(products.map(p => p["SUPPLIER"]).filter(Boolean))].sort() as string[];

  // Products filtered by supplier for order panel
  const orderPanelProducts = orderSupplierFilter.length === 0
    ? products
    : products.filter(p => orderSupplierFilter.includes(p["SUPPLIER"] ?? ""));

  // Unique product names in order panel (after supplier filter)
  const orderDropdownResults = orderSearch.length > 0
    ? (() => {
        const matched = orderPanelProducts.filter(p =>
          p["PRODUCT NAME"]?.toLowerCase().includes(orderSearch.toLowerCase()) &&
          !orderLines.some(l => l.product["PRODUCT NAME"] === p["PRODUCT NAME"] && l.product["SUPPLIER"] === p["SUPPLIER"])
        );
        // Deduplicate: for same PRODUCT NAME + SUPPLIER, keep only the row with smallest UNITS/ORDER (prefer 1)
        const seen = new Map<string, typeof matched[0]>();
        for (const p of matched) {
          const key = `${p["PRODUCT NAME"]}|||${p["SUPPLIER"]}`;
          const existing = seen.get(key);
          if (!existing || (p["UNITS/ORDER"] ?? 1) < (existing["UNITS/ORDER"] ?? 1)) {
            seen.set(key, p);
          }
        }
        return Array.from(seen.values()).slice(0, 30);
      })()
    : [];

  // When adding a product to order — check if same name exists with multiple suppliers
  const addToOrder = (p: OfficeProduct) => {
    // Only consider siblings with a DIFFERENT supplier (same supplier = different pack sizes, no choice needed)
    const siblings = products.filter(s => s["PRODUCT NAME"] === p["PRODUCT NAME"] && s.id !== p.id && s["SUPPLIER"] !== p["SUPPLIER"]);
    setOrderLines(prev => [...prev, {
      product: p,
      supplierChoice: siblings.length > 0 ? null : p["SUPPLIER"], // null = needs supplier choice
      qty: 1,
    }]);
    setOrderSearch("");
    setShowOrderDropdown(false);
    setOrderActiveIndex(-1);
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

  // Close order dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (orderSearchRef.current && !orderSearchRef.current.contains(e.target as Node)) {
        setShowOrderDropdown(false);
        setOrderActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close supplier dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (orderActiveIndex >= 0 && orderListRef.current) {
      const items = orderListRef.current.querySelectorAll("[data-item]");
      items[orderActiveIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [orderActiveIndex]);

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
          <div className="relative">
            <button
              onClick={() => {
                if (fromBranch && branchRoutes[fromBranch]) {
                  navigate(branchRoutes[fromBranch]);
                } else {
                  setShowBranchDropdown(prev => !prev);
                }
              }}
              className="flex items-center gap-2 text-[13px] tracking-[0.15em] uppercase transition-colors"
              style={{ color: "hsl(var(--foreground))" }}
            >
              <span>STOCK</span>
              <ArrowRight size={15} />
            </button>
            {showBranchDropdown && (
              <div
                className="absolute right-0 top-8 z-50 flex flex-col gap-1 p-2 rounded-xl"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", minWidth: "160px" }}
              >
                {Object.entries(branchRoutes).map(([branch, route]) => (
                  <button
                    key={branch}
                    onClick={() => { setShowBranchDropdown(false); navigate(route); }}
                    className="text-left px-4 py-2 rounded-lg text-[12px] tracking-[0.1em] uppercase transition-colors"
                    style={{ color: "hsl(var(--foreground))" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--muted))")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="py-12">

          {/* ── Page header ── */}
          <div className="mb-8">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-[11px] font-normal tracking-[0.2em] uppercase mb-1" style={dim}>Office Database</h1>
                <p className="text-[28px] font-light tracking-tight">Stock Inventory</p>
              </div>
              <span
                className="nav-link flex items-center gap-0.5 mb-1"
                style={{ color: "hsl(var(--foreground))" }}
                onClick={() => { setShowOrderPanel(true); setOrderSearch(""); setShowSupplierDropdown(false); }}
              >
                Order <ClipboardList size={13} className="inline -mt-0.5" />
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] tracking-wider uppercase" style={dim}>
                {products.length} products
                {lowStockCount > 0 && (
                  <span className="ml-3" style={{ color: "hsl(var(--red))" }}>· {lowStockCount} below par</span>
                )}
              </p>
              <button
                onClick={fetchProducts}
                className="nav-link flex items-center gap-1"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Refresh <RefreshCw size={13} className="inline -mt-0.5" />
              </button>
            </div>
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
                      {p["COLOUR"] === true && (
                        <span className="text-[10px] tracking-wider uppercase" style={dim}>Colour</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(p["UNITS/ORDER"] ?? 1) > 1 && (
                        <span className="text-[11px]" style={dim}>{p["UNITS/ORDER"]} units</span>
                      )}
                      <span className="text-[12px] font-light" style={{
                        color: checkBelowPar(p["OFFICE BALANCE"], p["PAR"])
                          ? "hsl(var(--red))" : "hsl(var(--foreground))"
                      }}>
                        {p["OFFICE BALANCE"] ?? "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Recent Activity (14 days) ── */}
          {(() => {
            // Group allActivity by GRN
            const groups: { grn: string; rows: AllFileLogRow[] }[] = [];
            const seen = new Map<string, AllFileLogRow[]>();
            allActivity.forEach(row => {
              const key = row.GRN ?? "—";
              if (!seen.has(key)) { seen.set(key, []); groups.push({ grn: key, rows: seen.get(key)! }); }
              seen.get(key)!.push(row);
            });

            return (
              <div className="mb-8">
                <p className="text-[10px] tracking-[0.2em] uppercase mb-3" style={dim}>Recent Activity · Last 14 Days</p>
                {allActivityLoading ? (
                  <p className="text-[12px]" style={dim}>Loading…</p>
                ) : groups.length === 0 ? (
                  <p className="text-[12px]" style={dim}>No order activity in the last 14 days</p>
                ) : (
                  <div className="border-t" style={{ borderColor: border }}>
                    {groups.map(({ grn, rows }) => {
                      const first = rows[0];
                      const isSupplierOrder = first.BRANCH === "Office";
                      const typeLabel = isSupplierOrder ? "Supplier Order" : "Branch Order";
                      const counterparty = isSupplierOrder ? (first.SUPPLIER ?? "—") : (first.BRANCH ?? "—");
                      const uniqueProducts = new Set(rows.map(r => r["PRODUCT NAME"])).size;
                      const totalUnits = rows.reduce((s, r) => s + Math.abs(r.QTY ?? 0), 0);
                      const expanded = expandedGRNs.has(grn);
                      const dateStr = first.DATE ? (() => {
                        const d = new Date(first.DATE);
                        return d.getDate() + " " + d.toLocaleString("en-GB", { month: "short" });
                      })() : "—";

                      return (
                        <div key={grn} className="border-b" style={{ borderColor: border }}>
                          {/* Collapsed row */}
                          <div
                            className="flex items-center gap-4 py-2.5 cursor-pointer select-none"
                            onClick={() => setExpandedGRNs(prev => {
                              const next = new Set(prev);
                              next.has(grn) ? next.delete(grn) : next.add(grn);
                              return next;
                            })}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                          >
                            <span style={dim}>{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                            <span className="text-[12px] font-light w-16 shrink-0">{dateStr}</span>
                            <span className="text-[11px] tracking-wide uppercase w-28 shrink-0" style={dim}>{grn}</span>
                            <span className="text-[12px] font-light w-28 shrink-0">{typeLabel}</span>
                            <span className="text-[12px] font-light flex-1">{counterparty}</span>
                            <span className="text-[11px] shrink-0" style={dim}>{uniqueProducts} {uniqueProducts === 1 ? "product" : "products"}</span>
                            <span className="text-[12px] font-light w-20 text-right shrink-0" style={{ color: isSupplierOrder ? "hsl(142 71% 45%)" : "hsl(var(--red))" }}>
                              {isSupplierOrder ? "+" : "−"}{totalUnits} units
                            </span>
                          </div>

                          {/* Expanded product lines */}
                          {expanded && (
                            <div className="pb-3 pl-6">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                                    <th className="text-left text-[10px] tracking-wider uppercase pb-1.5 pr-6 font-normal" style={dim}>Product</th>
                                    <th className="text-right text-[10px] tracking-wider uppercase pb-1.5 pr-6 font-normal" style={dim}>QTY</th>
                                    <th className="text-right text-[10px] tracking-wider uppercase pb-1.5 font-normal" style={dim}>Office Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((r, ri) => (
                                    <tr key={ri} className="border-b last:border-0" style={{ borderColor: border }}>
                                      <td className="text-[12px] font-light py-1.5 pr-6">{r["PRODUCT NAME"] ?? "—"}</td>
                                      <td className="text-[12px] font-light py-1.5 pr-6 text-right" style={{ color: isSupplierOrder ? "hsl(142 71% 45%)" : "hsl(var(--red))" }}>
                                        {isSupplierOrder ? "+" : "−"}{r.QTY ?? 0}
                                      </td>
                                      <td className="text-[12px] font-light py-1.5 text-right">{r["OFFICE BALANCE"] ?? "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Selected product card ── */}
          {selectedProduct && (
            <div className="surface-box p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[11px] tracking-wider uppercase mb-1" style={dim}>
                    {selectedProduct["COLOUR"] === true ? "Colour Product" : "Product"}
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

              {/* Balance */}
              <div className="flex items-center gap-8 mb-5 pb-5 border-b" style={{ borderColor: border }}>
                <div>
                  <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Office Balance</p>
                  <p className="text-[22px] font-light" style={{
                    color: checkBelowPar(selectedProduct["OFFICE BALANCE"], selectedProduct["PAR"])
                      ? "hsl(var(--red))" : "hsl(var(--foreground))"
                  }}>
                    {selectedProduct["OFFICE BALANCE"] ?? "—"}
                    {checkBelowPar(selectedProduct["OFFICE BALANCE"], selectedProduct["PAR"]) && (
                      <AlertTriangle size={14} className="inline ml-2 mb-1" style={{ color: "hsl(var(--red))" }} />
                    )}
                  </p>
                </div>
                {selectedProduct["OFFICE SECTION"] && (
                  <div>
                    <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Section</p>
                    <p className="text-[15px] font-light">{selectedProduct["OFFICE SECTION"]}</p>
                  </div>
                )}
              </div>

              {/* Prices */}
              <div className="grid grid-cols-4 gap-6 mb-5">
                <div>
                  <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Supplier Price</p>
                  <p className="text-[15px] font-light">RM {fmtPrice(selectedProduct["SUPPLIER PRICE"])}</p>
                  {(selectedProduct["UNITS/ORDER"] ?? 1) > 1 && (
                    <p className="text-[11px] mt-1" style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>
                      × {selectedProduct["UNITS/ORDER"]} units/order
                    </p>
                  )}
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

              {/* Recent Activity */}
              <div className="pt-4 pb-5 border-t border-b mb-5" style={{ borderColor: border }}>
                <p className="text-[10px] tracking-wider uppercase mb-3" style={dim}>Recent Activity</p>
                {activityLoading ? (
                  <p className="text-[12px]" style={dim}>Loading…</p>
                ) : recentActivity.length === 0 ? (
                  <p className="text-[12px]" style={dim}>No activity recorded yet</p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: border }}>
                        <th className="text-left text-[10px] tracking-wider uppercase pb-2 pr-5 font-normal" style={dim}>Date</th>
                        <th className="text-left text-[10px] tracking-wider uppercase pb-2 pr-5 font-normal" style={dim}>Product</th>
                        <th className="text-left text-[10px] tracking-wider uppercase pb-2 pr-5 font-normal" style={dim}>Branch</th>
                        <th className="text-left text-[10px] tracking-wider uppercase pb-2 pr-5 font-normal" style={dim}>Supplier</th>
                        <th className="text-center text-[10px] tracking-wider uppercase pb-2 pr-5 font-normal" style={dim}>QTY</th>
                        <th className="text-center text-[10px] tracking-wider uppercase pb-2 pr-5 font-normal" style={dim}>Office Balance</th>
                        <th className="text-left text-[10px] tracking-wider uppercase pb-2 font-normal" style={dim}>GRN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((a, i) => {
                        const isSupplierOrder = a.BRANCH === "Office";
                        const label = isSupplierOrder ? (a.SUPPLIER ?? "Supplier") : (a.BRANCH ?? "Branch");
                        const qtySign = isSupplierOrder ? `+${a.QTY}` : `-${a.QTY}`;
                        const qtyColor = isSupplierOrder ? "hsl(var(--green, 142 71% 45%))" : "hsl(var(--red))";
                        return (
                          <tr key={i} className="border-b last:border-0" style={{ borderColor: border }}>
                            <td className="text-[12px] font-light py-2 pr-5">{fmtActivityDate(a.DATE)}</td>
                            <td className="text-[12px] font-light py-2 pr-5">{a["PRODUCT NAME"] ?? "—"}</td>
                            <td className="text-[12px] font-light py-2 pr-5">{a["BRANCH"] ?? "—"}</td>
                            <td className="text-[12px] font-light py-2 pr-5">{a["SUPPLIER"] ?? "—"}</td>
                            <td className="text-[12px] font-light py-2 pr-5 text-center" style={{ color: qtyColor }}>{qtySign}</td>
                            <td className="text-[12px] font-light py-2 pr-5 text-center">{a["OFFICE BALANCE"] ?? "—"}</td>
                            <td className="text-[12px] font-light py-2">{a["GRN"] ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Multi-supplier price comparison */}
              {(() => {
                const sameProduct = products.filter(
                  p => p["PRODUCT NAME"] === selectedProduct["PRODUCT NAME"] && p.id !== selectedProduct.id
                );
                if (sameProduct.length === 0) return null;
                const allSupplierRows = [selectedProduct, ...sameProduct];
                return (
                  <div className="pt-4 border-t" style={{ borderColor: border }}>
                    <p className="text-[10px] tracking-wider uppercase mb-3" style={dim}>
                      Supplier Comparison · {allSupplierRows.length} suppliers
                    </p>
                    <div className="flex items-center gap-6">
                      {allSupplierRows.map(s => (
                        <div key={s.id} className="flex items-center gap-3">
                          <div
                            className="px-3 py-2"
                            style={{ border: `1px solid ${s.id === selectedProduct.id ? borderActive : border}` }}
                          >
                            <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>{s["SUPPLIER"] || "Unknown"}</p>
                            <p className="text-[15px] font-light">RM {fmtPrice(s["SUPPLIER PRICE"])}</p>
                            {(s["UNITS/ORDER"] ?? 1) > 1 && (
                              <p className="text-[10px] mt-0.5 font-medium" style={{ color: "hsl(var(--foreground))" }}>× {s["UNITS/ORDER"]} units/order</p>
                            )}
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

                      {/* Supplier Price — dim header, bright white data */}
                      <th className={`${thBase} text-center pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Supplier<br /><span>RM</span>
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

                      {/* Par */}
                      <th className={`${thBase} text-center pr-4 align-top`} style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        Par
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
                      const belowPar = checkBelowPar(p["OFFICE BALANCE"], p["PAR"]);
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
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={{ color: "hsl(var(--foreground))" }}>{fmtPrice(p["SUPPLIER PRICE"])}</td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={dim}>{fmtPrice(branchPrice)}</td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={dim}>{fmtPrice(p["STAFF PRICE"])}</td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={dim}>{fmtPrice(p["CUSTOMER PRICE"])}</td>
                          <td className="text-[12px] font-light py-3 pr-4" style={dim}>{p["OFFICE SECTION"] || "—"}</td>
                          <td className="text-[11px] font-light py-3 pr-4 text-center tracking-wider uppercase" style={dim}>
                            {p["COLOUR"] === true ? "Colour" : "Product"}
                          </td>
                          <td className="text-[12px] font-light py-3 pr-4 text-center" style={dim}>{p["PAR"] ?? "—"}</td>
                          <td className="text-[12px] font-light py-3 text-center" style={(p["UNITS/ORDER"] ?? 1) > 1 ? { color: "hsl(var(--foreground))", fontWeight: 500 } : dim}>
                            {(p["UNITS/ORDER"] ?? 1) > 1 ? `${p["UNITS/ORDER"]} units` : "—"}
                          </td>
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

      {/* ── Order Panel ── */}
      {showOrderPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowOrderPanel(false)}>
          <div
            className="h-full w-full max-w-[650px] overflow-y-auto p-10"
            style={{ background: "hsl(var(--background))", borderLeft: `1px solid hsl(var(--border))` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[24px] font-light tracking-tight">New Order</h2>
                <p className="text-[14.5px] tracking-wider uppercase mt-1" style={dim}>Office stock order</p>
              </div>
              <button onClick={() => setShowOrderPanel(false)} style={dim}
                onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                <X size={16} />
              </button>
            </div>

            {/* Supplier filter — compact multi-select dropdown */}
            <div className="mb-4 relative" ref={supplierDropdownRef}>
              <button
                onClick={() => setShowSupplierDropdown(v => !v)}
                onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setShowSupplierDropdown(false); }}
                className="flex items-center gap-2 text-[14.5px] tracking-wider uppercase transition-colors px-3 py-1.5"
                style={{
                  border: `1px solid ${borderActive}`,
                  color: "hsl(var(--foreground))",
                  minWidth: "180px",
                  background: "transparent",
                }}
              >
                <span className="flex-1 text-left">
                  {orderSupplierFilter.length === 0
                    ? "All Suppliers"
                    : orderSupplierFilter.length === 1
                      ? orderSupplierFilter[0]
                      : `${orderSupplierFilter.length} suppliers`}
                </span>
                <ChevronRight size={10} style={{ transform: showSupplierDropdown ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
              </button>
              {showSupplierDropdown && (
                <div
                  className="absolute top-full left-0 z-50 border min-w-[180px] py-1 max-h-[220px] overflow-y-auto scrollbar-thin"
                  style={{ background: "hsl(var(--popover))", borderColor: borderActive, marginTop: "2px" }}
                >
                  {/* Clear all */}
                  <button
                    className="w-full text-left px-3 py-2 text-[14.5px] tracking-wider uppercase transition-colors flex items-center gap-2"
                    style={{ color: "hsl(var(--foreground))", background: orderSupplierFilter.length === 0 ? cardBg : "transparent", borderBottom: `1px solid ${border}` }}
                    onClick={() => setOrderSupplierFilter([])}
                  >
                    <span style={{ width: 10, height: 10, border: `1px solid ${borderActive}`, display: "inline-block", background: orderSupplierFilter.length === 0 ? "hsl(var(--foreground))" : "transparent", flexShrink: 0 }} />
                    All Suppliers
                  </button>
                  {allSuppliers.map(s => {
                    const isAllMode = orderSupplierFilter.length === 0;
                    const selected = isAllMode || orderSupplierFilter.includes(s);
                    return (
                      <button
                        key={s}
                        className="w-full text-left px-3 py-2 text-[14.5px] tracking-wider uppercase transition-colors flex items-center gap-2"
                        style={{ color: "hsl(var(--foreground))", background: selected ? cardBg : "transparent" }}
                        onClick={() => setOrderSupplierFilter(prev =>
                          prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                        )}
                      >
                        <span style={{ width: 10, height: 10, border: `1px solid ${borderActive}`, display: "inline-block", background: selected ? "hsl(var(--foreground))" : "transparent", flexShrink: 0 }} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add product search */}
            <div ref={orderSearchRef} className="relative mb-6">
              <p className="text-[14.5px] tracking-wider uppercase mb-2" style={dim}>Add Product</p>
              <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: borderActive }}>
                <input
                  type="text"
                  className="flex-1 bg-transparent outline-none text-[14.5px] font-light"
                  placeholder="Search to add..."
                  value={orderSearch}
                  onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); setOrderActiveIndex(-1); }}
                  onFocus={() => setShowOrderDropdown(true)}
                  onKeyDown={handleOrderKeyDown}
                  style={{ color: "hsl(var(--foreground))" }}
                />
                {orderSearch && (
                  <button onClick={() => { setOrderSearch(""); setShowOrderDropdown(false); }} style={dim}>
                    <X size={12} />
                  </button>
                )}
                <Plus size={12} style={dim} />
              </div>
              {showOrderDropdown && orderDropdownResults.length > 0 && (
                <div
                  ref={orderListRef}
                  className="absolute top-full left-0 right-0 z-50 border max-h-[200px] overflow-y-auto scrollbar-thin"
                  style={{ background: "hsl(var(--popover))", borderColor: borderActive, marginTop: "2px" }}
                >
                  {orderDropdownResults.map((p, i) => (
                    <div
                      key={p.id}
                      data-item
                      className="flex items-center justify-between px-3 py-2.5 cursor-pointer"
                      style={{ borderBottom: `1px solid ${border}`, background: i === orderActiveIndex ? cardBg : "transparent" }}
                      onMouseDown={() => addToOrder(p)}
                      onMouseEnter={() => setOrderActiveIndex(i)}
                    >
                      <div>
                        <span className="text-[14.5px] font-light">{p["PRODUCT NAME"]}</span>
                        {orderSupplierFilter.length === 0 && p["SUPPLIER"] && (
                          <span className="text-[14.5px] ml-2" style={dim}>{p["SUPPLIER"]}</span>
                        )}
                        {(p["UNITS/ORDER"] ?? 1) > 1 && (
                          <span className="text-[14.5px] ml-2 font-medium" style={{ color: "hsl(var(--foreground))" }}>× {p["UNITS/ORDER"]} units/order</span>
                        )}
                      </div>
                      <span className="text-[14.5px] font-light" style={{
                        color: checkBelowPar(p["OFFICE BALANCE"], p["PAR"])
                          ? "hsl(var(--red))" : "hsl(var(--muted-foreground))"
                      }}>
                        {p["OFFICE BALANCE"] ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order lines */}
            {orderLines.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14.5px] tracking-wider uppercase" style={dim}>Order Items</p>
                  {orderLines.length > 0 && (
                    <button
                      onClick={() => setOrderLines([])}
                      className="text-[11px] tracking-wider uppercase px-2 py-0.5 rounded transition-colors"
                      style={{ color: "hsl(var(--muted-foreground))", border: `1px solid ${border}` }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {orderLines.map((line, idx) => {
                    const siblings = products.filter(
                      s => s["PRODUCT NAME"] === line.product["PRODUCT NAME"] && s.id !== line.product.id
                        && s["SUPPLIER"] !== line.product["SUPPLIER"]
                        && (s["UNITS/ORDER"] ?? 1) <= 1
                    );
                    const needsChoice = siblings.length > 0 && line.supplierChoice === null;
                    const chosenSupplier = line.supplierChoice
                      ? products.find(p => p["PRODUCT NAME"] === line.product["PRODUCT NAME"] && p["SUPPLIER"] === line.supplierChoice)
                      : line.product;
                    return (
                      <div key={idx} className="p-3" style={{ border: `1px solid ${needsChoice ? borderActive : border}` }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-[14.5px] font-light">{line.product["PRODUCT NAME"]}</p>
                            {/* Supplier choice prompt */}
                            {siblings.length > 0 && (
                              <div className="flex items-center gap-2 mt-1.5">
                                {[line.product, ...siblings].map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => setOrderLines(prev => prev.map((l, i) =>
                                      i === idx ? { ...l, supplierChoice: s["SUPPLIER"] } : l
                                    ))}
                                    className="text-[11.5px] tracking-wider uppercase px-2 py-1 transition-colors"
                                    style={{
                                      border: `1px solid ${line.supplierChoice === s["SUPPLIER"] ? borderActive : border}`,
                                      color: line.supplierChoice === s["SUPPLIER"] ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                                      background: line.supplierChoice === s["SUPPLIER"] ? cardBg : "transparent",
                                    }}
                                  >
                                    {s["SUPPLIER"] || "Unknown"}
                                    {s["SUPPLIER PRICE"] !== null && ` · RM ${fmtPrice(s["SUPPLIER PRICE"])}`}
                                  </button>
                                ))}
                              </div>
                            )}
                            {/* Single supplier — show supplier name + price */}
                            {siblings.length === 0 && (
                              <p className="text-[14.5px] mt-0.5" style={dim}>
                                {line.product["SUPPLIER"]}
                                {line.product["SUPPLIER PRICE"] !== null && ` · RM ${fmtPrice(line.product["SUPPLIER PRICE"])}`}
                              </p>
                            )}
                            {/* Units/Order badge */}
                            {(line.product["UNITS/ORDER"] ?? 1) > 1 && (
                              <p className="text-[14.5px] mt-0.5" style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>
                                × {line.product["UNITS/ORDER"]} units/order
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setOrderLines(prev => prev.filter((_, i) => i !== idx))}
                            style={dim}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {/* Balance + Qty */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[14.5px]" style={dim}>
                            Balance: <span style={{ color: checkBelowPar(line.product["OFFICE BALANCE"], line.product["PAR"]) ? "hsl(var(--red))" : "hsl(var(--foreground))" }}>
                              {chosenSupplier?.["OFFICE BALANCE"] ?? line.product["OFFICE BALANCE"] ?? "—"}
                            </span>
                          </span>
                          {/* Qty stepper */}
                          <div className="flex items-center" style={{ border: `1px solid ${borderActive}` }}>
                            <button
                              className="px-2 py-1.5 transition-colors text-[14.5px]"
                              style={dim}
                              onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: Math.max(1, l.qty - 1) } : l))}
                              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                            >
                              <ChevronLeft size={12} />
                            </button>
                            <span className="text-[14.5px] font-light px-3 min-w-[32px] text-center">
              {line.qty}
              {(line.product["UNITS/ORDER"] ?? 1) > 1 && (
                <span className="text-[14.5px] ml-1" style={{ color: "hsl(var(--green, 142 71% 45%))" }}>
                  ({line.qty * (line.product["UNITS/ORDER"] ?? 1)} units)
                </span>
              )}
            </span>
                            <button
                              className="px-2 py-1.5 transition-colors text-[14.5px]"
                              style={dim}
                              onClick={() => setOrderLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: l.qty + 1 } : l))}
                              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                            >
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary + Confirm */}
                <div className="mt-6 pt-4 border-t" style={{ borderColor: border }}>
                  {orderLines.some(l => l.supplierChoice === null && products.filter(s => s["PRODUCT NAME"] === l.product["PRODUCT NAME"] && s.id !== l.product.id).length > 0) && (
                    <p className="text-[14.5px] mb-2" style={{ color: "hsl(var(--red))" }}>
                      Please select a supplier for all items before submitting
                    </p>
                  )}
                  {orderSuccess ? (
                    <p className="text-[14.5px]" style={{ color: "hsl(var(--green, 142 71% 45%))" }}>
                      ✓ Order confirmed — office balances updated
                    </p>
                  ) : (
                    <button
                      className="minimal-btn"
                      style={{ opacity: (orderLines.length === 0 || orderSubmitting) ? 0.4 : 1 }}
                      disabled={orderLines.length === 0 || orderSubmitting}
                      onClick={handleOrderConfirm}
                    >
                      {orderSubmitting ? "Confirming…" : "Confirm Order"}
                    </button>
                  )}
                  {confirmError && (
                    <p className="text-[14.5px] mt-2" style={{ color: "hsl(var(--red))" }}>✗ {confirmError}</p>
                  )}

                  {/* Order Summary grouped by supplier / GRN */}
                  {orderLines.length > 0 && (() => {
                    const today = new Date();
                    const dd = String(today.getDate()).padStart(2, "0");
                    const mm = String(today.getMonth() + 1).padStart(2, "0");
                    const yy = String(today.getFullYear()).slice(-2);
                    const dateStr = `${dd}${mm}${yy}`;

                    // Group lines by resolved supplier
                    const groups: Record<string, typeof orderLines> = {};
                    orderLines.forEach(line => {
                      const sup = line.supplierChoice ?? line.product["SUPPLIER"] ?? "Unknown";
                      if (!groups[sup]) groups[sup] = [];
                      groups[sup].push(line);
                    });
                    const supplierNames = Object.keys(groups);
                    const multi = supplierNames.length > 1;

                    const grandTotal = orderLines.reduce((sum, line) => {
                      const rp = line.supplierChoice
                        ? products.find(p => p["PRODUCT NAME"] === line.product["PRODUCT NAME"] && p["SUPPLIER"] === line.supplierChoice) ?? line.product
                        : line.product;
                      return sum + (rp["SUPPLIER PRICE"] ?? 0) * line.qty;
                    }, 0);
                    const grandUnits = orderLines.reduce((s, l) => s + l.qty * (l.product["UNITS/ORDER"] ?? 1), 0);

                    return (
                      <div className="mt-5">
                        <p className="text-[14.5px] tracking-widest uppercase mb-3" style={dim}>Order Summary</p>

                        {supplierNames.map((supplier, sIdx) => {
                          const grpLines = groups[supplier];
                          const grn = multi ? `OFFICE ${dateStr} (${sIdx + 1})` : `OFFICE ${dateStr}`;
                          const subtotal = grpLines.reduce((s, l) => {
                            const rp = l.supplierChoice
                              ? products.find(p => p["PRODUCT NAME"] === l.product["PRODUCT NAME"] && p["SUPPLIER"] === l.supplierChoice) ?? l.product
                              : l.product;
                            return s + (rp["SUPPLIER PRICE"] ?? 0) * l.qty;
                          }, 0);

                          return (
                            <div key={supplier} className={sIdx > 0 ? "mb-5 mt-8 pt-6 border-t" : "mb-5"} style={sIdx > 0 ? { borderColor: border } : {}}>
                              {/* Supplier header */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[14.5px] font-semibold tracking-wide" style={{ color: "hsl(var(--foreground))" }}>{supplier}</span>
                                <span className="text-[14.5px] tracking-wider font-mono" style={dim}>{grn}</span>
                              </div>

                              {/* Product lines */}
                              {grpLines.map((line, lIdx) => {
                                const rp = line.supplierChoice
                                  ? products.find(p => p["PRODUCT NAME"] === line.product["PRODUCT NAME"] && p["SUPPLIER"] === line.supplierChoice) ?? line.product
                                  : line.product;
                                const unitPrice = rp["SUPPLIER PRICE"] ?? 0;
                                const unitsPerOrder = line.product["UNITS/ORDER"] ?? 1;
                                const lineTotal = unitPrice * line.qty;
                                const globalIdx = orderLines.indexOf(line);

                                return (
                                  <div key={lIdx} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: border }}>
                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[14.5px] leading-tight truncate" style={{ color: "hsl(var(--foreground))" }}>{line.product["PRODUCT NAME"]}</p>
                                      {unitsPerOrder > 1 && (
                                        <p className="text-[14.5px]" style={dim}>{line.qty * unitsPerOrder} units received</p>
                                      )}
                                    </div>
                                    {/* Qty editor */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        className="w-5 h-5 flex items-center justify-center rounded text-[14.5px]"
                                        style={dim}
                                        onClick={() => setOrderLines(prev => prev.map((ol, i) => i === globalIdx && ol.qty > 1 ? { ...ol, qty: ol.qty - 1 } : ol))}
                                      >−</button>
                                      <span className="text-[14.5px] w-4 text-center" style={{ color: "hsl(var(--foreground))" }}>{line.qty}</span>
                                      <button
                                        className="w-5 h-5 flex items-center justify-center rounded text-[14.5px]"
                                        style={dim}
                                        onClick={() => setOrderLines(prev => prev.map((ol, i) => i === globalIdx ? { ...ol, qty: ol.qty + 1 } : ol))}
                                      >+</button>
                                    </div>
                                    {/* Line total */}
                                    <span className="text-[14.5px] w-16 text-right shrink-0" style={dim}>RM {lineTotal.toFixed(2)}</span>
                                    {/* Remove */}
                                    <button
                                      className="shrink-0 text-[14.5px] leading-none ml-1"
                                      style={{ color: "hsl(var(--red))" }}
                                      onClick={() => setOrderLines(prev => prev.filter((_, i) => i !== globalIdx))}
                                    >×</button>
                                  </div>
                                );
                              })}

                              {/* Subtotal */}
                              <div className="flex justify-between mt-1.5">
                                <span className="text-[14.5px] tracking-wider uppercase" style={dim}>
                                  {grpLines.reduce((s, l) => s + l.qty, 0)} orders
                                </span>
                                <span className="text-[14.5px] font-medium" style={{ color: "hsl(var(--foreground))" }}>RM {subtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Grand total */}
                        <div className="pt-3 mt-2 border-t" style={{ borderColor: border }}>
                          <div className="flex justify-between">
                            <span className="text-[14.5px] tracking-wider uppercase" style={dim}>
                              {orderLines.length} {orderLines.length === 1 ? "item" : "items"} · {grandUnits} units{multi ? ` · ${supplierNames.length} suppliers` : ""}
                            </span>
                            <span className="text-[14.5px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>RM {grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {orderLines.length === 0 && (
              <p className="text-[14.5px]" style={dim}>No items added yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
