import React, { useState, useEffect, useCallback, useRef } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Plus, X, ChevronLeft, ChevronRight, Search, ChevronDown, FileText, Download, Home, Lock, Star } from "lucide-react";
import jsPDF from "jspdf";

interface AllFileProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "STAFF PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "CHIC NAILSPA BALANCE": number;
  "NUR YADI BALANCE": number;
  "CHIC NAILSPA BALANCE": number;
  "OFFICE BALANCE": number;
  "PAR": number | null;
  "UNITS/ORDER": number | null;
  "COLOUR": boolean | null;
  "OFFICE SECTION": string | null;
  "CHIC NAILSPA FAVOURITE": boolean | null;
}

interface LogRow {
  id: number;
  DATE: string;
  "PRODUCT NAME": string;
  BRANCH: string;
  SUPPLIER: string | null;
  TYPE: string;
  "STARTING BALANCE": number;
  QTY: number;
  "ENDING BALANCE": number;
  GRN?: string | null;
  "OFFICE BALANCE"?: number | null;
}

interface EntryLine {
  id: number;
  productName: string;
  type: string;
  qty: number;
  showProductDropdown: boolean;
  showTypeDropdown: boolean;
  productSearch: string;
}

interface OrderLine {
  id: number;
  productName: string;
  qty: number;
  showProductDropdown: boolean;
  productSearch: string;
}

const TYPES = ["Salon Use", "Customer", "Staff"];

const makeEntries = (): EntryLine[] => [1].map(id => ({
  id, productName: "", type: "Salon Use", qty: 1,
  showProductDropdown: false, showTypeDropdown: false, productSearch: "",
}));

const makeOrderEntries = (): OrderLine[] => [1].map(id => ({
  id, productName: "", qty: 1, showProductDropdown: false, productSearch: "",
}));

