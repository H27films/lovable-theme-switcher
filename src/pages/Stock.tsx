import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight, Search, ChevronDown, FileText, Download, Home, Lock } from "lucide-react";
import jsPDF from "jspdf";

interface AllFileProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "STAFF PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "BOUDOIR BALANCE": number;
  "NUR YADI BALANCE": number;
  "CHIC NAILSPA BALANCE": number;
  "OFFICE BALANCE": number;
  "PAR": number | null;
  "UNITS/ORDER": number | null;
  "COLOUR": boolean | null;
  "OFFICE SECTION": string | null;
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

const makeEntries = (): EntryLine[] => [1,2,3,4,5].map(id => ({
  id, productName: "", type: "Salon Use", qty: 1,
  showProductDropdown: false, showTypeDropdown: false, productSearch: "",
}));

const makeOrderEntries = (): OrderLine[] => [1,2,3,4,5].map(id => ({
  id, productName: "", qty: 1, showProductDropdown: false, productSearch: "",
}));

function ProductDropdown({ entry, sortedProducts, onSelect, onSearch, onToggle, onClose, showBalance }: {
  entry: { productName: string; showProductDropdown: boolean; productSearch: string };
  sortedProducts: AllFileProduct[];
  onSelect: (name: string) => void;
  onSearch: (val: string) => void;
  onToggle: () => void;
  onClose: () => void;
  showBalance?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const border = "hsl(var(--border))";
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";
  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  const filtered = entry.productSearch
    ? sortedProducts.filter(p => p["PRODUCT NAME"].toLowerCase().includes(entry.productSearch.toLowerCase()))
    : sortedProducts;

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
    <div ref={ref} className="relative flex-1">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer h-[34px]"
        style={{ background: cardBg, border: `1px solid ${borderActive}` }}
        onClick={onToggle}
      >
        <span className="text-[13px] font-light" style={{ color: entry.productName ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
          {entry.productName || "Select product..."}
        </span>
        <ChevronDown size={12} style={dim} />
      </div>

      {entry.showProductDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-50 border"
          style={{ background: "hsl(var(--popover))", borderColor: borderActive, marginTop: "2px" }}
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
                  background: i === activeIndex ? cardBg : "transparent",
                }}
                onMouseDown={() => { onSelect(p["PRODUCT NAME"]); setActiveIndex(-1); }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="text-[13px] font-light">{p["PRODUCT NAME"]}</span>
                {showBalance && <span className="text-[11px]" style={{ color: "hsl(var(--foreground))" }}>{p["BOUDOIR BALANCE"]}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TypeDropdown({ entry, onSelect, onToggle, onClose }: {
  entry: EntryLine;
  onSelect: (type: string) => void;
  onToggle: () => void;
  onClose: () => void;
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
      className="relative flex-shrink-0"
      style={{ width: "110px" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className="flex items-center justify-between px-2 py-2 cursor-pointer h-[34px]"
        style={{ background: cardBg, border: `1px solid ${borderActive}` }}
        onClick={onToggle}
      >
        <span className="text-[11px] font-light">{entry.type}</span>
        <ChevronDown size={11} style={dim} />
      </div>
      {entry.showTypeDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-50 border"
          style={{ background: "hsl(var(--popover))", borderColor: borderActive, marginTop: "2px" }}
        >
          {TYPES.map((t, i) => (
            <div
              key={t}
              className="px-3 py-2 text-[11px] font-light cursor-pointer transition-colors"
              style={{
                borderBottom: `1px solid ${border}`,
                background: i === activeIndex ? cardBg : "transparent",
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
        style={{ border: `1px solid ${value !== "today" ? borderActive : border}`, background: cardBg, color: value !== "today" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
      >
        {OPTIONS.find(o => o.value === value)?.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className="absolute top-full right-0 z-50 border mt-0.5"
          style={{ background: "hsl(var(--popover))", borderColor: borderActive, minWidth: "110px" }}
        >
          {OPTIONS.map(opt => (
            <div
              key={opt.value}
              className="px-3 py-2 text-[11px] tracking-wider uppercase cursor-pointer transition-colors"
              style={{
                borderBottom: `1px solid ${border}`,
                color: value === opt.value ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
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

export default function Stock() {
  const navigate = useNavigate();
  const { theme, toggle, font, cycleFont } = useTheme();

  const [mode, setMode] = useState<"usage" | "order">("usage");

  const [products, setProducts] = useState<AllFileProduct[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [entries, setEntries] = useState<EntryLine[]>(makeEntries());
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [orderEntries, setOrderEntries] = useState<OrderLine[]>(makeOrderEntries());
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
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

  const [stockSearch, setStockSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<AllFileProduct | null>(null);
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [stockActiveIndex, setStockActiveIndex] = useState(-1);
  const stockListRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0];
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
        .eq("BRANCH", "Boudoir")
        .gte("DATE", cutoff.toISOString().split("T")[0])
        .order("DATE", { ascending: false });
      if (error) console.error("Fetch log error:", error);
      if (data) setLog(data.sort((a: LogRow, b: LogRow) => b.DATE.localeCompare(a.DATE) || b.id - a.id));
    } catch (err) { console.error("Error fetching log:", err); }
  }, []);

  useEffect(() => { fetchProducts(); fetchLog(); }, [fetchProducts, fetchLog]);

  const handleSave = async () => {
    await fetchProducts();
    await fetchLog();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const sortedProducts = [...products].sort((a, b) =>
    a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"])
  );

  const filteredStockProducts = stockSearch.length > 0
    ? sortedProducts.filter(p => p["PRODUCT NAME"].toLowerCase().includes(stockSearch.toLowerCase()))
    : sortedProducts;

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
        const currentBalance = Number(product?.["BOUDOIR BALANCE"] ?? 0);
        const endingBalance = currentBalance - Number(entry.qty);

        // Log to AllFileLog
        const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": getDateStr(usageDate),
          "PRODUCT NAME": entry.productName,
          "BRANCH": "Boudoir",
          "SUPPLIER": null,
          "TYPE": entry.type,
          "STARTING BALANCE": currentBalance,
          "QTY": -Number(entry.qty),
          "ENDING BALANCE": endingBalance,
          "GRN": null,
          "OFFICE BALANCE": null,
        });
        if (logErr) { console.error("AllFileLog insert error:", logErr); setUsageError(logErr.message || "Log write failed — check console"); }

        // Update ALL AllFileProducts rows for this product
        await (supabase as any).from("AllFileProducts")
          .update({ "BOUDOIR BALANCE": endingBalance })
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
        .update({ "BOUDOIR BALANCE": row["STARTING BALANCE"] })
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
        .update({ "BOUDOIR BALANCE": row["STARTING BALANCE"] })
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
        .update({ "BOUDOIR BALANCE": newEndingBalance })
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
        .update({ "BOUDOIR BALANCE": row["STARTING BALANCE"] })
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
      const current = Number(product?.["BOUDOIR BALANCE"] ?? 0);
      const orderQty = Number(e.qty);
      return { productName: e.productName, current, orderQty, ending: current + orderQty };
    });

  const handleOrderSubmit = async () => {
    const valid = orderEntries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    setOrderError(null);
    setOrderSubmitting(true);

    // Generate GRN: BOU DDMMYY based on selected date
    const orderDateObj = new Date(getDateStr(orderDate));
    const dd = String(orderDateObj.getDate()).padStart(2, "0");
    const mm = String(orderDateObj.getMonth() + 1).padStart(2, "0");
    const yy = String(orderDateObj.getFullYear()).slice(-2);
    const grn = `BOU ${dd}${mm}${yy}`;

    try {
      for (const entry of valid) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const currentBranchBalance = Number(product?.["BOUDOIR BALANCE"] ?? 0);
        const endingBranchBalance = currentBranchBalance + Number(entry.qty);
        const currentOfficeBalance = Number(product?.["OFFICE BALANCE"] ?? 0);
        const endingOfficeBalance = currentOfficeBalance - Number(entry.qty);

        // Log to AllFileLog
        const { error: orderLogErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": getDateStr(orderDate),
          "PRODUCT NAME": entry.productName,
          "BRANCH": "Boudoir",
          "SUPPLIER": "Office",
          "TYPE": "Order",
          "STARTING BALANCE": currentBranchBalance,
          "QTY": Number(entry.qty),
          "ENDING BALANCE": endingBranchBalance,
          "GRN": grn,
          "OFFICE BALANCE": endingOfficeBalance,
        });
        if (orderLogErr) { console.error("AllFileLog order insert error:", orderLogErr); setOrderError(orderLogErr.message || "Log write failed — check console"); }

        // Update branch balance in AllFileProducts (ALL rows for this product)
        await (supabase as any).from("AllFileProducts")
          .update({ "BOUDOIR BALANCE": endingBranchBalance })
          .eq("PRODUCT NAME", entry.productName);

        // Update office balance in AllFileProducts (ALL rows for this product)
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
  const hasOrderNotification = log.filter(r => r.TYPE === "Order" && (r.DATE === today || r.DATE === tomorrow)).length > 0;

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
      const found = allTodayOrders.find((r: LogRow) => r.GRN);
      if (found) return found.GRN as string;
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      return `BOU ${dd}${mm}${yy}`;
    })();

    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(26, 26, 26);
    doc.text("BOUDOIR", margin, 58);
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

    // Rows — sorted alphabetically
    const sortedOrders = [...allTodayOrders].sort((a, b) =>
      a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"])
    );

    const rowH = 26;
    let y = tableTop + 16;
    let totalQty = 0;

    sortedOrders.forEach((row, idx) => {
      totalQty += row.QTY;
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
      doc.text(row["PRODUCT NAME"], nameX, y + 14);
      doc.text(String(row["STARTING BALANCE"]), oldCX, y + 14, { align: "center" });
      doc.text(String(row.QTY), qtyCX, y + 14, { align: "center" });
      doc.text(String(row["ENDING BALANCE"]), endCX, y + 14, { align: "center" });
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
      ...allTodayOrders.map(r => [r["PRODUCT NAME"], r["STARTING BALANCE"], r.QTY, r["ENDING BALANCE"]])
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
    <div className="min-h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <div className="max-w-[1100px] mx-auto px-5">
        {/* Top bar */}
        <div className="flex justify-between items-center py-6 border-b" style={{ borderColor: border }}>
          <button
            onClick={() => navigate("/prices")}
            className="flex items-center gap-2 text-[13px] tracking-[0.15em] uppercase text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            <span>OFFICE</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] tracking-[0.2em] uppercase"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Boudoir
              </span>
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
            <ThemeToggle theme={theme} toggle={toggle} font={font} cycleFont={cycleFont} />
          </div>
        </div>

        <div className="py-12">

          {/* ── SECTION 1: Current Stock ── */}
          <div className="mb-12">
            <div className="mb-6">
              <div className="flex items-end justify-between">
                <div>
                <h1 className="text-[11px] font-normal tracking-[0.2em] uppercase text-dim mb-1">Current Stock</h1>
                  <p className="text-[28px] font-light tracking-tight">
                    {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                <span
                  className="nav-link mb-1"
                  style={{ color: saveFlash ? "hsl(var(--green))" : "hsl(var(--foreground))" }}
                  onClick={handleSave}
                >
                  {saveFlash ? "✓ Saved" : "Save"} &nbsp;<Lock size={13} className="inline -mt-0.5" />
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] tracking-wider uppercase" style={dim}>{products.length} products · Boudoir</p>
                {mode === "order" && (
                  <span
                    className="nav-link relative"
                    style={{ color: "hsl(var(--foreground))" }}
                    onClick={() => setShowOrderSummaryPanel(true)}
                  >
                    Order Summary &nbsp;<FileText size={13} className="inline -mt-0.5" />
                    {hasOrderNotification && (
                      <span className="absolute -top-1 -right-0 w-2 h-2 rounded-full" style={{ background: "hsl(var(--green))" }} />
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Stock search bar with keyboard nav */}
            <div className="relative mb-6">
              <div className="flex items-center gap-3 border-b pb-2" style={{ borderColor: borderActive }}>
                <Search size={13} style={dim} />
                <input
                  type="text"
                  className="flex-1 bg-transparent outline-none text-[15px] font-light"
                  placeholder="Search product..."
                  value={stockSearch}
                  onChange={e => { setStockSearch(e.target.value); setSelectedProduct(null); setShowStockDropdown(true); }}
                  onFocus={() => setShowStockDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStockDropdown(false), 150)}
                  onKeyDown={handleStockKeyDown}
                />
                {stockSearch && (
                  <button onClick={() => { setStockSearch(""); setSelectedProduct(null); }} style={dim}><X size={13} /></button>
                )}
              </div>
              {showStockDropdown && filteredStockProducts.length > 0 && (
                <div
                  ref={stockListRef}
                  className="absolute top-full left-0 right-0 z-50 border max-h-[220px] overflow-y-auto scrollbar-thin"
                  style={{ background: "hsl(var(--popover))", borderColor: borderActive, marginTop: "2px" }}
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
                      <span className="text-[13px] font-light">{row["PRODUCT NAME"]}</span>
                      <span className="text-[12px]" style={{ color: "hsl(var(--foreground))" }}>{row["BOUDOIR BALANCE"]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (() => {
              const productLog = log.filter(r => r["PRODUCT NAME"] === selectedProduct["PRODUCT NAME"]);
              const fmtPrice = (val: number | null | undefined) => {
                if (!val || val < 0.01) return "—";
                return `RM ${val.toFixed(2)}`;
              };
              return (
                <div className="surface-box p-6">
                  {/* Balance row */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[11px] tracking-wider uppercase mb-1" style={dim}>Current Balance</p>
                      <p className="text-[15px] font-light">{selectedProduct["PRODUCT NAME"]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[32px] font-light leading-none" style={{
                        color: selectedProduct["BOUDOIR BALANCE"] <= 1 ? "hsl(var(--red))" : "hsl(var(--foreground))"
                      }}>{selectedProduct["BOUDOIR BALANCE"]}</p>
                      <p className="text-[10px] tracking-wider uppercase mt-1" style={dim}>units</p>
                    </div>
                  </div>

                  {/* Staff & Customer prices */}
                  <div className="flex items-center gap-6 mb-6 pt-4 border-t" style={{ borderColor: border }}>
                    <div>
                      <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Staff Price</p>
                      <p className="text-[15px] font-light">{fmtPrice(selectedProduct["STAFF PRICE"])}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-wider uppercase mb-1" style={dim}>Customer Price</p>
                      <p className="text-[15px] font-light">{fmtPrice(selectedProduct["CUSTOMER PRICE"])}</p>
                    </div>
                  </div>

                  {/* Recent activity for this product */}
                  {productLog.length > 0 && (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: border }}>
                          <th className="label-uppercase font-normal text-left pb-2 pt-1">Date</th>
                          <th className="label-uppercase font-normal text-left pb-2 pt-1">Product</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Branch</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Supplier</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Qty</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Office Bal</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">GRN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productLog.map(row => (
                          <tr key={row.id} className="border-b" style={{ borderColor: border }}>
                            <td className="text-[12px] font-light py-2" style={dim}>
                              {new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </td>
                            <td className="text-[12px] font-light py-2">{row["PRODUCT NAME"]}</td>
                            <td className="text-[11px] font-light py-2 text-center tracking-wider uppercase" style={dim}>{row.BRANCH}</td>
                            <td className="text-[11px] font-light py-2 text-center" style={dim}>{row.SUPPLIER || "—"}</td>
                            <td className="text-[12px] font-light py-2 text-center" style={{ color: row.QTY < 0 ? "hsl(var(--red))" : "hsl(var(--green))" }}>
                              {row.QTY > 0 ? "+" : ""}{row.QTY}
                            </td>
                            <td className="text-[12px] font-light py-2 text-center">{row["OFFICE BALANCE"] ?? "—"}</td>
                            <td className="text-[11px] font-light py-2 text-center" style={dim}>{row.GRN || "—"}</td>
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
          <div className="mb-12">

            {/* Tab buttons */}
            <div className="flex items-center border-b mb-8" style={{ borderColor: border }}>
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
            </div>

            {/* ── Daily Usage panel ── */}
            {mode === "usage" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] tracking-wider uppercase" style={dim}>Enter today's stock movements</p>
                  <DatePicker value={usageDate} onChange={setUsageDate} />
                </div>
                {/* Column headers */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 flex-shrink-0" />
                  <div className="flex-1"><span className="text-[10px] tracking-wider uppercase" style={dim}>Product</span></div>
                  <div className="flex-shrink-0 text-center" style={{width:"110px"}}><span className="text-[10px] tracking-wider uppercase" style={dim}>Type</span></div>
                  <div className="flex-shrink-0 text-center" style={{width:"106px"}}><span className="text-[10px] tracking-wider uppercase" style={dim}>Qty</span></div>
                  <div className="w-[13px] flex-shrink-0" />
                </div>
                <div className="space-y-3 mb-5">
                  {entries.map((entry, idx) => (
                    <div key={entry.id} className="flex items-stretch gap-2">
                      <span className="text-[10px] w-4 text-right flex-shrink-0 pt-2.5" style={dim}>{idx + 1}</span>
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
                      />
                      <TypeDropdown
                        entry={entry}
                        onSelect={type => updateEntry(entry.id, { type, showTypeDropdown: false })}
                        onToggle={() => {
                          closeAllDropdowns(entry.id, "type");
                          updateEntry(entry.id, { showTypeDropdown: !entry.showTypeDropdown, showProductDropdown: false });
                        }}
                        onClose={() => updateEntry(entry.id, { showTypeDropdown: false })}
                      />
                      <div className="flex items-center flex-shrink-0 h-[34px]" style={{ border: `1px solid ${borderActive}`, background: cardBg }}>
                        <button onClick={() => updateEntry(entry.id, { qty: Math.max(1, entry.qty - 1) })}
                          className="px-2 py-2 transition-colors" style={dim}
                          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                          <ChevronLeft size={13} />
                        </button>
                        <span className="text-[13px] font-light px-3 min-w-[32px] text-center">{entry.qty}</span>
                        <button onClick={() => updateEntry(entry.id, { qty: entry.qty + 1 })}
                          className="px-2 py-2 transition-colors" style={dim}
                          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                      <button onClick={() => removeEntry(entry.id)} className="flex-shrink-0 transition-colors pt-2.5" style={dim}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                        onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addEntry}
                  className="flex items-center gap-1.5 mb-7 text-[11px] tracking-wider uppercase transition-colors" style={dim}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                  <Plus size={11} /> Add another product
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="minimal-btn" style={{ opacity: submitting ? 0.5 : 1 }}>
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
                {/* Column headers */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 flex-shrink-0" />
                  <div className="flex-1"><span className="text-[10px] tracking-wider uppercase" style={dim}>Product</span></div>
                  <div className="flex-shrink-0" style={{width:"60px", textAlign:"center"}}><span className="text-[10px] tracking-wider uppercase" style={dim}>Balance</span></div>
                  <div className="flex-shrink-0 text-center" style={{width:"106px"}}><span className="text-[10px] tracking-wider uppercase" style={dim}>Order Qty</span></div>
                  <div className="w-[13px] flex-shrink-0" />
                </div>
                <div className="space-y-3 mb-5">
                  {orderEntries.map((entry, idx) => {
                    const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
                    const currentBal = product?.["BOUDOIR BALANCE"] ?? null;
                    return (
                      <div key={entry.id} className="flex items-stretch gap-2">
                        <span className="text-[10px] w-4 text-right flex-shrink-0 pt-2.5" style={dim}>{idx + 1}</span>
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
                        />
                        {/* Current balance box */}
                        <div
                          className="flex items-center justify-center flex-shrink-0 h-[34px]" style={{width:"60px", border: `1px solid ${border}`, background: cardBg}}
                        >
                          <span className="text-[13px] font-light" style={currentBal === null ? dim : { color: "hsl(var(--foreground))" }}>
                            {currentBal === null ? "—" : currentBal}
                          </span>
                        </div>
                        {/* Qty stepper */}
                        <div className="flex items-center flex-shrink-0 h-[34px]" style={{ width: "106px", border: `1px solid ${borderActive}`, background: cardBg }}>
                          <button onClick={() => updateOrderEntry(entry.id, { qty: Math.max(1, entry.qty - 1) })}
                            className="px-2 py-2 transition-colors" style={dim}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                            <ChevronLeft size={13} />
                          </button>
                          <span className="text-[13px] font-light px-3 min-w-[32px] text-center">{entry.qty}</span>
                          <button onClick={() => updateOrderEntry(entry.id, { qty: entry.qty + 1 })}
                            className="px-2 py-2 transition-colors" style={dim}
                            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                        <button onClick={() => removeOrderEntry(entry.id)} className="flex-shrink-0 transition-colors pt-2.5" style={dim}
                          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                          <X size={13} />
                        </button>
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
                <button onClick={handleOrderSubmit} disabled={orderSubmitting} className="minimal-btn" style={{ opacity: orderSubmitting ? 0.5 : 1 }}>
                  {orderSubmitting ? "Saving..." : "Submit Order"}
                </button>
                {orderSuccess && (
                  <p className="text-[11px] mt-3 tracking-wider" style={{ color: "hsl(var(--green))" }}>✓ Order applied successfully</p>
                )}
                {orderError && (
                  <p className="text-[11px] mt-3 tracking-wider" style={{ color: "hsl(var(--red))" }}>✗ {orderError}</p>
                )}

                {/* Order Summary — preview before submit */}
                {orderSummary.length > 0 && (
                  <div className="mt-10">
                    <div className="mb-5">
                      <h2 className="text-[22px] font-light tracking-tight">Order Summary</h2>
                      <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>Preview before submitting</p>
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
                            <td className="text-[13px] font-light py-3 text-center" style={{ color: "hsl(var(--green))" }}>{row.orderQty}</td>
                            <td className="text-[13px] font-light py-3 text-center">{row.ending}</td>
                            <td className="py-3 text-center" />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Submitted Orders — today only, with reverse button */}
                {todayOrders.length > 0 && orderSummary.length === 0 && (
                  <div className="mt-10">
                    <div className="mb-5">
                      <h2 className="text-[22px] font-light tracking-tight">Order Summary</h2>
                      <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>
                        {latestOrderDate === tomorrow ? "Tomorrow's order" : latestOrderDate === today ? "Submitted today" : new Date(latestOrderDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — click × to reverse
                      </p>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: borderActive }}>
                          <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">Starting Bal</th>
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">Order Qty</th>
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">Ending Bal</th>
                          <th className="w-6" />
                        </tr>
                      </thead>
                      <tbody>
                        {todayOrders.map(row => (
                          <tr key={row.id} className="border-b table-row-hover" style={{ borderColor: border }}>
                            <td className="text-[13px] font-light py-3">{row["PRODUCT NAME"]}</td>
                            <td className="text-[13px] font-light py-3 text-center" style={dim}>{row["STARTING BALANCE"]}</td>
                            <td className="text-[13px] font-light py-3 text-center" style={{ color: "hsl(var(--green))" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</td>
                            <td className="text-[13px] font-light py-3 text-center">{row["ENDING BALANCE"]}</td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => reverseOrder(row)}
                                disabled={reversing === row.id}
                                className="transition-colors"
                                style={{ color: "hsl(var(--muted-foreground))", opacity: reversing === row.id ? 0.4 : 1 }}
                                onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                                onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

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
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">Starting Bal</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">Qty</th>
                            <th className="label-uppercase font-normal text-center pb-3 pt-2">Ending Bal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Recent rows (≤7 days) — shown individually */}
                          {recentRows.map((row, idx) => {
                            const nextRow = recentRows[idx + 1];
                            const isDateBreak = (nextRow && nextRow.DATE !== row.DATE) || (!nextRow && olderDates.length > 0);
                            return (
                              <tr key={row.id} className="table-row-hover" style={{ borderBottom: `1px solid ${isDateBreak ? "hsl(var(--foreground))" : border}` }}>
                                <td className="text-[12px] font-light py-3">
                                  {new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                </td>
                                <td className="text-[13px] font-light py-3">{row["PRODUCT NAME"]}</td>
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
                                  <td className="text-[12px] font-light py-3" style={dim}>
                                    {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </td>
                                  <td className="text-[12px] font-light py-3" style={dim}>
                                    {rows.length} {rows.length === 1 ? "item" : "items"}
                                  </td>
                                  <td colSpan={2} />
                                  <td className="py-3 text-center">
                                    <span style={{ ...dim, fontSize: "11px", display: "inline-block", transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                                  </td>
                                </tr>
                                {isExpanded && rows.map((row, ri) => (
                                  <tr key={row.id} className="table-row-hover" style={{ borderBottom: `1px solid ${ri === rows.length - 1 ? (isLast ? border : "hsl(var(--foreground))") : border}`, background: "hsl(var(--card))" }}>
                                    <td className="text-[12px] font-light py-2.5 pl-2" style={dim}>—</td>
                                    <td className="text-[13px] font-light py-2.5">{row["PRODUCT NAME"]}</td>
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

          {/* ── SECTION 3: Recent Activity (Daily Usage mode only) ── */}
          {mode === "usage" && (
            <div>
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
                          style={{ color: "hsl(var(--muted-foreground))" }}
                          onClick={() => setDateSortAsc(prev => !prev)}
                          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                        >Date</th>
                        <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                        <th className="label-uppercase font-normal text-center pb-3 pt-2">Type</th>
                        <th className="label-uppercase font-normal text-center pb-3 pt-2">Qty</th>
                        <th className="label-uppercase font-normal text-center pb-3 pt-2">Ending Bal</th>
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {/* Recent rows (≤7 days) — shown individually */}
                      {recentRows.map((row, idx) => {
                        const canReverse = row.DATE === today || row.DATE === yesterdayStr;
                        const nextRow = recentRows[idx + 1];
                        const isDateBreak = (nextRow && nextRow.DATE !== row.DATE) || (!nextRow && olderDates.length > 0);
                        return (
                          <tr key={row.id} className="table-row-hover" style={{ borderBottom: `1px solid ${isDateBreak ? "hsl(var(--foreground))" : border}` }}>
                            <td className="text-[12px] font-light py-3">
                              {new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </td>
                            <td className="text-[13px] font-light py-3 text-dim">{row["PRODUCT NAME"]}</td>
                            <td className="text-[11px] font-light py-3 text-center tracking-wider uppercase" style={dim}>{row.TYPE}</td>
                            <td className="text-[13px] font-light py-3 text-center" style={{ color: row.QTY < 0 ? "hsl(var(--red))" : "hsl(var(--green))" }}>{row.QTY}</td>
                            <td className="text-[13px] font-light py-3 text-center">{row["ENDING BALANCE"]}</td>
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
                              <td className="text-[12px] font-light py-3" style={dim}>
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
                                <td className="text-[12px] font-light py-2.5 pl-2" style={dim}>—</td>
                                <td className="text-[13px] font-light py-2.5 text-dim">{row["PRODUCT NAME"]}</td>
                                <td className="text-[11px] font-light py-2.5 text-center tracking-wider uppercase" style={dim}>{row.TYPE}</td>
                                <td className="text-[13px] font-light py-2.5 text-center" style={{ color: row.QTY < 0 ? "hsl(var(--red))" : "hsl(var(--green))" }}>{row.QTY}</td>
                                <td className="text-[13px] font-light py-2.5 text-center">{row["ENDING BALANCE"]}</td>
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

      {/* ── Order Summary Panel ── */}
      {showOrderSummaryPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowOrderSummaryPanel(false)}>
          <div
            className="h-full w-full max-w-[480px] overflow-y-auto p-8"
            style={{ background: "hsl(var(--background))", borderLeft: `1px solid hsl(var(--border))` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[22px] font-light tracking-tight">Order Summary</h2>
                <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>
                  {latestOrderDate === tomorrow ? "Tomorrow" : latestOrderDate === today ? "Today" : new Date(latestOrderDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {allTodayOrders.length > 0 && ` · ${allTodayOrders.length} ${allTodayOrders.length === 1 ? "item" : "items"}`}
                </p>
              </div>
              <button onClick={() => setShowOrderSummaryPanel(false)} style={dim}
                onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                <X size={16} />
              </button>
            </div>

            {/* ── Most recent order (editable) ── */}
            {allTodayOrders.length === 0 ? (
              <p className="text-[13px]" style={dim}>No orders submitted yet.</p>
            ) : (
              <>
                <p className="text-[10px] tracking-wider uppercase mb-4" style={dim}>Click qty to edit · × to remove line</p>
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
                    {allTodayOrders.map(row => {
                      const isEditing = editingOrderRow === row.id;
                      const isSaving = savingOrderEdit === row.id;
                      const parsedEdit = parseInt(editingOrderQty);
                      const previewBal = isEditing && !isNaN(parsedEdit)
                        ? row["STARTING BALANCE"] + parsedEdit
                        : row["ENDING BALANCE"];
                      return (
                        <tr key={row.id} className="border-b" style={{ borderColor: "hsl(var(--border))", opacity: isSaving ? 0.4 : 1, transition: "opacity 0.15s" }}>
                          <td className="text-[13px] font-light py-3">{row["PRODUCT NAME"]}</td>
                          <td className="text-[13px] font-light py-3 text-center" style={dim}>{row["STARTING BALANCE"]}</td>
                          <td className="text-[13px] font-light py-3 text-center">
                            {isEditing ? (
                              <input
                                autoFocus
                                type="number"
                                min={1}
                                className="text-[13px] font-light text-center bg-transparent outline-none border-b w-[40px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                style={{ borderColor: "hsl(var(--border-active))", color: "hsl(var(--green))" }}
                                value={editingOrderQty}
                                onChange={e => setEditingOrderQty(e.target.value)}
                                onClick={e => (e.target as HTMLInputElement).select()}
                                onBlur={() => handleOrderQtyEdit(row, parsedEdit)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleOrderQtyEdit(row, parsedEdit);
                                  if (e.key === "Escape") setEditingOrderRow(null);
                                }}
                              />
                            ) : (
                              <span
                                className="cursor-pointer"
                                style={{ color: "hsl(var(--green))" }}
                                title="Click to edit"
                                onClick={() => { setEditingOrderRow(row.id); setEditingOrderQty(String(row.QTY)); }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                              >+{row.QTY}</span>
                            )}
                          </td>
                          <td className="text-[13px] font-light py-3 text-center" style={isEditing ? dim : {}}>{previewBal}</td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => handleOrderRowDelete(row)}
                              disabled={isSaving}
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
              </>
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
                      <th className="w-8" />
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
                          <td className="text-[12px] font-light py-3" style={dim}>
                            {new Date(group.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </td>
                          <td className="text-[12px] font-light py-3 text-center" style={dim}>{group.grn}</td>
                          <td className="text-[12px] font-light py-3 text-center" style={dim}>{group.rows.length}</td>
                          <td className="py-3 text-center">
                            <span style={{ ...dim, fontSize: "11px", display: "inline-block", transition: "transform 0.15s", transform: expandedGRNs.has(group.key) ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                          </td>
                        </tr>
                        {expandedGRNs.has(group.key) && group.rows.map((row, ri) => (
                          <tr key={row.id} className="border-b" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
                            <td className="text-[12px] font-light py-2.5 pl-2" style={dim}>—</td>
                            <td className="text-[13px] font-light py-2.5" colSpan={2}>{row["PRODUCT NAME"]}</td>
                            <td className="text-[12px] font-light py-2.5 text-center" style={{ color: "hsl(var(--green))" }}>+{row.QTY}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
