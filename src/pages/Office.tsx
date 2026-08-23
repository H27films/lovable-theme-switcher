import React, { useState, useRef, useEffect } from "react";
import { X, Search, ChevronDown, ChevronUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import ImportPanel from "@/components/office/ImportPanel";
import ExportPanel from "@/components/office/ExportPanel";

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
  "PAR": number | null;
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

interface OfficeProps {
  onBack?: () => void;
  onBackToMain?: () => void;
  products?: OfficeProduct[];
}

const hdrStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: "#000000", textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const allDataHdrStyle: React.CSSProperties = {
  fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: "hsl(var(--foreground))",
};

const allDataHeaderStyle: React.CSSProperties = {
  ...hdrStyle,
  textTransform: "capitalize",
};

const Office = ({ onBack, onBackToMain, products = [] }: OfficeProps) => {
  const navigate = useNavigate();
  // ── IMPORT PANEL STATE ────────────────────────────────────
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showSalesPanel, setShowSalesPanel] = useState(false);
  const [salesData, setSalesData] = useState<{ Branch: string; Date: string; "Total GST": number }[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesMonthFilter, setSalesMonthFilter] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [salesYearFilter, setSalesYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [salesViewMode, setSalesViewMode] = useState<"week" | "day">("week");
  // Reset to week view when "All" months is selected
  React.useEffect(() => {
    if (salesMonthFilter === "all") setSalesViewMode("week");
  }, [salesMonthFilter]);
  const [tappedBar, setTappedBar] = useState<{ branchKey: string; label: string; total: number } | null>(null);
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [salesYearDropdownOpen, setSalesYearDropdownOpen] = useState(false);
  // ── EXPORT PANEL STATE ────────────────────────────────────
  const [showExportPanel, setShowExportPanel] = useState(false);

  // ── Selected product (detail view; opened by tapping a Recent/GRN entry) ──
  const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);

  const BRANCH_NAME = "OFFICE";

  // ── Local products (synced from prop, refreshed after order) ─
  const [localProducts, setLocalProducts] = useState<OfficeProduct[]>(products);
  useEffect(() => { setLocalProducts(products ?? []); }, [products]);

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

  // Standalone route: no products prop provided → load them here
  useEffect(() => {
    if (!products || products.length === 0) refreshLocalProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const sorted = (data || []).sort((a, b) => {
          if (a.DATE !== b.DATE) return a.DATE > b.DATE ? -1 : 1;
          const aOff = a.BRANCH === "Office" ? 1 : 0;
          const bOff = b.BRANCH === "Office" ? 1 : 0;
          return aOff - bOff; // Branch orders first, Office last within same date
        });
        setLogRows(sorted);
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
       .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"].trim())
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
       .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"].trim())
       .order("DATE", { ascending: false }).limit(30);
     setProductLog(data || []);
  };

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

  // Month navigation (chevrons on SALES header)
  const navigateMonth = (dir: 1 | -1) => {
    let m = salesMonthFilter === "all" ? (dir === -1 ? 13 : 0) : parseInt(salesMonthFilter);
    let y = parseInt(salesYearFilter);
    m += dir;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1)  { m = 12; y -= 1; }
    setSalesYearFilter(String(y));
    setSalesMonthFilter(String(m).padStart(2, '0'));
  };

  // Custom bar shape: half-circle top, straight bottom
  const makeRoundedBar = (baseColor: string, highlightColor: string, isDay: boolean) =>
    (props: any) => {
      const { x, y, width, height } = props;
      const value = props.value ?? props.total ?? 0;
      if (!width || height == null || height <= 0) return null;
      const fill = isDay && value > 5000 ? highlightColor : baseColor;
      const r = Math.min(width / 2, height);
      const d = `M ${x},${y + height} L ${x},${y + r} A ${r},${r} 0 0 1 ${x + width},${y + r} L ${x + width},${y + height} Z`;
      return <path d={d} fill={fill} cursor="pointer" />;
    };

  // ─── SALES HELPERS ───────────────────────────────────────────────
  const BRANCHES = [
    { key: "Boudoir", color: "#9CA998", highlight: "#7BC47A" },
    { key: "Chic Nailspa", color: "#707F84", highlight: "#5BA3B5" },
    { key: "Nur Yadi", color: "#CAB99E", highlight: "#E09660" },
  ];

  const fetchSales = React.useCallback(async () => {
    setSalesLoading(true);
    try {
      // Paginate to get all rows (Supabase default cap is 1000)
      let allSales: any[] = [];
      let salesFrom = 0;
      const salesPageSize = 1000;
      while (true) {
        const { data: pageData } = await (supabase as any)
          .from("Cash").select("*")
          .order("Date", { ascending: true })
          .range(salesFrom, salesFrom + salesPageSize - 1);
        if (!pageData || pageData.length === 0) break;
        allSales = allSales.concat(pageData);
        if (pageData.length < salesPageSize) break;
        salesFrom += salesPageSize;
      }
      setSalesData(allSales);
    } catch {}
    setSalesLoading(false);
  }, []);

  React.useEffect(() => {
    if (showSalesPanel) fetchSales();
  }, [showSalesPanel, fetchSales]);

  const salesYears = React.useMemo(() => {
    const set = new Set<string>();
    salesData.forEach(r => { if (r.Date) set.add(r.Date.slice(0, 4)); });
    return Array.from(set).sort();
  }, [salesData]);

  const salesMonths = React.useMemo(() => {
    const set = new Set<string>();
    salesData.forEach(r => { if (r.Date && r.Date.slice(0, 4) === salesYearFilter) set.add(r.Date.slice(5, 7)); });
    return Array.from(set).sort();
  }, [salesData, salesYearFilter]);

  const monthName = (mm: string) => {
    return new Date(2000, Number(mm) - 1, 1).toLocaleString("default", { month: "long" });
  };

  const monthNameShort = (mm: string) => {
    return new Date(2000, Number(mm) - 1, 1).toLocaleString("default", { month: "short" });
  };

  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return mon;
  };

  const buildWeeklyData = (branch: string) => {
    const filtered = salesData.filter(r => {
      if (r.Branch !== branch) return false;
      const prefix = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
      if (!r.Date?.startsWith(prefix)) return false;
      return true;
    });
    // Group into fixed date bands: 1-7, 8-14, 15-21, 22-end
    const bandMap: Record<string, { total: number; sortKey: string }> = {};
    filtered.forEach(r => {
      const d = new Date(r.Date + "T00:00:00");
      const day = d.getDate();
      const bandStart = day <= 7 ? 1 : day <= 14 ? 8 : day <= 21 ? 15 : 22;
      const startDate = new Date(d.getFullYear(), d.getMonth(), bandStart);
      const label = startDate.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      const sortKey = r.Date.slice(0, 7) + "-" + String(bandStart).padStart(2, "0");
      if (!bandMap[label]) bandMap[label] = { total: 0, sortKey };
      bandMap[label].total += Number(r["Total GST"]) || 0;
    });
    return Object.entries(bandMap)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([week, { total }]) => ({ week, total }));
  };

  const buildDailyData = (branch: string) => {
    const prefix = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
    const filtered = salesData.filter(r => r.Branch === branch && r.Date?.startsWith(prefix));
    const dayMap: Record<string, { total: number; sortKey: string }> = {};
    filtered.forEach(r => {
      const d = new Date(r.Date + "T00:00:00");
      const label = d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      if (!dayMap[label]) dayMap[label] = { total: 0, sortKey: r.Date };
      dayMap[label].total += Number(r["Total GST"]) || 0;
    });
    return Object.entries(dayMap)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([day, { total }]) => ({ week: day, total }));
  };

  const salesGrandTotal = (branch: string) => {
    return salesData
      .filter(r => { const p = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`; return r.Branch === branch && (r.Date?.startsWith(p) ?? false); })
      .reduce((s, r) => s + (Number(r["Total GST"]) || 0), 0);
  };
  // ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      height: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))",
      fontFamily: "'Raleway', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

            {/* ── TOP AREA ── */}
            <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", flexShrink: 0 }}>

{/* Branch name header row */}
<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
  <button
    onClick={() => {
      if (selectedProduct) {
        setSelectedProduct(null); setUsageOpen(false);
      } else {
        navigate("/simple/branches/admin");
      }
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
</div>

        {/* ── Icon tab bar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "20px",
          borderBottom: "0.5px solid hsl(var(--border))",
          paddingBottom: "12px", marginBottom: "8px",
        }}>

          {/* Order */}
          <button
            onClick={() => navigate("/simple/order", { state: { from: "office" } })}
            title="Order"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", gap: "5px", opacity: 0.7, transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span style={{ fontSize: "11px", fontWeight: 400, fontFamily: "Raleway, inherit", letterSpacing: "0.08em", textTransform: "uppercase" }}>Order</span>
          </button>

          {/* Sales */}
          <button
            onClick={() => setShowSalesPanel(true)}
            title="Sales"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", gap: "5px", opacity: 0.7, transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span style={{ fontSize: "11px", fontWeight: 400, fontFamily: "Raleway, inherit", letterSpacing: "0.08em", textTransform: "uppercase" }}>Sales</span>
          </button>

          {/* Import */}
          <button
            onClick={() => setShowImportPanel(true)}
            title="Import"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", gap: "5px", opacity: 0.7, transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ fontSize: "11px", fontWeight: 400, fontFamily: "Raleway, inherit", letterSpacing: "0.08em", textTransform: "uppercase" }}>Import</span>
          </button>

          {/* Export */}
          <button
            onClick={() => setShowExportPanel(true)}
            title="Export"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", gap: "5px", opacity: 0.7, transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span style={{ fontSize: "11px", fontWeight: 400, fontFamily: "Raleway, inherit", letterSpacing: "0.08em", textTransform: "uppercase" }}>Export</span>
          </button>

          {/* Search — icon only, next to Export */}
          <button
            onClick={() => navigate("/simple/search", { state: { from: "office" } })}
            title="Search"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", opacity: 0.7, transition: "opacity 0.2s" }}
          >
            <Search size={14} />
          </button>

        </div>
        </div> 
        
      {/* ── MIDDLE SCROLLABLE ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px" }}>

        {/* ══ SEARCH + RECENT ══════════════════════════════════════ */}
        <>

            

            {/* Product detail */}
            {selectedProduct && (
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
                <div style={{ borderTop: "0.5px solid #d8d0c8", paddingTop: "16px", paddingBottom: "24px" }}>
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

            {/* Recent section */}
            {!selectedProduct && (
              <div style={{ paddingTop: "2px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                 <div style={{
                   position: "sticky",
                   top: 0,
                   background: "hsl(var(--background))",
                   zIndex: 10,
                   display: "flex",
                   flexDirection: "column",
                   width: "100%",
                 }}>
                   <div style={{ fontSize: "16px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "12px" }}>
                     All Data
                   </div>
                   <div style={{ 
                     display: "grid", 
                     gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px", 
                     gap: "6px", 
                     paddingBottom: "8px", 
                     borderBottom: "0.5px solid hsl(var(--border))",
                     width: "100%",
                   }}>
                    <div style={{ ...allDataHeaderStyle }}>Date</div>
                    <div style={{ ...allDataHeaderStyle }}>GRN</div>
                    <div style={{ ...allDataHeaderStyle }}>Supplier</div>
                    <div style={{ ...allDataHeaderStyle, textAlign: "center" }}>Items</div>
                    <div style={{ ...allDataHeaderStyle, textAlign: "center", visibility: expandedGRNs.size > 0 ? "visible" : "hidden" }}>Bal</div>
                    <div />
                   </div>
                 </div>
                  {loadingLog && <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading...</div>}
                  {!loadingLog && grnGroups.length === 0 && <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>}
                  {!loadingLog && grnGroups.map(group => {
                    const isOpen = expandedGRNs.has(group.grn);
                    const isOfficeGRN = group.grn.startsWith("OFFICE");
                    const groupTotal = isOfficeGRN && isOpen
                      ? group.rows.reduce((sum, row) => {
                          const mp = localProducts.find(lp => lp["PRODUCT NAME"] === row["PRODUCT NAME"]);
                          return sum + (mp ? Number(mp["SUPPLIER PRICE"] ?? 0) * Math.abs(row.QTY ?? 0) : 0);
                        }, 0)
                      : null;
                    return (
                      <div key={group.grn}>
                        <div
                          onClick={() => toggleGRN(group.grn)}
                          style={{ display: "grid", gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px", gap: "6px", padding: "9px 0", borderBottom: isOpen ? "none" : "0.5px solid hsl(var(--border) / 0.4)", cursor: "pointer", alignItems: "center" }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{fmtDate(group.date)}</div>
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>{group.grn}</div>
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {group.supplier}{groupTotal !== null ? ` — RM ${groupTotal.toFixed(2)}` : ""}
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{group.rows.length}</div>
                          <div />
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))" }}>
                            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </div>
                        </div>
                        {isOpen && (
                          <div style={{ paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border) / 0.4)" }}>
                            {group.rows.map((row, idx) => {
                              const matchedProduct = localProducts.find(lp => lp["PRODUCT NAME"] === row["PRODUCT NAME"]);
                              const lineTotal = isOfficeGRN && matchedProduct
                                ? (Number(matchedProduct["SUPPLIER PRICE"] ?? 0) * Math.abs(row.QTY ?? 0))
                                : null;
                              return (
                                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px", gap: "6px", padding: "5px 0", borderTop: idx > 0 ? "0.5px solid hsl(var(--border) / 0.25)" : "none", alignItems: "center" }}>
                                  <div style={{ visibility: "hidden", fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit" }}>{fmtDate(group.date)}</div>
                                  <div
                                    onClick={(e) => { e.stopPropagation(); if (matchedProduct) setSelectedProduct(matchedProduct); }}
                                    style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", gridColumn: isOfficeGRN ? undefined : "2 / 4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: matchedProduct ? "pointer" : "default", textDecoration: "none" }}
                                  >{row["PRODUCT NAME"]}</div>
                                  {isOfficeGRN && (
                                    <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {lineTotal !== null && lineTotal > 0 ? `RM ${lineTotal.toFixed(2)}` : "—"}
                                    </div>
                                  )}
                                  <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>
                                    {(row.BRANCH || "").toLowerCase() === "office" ? `+${Math.abs(row.QTY)}` : `-${Math.abs(row.QTY)}`}
                                  </div>
                                  <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{row["OFFICE BALANCE"] ?? "—"}</div>
                                  <div />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </>
      </div>

        {/* ══ SALES PANEL OVERLAY ══════════════════════════════════ */}
        {showSalesPanel && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "hsl(var(--background))", zIndex: 100,
            display: "flex", flexDirection: "column",
            fontFamily: "Raleway, inherit",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0 20px" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => setShowSalesPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginRight: "16px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
                </button>
                <span style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))" }}>SALES</span>
              </div>
              {/* Month navigation chevrons */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  onClick={() => navigateMonth(-1)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", color: "hsl(var(--foreground))", opacity: 0.7, lineHeight: 1 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", color: "hsl(var(--foreground))", opacity: 0.7, lineHeight: 1 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            {/* Month + Year filter + View toggle */}
            <div style={{ padding: "14px 20px 10px 20px", display: "flex", alignItems: "center", gap: "6px" }}>

              {/* Month dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => { setSalesDropdownOpen(v => !v); setSalesYearDropdownOpen(false); }}
                  style={{
                    background: "transparent", border: "none", padding: "0",
                    fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit",
                    cursor: "pointer", color: "hsl(var(--foreground))",
                    display: "flex", alignItems: "center", gap: "5px", letterSpacing: "0.04em",
                  }}
                >
                  {salesMonthFilter === "all" ? "All" : monthName(salesMonthFilter)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                    {salesDropdownOpen ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
                  </svg>
                </button>
                {salesDropdownOpen && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0,
                    background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))",
                    borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    zIndex: 100, minWidth: "140px", overflow: "hidden", marginTop: "6px",
                  }}>
                    {["all", ...salesMonths].map(m => (
                      <div
                        key={m}
                        onClick={() => { setSalesMonthFilter(m); setSalesDropdownOpen(false); if (m !== "all") {} }}
                        style={{
                          padding: "9px 16px", fontSize: "11px", fontFamily: "Raleway, inherit",
                          fontWeight: salesMonthFilter === m ? 500 : 300,
                          cursor: "pointer",
                          color: salesMonthFilter === m ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                          background: salesMonthFilter === m ? "hsl(var(--muted) / 0.4)" : "transparent",
                        }}
                      >
                        {m === "all" ? "All" : monthName(m)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Year dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => { setSalesYearDropdownOpen(v => !v); setSalesDropdownOpen(false); }}
                  style={{
                    background: "transparent", border: "none", padding: "0",
                    fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit",
                    cursor: "pointer", color: "hsl(var(--muted-foreground))",
                    display: "flex", alignItems: "center", gap: "5px", letterSpacing: "0.04em",
                  }}
                >
                  {salesYearFilter}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                    {salesYearDropdownOpen ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
                  </svg>
                </button>
                {salesYearDropdownOpen && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0,
                    background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))",
                    borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    zIndex: 100, minWidth: "100px", overflow: "hidden", marginTop: "6px",
                  }}>
                    {salesYears.map(y => (
                      <div
                        key={y}
                        onClick={() => { setSalesYearFilter(y); setSalesYearDropdownOpen(false); setSalesMonthFilter("all"); }}
                        style={{
                          padding: "9px 16px", fontSize: "11px", fontFamily: "Raleway, inherit",
                          fontWeight: salesYearFilter === y ? 500 : 300,
                          cursor: "pointer",
                          color: salesYearFilter === y ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                          background: salesYearFilter === y ? "hsl(var(--muted) / 0.4)" : "transparent",
                        }}
                      >
                        {y}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Week / Day toggle — only when a specific month is selected */}
              {salesMonthFilter !== "all" && (
                <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "0.5px solid hsl(var(--border))" }}>
                  {(["week", "day"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSalesViewMode(mode)}
                      style={{
                        background: salesViewMode === mode ? "hsl(var(--foreground))" : "transparent",
                        color: salesViewMode === mode ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                        border: "none", padding: "5px 12px",
                        fontSize: "10px", fontWeight: 400, fontFamily: "Raleway, inherit",
                        letterSpacing: "0.06em", cursor: "pointer", textTransform: "uppercase",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      {mode === "week" ? "Week" : "Day"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Charts */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px 20px" }} onClick={() => setTappedBar(null)}>
              {salesLoading && (
                <div style={{ textAlign: "center", padding: "40px", fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))" }}>Loading...</div>
              )}
              {!salesLoading && BRANCHES.map(({ key, color, highlight }) => {
                const data = salesViewMode === "week" ? buildWeeklyData(key) : buildDailyData(key);
                const total = salesGrandTotal(key);
                return (
                  <div key={key} style={{ marginBottom: "20px", background: "#F2EDE6", borderRadius: "18px", padding: "16px 16px 8px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "#2a2a2a" }}>
                        {({ "Boudoir": "BOUDOIR", "Chic Nailspa": "CHIC NAILSPA", "Nur Yadi": "NUR YADI" } as Record<string,string>)[key] ?? key.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 300, color: "#2a2a2a", fontFamily: "Raleway, inherit" }}>
                        RM {total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {data.length === 0 ? (
                      <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300, padding: "12px 0" }}>No data</div>
                    ) : (() => {
                      // Day view: fixed 0-10k; Week view: dynamic 5k increments
                      let topTick: number;
                      let yTicks: number[];
                      if (salesViewMode === "day") {
                        topTick = 10000;
                        yTicks = [0, 5000, 10000];
                      } else {
                        const maxVal = data.reduce((m: number, d: any) => Math.max(m, d.total || d.value || 0), 0);
                        topTick = Math.ceil(Math.max(maxVal, 5000) / 5000) * 5000;
                        yTicks = Array.from({ length: topTick / 5000 + 1 }, (_, i) => i * 5000);
                      }
                      const prefix2 = salesMonthFilter === "all" ? salesYearFilter : `${salesYearFilter}-${salesMonthFilter}`;
                      const filtered2 = salesData.filter(r => r.Branch === key && r.Date?.startsWith(prefix2));
                      let weeklyAvg: number | null = null;
                      if (filtered2.length >= 2) {
                        const dates2 = filtered2.map(r => new Date(r.Date).getTime());
                        const days2 = Math.max(1, Math.round((Math.max(...dates2) - Math.min(...dates2)) / 86400000) + 1);
                        const sum2 = filtered2.reduce((s, r) => s + (parseFloat(r["Total GST"] as any) || 0), 0);
                        weeklyAvg = sum2 / days2 * 7;
                      }
                      return (
                        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                          {tappedBar?.branchKey === key && (
                            <div style={{
                              position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)",
                              zIndex: 10, background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.18)",
                              borderRadius: "8px", padding: "5px 12px", display: "flex", flexDirection: "column",
                              alignItems: "center", gap: "1px", boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                              pointerEvents: "none",
                            }}>
                              <span style={{ fontSize: "10px", fontWeight: 300, color: "#aaa", letterSpacing: "0.04em", fontFamily: "Raleway, inherit" }}>{tappedBar.label}</span>
                              <span style={{ fontSize: "13px", fontWeight: 500, color: "#fff", fontFamily: "Raleway, inherit" }}>RM {tappedBar.total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={data} barCategoryGap="25%" margin={{ top: 4, right: 4, left: 16, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#e8e8e8" strokeWidth={0.8} />
                            <XAxis
                              dataKey="week"
                              tick={{ fontSize: 10, fontFamily: "Raleway, inherit", fontWeight: 300, fill: "#888" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              ticks={yTicks}
                              domain={[0, topTick]}
                              interval={0}
                              tick={{ fontSize: 10, fontFamily: "Raleway, inherit", fontWeight: 300, fill: "#888" }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`}
                              width={36}
                            />
                            <Bar
                              dataKey="total"
                              isAnimationActive={false}
                              maxBarSize={40}
                              cursor="pointer"
                              shape={makeRoundedBar(color, highlight, salesViewMode === "day")}
                              onClick={(barData: any) => {
                                if (tappedBar?.branchKey === key && tappedBar?.label === barData.week) {
                                  setTappedBar(null);
                                } else {
                                  setTappedBar({ branchKey: key, label: barData.week, total: barData.total });
                                }
                              }}
                            />
                            {weeklyAvg !== null && (
                              <ReferenceLine y={weeklyAvg} stroke="#888" strokeDasharray="4 3" strokeWidth={1} />
                            )}
                          </BarChart>
                        </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {/* ── Combined grand total ─────────────────────── */}
              <div style={{ textAlign: "right", paddingTop: "8px", borderTop: "0.5px solid #d8d0c8" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#2a2a2a", fontFamily: "Raleway, inherit", letterSpacing: "0.02em" }}>
                  Total: RM {BRANCHES.reduce((sum, b) => sum + salesGrandTotal(b.key), 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ═ IMPORT PANEL ══════════════════════════════ */}
        {showImportPanel && (
          <ImportPanel
            onClose={() => setShowImportPanel(false)}
            onProductsUpdated={refreshLocalProducts}
          />
        )}

        {/* ═ EXPORT PANEL ══════════════════════════════ */}
        {showExportPanel && <ExportPanel onClose={() => setShowExportPanel(false)} />}

    </div>
  );
};

export default Office;