function ProductDropdown({ entry, sortedProducts, onSelect, onSearch, onToggle, onClose, showBalance, lineStyle }: {
  entry: { productName: string; showProductDropdown: boolean; productSearch: string };
  sortedProducts: AllFileProduct[];
  onSelect: (name: string) => void;
  onSearch: (val: string) => void;
  onToggle: () => void;
  onClose: () => void;
  showBalance?: boolean;
  lineStyle?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const border = "hsl(var(--border))";
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";
  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  const filtered = (entry.productSearch
    ? sortedProducts.filter(p => p["PRODUCT NAME"].toLowerCase().includes(entry.productSearch.toLowerCase()))
    : sortedProducts
  ).slice().sort((a, b) => {
    const af = (a as any)["CHIC NAILSPA FAVOURITE"] ? 0 : 1;
    const bf = (b as any)["CHIC NAILSPA FAVOURITE"] ? 0 : 1;
    if (af !== bf) return af - bf;
    const isColourA = (a as any)["COLOUR"] === true || (a as any)["COLOUR"] === "YES" || (a as any)["COLOUR"] === "yes" ? 1 : 0;
    const isColourB = (b as any)["COLOUR"] === true || (b as any)["COLOUR"] === "YES" || (b as any)["COLOUR"] === "yes" ? 1 : 0;
    if (isColourA !== isColourB) return isColourA - isColourB;
    return a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]);
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (entry.showProductDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [entry.showProductDropdown, onClose]);

  // Reset active index when filtered list changes
  useEffect(() => { setActiveIndex(-1); }, [entry.productSearch]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item]");
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!entry.showProductDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? filtered[activeIndex] : filtered[0];
      if (target) { onSelect(target["PRODUCT NAME"]); setActiveIndex(-1); }
    } else if (e.key === "Escape") {
      onClose();
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={ref} className={lineStyle ? "relative w-full" : "relative flex-1 max-w-[460px]"}>
      <div
        className={lineStyle ? "flex items-center justify-between px-0 cursor-pointer h-[40px] w-full" : "flex items-center justify-between px-3 py-2 cursor-pointer h-[34px]"}
        style={lineStyle ? {} : { background: cardBg, border: `1px solid ${borderActive}` }}
        onClick={onToggle}
      >
        <span className="text-[13px] font-light" style={{ color: "hsl(var(--foreground))" }}>
          {entry.productName || "Select product..."}
        </span>
        <ChevronDown size={12} style={dim} />
      </div>

      {entry.showProductDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-[200] border"
          style={{ background: "hsl(var(--card))", borderColor: borderActive, marginTop: "2px" }}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: border }}>
            <Search size={11} style={dim} />
            <input
              autoFocus
              type="text"
              className="flex-1 bg-transparent outline-none text-[13px] font-light"
              placeholder="Type to filter..."
              value={entry.productSearch}
              onChange={e => onSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div ref={listRef} className="max-h-[200px] overflow-y-auto scrollbar-thin">
            {filtered.map((p, i) => (
              <div
                key={p["PRODUCT NAME"]}
                data-item
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors"
                style={{
                  borderBottom: `1px solid ${border}`,
                  background: i === activeIndex ? "hsl(var(--muted))" : "hsl(var(--card))",
                }}
                onMouseDown={() => { onSelect(p["PRODUCT NAME"]); setActiveIndex(-1); }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="flex items-center gap-1.5">
                  {(p as any)["CHIC NAILSPA FAVOURITE"] && <Star size={10} style={{ fill: "hsl(var(--foreground))", color: "hsl(var(--foreground))" }} />}
                  <span className="text-[13px] font-light">{p["PRODUCT NAME"]}</span>
                </div>
                {showBalance && <span className="text-[11px]" style={{ color: "hsl(var(--foreground))" }}>{p["CHIC NAILSPA BALANCE"]}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TypeDropdown({ entry, onSelect, onToggle, onClose, lineStyle }: {
  entry: EntryLine;
  onSelect: (type: string) => void;
  onToggle: () => void;
  onClose: () => void;
  lineStyle?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const borderActive = "hsl(var(--border-active))";
  const border = "hsl(var(--border))";
  const cardBg = "hsl(var(--card))";
  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (entry.showTypeDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [entry.showTypeDropdown, onClose]);

  // Reset when closed
  useEffect(() => { if (!entry.showTypeDropdown) setActiveIndex(-1); }, [entry.showTypeDropdown]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!entry.showTypeDropdown) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % TYPES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? TYPES.length - 1 : i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const target = activeIndex >= 0 ? TYPES[activeIndex] : TYPES[0];
      onSelect(target);
      setActiveIndex(-1);
    } else if (e.key === "Escape") {
      onClose();
      setActiveIndex(-1);
    }
  };

  return (
    <div
      ref={ref}
      className={lineStyle ? "relative w-full" : "relative flex-shrink-0"}
      style={lineStyle ? {} : { width: "150px" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className={lineStyle ? "flex items-center justify-between px-0 cursor-pointer h-[28px] w-full" : "flex items-center justify-between px-2 py-2 cursor-pointer h-[34px]"}
        style={lineStyle ? {} : { background: cardBg, border: `1px solid ${borderActive}` }}
        onClick={onToggle}
      >
        <span className="text-[11px] font-light">{entry.type}</span>
        <ChevronDown size={11} style={dim} />
      </div>
      {entry.showTypeDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-[200] border"
          style={{ background: "hsl(var(--card))", borderColor: borderActive, marginTop: "2px" }}
        >
          {TYPES.map((t, i) => (
            <div
              key={t}
              className="px-3 py-2 text-[11px] font-light cursor-pointer transition-colors"
              style={{
                borderBottom: `1px solid ${border}`,
                background: i === activeIndex ? "hsl(var(--muted))" : "hsl(var(--card))",
              }}
              onMouseDown={() => { onSelect(t); setActiveIndex(-1); }}
              onMouseEnter={() => setActiveIndex(i)}
            >{t}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function DatePicker({ value, onChange }: {
  value: "today" | "yesterday" | "tomorrow";
  onChange: (v: "today" | "yesterday" | "tomorrow") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";
  const border = "hsl(var(--border))";
  const OPTIONS: { value: "today" | "yesterday" | "tomorrow"; label: string }[] = [
    { value: "yesterday", label: "Yesterday" },
    { value: "today", label: "Today" },
    { value: "tomorrow", label: "Tomorrow" },
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 h-[28px] px-3 text-[11px] tracking-wider uppercase transition-colors"
        style={{ border: `1px solid ${borderActive}`, background: cardBg, color: "hsl(var(--foreground))", borderRadius: "5px" }}
      >
        {OPTIONS.find(o => o.value === value)?.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className="absolute top-full right-0 z-50 border mt-0.5"
          style={{ background: "hsl(var(--card))", borderColor: borderActive, minWidth: "110px", borderRadius: "5px", zIndex: 200 }}
        >
          {OPTIONS.map(opt => (
            <div
              key={opt.value}
              className="px-3 py-2 text-[11px] tracking-wider uppercase cursor-pointer transition-colors"
              style={{
                borderBottom: `1px solid ${border}`,
                color: "hsl(var(--foreground))",
                background: value === opt.value ? cardBg : "transparent",
              }}
              onMouseDown={() => { onChange(opt.value); setOpen(false); }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
              onMouseLeave={e => (e.currentTarget.style.color = value === opt.value ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))")}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StockChicNailspaPhoneInner() {
  const navigate = useNavigate();
  const { theme, toggle, font, cycleFont } = useTheme();

  const [mode, setMode] = useState<"usage" | "order" | "summary">("usage");

  const [products, setProducts] = useState<AllFileProduct[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [entries, setEntries] = useState<EntryLine[]>(makeEntries());
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [orderEntries, setOrderEntries] = useState<OrderLine[]>(makeOrderEntries());
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [reversing, setReversing] = useState<number | null>(null);
  const [showOrderSummaryPanel, setShowOrderSummaryPanel] = useState(false);
  const [grnNotes, setGrnNotes] = useState("");
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());
  const [expandedActivityDates, setExpandedActivityDates] = useState<Set<string>>(new Set());
  const [expandedOrderDates, setExpandedOrderDates] = useState<Set<string>>(new Set());
  const [editingOrderRow, setEditingOrderRow] = useState<number | null>(null);
  const [editingOrderQty, setEditingOrderQty] = useState<string>("");
  const [savingOrderEdit, setSavingOrderEdit] = useState<number | null>(null);
  const [activityRange, setActivityRange] = useState<"14" | "all">("14");
  const [dateSortAsc, setDateSortAsc] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{ grn: string; date: string; entries: { productName: string; starting: number; qty: number; ending: number }[] } | null>(null);
  const [orderConfirming, setOrderConfirming] = useState(false);
  const [orderConfirmMode] = useState(() => localStorage.getItem("orderConfirmation") !== "false");
  const [editingPendingIdx, setEditingPendingIdx] = useState<number | null>(null);
  const [editingPendingQty, setEditingPendingQty] = useState("");

  const [stockSearch, setStockSearch] = useState("");

  // ── Page entrance animation ──
  const [mounted, setMounted] = useState(false);
  const [scrollDir, setScrollDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Scroll direction blur effect
  useEffect(() => {
    let lastY = window.scrollY;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      const y = window.scrollY;
      setScrollDir(y > lastY ? "down" : "up");
      lastY = y;
      clearTimeout(timer);
      timer = setTimeout(() => setScrollDir(null), 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(timer); };
  }, []);
  const fade = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
  });
  const [selectedProduct, setSelectedProduct] = useState<AllFileProduct | null>(null);
  const [selectedActivityProduct, setSelectedActivityProduct] = useState<string | null>(null);
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [stockActiveIndex, setStockActiveIndex] = useState(-1);
  const [stockSearchHovered, setStockSearchHovered] = useState(false);
  const [stockSearchFocused, setStockSearchFocused] = useState(false);
  const stockListRef = useRef<HTMLDivElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const activityDetailRef = useRef<HTMLDivElement>(null);
  const stockSearchExpanded = stockSearchHovered || stockSearchFocused || stockSearch.length > 0;

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (selectedActivityProduct && activityDetailRef.current) {
      setTimeout(() => {
        activityDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [selectedActivityProduct]);
  const [usageDate, setUsageDate] = useState<"today" | "yesterday" | "tomorrow">("today");
  const [orderDate, setOrderDate] = useState<"today" | "yesterday" | "tomorrow">("today");

  const getDateStr = (rel: "today" | "yesterday" | "tomorrow") => {
    const d = new Date();
    if (rel === "yesterday") d.setDate(d.getDate() - 1);
    if (rel === "tomorrow") d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const fetchProducts = useCallback(async () => {
    try {
      let allData: AllFileProduct[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("AllFileProducts")
          .select("*")
          .range(from, from + 999);
        if (error) { console.error("Fetch products error:", error); break; }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < 1000) break;
        from += 1000;
      }
      // Deduplicate by PRODUCT NAME (all rows for same product have identical balances)
      const seen = new Set<string>();
      const unique = allData.filter(p => {
        if (seen.has(p["PRODUCT NAME"])) return false;
        seen.add(p["PRODUCT NAME"]);
        return true;
      });
      setProducts(unique);
    } catch (err) { console.error("Error fetching products:", err); }
  }, []);

  const fetchLog = useCallback(async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 60);
      const { data, error } = await (supabase as any)
        .from("AllFileLog")
        .select("*")
        .eq("BRANCH", "Chic Nailspa")
        .gte("DATE", cutoff.toISOString().split("T")[0])
        .order("DATE", { ascending: false });
      if (error) console.error("Fetch log error:", error);
      if (data) {
        const orderRequests = data.filter((r: LogRow) => r.TYPE === "Order Request");
        const regularLog = data.filter((r: LogRow) => r.TYPE !== "Order Request");
        setLog(regularLog.sort((a: LogRow, b: LogRow) => b.DATE.localeCompare(a.DATE) || b.id - a.id));
        if (orderRequests.length > 0) {
          const req = orderRequests[0];
          setPendingOrder({
            grn: req.GRN || "",
            date: req.DATE,
            entries: orderRequests.map((r: LogRow) => ({
              productName: r["PRODUCT NAME"],
              starting: Number(r["STARTING BALANCE"]),
              qty: Number(r.QTY),
              ending: Number(r["ENDING BALANCE"]),
            }))
          });
          setOrderSubmitted(true);
          // Populate orderEntries so inline Order Summary renders on the Order tab
          setOrderEntries(prev => {
            const hasData = prev.some(e => e.productName);
            if (hasData) return prev; // user already has local entries — don't overwrite
            return orderRequests.map((r: LogRow, idx: number) => ({
              id: Date.now() + idx,
              productName: r["PRODUCT NAME"],
              qty: Number(r.QTY),
              showProductDropdown: false,
              productSearch: "",
            }));
          });
        }
      }
    } catch (err) { console.error("Error fetching log:", err); }
  }, []);

  useEffect(() => { fetchProducts(); fetchLog(); }, [fetchProducts, fetchLog]);

  const handleSave = async () => {
    await fetchProducts();
    await fetchLog();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const sortedProducts = [...products].sort((a, b) => {
    const af = a["CHIC NAILSPA FAVOURITE"] ? 0 : 1;
    const bf = b["CHIC NAILSPA FAVOURITE"] ? 0 : 1;
    if (af !== bf) return af - bf;
    const isColourA = a["COLOUR"] === true || (a["COLOUR"] as any) === "YES" || (a["COLOUR"] as any) === "yes" ? 1 : 0;
    const isColourB = b["COLOUR"] === true || (b["COLOUR"] as any) === "YES" || (b["COLOUR"] as any) === "yes" ? 1 : 0;
    if (isColourA !== isColourB) return isColourA - isColourB;
    return a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]);
  });

  const filteredStockProducts = stockSearch.length > 0
    ? sortedProducts.filter(p => p["PRODUCT NAME"].toLowerCase().includes(stockSearch.toLowerCase()))
    : sortedProducts;

  const toggleFavourite = async (product: AllFileProduct) => {
    const newVal = !(product["CHIC NAILSPA FAVOURITE"]);
    await (supabase as any)
      .from("AllFileProducts")
      .update({ "CHIC NAILSPA FAVOURITE": newVal })
      .eq("PRODUCT NAME", product["PRODUCT NAME"]);
    setProducts(prev => prev.map(p =>
      p["PRODUCT NAME"] === product["PRODUCT NAME"]
        ? { ...p, "CHIC NAILSPA FAVOURITE": newVal }
        : p
    ));
    setSelectedProduct(prev => prev ? { ...prev, "CHIC NAILSPA FAVOURITE": newVal } : null);
  };

  const handleSelectProduct = (row: AllFileProduct) => {
    setSelectedProduct(row);
    setStockSearch(row["PRODUCT NAME"]);
    setShowStockDropdown(false);
    setStockActiveIndex(-1);
  };

  // Scroll stock dropdown active item into view
  useEffect(() => {
    if (stockActiveIndex >= 0 && stockListRef.current) {
      const items = stockListRef.current.querySelectorAll("[data-item]");
      items[stockActiveIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [stockActiveIndex]);

  // Reset stock active index when search changes
  useEffect(() => { setStockActiveIndex(-1); }, [stockSearch]);

  const handleStockKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showStockDropdown || filteredStockProducts.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setStockActiveIndex(i => (i + 1) % filteredStockProducts.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setStockActiveIndex(i => (i <= 0 ? filteredStockProducts.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = stockActiveIndex >= 0 ? filteredStockProducts[stockActiveIndex] : filteredStockProducts[0];
      if (target) handleSelectProduct(target);
    } else if (e.key === "Escape") {
      setShowStockDropdown(false);
      setStockActiveIndex(-1);
    }
  };

  // Daily Usage helpers
  const updateEntry = (id: number, fields: Partial<EntryLine>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...fields } : e));
  };

  const closeAllDropdowns = (exceptId?: number, exceptField?: string) => {
    setEntries(prev => prev.map(e => ({
      ...e,
      showProductDropdown: e.id === exceptId && exceptField === "product" ? e.showProductDropdown : false,
      showTypeDropdown: e.id === exceptId && exceptField === "type" ? e.showTypeDropdown : false,
    })));
  };

  const addEntry = () => {
    setEntries(prev => [...prev, {
      id: Date.now(), productName: "", type: "Salon Use", qty: 1,
      showProductDropdown: false, showTypeDropdown: false, productSearch: "",
    }]);
  };

  const removeEntry = (id: number) => setEntries(prev => prev.filter(e => e.id !== id));

  const handleSubmit = async () => {
    const valid = entries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    setUsageError(null);
    setSubmitting(true);
    try {
      for (const entry of valid) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const currentBalance = Number(product?.["CHIC NAILSPA BALANCE"] ?? 0);
        const endingBalance = currentBalance - Number(entry.qty);

        // Log to AllFileLog
        const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": getDateStr(usageDate),
          "PRODUCT NAME": entry.productName,
          "BRANCH": "Chic Nailspa",
          "SUPPLIER": null,
          "TYPE": entry.type,
          "STARTING BALANCE": currentBalance,
          "QTY": -Number(entry.qty),
          "ENDING BALANCE": endingBalance,
          "GRN": null,
          "OFFICE BALANCE": Number(product?.["OFFICE BALANCE"] ?? 0),
        });
        if (logErr) { console.error("AllFileLog insert error:", logErr); setUsageError(logErr.message || "Log write failed — check console"); }

        // Update ALL AllFileProducts rows for this product
        await (supabase as any).from("AllFileProducts")
          .update({ "CHIC NAILSPA BALANCE": endingBalance })
          .eq("PRODUCT NAME", entry.productName);
      }
      await fetchProducts();
      await fetchLog();
      setEntries(makeEntries());
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) { console.error("Submit error:", err); }
    setSubmitting(false);
  };

  // Order helpers
  const updateOrderEntry = (id: number, fields: Partial<OrderLine>) => {
    setOrderEntries(prev => prev.map(e => e.id === id ? { ...e, ...fields } : e));
  };

  const closeAllOrderDropdowns = (exceptId?: number) => {
    setOrderEntries(prev => prev.map(e => ({
      ...e,
      showProductDropdown: e.id === exceptId ? e.showProductDropdown : false,
    })));
  };

  const addOrderEntry = () => {
    setOrderEntries(prev => [...prev, {
      id: Date.now(), productName: "", qty: 1, showProductDropdown: false, productSearch: "",
    }]);
  };

  const removeOrderEntry = (id: number) => setOrderEntries(prev => prev.filter(e => e.id !== id));

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const cutoff14 = new Date();
  cutoff14.setDate(cutoff14.getDate() - 14);
  const cutoff14Str = cutoff14.toISOString().split("T")[0];

  const reverseUsage = async (row: LogRow) => {
    setReversing(row.id);
    try {
      // Restore branch balance (back to starting balance before this entry)
      await (supabase as any).from("AllFileProducts")
        .update({ "CHIC NAILSPA BALANCE": row["STARTING BALANCE"] })
        .eq("PRODUCT NAME", row["PRODUCT NAME"]);
      // Delete from AllFileLog
      await (supabase as any).from("AllFileLog").delete().eq("id", row.id);
      await fetchProducts();
      await fetchLog();
    } catch (err) { console.error("Reverse usage error:", err); }
    setReversing(null);
  };

  const reverseOrder = async (row: LogRow) => {
    setReversing(row.id);
    try {
      // Restore branch balance
      await (supabase as any).from("AllFileProducts")
        .update({ "CHIC NAILSPA BALANCE": row["STARTING BALANCE"] })
        .eq("PRODUCT NAME", row["PRODUCT NAME"]);

      // Restore office balance: the log stores office balance AFTER deduction
      // so to restore: add back the QTY
      if (row["OFFICE BALANCE"] !== null && row["OFFICE BALANCE"] !== undefined) {
        const restoredOfficeBal = Number(row["OFFICE BALANCE"]) + Number(row.QTY);
        await (supabase as any).from("AllFileProducts")
          .update({ "OFFICE BALANCE": restoredOfficeBal })
          .eq("PRODUCT NAME", row["PRODUCT NAME"]);
      }

      // Delete from AllFileLog by id
      await (supabase as any).from("AllFileLog").delete().eq("id", row.id);
      await fetchProducts();
      await fetchLog();
    } catch (err) { console.error("Reverse order error:", err); }
    setReversing(null);
  };

  const handleOrderQtyEdit = async (row: LogRow, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) return;
    setSavingOrderEdit(row.id);
    try {
      const newEndingBalance = row["STARTING BALANCE"] + newQty;
      await (supabase as any).from("AllFileLog")
        .update({ "QTY": newQty, "ENDING BALANCE": newEndingBalance })
        .eq("id", row.id);
      await (supabase as any).from("AllFileProducts")
        .update({ "CHIC NAILSPA BALANCE": newEndingBalance })
        .eq("PRODUCT NAME", row["PRODUCT NAME"]);
      await fetchProducts();
      await fetchLog();
    } catch (err) { console.error("Edit order qty error:", err); }
    setSavingOrderEdit(null);
    setEditingOrderRow(null);
  };

  const handleOrderRowDelete = async (row: LogRow) => {
    setSavingOrderEdit(row.id);
    try {
      // Restore branch balance
      await (supabase as any).from("AllFileProducts")
        .update({ "CHIC NAILSPA BALANCE": row["STARTING BALANCE"] })
        .eq("PRODUCT NAME", row["PRODUCT NAME"]);

      // Restore office balance
      if (row["OFFICE BALANCE"] !== null && row["OFFICE BALANCE"] !== undefined) {
        const restoredOfficeBal = Number(row["OFFICE BALANCE"]) + Number(row.QTY);
        await (supabase as any).from("AllFileProducts")
          .update({ "OFFICE BALANCE": restoredOfficeBal })
          .eq("PRODUCT NAME", row["PRODUCT NAME"]);
      }

      // Delete from AllFileLog
      await (supabase as any).from("AllFileLog").delete().eq("id", row.id);
      await fetchProducts();
      await fetchLog();
    } catch (err) { console.error("Delete order row error:", err); }
    setSavingOrderEdit(null);
  };

  const toggleGRN = (key: string) => {
    setExpandedGRNs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleActivityDate = (date: string) => {
    setExpandedActivityDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const toggleOrderDate = (date: string) => {
    setExpandedOrderDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const cutoff7 = new Date();
  cutoff7.setDate(cutoff7.getDate() - 7);
  const cutoff7Str = cutoff7.toISOString().split("T")[0];

  const orderSummary = orderEntries
    .filter(e => e.productName)
    .map(e => {
      const product = products.find(p => p["PRODUCT NAME"] === e.productName);
      const current = Number(product?.["CHIC NAILSPA BALANCE"] ?? 0);
      const orderQty = Number(e.qty);
      return { productName: e.productName, current, orderQty, ending: current + orderQty };
    });

  const handleOrderSubmit = async () => {
    const valid = orderEntries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    setOrderError(null);

    const orderDateObj = new Date(getDateStr(orderDate));
    const dd = String(orderDateObj.getDate()).padStart(2, "0");
    const mm = String(orderDateObj.getMonth() + 1).padStart(2, "0");
    const yy = String(orderDateObj.getFullYear()).slice(-2);
    const grn = `CHIC ${dd}${mm}${yy}`;

    if (orderConfirmMode) {
      // V2: build pending order, wait for confirmation
      const entries = valid.map(entry => {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const starting = Number(product?.["CHIC NAILSPA BALANCE"] ?? 0);
        const qty = Number(entry.qty);
        const ending = starting + qty;
        return { productName: entry.productName, starting, qty, ending };
      });
      setPendingOrder({ grn, date: getDateStr(orderDate), entries });
      setOrderSubmitted(true);
    } else {
      // V1: write directly to Supabase
      setOrderSubmitting(true);
      try {
        for (const entry of valid) {
          const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
          const currentBranchBalance = Number(product?.["CHIC NAILSPA BALANCE"] ?? 0);
          const endingBranchBalance = currentBranchBalance + Number(entry.qty);
          const currentOfficeBalance = Number(product?.["OFFICE BALANCE"] ?? 0);
          const endingOfficeBalance = currentOfficeBalance - Number(entry.qty);
          await (supabase as any).from("AllFileLog").insert({
            "DATE": getDateStr(orderDate),
            "PRODUCT NAME": entry.productName,
            "BRANCH": "Chic Nailspa",
            "SUPPLIER": "Office",
            "TYPE": "Order",
            "STARTING BALANCE": currentBranchBalance,
            "QTY": Number(entry.qty),
            "ENDING BALANCE": endingBranchBalance,
            "GRN": grn,
            "OFFICE BALANCE": endingOfficeBalance,
          });
          await (supabase as any).from("AllFileProducts")
            .update({ "CHIC NAILSPA BALANCE": endingBranchBalance })
            .eq("PRODUCT NAME", entry.productName);
          await (supabase as any).from("AllFileProducts")
            .update({ "OFFICE BALANCE": endingOfficeBalance })
            .eq("PRODUCT NAME", entry.productName);
        }
        await fetchProducts();
        await fetchLog();
        setOrderEntries(makeOrderEntries());
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 3000);
      } catch (err) { console.error("Order submit error:", err); }
      setOrderSubmitting(false);
    }
  };

  const handleResetOrder = async () => {
    await (supabase as any).from("AllFileLog").delete().eq("BRANCH", "Chic Nailspa").eq("TYPE", "Order Request");
    setPendingOrder(null);
    setOrderEntries(makeOrderEntries());
    setOrderSubmitted(false);
    setOrderError(null);
  };

  const handleInlineConfirmOrder = async () => {
    const valid = orderEntries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    setOrderConfirming(true);
    setOrderError(null);

    const orderDateObj = new Date(getDateStr(orderDate));
    const dd = String(orderDateObj.getDate()).padStart(2, "0");
    const mm = String(orderDateObj.getMonth() + 1).padStart(2, "0");
    const yy = String(orderDateObj.getFullYear()).slice(-2);
    const grn = `CHIC ${dd}${mm}${yy}`;

    try {
      for (const entry of valid) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const starting = Number(product?.["CHIC NAILSPA BALANCE"] ?? 0);
        const qty = Number(entry.qty);
        const ending = starting + qty;
        const currentOfficeBalance = Number(product?.["OFFICE BALANCE"] ?? 0);
        const endingOfficeBalance = currentOfficeBalance - qty;

        const { error: orderLogErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": getDateStr(orderDate),
          "PRODUCT NAME": entry.productName,
          "BRANCH": "Chic Nailspa",
          "SUPPLIER": "Office",
          "TYPE": "Order",
          "STARTING BALANCE": starting,
          "QTY": qty,
          "ENDING BALANCE": ending,
          "GRN": grn,
          "OFFICE BALANCE": endingOfficeBalance,
        });
        if (orderLogErr) { console.error("AllFileLog order insert error:", orderLogErr); setOrderError(orderLogErr.message || "Log write failed"); }

        await (supabase as any).from("AllFileProducts")
          .update({ "CHIC NAILSPA BALANCE": ending })
          .eq("PRODUCT NAME", entry.productName);

        await (supabase as any).from("AllFileProducts")
          .update({ "OFFICE BALANCE": endingOfficeBalance })
          .eq("PRODUCT NAME", entry.productName);
      }
      await fetchProducts();
      await fetchLog();
      setOrderEntries(makeOrderEntries());
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) { console.error("Confirm order error:", err); }
    setOrderConfirming(false);
  };

  const handleConfirmOrder = async () => {
    if (!pendingOrder) return;
    setOrderConfirming(true);
    setOrderError(null);
    try {
      // Delete any Order Request entries written via ENTRY tab (no balance changes yet)
      await (supabase as any).from("AllFileLog").delete().eq("BRANCH", "Chic Nailspa").eq("TYPE", "Order Request").eq("GRN", pendingOrder.grn);
      for (const entry of pendingOrder.entries) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const currentOfficeBalance = Number(product?.["OFFICE BALANCE"] ?? 0);
        const endingOfficeBalance = currentOfficeBalance - entry.qty;

        // Log to AllFileLog
        const { error: orderLogErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": pendingOrder.date,
          "PRODUCT NAME": entry.productName,
          "BRANCH": "Chic Nailspa",
          "SUPPLIER": "Office",
          "TYPE": "Order",
          "STARTING BALANCE": entry.starting,
          "QTY": entry.qty,
          "ENDING BALANCE": entry.ending,
          "GRN": pendingOrder.grn,
          "OFFICE BALANCE": endingOfficeBalance,
        });
        if (orderLogErr) { console.error("AllFileLog order insert error:", orderLogErr); setOrderError(orderLogErr.message || "Log write failed — check console"); }

        // Update branch balance in AllFileProducts (ALL rows for this product)
        await (supabase as any).from("AllFileProducts")
          .update({ "CHIC NAILSPA BALANCE": entry.ending })
          .eq("PRODUCT NAME", entry.productName);

        // Update office balance in AllFileProducts (ALL rows for this product)
        await (supabase as any).from("AllFileProducts")
          .update({ "OFFICE BALANCE": endingOfficeBalance })
          .eq("PRODUCT NAME", entry.productName);
      }
      await fetchProducts();
      await fetchLog();
      setOrderEntries(makeOrderEntries());
      setPendingOrder(null);
      setOrderSubmitted(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) { console.error("Confirm order error:", err); }
    setOrderConfirming(false);
  };

  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };
  const border = "hsl(var(--border))";
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";

  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();
  const allOrderDates = [...new Set(log.filter(r => r.TYPE === "Order").map(r => r.DATE))].sort((a, b) => b.localeCompare(a));
  const latestOrderDate = allOrderDates[0] ?? today;
  const todayOrders = log.filter(r => r.TYPE === "Order" && r.DATE === latestOrderDate);
  const allTodayOrders = log.filter(r => r.TYPE === "Order" && r.DATE === latestOrderDate);
  const hasOrderNotification = pendingOrder !== null || log.filter(r => r.TYPE === "Order" && (r.DATE === today || r.DATE === tomorrow)).length > 0;

  // Group ALL orders by date+GRN for the All Orders section
  const allOrderGroups = (() => {
    const allOrders = log.filter(r => r.TYPE === "Order");
    const seen = new Map<string, LogRow[]>();
    allOrders.forEach(r => {
      const grn = r.GRN || r.DATE;
      const key = `${r.DATE}__${grn}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(r);
    });
    const groups: { key: string; date: string; grn: string; rows: LogRow[] }[] = [];
    seen.forEach((rows, key) => {
      const [date, grn] = key.split("__");
      groups.push({ key, date, grn, rows });
    });
    return groups.sort((a, b) => b.date.localeCompare(a.date));
  })();

  const activityLogUnsorted = activityRange === "all"
    ? log
    : log.filter(r => r.DATE >= cutoff14Str);
  const activityLog = [...activityLogUnsorted].sort((a, b) =>
    dateSortAsc ? a.DATE.localeCompare(b.DATE) : b.DATE.localeCompare(a.DATE)
  );

  const recentOrdersLogUnsorted = log.filter(r =>
    r.TYPE === "Order" && (activityRange === "all" || r.DATE >= cutoff14Str)
  );
  const recentOrdersLog = [...recentOrdersLogUnsorted].sort((a, b) =>
    dateSortAsc ? a.DATE.localeCompare(b.DATE) : b.DATE.localeCompare(a.DATE)
  );

  const generateGRNPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = 595;
    const margin = 50;

    const grnNumber = (() => {
      if (pendingOrder?.grn) return pendingOrder.grn;
      const found = allTodayOrders.find((r: LogRow) => r.GRN);
      if (found) return found.GRN as string;
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      return `CHIC ${dd}${mm}${yy}`;
    })();

    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(26, 26, 26);
    doc.text("CHIC NAILSPA", margin, 58);
    doc.text("GOODS RECEIVED NOTE", W - margin, 58, { align: "right" });

    // Divider
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.8);
    doc.line(margin, 64, W - margin, 64);

    // Address
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text("ADDRESS", margin, 78);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text("+60123333128  /  soongailing@gmail.com", margin, 90);
    doc.text("2F-11, Bangsar Village 2, No 2, Jalan Telawi 1, Bangsar Baru, Kuala Lumpur, 59100, Malaysia", margin, 101);

    // Meta
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text("DATE", margin, 130);
    doc.text("GRN NUMBER", margin + 120, 130);
    doc.setFontSize(9);
    doc.text(dateStr, margin, 143);
    doc.text(grnNumber, margin + 120, 143);

    // Notes box
    const notesY = 160;
    const notesH = 56;
    doc.setFillColor(247, 247, 247);
    doc.rect(margin, notesY, W - 2 * margin, notesH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(26, 26, 26);
    doc.text("NOTES", margin, notesY + 12);
    if (grnNotes.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(grnNotes, margin + 6, notesY + 26, { maxWidth: W - 2 * margin - 12 });
    }

    // Column positions
    // #(30) | Product Name(220) | Old Bal(70) | Order Qty(70) | Ending Bal(55)
    const numX  = margin;
    const nameX = margin + 30;
    const oldCX = margin + 285;
    const qtyCX = margin + 355;
    const endCX = margin + 427;

    // Table header — taller with wrapped text
    const tableTop = 250;
    const headerH = 28;
    doc.setFillColor(242, 242, 242);
    doc.rect(margin, tableTop - headerH + 12, W - 2 * margin, headerH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(26, 26, 26);
    doc.text("NO", numX + 10, tableTop - 2, { align: "center" });
    doc.text("PRODUCT NAME", nameX, tableTop - 2);
    doc.text("OLD", oldCX, tableTop + 5, { align: "center" });
    doc.text("BALANCE", oldCX, tableTop - 5, { align: "center" });
    doc.text("ORDER", qtyCX, tableTop + 5, { align: "center" });
    doc.text("QTY", qtyCX, tableTop - 5, { align: "center" });
    doc.text("ENDING", endCX, tableTop + 5, { align: "center" });
    doc.text("BALANCE", endCX, tableTop - 5, { align: "center" });

    // Rows — use pendingOrder if available, else allTodayOrders
    type PdfRow = { name: string; starting: number; qty: number; ending: number };
    const pdfRows: PdfRow[] = pendingOrder
      ? [...pendingOrder.entries].sort((a, b) => a.productName.localeCompare(b.productName)).map(e => ({ name: e.productName, starting: e.starting, qty: e.qty, ending: e.ending }))
      : [...allTodayOrders].sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"])).map(r => ({ name: r["PRODUCT NAME"], starting: r["STARTING BALANCE"], qty: r.QTY, ending: r["ENDING BALANCE"] }));

    const rowH = 26;
    let y = tableTop + 16;
    let totalQty = 0;

    pdfRows.forEach((row, idx) => {
      totalQty += row.qty;
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 2, W - 2 * margin, rowH, "F");
      }
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.4);
      doc.line(margin, y + rowH - 2, W - margin, y + rowH - 2);

      // Row number
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(String(idx + 1), numX + 10, y + 14, { align: "center" });

      // Product name
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(38, 38, 38);
      doc.text(row.name, nameX, y + 14);
      doc.text(String(row.starting), oldCX, y + 14, { align: "center" });
      doc.text(String(row.qty), qtyCX, y + 14, { align: "center" });
      doc.text(String(row.ending), endCX, y + 14, { align: "center" });
      y += rowH;
    });

    // Total row
    doc.setDrawColor(77, 77, 77);
    doc.setLineWidth(0.6);
    doc.line(margin, y - 2, W - margin, y - 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(26, 26, 26);
    doc.text("TOTAL ORDER QTY", nameX, y + 14);
    doc.text(String(totalQty), qtyCX, y + 14, { align: "center" });
    y += rowH;

    // Bottom rule
    const pageH = 842;
    const sigY = Math.max(y + 70, pageH - 110);

    // Signatures
    const sigW = 180;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(128, 128, 128);
    doc.text("RECEIVED BY", margin, sigY - 14);
    doc.setDrawColor(77, 77, 77);
    doc.setLineWidth(0.5);
    doc.line(margin, sigY, margin + sigW, sigY);
    const rightSigX = W - margin - sigW;
    doc.text("ORDER PROCESSED BY", rightSigX, sigY - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(38, 38, 38);
    doc.text("Hamza Riazuddin", rightSigX, sigY - 4);
    doc.line(rightSigX, sigY, rightSigX + sigW, sigY);

    doc.save(`${grnNumber} - GRN.pdf`);
  };

  const exportToExcel = () => {
    const rows = [
      ["Product Name", "Starting Balance", "Order Qty", "Ending Balance"],
      ...(pendingOrder
        ? pendingOrder.entries.map(e => [e.productName, e.starting, e.qty, e.ending])
        : allTodayOrders.map(r => [r["PRODUCT NAME"], r["STARTING BALANCE"], r.QTY, r["ENDING BALANCE"]]))
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-summary-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <div className="max-w-[900px] mx-auto px-5">
        {/* Top bar */}
        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: border, ...fade(0) }}>
          <span
            className="text-[11px] tracking-[0.2em] uppercase"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Chic Nailspa
          </span>
          <div className="flex items-center gap-4">
            <ThemeToggle theme={theme} toggle={toggle} font={font} cycleFont={cycleFont} />
            <button
              onClick={() => navigate("/")}
              className="flex items-center justify-center w-7 h-7 rounded-full border transition-colors"
              style={{ ...dim, borderColor: "hsl(var(--border))" }}
              aria-label="Go to home"
              onMouseEnter={e => {
                e.currentTarget.style.color = "hsl(var(--foreground))";
                e.currentTarget.style.backgroundColor = "hsl(var(--card))";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Home size={14} />
            </button>
          </div>
        </div>

        <div className="py-2">

          {/* ── SECTION 1: Chic Nailspa Stock ── */}
          <div className="mb-4">

            {/* Stock search bar with hover underline */}
            <div
              style={{...fade(170), position: "relative", zIndex: 40, marginTop: "16px"}}
            >
              <div
                className="relative mb-6"
                onMouseEnter={() => setStockSearchHovered(true)}
              onMouseLeave={() => setStockSearchHovered(false)}
            >
              <div
                className="flex items-center gap-2 cursor-pointer pb-2 relative"
                onClick={() => { setStockSearchFocused(true); setTimeout(() => stockInputRef.current?.focus(), 50); }}
              >
                <Search size={18} strokeWidth={1.5} className={`transition-colors duration-300 ${stockSearchHovered || stockSearchExpanded ? "text-muted-foreground" : "text-foreground"}`} />
                {!stockSearchExpanded && (
                  <span className={`text-[15px] font-light transition-colors duration-300 ${stockSearchHovered ? "text-muted-foreground" : "text-foreground"}`}>Search</span>
                )}
                {stockSearchExpanded && (
                  <input
                    ref={stockInputRef}
                    type="text"
                    className="flex-1 bg-transparent outline-none text-[15px] font-light"
                    placeholder="Search"
                    value={stockSearch}
                    onChange={e => { setStockSearch(e.target.value); setSelectedProduct(null); setShowStockDropdown(true); }}
                    onFocus={() => { setStockSearchFocused(true); setShowStockDropdown(true); }}
                    onBlur={() => setTimeout(() => { setShowStockDropdown(false); setStockSearchFocused(false); }, 150)}
                    onKeyDown={handleStockKeyDown}
                  />
                )}
                {stockSearch && (
                  <button onClick={(e) => { e.stopPropagation(); setStockSearch(""); setSelectedProduct(null); }} style={dim}><X size={13} /></button>
                )}
                {/* Animated underline */}
                <span
                  className="absolute bottom-0 left-0 h-px transition-all duration-[600ms] ease-out"
                  style={{
                    background: `hsl(var(--border-active))`,
                    width: stockSearchHovered || stockSearchExpanded ? "100%" : "0%",
                  }}
                />
              </div>
              {showStockDropdown && filteredStockProducts.length > 0 && (
                <div
                  ref={stockListRef}
                  className="absolute top-full left-0 right-0 z-50 border max-h-[220px] overflow-y-auto scrollbar-thin"
                  style={{ background: "hsl(var(--popover))", borderColor: borderActive, marginTop: "2px", borderRadius: "5px" }}
                >
                  {filteredStockProducts.map((row, i) => (
                    <div key={row["PRODUCT NAME"]}
                      data-item
                      className="flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors"
                      style={{
                        borderBottom: `1px solid ${border}`,
                        background: i === stockActiveIndex ? cardBg : "transparent",
                      }}
                      onMouseDown={() => handleSelectProduct(row)}
                      onMouseEnter={() => setStockActiveIndex(i)}
                    >
                      <div className="flex items-center gap-1.5">
                        {row["CHIC NAILSPA FAVOURITE"] && <Star size={10} style={{ fill: "hsl(var(--foreground))", color: "hsl(var(--foreground))" }} />}
                        <span className="text-[13px] font-light">{row["PRODUCT NAME"]}</span>
                      </div>
                      <span className="text-[12px]" style={{ color: "hsl(var(--foreground))" }}>{row["CHIC NAILSPA BALANCE"]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>

            {selectedProduct && (() => {
              const productLog = log.filter(r => r["PRODUCT NAME"] === selectedProduct["PRODUCT NAME"]);
              const fmtPrice = (val: number | null | undefined) => {
                if (!val || val < 0.01) return "—";
                return `RM ${val.toFixed(2)}`;
              };
              return (
                <div className="surface-box p-6" style={{ borderRadius: "5px" }}>
                  {/* Balance row */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-light">{selectedProduct["PRODUCT NAME"]}</p>
                        <button
                          onClick={() => toggleFavourite(selectedProduct)}
                          title={selectedProduct["CHIC NAILSPA FAVOURITE"] ? "Remove from favourites" : "Add to favourites"}
                        >
                          <Star
                            size={20}
                            style={{
                              fill: selectedProduct["CHIC NAILSPA FAVOURITE"] ? "hsl(var(--foreground))" : "transparent",
                              color: selectedProduct["CHIC NAILSPA FAVOURITE"] ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                              transition: "all 0.15s"
                            }}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[22px] font-light leading-none" style={{
                        color: selectedProduct["CHIC NAILSPA BALANCE"] <= 1 ? "hsl(var(--red))" : "hsl(var(--foreground))"
                      }}>{selectedProduct["CHIC NAILSPA BALANCE"]}</p>
                      <p className="text-[10px] tracking-wider uppercase mt-1" style={dim}>units</p>
                    </div>
                  </div>

                  {/* Staff & Customer prices */}
                  <div className="flex items-center gap-6 mb-6 pt-4 border-t" style={{ borderColor: border }}>
                    <div>
                      <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Staff Price</p>
                      <p className="text-[13px] font-light">{fmtPrice(selectedProduct["STAFF PRICE"])}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Customer Price</p>
                      <p className="text-[13px] font-light">{fmtPrice(selectedProduct["CUSTOMER PRICE"])}</p>
                    </div>
                  </div>

                  {/* Recent activity for this product */}
                  {productLog.length > 0 && (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: border }}>
                          <th className="label-uppercase font-normal text-left pb-2 pt-1">Date</th>
                          <th className="label-uppercase font-normal text-left pb-2 pt-1">Type</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Qty</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">End Bal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productLog.map(row => (
                          <tr key={row.id} className="border-b" style={{ borderColor: border }}>
                            <td className="text-[10px] font-light py-2" style={dim}>
                              {new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </td>
                            <td className="text-[10px] font-light py-2" style={dim}>{row.TYPE || "—"}</td>
                            <td className="text-[12px] font-light py-2 text-center" style={{ color: row.QTY < 0 ? "hsl(var(--red))" : "hsl(var(--green))" }}>
                              {row.QTY > 0 ? "+" : ""}{row.QTY}
                            </td>
                            <td className="text-[12px] font-light py-2 text-center">{row["ENDING BALANCE"] ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {productLog.length === 0 && (
                    <p className="text-[12px]" style={dim}>No recent activity for this product</p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── SECTION 2: Mode Toggle ── */}
          <div className="mb-12" style={{ ...fade(260), position: "relative", zIndex: 10 }}>

            {/* Tab buttons */}
            <div className="flex items-center border-b mb-4" style={{ borderColor: border }}>
              <button
                onClick={() => setMode("usage")}
                className="pb-3 pr-6 text-[13px] tracking-wider uppercase transition-colors"
                style={{
                  color: mode === "usage" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  borderBottom: mode === "usage" ? "1px solid hsl(var(--foreground))" : "1px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                Daily Usage
              </button>
              <button
                onClick={() => setMode("order")}
                className="pb-3 px-6 text-[13px] tracking-wider uppercase transition-colors"
                style={{
                  color: mode === "order" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  borderBottom: mode === "order" ? "1px solid hsl(var(--foreground))" : "1px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                Order
              </button>
              <button
                onClick={() => setMode("summary")}
                className="pb-3 px-6 text-[13px] tracking-wider uppercase transition-colors"
                style={{
                  color: mode === "summary" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  borderBottom: mode === "summary" ? "1px solid hsl(var(--foreground))" : "1px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                Summary
              </button>
            </div>

            {/* ── Daily Usage panel ── */}
            {mode === "usage" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] tracking-wider uppercase" style={dim}>Enter today's stock movements</p>
                  <DatePicker value={usageDate} onChange={setUsageDate} />
                </div>
                {/* Stacked rows — mobile friendly */}
                <div className="mb-5">
                  {entries.map((entry, idx) => (
                    <div key={entry.id} className="mb-3">
                      {/* Line 1: Product + Remove */}
                      <div className="flex items-center gap-2" style={{ borderBottom: `1px solid ${border}` }}>
                        <div className="flex-1">
                          <ProductDropdown
                            entry={entry}
                            sortedProducts={sortedProducts}
                            onSelect={name => updateEntry(entry.id, { productName: name, showProductDropdown: false, productSearch: "" })}
                            onSearch={val => updateEntry(entry.id, { productSearch: val })}
                            onToggle={() => {
                              closeAllDropdowns(entry.id, "product");
                              updateEntry(entry.id, { showProductDropdown: !entry.showProductDropdown, showTypeDropdown: false });
                            }}
                            onClose={() => updateEntry(entry.id, { showProductDropdown: false })}
                            showBalance
                            lineStyle
                          />
                        </div>
                        <button onClick={() => removeEntry(entry.id)} className="transition-colors flex-shrink-0" style={dim}
                          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                          <X size={13} />
                        </button>
                      </div>
                      {/* Line 2: Type + Qty */}
                      <div className="flex items-center justify-between py-1" style={{ borderBottom: `1px solid ${border}` }}>
                        <div className="flex-1">
                          <TypeDropdown
                            entry={entry}
                            onSelect={type => updateEntry(entry.id, { type, showTypeDropdown: false })}
                            onToggle={() => {
                              closeAllDropdowns(entry.id, "type");
                              updateEntry(entry.id, { showTypeDropdown: !entry.showTypeDropdown, showProductDropdown: false });
                            }}
                            onClose={() => updateEntry(entry.id, { showTypeDropdown: false })}
                            lineStyle
                          />
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => updateEntry(entry.id, { qty: Math.max(1, entry.qty - 1) })}
                            className="px-1.5 py-1 transition-colors" style={dim}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                            <ChevronLeft size={13} />
                          </button>
                          <span className="text-[13px] font-light min-w-[32px] text-center">{entry.qty}</span>
                          <button
                            onClick={() => updateEntry(entry.id, { qty: entry.qty + 1 })}
                            className="px-1.5 py-1 transition-colors" style={dim}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addEntry}
                  className="flex items-center gap-1.5 mb-7 text-[11px] tracking-wider uppercase transition-colors" style={dim}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                  <Plus size={11} /> Add another product
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="minimal-btn" style={{ opacity: submitting ? 0.5 : 1, borderRadius: "5px" }}>
                  {submitting ? "Saving..." : "Submit"}
                </button>
                {submitSuccess && (
                  <p className="text-[11px] mt-3 tracking-wider" style={{ color: "hsl(var(--green))" }}>✓ Stock updated successfully</p>
                )}
                {usageError && (
                  <p className="text-[11px] mt-3 tracking-wider" style={{ color: "hsl(var(--red))" }}>✗ {usageError}</p>
                )}
              </div>
            )}

            {/* ── Order panel ── */}
            {mode === "order" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] tracking-wider uppercase" style={dim}>Add stock from a new order</p>
                  <DatePicker value={orderDate} onChange={setOrderDate} />
                </div>
                {/* Stacked rows — mobile friendly */}
                <div className="mb-5">
                  {orderEntries.map((entry, idx) => {
                    const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
                    const currentBal = product?.["CHIC NAILSPA BALANCE"] ?? null;
                    return (
                      <div key={entry.id} className="mb-3">
                        {/* Line 1: Product + Remove */}
                        <div className="flex items-center gap-2" style={{ borderBottom: `1px solid ${border}` }}>
                          <div className="flex-1">
                            <ProductDropdown
                              entry={entry}
                              sortedProducts={sortedProducts}
                              onSelect={name => updateOrderEntry(entry.id, { productName: name, showProductDropdown: false, productSearch: "" })}
                              onSearch={val => updateOrderEntry(entry.id, { productSearch: val })}
                              onToggle={() => {
                                closeAllOrderDropdowns(entry.id);
                                updateOrderEntry(entry.id, { showProductDropdown: !entry.showProductDropdown });
                              }}
                              onClose={() => updateOrderEntry(entry.id, { showProductDropdown: false })}
                              showBalance
                              lineStyle
                            />
                          </div>
                          <button onClick={() => {
                            if (orderEntries.length > 1) {
                              removeOrderEntry(entry.id);
                            } else {
                              updateOrderEntry(entry.id, { productName: "", qty: 1, productSearch: "", showProductDropdown: false });
                            }
                          }} className="transition-colors flex-shrink-0" style={dim}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                            <X size={13} />
                          </button>
                        </div>
                        {/* Line 2: Balance + Qty */}
                        <div className="flex items-center justify-between py-1" style={{ borderBottom: `1px solid ${border}` }}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] tracking-wider uppercase" style={dim}>Balance</span>
                            <span className="text-[13px] font-light" style={currentBal === null ? dim : { color: "hsl(var(--foreground))" }}>
                              {currentBal === null ? "—" : currentBal}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <button
                              onClick={() => updateOrderEntry(entry.id, { qty: Math.max(1, entry.qty - 1) })}
                              className="px-1.5 py-1 transition-colors" style={dim}
                              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                              <ChevronLeft size={13} />
                            </button>
                            <span className="text-[13px] font-light min-w-[32px] text-center">{entry.qty}</span>
                            <button
                              onClick={() => updateOrderEntry(entry.id, { qty: entry.qty + 1 })}
                              className="px-1.5 py-1 transition-colors" style={dim}
                              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={addOrderEntry}
                  className="flex items-center gap-1.5 mb-7 text-[11px] tracking-wider uppercase transition-colors" style={dim}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                  <Plus size={11} /> Add another product
                </button>
                <button onClick={handleOrderSubmit} disabled={orderSubmitting} className="minimal-btn" style={{ opacity: orderSubmitting ? 0.5 : 1, borderRadius: "5px" }}>
                  {orderSubmitting ? "Saving..." : "Submit Order"}
                </button>
                {orderSubmitted && !orderSuccess && (
                  <p className="text-[11px] mt-3 tracking-wider" style={{ color: "hsl(var(--green))" }}>✓ Order submitted</p>
                )}
                {orderSuccess && (
                  <p className="text-[11px] mt-3 tracking-wider" style={{ color: "hsl(var(--green))" }}>✓ Order confirmed</p>
                )}
                {orderError && (
                  <p className="text-[11px] mt-3 tracking-wider" style={{ color: "hsl(var(--red))" }}>✗ {orderError}</p>
                )}

                {/* Order Summary — preview before confirm */}
                {orderSummary.length > 0 && (
                  <div className="mt-10">
                    <div className="mb-5">
                      <h2 className="text-[22px] font-light tracking-tight">Order Summary</h2>
                      <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>{pendingOrder ? "Pending · Click × to remove" : "Preview · Click × to remove · Submit Order to confirm"}</p>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: borderActive }}>
                          <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">CURRENT BAL</th>
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">ORDER QTY</th>
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">Ending Bal</th>
                          <th className="w-6" />
                        </tr>
                      </thead>
                      <tbody>
                        {orderSummary.map((row, i) => (
                          <tr key={i} className="border-b table-row-hover" style={{ borderColor: border }}>
                            <td className="text-[13px] font-light py-3">{row.productName}</td>
                            <td className="text-[13px] font-light py-3 text-center" style={dim}>{row.current}</td>
                            <td className="text-[13px] font-light py-3 text-center" style={{ color: "hsl(var(--green))" }}>+{row.orderQty}</td>
                            <td className="text-[13px] font-light py-3 text-center">{row.ending}</td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => {
                                  setOrderEntries(prev => prev.map(e => e.productName === row.productName ? { ...e, productName: "", qty: 1, productSearch: "", showProductDropdown: false } : e));
                                  setPendingOrder(prev => {
                                    if (!prev) return prev;
                                    const entries = prev.entries.filter(e => e.productName !== row.productName);
                                    if (!entries.length) { setOrderSubmitted(false); return null; }
                                    return { ...prev, entries };
                                  });
                                }}
                                style={{ color: "hsl(var(--muted-foreground))" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                                onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                              ><X size={13} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                  </div>
                )}

                {/* Submitted Orders — today only, with reverse button */}
                {/* Recent Orders */}
                <div className="mt-10">
                  <div className="mb-5">
                    <div className="flex items-center gap-5">
                      <button
                        type="button"
                        onClick={() => setActivityRange("14")}
                        className="transition-all duration-200"
                        style={{
                          fontSize: activityRange === "14" ? "22px" : "18px",
                          fontWeight: 300,
                          letterSpacing: "-0.02em",
                          color: activityRange === "14" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                        }}
                        onMouseEnter={e => { if (activityRange !== "14") { e.currentTarget.style.color = "hsl(var(--foreground))"; e.currentTarget.style.fontSize = "20px"; } }}
                        onMouseLeave={e => { if (activityRange !== "14") { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; e.currentTarget.style.fontSize = "18px"; } }}
                      >
                        Recent Activity
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityRange("all")}
                        className="transition-all duration-200"
                        style={{
                          fontSize: activityRange === "all" ? "22px" : "18px",
                          fontWeight: 300,
                          letterSpacing: "-0.02em",
                          color: activityRange === "all" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                        }}
                        onMouseEnter={e => { if (activityRange !== "all") { e.currentTarget.style.color = "hsl(var(--foreground))"; e.currentTarget.style.fontSize = "20px"; } }}
                        onMouseLeave={e => { if (activityRange !== "all") { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; e.currentTarget.style.fontSize = "18px"; } }}
                      >
                        All Data
                      </button>
                    </div>
                    <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>
                      {activityRange === "all" ? "All data" : "Last 14 days"}
                    </p>
                  </div>
                  {recentOrdersLog.length === 0 ? (
                    <p className="text-[13px]" style={dim}>No orders yet</p>
                  ) : (() => {
                    const recentRows = recentOrdersLog.filter(r => r.DATE >= cutoff7Str);
                    const olderRows = recentOrdersLog.filter(r => r.DATE < cutoff7Str);

                    const olderByDate = new Map<string, LogRow[]>();
                    olderRows.forEach(r => {
                      if (!olderByDate.has(r.DATE)) olderByDate.set(r.DATE, []);
                      olderByDate.get(r.DATE)!.push(r);
                    });
                    const olderDates = [...olderByDate.keys()].sort((a, b) =>
                      dateSortAsc ? a.localeCompare(b) : b.localeCompare(a)
                    );

                    return (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b" style={{ borderColor: borderActive }}>
                            <th
                              className="label-uppercase font-normal text-left pb-3 pt-2 cursor-pointer select-none transition-colors"
                              style={{ color: "hsl(var(--muted-foreground))" }}
                              onClick={() => setDateSortAsc(prev => !prev)}
                              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                            >Date</th>
                            <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">Start Bal</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">Qty</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">End Bal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Recent rows (≤7 days) — shown individually */}
                          {recentRows.map((row, idx) => {
                            const nextRow = recentRows[idx + 1];
                            const isDateBreak = (nextRow && nextRow.DATE !== row.DATE) || (!nextRow && olderDates.length > 0);
                            return (
                              <tr key={row.id} className="table-row-hover" style={{ borderBottom: `1px solid ${isDateBreak ? "hsl(var(--foreground))" : border}` }}>
                                <td className="text-[10px] font-light py-3">
                                  {new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                </td>
                                <td className="text-[11px] font-light py-3">{row["PRODUCT NAME"]}</td>
                                <td className="text-[13px] font-light py-3 text-center" style={dim}>{row["STARTING BALANCE"]}</td>
                                <td className="text-[13px] font-light py-3 text-center" style={{ color: "hsl(var(--green))" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</td>
                                <td className="text-[13px] font-light py-3 text-center">{row["ENDING BALANCE"]}</td>
                              </tr>
                            );
                          })}
                          {/* Older rows (>7 days) — grouped by date, expandable */}
                          {olderDates.map((date, di) => {
                            const rows = olderByDate.get(date)!;
                            const isExpanded = expandedOrderDates.has(date);
                            const isLast = di === olderDates.length - 1;
                            return (
                              <>
                                <tr
                                  key={`order-group-${date}`}
                                  className="cursor-pointer"
                                  style={{ borderBottom: `1px solid ${isExpanded ? "hsl(var(--border-active))" : border}` }}
                                  onClick={() => toggleOrderDate(date)}
                                  onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--card))")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                  <td className="text-[10px] font-light py-3" style={dim}>
                                    {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </td>
                                  <td className="text-[11px] font-light py-3" style={dim}>
                                    {rows.length} {rows.length === 1 ? "item" : "items"}
                                  </td>
                                  <td colSpan={2} />
                                  <td className="py-3 text-center">
                                    <span style={{ ...dim, fontSize: "11px", display: "inline-block", transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                                  </td>
                                </tr>
                                {isExpanded && rows.map((row, ri) => (
                                  <tr key={row.id} className="table-row-hover" style={{ borderBottom: `1px solid ${ri === rows.length - 1 ? (isLast ? border : "hsl(var(--foreground))") : border}`, background: "hsl(var(--card))" }}>
                                    <td className="text-[10px] font-light py-2.5 pl-2" style={dim}>—</td>
                                    <td className="text-[11px] font-light py-2.5 text-center">{row["PRODUCT NAME"]}</td>
                                    <td className="text-[13px] font-light py-2.5 text-center" style={dim}>{row["STARTING BALANCE"]}</td>
                                    <td className="text-[13px] font-light py-2.5 text-center" style={{ color: "hsl(var(--green))" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</td>
                                    <td className="text-[13px] font-light py-2.5 text-center">{row["ENDING BALANCE"]}</td>
                                  </tr>
                                ))}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

            {/* ── Order Summary Panel ── */}
            {mode === "summary" && (
              <div>
                  {/* Panel header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[18px] font-light tracking-tight" style={{ lineHeight: 1.2 }}>Order Summary</div>
                      <p className="text-[11px] tracking-wider uppercase mt-0.5" style={dim}>
                        {pendingOrder
                          ? new Date(pendingOrder.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                          : latestOrderDate === tomorrow ? "Tomorrow" : latestOrderDate === today ? "Today" : new Date(latestOrderDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {pendingOrder
                          ? ` · ${pendingOrder.entries.length} ${pendingOrder.entries.length === 1 ? "item" : "items"} · Pending`
                          : allTodayOrders.length > 0 ? ` · ${allTodayOrders.length} ${allTodayOrders.length === 1 ? "item" : "items"}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* ── Most recent order (editable) ── */}
                  {pendingOrder !== null ? (
                    <>
                      <p className="text-[10px] tracking-wider uppercase mb-4" style={dim}>PREVIEW · CLICK × TO REMOVE</p>
                      <table className="w-full border-collapse mb-8">
                        <thead>
                          <tr className="border-b" style={{ borderColor: "hsl(var(--border-active))" }}>
                            <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">Prev Bal</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">Order Qty</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">New Bal</th>
                            <th className="w-6" />
                          </tr>
                        </thead>
                        <tbody>
                          {pendingOrder.entries.map((entry, idx) => {
                            const isEditing = editingPendingIdx === idx;
                            const parsedEdit = parseInt(editingPendingQty);
                            const previewBal = isEditing && !isNaN(parsedEdit) ? entry.starting + parsedEdit : entry.ending;
                            return (
                              <tr key={idx} className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
                                <td className="text-[13px] font-light py-3">{entry.productName}</td>
                                <td className="text-[13px] font-light py-3 text-center" style={dim}>{entry.starting}</td>
                                <td className="text-[13px] font-light py-3 text-center">
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      type="number"
                                      min={1}
                                      className="text-[13px] font-light text-center bg-transparent outline-none border-b w-[40px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                      style={{ borderColor: "hsl(var(--border-active))", color: "hsl(var(--green))" }}
                                      value={editingPendingQty}
                                      onChange={e => setEditingPendingQty(e.target.value)}
                                      onClick={e => (e.target as HTMLInputElement).select()}
                                      onBlur={() => {
                                        if (!isNaN(parsedEdit) && parsedEdit > 0) {
                                          setPendingOrder(prev => {
                                            if (!prev) return prev;
                                            const entries = [...prev.entries];
                                            entries[idx] = { ...entries[idx], qty: parsedEdit, ending: entries[idx].starting + parsedEdit };
                                            return { ...prev, entries };
                                          });
                                        }
                                        setEditingPendingIdx(null);
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                        if (e.key === "Escape") setEditingPendingIdx(null);
                                      }}
                                    />
                                  ) : (
                                    <span
                                      className="cursor-pointer"
                                      style={{ color: "hsl(var(--green))" }}
                                      title="Click to edit"
                                      onClick={() => { setEditingPendingIdx(idx); setEditingPendingQty(String(entry.qty)); }}
                                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                                    >+{entry.qty}</span>
                                  )}
                                </td>
                                <td className="text-[13px] font-light py-3 text-center" style={isEditing ? dim : {}}>{previewBal}</td>
                                <td className="py-3 text-center">
                                  <button
                                    onClick={() => {
                                      const productName = entry.productName;
                                      setPendingOrder(prev => {
                                        if (!prev) return prev;
                                        const entries = prev.entries.filter((_, i) => i !== idx);
                                        if (!entries.length) { setOrderSubmitted(false); return null; }
                                        return { ...prev, entries };
                                      });
                                      setOrderEntries(prev => prev.map(e => e.productName === productName ? { ...e, productName: "", qty: 1, productSearch: "", showProductDropdown: false } : e));
                                    }}
                                    style={dim}
                                    onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                                    onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                                  ><X size={13} /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Notes */}
                      <div className="mb-6 mt-2">
                        <p className="text-[10px] tracking-wider uppercase mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Add Notes</p>
                        <textarea
                          rows={3}
                          className="w-full bg-transparent outline-none text-[13px] font-light resize-none"
                          style={{ borderBottom: "1px solid hsl(var(--border-active))", padding: "6px 0", color: "hsl(var(--foreground))" }}
                          placeholder="Example: No Argan Stock..."
                          value={grnNotes}
                          onChange={e => setGrnNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-3 mb-12">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleConfirmOrder}
                            disabled={orderConfirming}
                            className="flex items-center gap-2 text-[11px] tracking-wider uppercase"
                            style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", padding: "6px 12px", borderRadius: "5px", opacity: orderConfirming ? 0.5 : 1 }}
                          >
                            {orderConfirming ? "Confirming..." : "Confirm Order"}
                          </button>
                          <button
                            onClick={handleResetOrder}
                            className="flex items-center gap-2 text-[11px] tracking-wider uppercase transition-colors"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                          >
                            Reset
                          </button>
                        </div>
                        <div className="flex items-center gap-6">
                          <button
                            onClick={generateGRNPdf}
                            className="flex items-center gap-2 text-[11px] tracking-wider uppercase transition-colors"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                          >
                            <FileText size={12} />
                            GRN
                          </button>
                          <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 text-[11px] tracking-wider uppercase transition-colors"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                          >
                            <Download size={12} />
                            Export to Excel
                          </button>
                        </div>
                      </div>
                    </>
                  ) : allTodayOrders.length === 0 ? (
                    <p className="text-[13px]" style={dim}>No orders submitted yet.</p>
                  ) : (
                    <div className="flex items-center gap-6 mb-12">
                      <button
                        onClick={generateGRNPdf}
                        className="flex items-center gap-2 text-[11px] tracking-wider uppercase transition-colors"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                      >
                        <FileText size={12} />
                        GRN
                      </button>
                      <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 text-[11px] tracking-wider uppercase transition-colors"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                      >
                        <Download size={12} />
                        Export to Excel
                      </button>
                    </div>
                  )}

                  {/* ── All Orders ── */}
                  {allOrderGroups.length > 0 && (
                    <div>
                      <div className="border-t pt-8 mb-6" style={{ borderColor: "hsl(var(--border))" }}>
                        <h3 className="text-[13px] font-light tracking-tight mb-1">All Orders</h3>
                        <p className="text-[10px] tracking-wider uppercase" style={dim}>Last 60 days</p>
                      </div>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b" style={{ borderColor: "hsl(var(--border-active))" }}>
                            <th className="label-uppercase font-normal text-left pb-3 pt-2">Date</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">GRN</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">Items</th>
                            <th className="w-8 label-uppercase font-normal text-center pb-3 pt-2">{expandedGRNs.size > 0 ? "BAL" : ""}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allOrderGroups.map(group => (
                            <>
                              <tr
                                key={group.key}
                                className="border-b cursor-pointer"
                                style={{ borderColor: "hsl(var(--border))" }}
                                onClick={() => toggleGRN(group.key)}
                                onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--card))")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                <td className="text-[12px] font-light py-3" style={{ color: "hsl(var(--foreground))" }}>
                                  {new Date(group.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                </td>
                                <td className="text-[12px] font-light py-3 text-center" style={{ color: "hsl(var(--foreground))" }}>{group.grn}</td>
                                <td className="text-[12px] font-light py-3 text-center" style={dim}>{group.rows.length}</td>
                                <td className="py-3 text-center">
                                  <span style={{ ...dim, fontSize: "11px", display: "inline-block", transition: "transform 0.15s", transform: expandedGRNs.has(group.key) ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                                </td>
                              </tr>
                              {expandedGRNs.has(group.key) && group.rows.map((row, ri) => (
                                <tr key={row.id} className="border-b" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
                                  <td className="text-[10px] font-light py-2.5 pl-2" style={dim}>—</td>
                                  <td className="text-[13px] font-light py-2.5 text-center">{row["PRODUCT NAME"]}</td>
                                  <td className="text-[12px] font-light py-2.5 text-center" style={{ color: "hsl(var(--green))" }}>+{row.QTY}</td>
                                  <td className="text-[12px] font-light py-2.5 text-center" style={dim}>{row["ENDING BALANCE"]}</td>
                                </tr>
                              ))}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}


          {/* ── SECTION 3: Recent Activity (Daily Usage mode only) ── */}
          {mode === "usage" && (
            <div>
              <div className="mb-5" style={fade(380)}>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => setActivityRange("14")}
                    className="transition-all duration-200"
                    style={{
                      fontSize: activityRange === "14" ? "22px" : "18px",
                      fontWeight: 300,
                      letterSpacing: "-0.02em",
                      color: activityRange === "14" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    }}
                    onMouseEnter={e => { if (activityRange !== "14") { e.currentTarget.style.color = "hsl(var(--foreground))"; e.currentTarget.style.fontSize = "20px"; } }}
                    onMouseLeave={e => { if (activityRange !== "14") { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; e.currentTarget.style.fontSize = "18px"; } }}
                  >
                    Recent Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityRange("all")}
                    className="transition-all duration-200"
                    style={{
                      fontSize: activityRange === "all" ? "22px" : "18px",
                      fontWeight: 300,
                      letterSpacing: "-0.02em",
                      color: activityRange === "all" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    }}
                    onMouseEnter={e => { if (activityRange !== "all") { e.currentTarget.style.color = "hsl(var(--foreground))"; e.currentTarget.style.fontSize = "20px"; } }}
                    onMouseLeave={e => { if (activityRange !== "all") { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; e.currentTarget.style.fontSize = "18px"; } }}
                  >
                    All Data
                  </button>
                </div>
                <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>
                  {activityRange === "all" ? "All data" : "Last 14 days"}
                </p>
              </div>
              {selectedActivityProduct && (() => {
                const info = products.find(p => p["PRODUCT NAME"] === selectedActivityProduct) ?? null;
                const activityForProduct = log.filter(r => r["PRODUCT NAME"] === selectedActivityProduct);
                const fmtPrice = (val: number | null | undefined) => {
                  if (!val || val < 0.01) return "—";
                  return `RM ${val.toFixed(2)}`;
                };
                return (
                  <div ref={activityDetailRef} className="surface-box p-6 mb-6" style={{ borderRadius: "5px" }}>
                    {/* Name + star + close | Balance + units */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-light">{selectedActivityProduct}</p>
                          {info && (
                            <button
                              onClick={() => toggleFavourite(info)}
                              title={info["CHIC NAILSPA FAVOURITE"] ? "Remove from favourites" : "Add to favourites"}
                            >
                              <Star
                                size={20}
                                style={{
                                  fill: info["CHIC NAILSPA FAVOURITE"] ? "hsl(var(--foreground))" : "transparent",
                                  color: info["CHIC NAILSPA FAVOURITE"] ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                                  transition: "all 0.15s"
                                }}
                              />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedActivityProduct(null)}
                            style={dim}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      {info && (
                        <div className="text-right">
                          <p className="text-[22px] font-light leading-none" style={{
                            color: (info["CHIC NAILSPA BALANCE"] ?? 0) <= 1 ? "hsl(var(--red))" : "hsl(var(--foreground))"
                          }}>
                            {info["CHIC NAILSPA BALANCE"] ?? 0}
                          </p>
                          <p className="text-[10px] tracking-wider uppercase mt-1" style={dim}>units</p>
                        </div>
                      )}
                    </div>

                    {/* Prices */}
                    {info && (info["STAFF PRICE"] || info["CUSTOMER PRICE"]) && (
                      <div className="flex items-center gap-6 mb-6 pt-4 border-t" style={{ borderColor: border }}>
                        {info["STAFF PRICE"] && (info["STAFF PRICE"] as number) > 0 && (
                          <div>
                            <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Staff Price</p>
                            <p className="text-[13px] font-light">{fmtPrice(info["STAFF PRICE"] as number)}</p>
                          </div>
                        )}
                        {info["CUSTOMER PRICE"] && (info["CUSTOMER PRICE"] as number) > 0 && (
                          <div>
                            <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Customer Price</p>
                            <p className="text-[13px] font-light">{fmtPrice(info["CUSTOMER PRICE"] as number)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Table */}
                    {activityForProduct.length === 0 ? (
                      <p className="text-[12px]" style={dim}>No activity found for this product</p>
                    ) : (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b" style={{ borderColor: border }}>
                            <th className="label-uppercase font-normal text-left pb-2 pt-1">Date</th>
                            <th className="label-uppercase font-normal text-left pb-2 pt-1">Type</th>
                            <th className="label-uppercase font-normal text-center pb-2 pt-1">Qty</th>
                            <th className="label-uppercase font-normal text-center pb-2 pt-1">End Bal</th>
                            <th className="label-uppercase font-normal text-center pb-2 pt-1">GRN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activityForProduct.map(row => (
                            <tr key={row.id} className="border-b" style={{ borderColor: border }}>
                              <td className="text-[10px] font-light py-2" style={dim}>
                                {new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </td>
                              <td className="text-[10px] font-light py-2" style={dim}>{row.TYPE || "—"}</td>
                              <td className="text-[12px] font-light py-2 text-center" style={{ color: row.QTY < 0 ? "hsl(var(--red))" : "hsl(var(--green))" }}>
                                {row.QTY > 0 ? "+" : ""}{row.QTY}
                              </td>
                              <td className="text-[12px] font-light py-2 text-center">{row["ENDING BALANCE"] ?? "—"}</td>
                              <td className="text-[11px] font-light py-2 text-center" style={dim}>{row.GRN || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })()}
              {activityLog.length === 0 ? (
                <p className="text-[13px]" style={dim}>No entries yet</p>
              ) : (() => {
                // Split into recent (≤7 days) shown individually, and older grouped by date
                const recentRows = activityLog.filter(r => r.DATE >= cutoff7Str);
                const olderRows = activityLog.filter(r => r.DATE < cutoff7Str);

                // Group older rows by date
                const olderByDate = new Map<string, LogRow[]>();
                olderRows.forEach(r => {
                  if (!olderByDate.has(r.DATE)) olderByDate.set(r.DATE, []);
                  olderByDate.get(r.DATE)!.push(r);
                });
                const olderDates = [...olderByDate.keys()].sort((a, b) =>
                  dateSortAsc ? a.localeCompare(b) : b.localeCompare(a)
                );

                return (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: borderActive }}>
                        <th
                          className="label-uppercase font-normal text-left pb-3 pt-2 cursor-pointer select-none transition-colors"
                          style={{ color: "hsl(var(--muted-foreground))", width: "65px" }}
                          onClick={() => setDateSortAsc(prev => !prev)}
                          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                        >Date</th>
                        <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                        <th className="label-uppercase font-normal text-center pb-3 pt-2">Type</th>
                        <th className="label-uppercase font-normal text-center pb-3 pt-2">Qty</th>
                        <th className="label-uppercase font-normal text-center pb-3 pt-2" style={{ minWidth: "52px" }}>Bal</th>
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {/* Recent rows (≤7 days) — shown individually */}
                      {recentRows.map((row, idx) => {
                        const eightDaysAgoStr = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; })();
                        const canReverse = row.DATE >= eightDaysAgoStr && row.DATE <= tomorrow;
                        const nextRow = recentRows[idx + 1];
                        const isDateBreak = (nextRow && nextRow.DATE !== row.DATE) || (!nextRow && olderDates.length > 0);
                        return (
                          <tr key={row.id} className="table-row-hover" style={{ borderBottom: `1px solid ${isDateBreak ? "hsl(var(--foreground))" : border}` }}>
                            <td className="text-[10px] font-light py-3">
                              {new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </td>
                            <td
                              className="text-[11px] font-light py-3 text-dim cursor-pointer hover:underline"
                              onClick={() => setSelectedActivityProduct(row["PRODUCT NAME"])}
                            >{row["PRODUCT NAME"]}</td>
                            <td className="text-[9px] font-light py-3 text-center tracking-wider uppercase" style={dim}>{row.TYPE}</td>
                            <td className="text-[11px] font-light py-3 text-center" style={{ color: row.QTY < 0 ? "hsl(var(--red))" : "hsl(var(--green))" }}>{row.QTY}</td>
                            <td className="text-[11px] font-light py-3 text-center">{row["ENDING BALANCE"]}</td>
                            <td className="py-3 text-center">
                              {canReverse && (
                                <button
                                  onClick={() => row.TYPE === "Order" ? reverseOrder(row) : reverseUsage(row)}
                                  disabled={reversing === row.id}
                                  className="transition-colors"
                                  style={{ color: "hsl(var(--muted-foreground))", opacity: reversing === row.id ? 0.4 : 1 }}
                                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Older rows (>7 days) — grouped by date, expandable */}
                      {olderDates.map((date, di) => {
                        const rows = olderByDate.get(date)!;
                        const isExpanded = expandedActivityDates.has(date);
                        const isLast = di === olderDates.length - 1;
                        return (
                          <>
                            <tr
                              key={`group-${date}`}
                              className="cursor-pointer"
                              style={{ borderBottom: `1px solid ${isExpanded ? "hsl(var(--border-active))" : border}` }}
                              onClick={() => toggleActivityDate(date)}
                              onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--card))")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <td className="text-[10px] font-light py-3" style={dim}>
                                {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </td>
                              <td className="text-[12px] font-light py-3" style={dim}>
                                {rows.length} {rows.length === 1 ? "entry" : "entries"}
                              </td>
                              <td colSpan={3} />
                              <td className="py-3 text-center">
                                <span style={{ ...dim, fontSize: "11px", display: "inline-block", transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                              </td>
                            </tr>
                            {isExpanded && rows.map((row, ri) => (
                              <tr key={row.id} className="table-row-hover" style={{ borderBottom: `1px solid ${ri === rows.length - 1 ? (isLast ? border : "hsl(var(--foreground))") : border}`, background: "hsl(var(--card))" }}>
                                <td className="text-[10px] font-light py-2.5 pl-2" style={dim}>—</td>
                                <td
                                  className="text-[11px] font-light py-2.5 text-dim cursor-pointer hover:underline"
                                  onClick={() => setSelectedActivityProduct(row["PRODUCT NAME"])}
                                >{row["PRODUCT NAME"]}</td>
                                <td className="text-[9px] font-light py-2.5 text-center tracking-wider uppercase" style={dim}>{row.TYPE}</td>
                                <td className="text-[11px] font-light py-2.5 text-center" style={{ color: row.QTY < 0 ? "hsl(var(--red))" : "hsl(var(--green))" }}>{row.QTY}</td>
                                <td className="text-[11px] font-light py-2.5 text-center">{row["ENDING BALANCE"]}</td>
                                <td />
                              </tr>
                            ))}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}

        </div>
      </div>


      {/* ── Scroll direction blur overlays ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "80px",
        background: "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        maskImage: "linear-gradient(to bottom, black 30%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 100%)",
        opacity: scrollDir === "down" ? 1 : 0,
        transition: "opacity 0.5s ease",
        pointerEvents: "none",
        zIndex: 50,
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "80px",
        background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        maskImage: "linear-gradient(to top, black 30%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, black 30%, transparent 100%)",
        opacity: scrollDir === "up" ? 1 : 0,
        transition: "opacity 0.5s ease",
        pointerEvents: "none",
        zIndex: 50,
      }} />
    </div>
  );
}

export default function StockChicNailspaPhone() {
  return (
    <ErrorBoundary>
      <StockChicNailspaPhoneInner />
    </ErrorBoundary>
  );
}
