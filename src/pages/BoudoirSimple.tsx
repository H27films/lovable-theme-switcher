import { createPortal } from "react-dom";
import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Check, Search, Star, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, Download } from "lucide-react";
import { USAGE_TYPES, makeIsFavourite, UsageType, isYes } from "@/lib/branchSimpleUtils";
import jsPDF from "jspdf";

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
  "BOUDOIR FAVOURITE": string | boolean | null;
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
  GRN?: string;
  "OFFICE BALANCE"?: number;
}

interface EntryLine {
  id: number;
  productName: string;
  type: UsageType;
  qty: number;
}

interface CashRow {
  id: number;
  Branch: string;
  "Total GST": number | null;
  Credit: number | null;
  QR: number | null;
  Cash: number | null;
  Date: string;
  Error: number | null;
  Explanation: string | null;
}

interface CashEntryState {
  date: string;
  totalGST: string;
  credit: string;
  qr: string;
  cashOverride: string;
  error: string;
  errorNote: string;
  expanded: boolean;
  existingId?: number;
}

interface BoudoirSimpleProps {
  onBack?: () => void;
  onBackToMain?: () => void;
  products?: OfficeProduct[];
}
const isBoudoirFav = makeIsFavourite("BOUDOIR FAVOURITE");

const BoudoirSimple = ({ onBack, onBackToMain, products: propProducts }: BoudoirSimpleProps) => {
  const [products, setProducts] = useState<OfficeProduct[]>(propProducts || []);

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

  const [searchMode, setSearchMode] = useState<"idle" | "active" | "result">("idle");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);

  const toggleFavourite = async (product: OfficeProduct) => {
    const currentlyFav = isBoudoirFav(product);
    const newVal = !currentlyFav;
    await (supabase as any)
      .from("AllFileProducts")
      .update({ "BOUDOIR FAVOURITE": newVal })
      .eq("id", product.id);
    setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, "BOUDOIR FAVOURITE": newVal } : p)
    );
    setSelectedProduct(prev =>
      prev && prev.id === product.id ? { ...prev, "BOUDOIR FAVOURITE": newVal } : prev
    );
  };

  const [activePanel, setActivePanel] = useState<"USAGE" | "ORDER" | "CASH" | null>(null);

  const [usageEntries, setUsageEntries] = useState<EntryLine[]>([]);
  const [usageSearch, setUsageSearch] = useState("");
  const [showUsageDropdown, setShowUsageDropdown] = useState(false);
  const [usageSubmitting, setUsageSubmitting] = useState(false);
  const [usageSuccess, setUsageSuccess] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const usageInputRef = useRef<HTMLInputElement>(null);
  const [orderEntries, setOrderEntries] = useState<{ id: number; productName: string; qty: number }[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);
  const [pendingOrder, setPendingOrder] = useState<{
    grn: string; date: string;
    entries: { id: number; productName: string; starting: number; qty: number; ending: number }[];
  } | null>(null);
  const [orderConfirming, setOrderConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());
  const [editingPendingIdx, setEditingPendingIdx] = useState<number | null>(null);
  const [editingPendingQty, setEditingPendingQty] = useState("");
  const [grnNotes, setGrnNotes] = useState("");
  const [lastConfirmedEntries, setLastConfirmedEntries] = useState<Array<{productName: string; starting: number; qty: number; ending: number}> | null>(null);

  // Cash panel state
  const [cashEntries, setCashEntries] = useState<CashEntryState[]>([]);
  const [cashView, setCashView] = useState<"recent" | "month" | "deposit">("recent");
  const [cashLog, setCashLog] = useState<CashRow[]>([]);
  const [loadingCashLog, setLoadingCashLog] = useState(false);
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [cashSuccess, setCashSuccess] = useState(false);
  const [cashError, setCashError] = useState<string | null>(null);
  const [editingLogCell, setEditingLogCell] = useState<{id: number, col: string} | null>(null);
  const [editingLogValue, setEditingLogValue] = useState("");

  // Deposit tab state
  const [depStart, setDepStart] = useState<string>("");
  const [depEnd, setDepEnd] = useState<string>("");
  const [depCashTotal, setDepCashTotal] = useState<number | null>(null);
  const [depLoading, setDepLoading] = useState(false);
  const [denomCounts, setDenomCounts] = useState<Record<string,string>>({
    "100": "", "50": "", "20": "", "10": "", "5": "", "1": "", "coins": ""
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const BRANCH_NAME = "BOUDOIR";
  const BALANCE_KEY = "BOUDOIR BALANCE" as keyof OfficeProduct;
  const BRANCH_LOG_NAME = "Boudoir";

  const [branchLog, setBranchLog] = useState<LogRow[]>([]);
  const [loadingBranchLog, setLoadingBranchLog] = useState(true);
  const [productLog, setProductLog] = useState<LogRow[]>([]);
  const [loadingProductLog, setLoadingProductLog] = useState(false);
  const [reversing, setReversing] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<LogRow | null>(null);
  const [confirmPos, setConfirmPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    setLoadingBranchLog(true);
    (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("BRANCH", BRANCH_LOG_NAME)
      .order("DATE", { ascending: false })
      .limit(200)
      .then(({ data }: { data: LogRow[] | null }) => {
        setBranchLog(data || []);
        setLoadingBranchLog(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedProduct) { setProductLog([]); return; }
    setLoadingProductLog(true);
    (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"])
      .eq("BRANCH", BRANCH_LOG_NAME)
      .order("DATE", { ascending: false })
      .limit(200)
      .then(({ data }: { data: LogRow[] | null }) => {
        setProductLog(data || []);
        setLoadingProductLog(false);
      });
  }, [selectedProduct]);

  useEffect(() => {
    if (activePanel !== "CASH") return;
    const fetchCashData = async () => {
      setLoadingCashLog(true);
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const fromDate = thirtyDaysAgo < monthStart ? thirtyDaysAgo : monthStart;
      const fromDateStr = fromDate.toISOString().split("T")[0];
      const { data } = await (supabase as any)
        .from("Cash")
        .select("*")
        .eq("Branch", "Boudoir")
        .gte("Date", fromDateStr)
        .order("Date", { ascending: false });
      const rows: CashRow[] = data || [];
      setCashLog(rows);
      setLoadingCashLog(false);
      const entries: CashEntryState[] = [];
      for (let i = 0; i < 1; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const existing = rows.find(r => r.Date === dateStr);
        entries.push({
          date: dateStr,
          totalGST: existing ? String(existing["Total GST"] ?? "") : "",
          credit: existing ? String(existing["Credit"] ?? "") : "",
          qr: existing ? String(existing["QR"] ?? "") : "",
          cashOverride: "",
          error: existing ? String(existing["Error"] ?? "") : "",
          errorNote: existing ? String(existing["Explanation"] ?? "") : "",
          expanded: !!(existing?.Error),
          existingId: existing?.id,
        });
      }
      setCashEntries(entries);
    };
    fetchCashData();
  }, [activePanel]);

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
        setProductLog(freshPLog || []);
      }
      // Refresh branch log
      const { data: freshBLog } = await (supabase as any)
        .from("AllFileLog").select("*").eq("BRANCH", BRANCH_LOG_NAME)
        .order("DATE", { ascending: false }).limit(50);
      setBranchLog(freshBLog || []);
    } catch (err) {
      console.error("Reverse row error:", err);
    }
    setReversing(null);
  };

  const activeLog = selectedProduct ? productLog : branchLog;
  const loadingLog = selectedProduct ? loadingProductLog : loadingBranchLog;

  const usageFiltered = usageSearch.length > 0
    ? products.filter(p =>
        p["PRODUCT NAME"].toLowerCase().includes(usageSearch.toLowerCase()) &&
        (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
      )
    : products.filter(p => p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1);

  const usageFavs    = usageFiltered.filter(p =>  isBoudoirFav(p));
  const usageColours = usageFiltered.filter(p => !isBoudoirFav(p) &&  isYes(p["Colour"]));
  const usageRegular = usageFiltered.filter(p => !isBoudoirFav(p) && !isYes(p["Colour"]));

  const orderFiltered = orderSearch.length > 0
    ? products.filter(p => p["PRODUCT NAME"].toLowerCase().includes(orderSearch.toLowerCase()))
    : products;
  const orderFavs    = orderFiltered.filter(p =>  isBoudoirFav(p));
  const orderColours = orderFiltered.filter(p => !isBoudoirFav(p) &&  isYes(p["Colour"]));
  const orderRegular = orderFiltered.filter(p => !isBoudoirFav(p) && !isYes(p["Colour"]));

  const handleAddUsageProduct = (p: OfficeProduct) => {
    const existing = usageEntries.find(e => e.productName === p["PRODUCT NAME"]);
    if (!existing) {
      setUsageEntries(prev => [...prev, {
        id: Date.now(),
        productName: p["PRODUCT NAME"],
        type: "Salon Use",
        qty: 1,
      }]);
    }
    setUsageSearch("");
    setShowUsageDropdown(false);
    usageInputRef.current?.blur();
  };

  const dismissUsageDropdown = () => {
    setShowUsageDropdown(false);
    setUsageSearch("");
    usageInputRef.current?.blur();
  };

  const handleAddOrderProduct = (p: OfficeProduct) => {
    const existing = orderEntries.find(e => e.productName === p["PRODUCT NAME"]);
    if (!existing) {
      setOrderEntries(prev => [...prev, { id: Date.now(), productName: p["PRODUCT NAME"], qty: 1 }]);
    }
    setOrderSearch("");
    setShowOrderDropdown(false);
    orderInputRef.current?.blur();
  };

  const dismissOrderDropdown = () => {
    setShowOrderDropdown(false);
    setOrderSearch("");
    orderInputRef.current?.blur();
  };

  const handleOrderSubmit = () => {
    const valid = orderEntries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yy = String(today.getFullYear()).slice(-2);
    const grn = `BOU ${dd}${mm}${yy}`;
    const dateStr = today.toISOString().split("T")[0];
    const entries = valid.map(entry => {
      const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
      const starting = Number((product as any)?.[BALANCE_KEY] ?? 0);
      return { id: entry.id, productName: entry.productName, starting, qty: entry.qty, ending: starting + entry.qty };
    });
    setPendingOrder({ grn, date: dateStr, entries });
    setOrderError(null);
  };

  const handleConfirmOrder = async () => {
    if (!pendingOrder) return;
    setOrderConfirming(true);
    setOrderError(null);
    let hasError = false;
    try {
      for (const entry of pendingOrder.entries) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const currentOfficeBalance = Number(product?.["OFFICE BALANCE"] ?? 0);
        const endingOfficeBalance = currentOfficeBalance - entry.qty;
        const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": pendingOrder.date,
          "PRODUCT NAME": entry.productName,
          "BRANCH": BRANCH_LOG_NAME,
          "SUPPLIER": "Office",
          "TYPE": "Order",
          "STARTING BALANCE": entry.starting,
          "QTY": entry.qty,
          "ENDING BALANCE": entry.ending,
          "GRN": pendingOrder.grn,
          "OFFICE BALANCE": endingOfficeBalance,
        });
        if (logErr) { setOrderError(logErr.message || "Write failed"); hasError = true; break; }
        await (supabase as any).from("AllFileProducts")
          .update({ [BALANCE_KEY]: entry.ending })
          .eq("PRODUCT NAME", entry.productName);
        await (supabase as any).from("AllFileProducts")
          .update({ "OFFICE BALANCE": endingOfficeBalance })
          .eq("PRODUCT NAME", entry.productName);
        setProducts(prev => prev.map(p =>
          p["PRODUCT NAME"] === entry.productName
            ? { ...p, [BALANCE_KEY]: entry.ending, "OFFICE BALANCE": endingOfficeBalance }
            : p
        ));
      }
      if (!hasError) {
        setOrderEntries([]);
        setPendingOrder(null);
        setGrnNotes("");
        setConfirmSuccess(true);
        setTimeout(() => setConfirmSuccess(false), 3000);
        const { data: freshBLog } = await (supabase as any)
          .from("AllFileLog").select("*").eq("BRANCH", BRANCH_LOG_NAME)
          .order("DATE", { ascending: false }).limit(200);
        setBranchLog(freshBLog || []);
      }
    } catch (err: any) {
      setOrderError(err?.message || "Unknown error");
    }
    setOrderConfirming(false);
  };


  const generateGRNPdf = (entries: Array<{productName: string; starting: number; qty: number; ending: number}>, grn: string) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = 595;
    const margin = 50;
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(26, 26, 26);
    doc.text("BOUDOIR", margin, 58);
    doc.text("GOODS RECEIVED NOTE", W - margin, 58, { align: "right" });
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.8);
    doc.line(margin, 64, W - margin, 64);
    // Address
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
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
    doc.text(grn, margin + 120, 143);
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
    const numX  = margin;
    const nameX = margin + 30;
    const oldCX = margin + 285;
    const qtyCX = margin + 355;
    const endCX = margin + 427;
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
    // Rows
    const sorted = [...entries].sort((a, b) => a.productName.localeCompare(b.productName));
    const rowH = 26;
    let y = tableTop + 16;
    let totalQty = 0;
    sorted.forEach((row, idx) => {
      totalQty += row.qty;
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 2, W - 2 * margin, rowH, "F");
      }
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.4);
      doc.line(margin, y + rowH - 2, W - margin, y + rowH - 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(String(idx + 1), numX + 10, y + 14, { align: "center" });
      doc.setFontSize(9.5);
      doc.setTextColor(38, 38, 38);
      doc.text(row.productName, nameX, y + 14);
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
    // Signatures
    const pageH = 842;
    const sigY = Math.max(y + 70, pageH - 110);
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
    doc.save(`${grn} - GRN.pdf`);
  };

  const exportDepositCsv = () => {
    if (!depStart || !depEnd) return;
    const start = depStart <= depEnd ? depStart : depEnd;
    const end = depStart <= depEnd ? depEnd : depStart;
    const rows = cashLog
      .filter(r => r.Branch === "Boudoir" && r.Date >= start && r.Date <= end)
      .sort((a, b) => a.Date.localeCompare(b.Date));
    const headers = ["Date", "Total GST", "Credit", "QR", "Cash", "Error", "Explanation"];
    const csvRows = [
      headers.join(","),
      ...rows.map(r => [
        r.Date,
        r["Total GST"] ?? "",
        r.Credit ?? "",
        r.QR ?? "",
        r.Cash ?? "",
        r.Error ?? "",
        `"${(r.Explanation ?? "").replace(/"/g, '""')}"`
      ].join(","))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Boudoir_Deposit_${start}_to_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = (entries: Array<{productName: string; starting: number; qty: number; ending: number}>, grn: string) => {
    const rows = [
      ["Product Name", "Starting Balance", "Order Qty", "Ending Balance"],
      ...entries.map(e => [e.productName, e.starting, e.qty, e.ending])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${grn}-order.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetOrder = () => {
    setPendingOrder(null);
    setOrderError(null);
    setGrnNotes("");
  };

  const toggleGRN = (key: string) => {
    setExpandedGRNs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allOrderGroups = (() => {
    const orders = branchLog.filter(r => r.TYPE === "Order");
    const seen = new Map<string, LogRow[]>();
    orders.forEach(r => {
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

  const cycleType = (id: number) => {
    setUsageEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const idx = USAGE_TYPES.indexOf(e.type);
      return { ...e, type: USAGE_TYPES[(idx + 1) % USAGE_TYPES.length] };
    }));
  };

  const handleUsageSubmit = async () => {
    const valid = usageEntries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    setUsageError(null);
    setUsageSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      for (const entry of valid) {
        const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
        const currentBalance = Number((product as any)?.[BALANCE_KEY] ?? 0);
        const endingBalance = currentBalance - entry.qty;
        const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": today,
          "PRODUCT NAME": entry.productName,
          "BRANCH": BRANCH_LOG_NAME,
          "SUPPLIER": null,
          "TYPE": entry.type,
          "STARTING BALANCE": currentBalance,
          "QTY": -entry.qty,
          "ENDING BALANCE": endingBalance,
          "GRN": null,
          "OFFICE BALANCE": Number(product?.["OFFICE BALANCE"] ?? 0),
        });
        if (logErr) { setUsageError(logErr.message || "Write failed"); break; }
        await (supabase as any).from("AllFileProducts")
          .update({ [BALANCE_KEY]: endingBalance })
          .eq("PRODUCT NAME", entry.productName);
      }
      if (!usageError) {
        setUsageEntries([]);
        setUsageSuccess(true);
        setTimeout(() => setUsageSuccess(false), 3000);
        const { data } = await (supabase as any)
          .from("AllFileLog").select("*").eq("BRANCH", BRANCH_LOG_NAME)
          .order("DATE", { ascending: false }).limit(50);
        setBranchLog(data || []);
      }
    } catch (err: any) {
      setUsageError(err?.message || "Unknown error");
    }
    setUsageSubmitting(false);
  };

  const cashLogFiltered = React.useMemo(() => {
    if (cashView === "recent") {
      return [...cashLog].sort((a, b) => b.Date.localeCompare(a.Date)).slice(0, 7);
    } else {
      const now = new Date();
      return cashLog.filter(r => { const d = new Date(r.Date + "T00:00:00"); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
    }
  }, [cashLog, cashView]);

  const monthGSTTotal = React.useMemo(() => {
    const now = new Date();
    return cashLog
      .filter(r => { const d = new Date(r.Date + "T00:00:00"); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
      .reduce((sum, r) => sum + (Number(r["Total GST"]) || 0), 0);
  }, [cashLog]);

  const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });
  const currentMonthDates = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const days: string[] = [];
    for (let d = 1; d <= today.getDate(); d++) {
      days.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
    }
    return days.reverse(); // newest first
  }, []);

  // Deposit: compute cash total from cashLog when date range changes
  React.useEffect(() => {
    if (!depStart || !depEnd) { setDepCashTotal(null); return; }
    const start = depStart <= depEnd ? depStart : depEnd;
    const end = depStart <= depEnd ? depEnd : depStart;
    const total = cashLog
      .filter(r => r.Date >= start && r.Date <= end)
      .reduce((sum, r) => sum + (Number(r["Cash"]) || 0), 0);
    setDepCashTotal(total);
  }, [depStart, depEnd, cashLog]);

  const denominations: Array<{key: string, label: string, value: number}> = [
    { key: "100", label: "RM 100", value: 100 },
    { key: "50",  label: "RM 50",  value: 50  },
    { key: "20",  label: "RM 20",  value: 20  },
    { key: "10",  label: "RM 10",  value: 10  },
    { key: "5",   label: "RM 5",   value: 5   },
    { key: "1",   label: "RM 1",   value: 1   },
    { key: "coins", label: "Coins", value: 1  },
  ];
  const denomTotal = denominations.reduce((sum, d) => {
    if (d.key === "coins") return sum + (parseFloat(denomCounts["coins"]) || 0);
    return sum + (parseInt(denomCounts[d.key] || "0") || 0) * d.value;
  }, 0);
  const denomDiff = depCashTotal !== null ? denomTotal - depCashTotal : null;

  const recentGSTTotal = React.useMemo(() => {
    return cashLogFiltered.reduce((sum, r) => sum + (Number(r["Total GST"]) || 0), 0);
  }, [cashLogFiltered]);

  const refreshCashLog = async () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const fromDate = sevenDaysAgo < monthStart ? sevenDaysAgo : monthStart;
    const fromDateStr = fromDate.toISOString().split("T")[0];
    const { data } = await (supabase as any)
      .from("Cash").select("*").eq("Branch", "Boudoir")
      .gte("Date", fromDateStr).order("Date", { ascending: false });
    setCashLog(data || []);
  };

  const handleDeleteCashEntry = async (entry: CashEntryState, idx: number) => {
    if (idx === 0) return; // cannot delete today
    setCashEntries(prev => prev.filter((_, i) => i !== idx));
    const existing = cashLog.find(r => r.Date === entry.date);
    if (existing?.id) {
      await (supabase as any).from("Cash").delete().eq("id", existing.id);
      setCashLog(prev => prev.filter(r => r.id !== existing.id));
    }
  };

  const handleLogCellSave = async (rowId: number, col: string, value: string) => {
    const numVal = parseFloat(value);
    const parsed: number | string = isNaN(numVal) ? value : numVal;
    try {
      await (supabase as any).from("Cash").update({ [col]: parsed }).eq("id", rowId);
      setCashLog(prev => prev.map(r => r.id === rowId ? { ...r, [col]: parsed } : r));
    } catch (_) {}
    setEditingLogCell(null);
    setEditingLogValue("");
  };

  const handleCashSubmit = async () => {
    const toSubmit = cashEntries.filter(e => e.totalGST !== "" || e.credit !== "" || e.qr !== "");
    if (!toSubmit.length) return;
    setCashSubmitting(true);
    setCashError(null);
    try {
      for (const entry of toSubmit) {
        const total = parseFloat(entry.totalGST) || 0;
        const credit = parseFloat(entry.credit) || 0;
        const qr = parseFloat(entry.qr) || 0;
        const err = parseFloat(entry.error) || 0;
        const cash = entry.cashOverride !== "" ? (parseFloat(entry.cashOverride) || 0) : total - credit - qr - err;
        const errVal = parseFloat(entry.error) || null;
        const payload = { Branch: "Boudoir", Date: entry.date, "Total GST": total, Credit: credit, QR: qr, Cash: cash, Error: errVal || null, Explanation: entry.errorNote || null };
        if (entry.existingId) {
          const { error: uErr } = await (supabase as any).from("Cash").update(payload).eq("id", entry.existingId);
          if (uErr) { setCashError(uErr.message || "Update failed"); break; }
        } else {
          const { error: iErr } = await (supabase as any).from("Cash").insert(payload);
          if (iErr) { setCashError(iErr.message || "Insert failed"); break; }
        }
      }
      if (!cashError) {
        setCashSuccess(true);
        setTimeout(() => setCashSuccess(false), 3000);
        await refreshCashLog();
        const today = new Date();
        const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 6);
        const fromDateStr = sevenDaysAgo.toISOString().split("T")[0];
        const { data: freshData } = await (supabase as any).from("Cash").select("*").eq("Branch", "Boudoir").gte("Date", fromDateStr);
        const freshRows: CashRow[] = freshData || [];
        setCashEntries(prev => prev.map(en => {
          const found = freshRows.find(r => r.Date === en.date);
          return found ? { ...en, existingId: found.id } : en;
        }));
      }
    } catch (err: any) {
      setCashError(err?.message || "Unknown error");
    }
    setCashSubmitting(false);
  };

  const handleAddCashRow = () => {
    setCashEntries(prev => {
      const last = prev[prev.length - 1];
      const [ly, lm, ld] = last.date.split("-").map(Number);
      const lastDate = new Date(ly, lm - 1, ld);
      lastDate.setDate(lastDate.getDate() - 1);
      const newDate = `${lastDate.getFullYear()}-${String(lastDate.getMonth()+1).padStart(2,"0")}-${String(lastDate.getDate()).padStart(2,"0")}`;
      const existing = cashLog.find(r => r.Date === newDate);
      return [...prev, {
        date: newDate,
        totalGST: existing ? String(existing["Total GST"] ?? "") : "",
        credit: existing ? String(existing["Credit"] ?? "") : "",
        qr: existing ? String(existing["QR"] ?? "") : "",
        cashOverride: "",
        error: existing ? String(existing["Error"] ?? "") : "",
        errorNote: existing ? String(existing["Explanation"] ?? "") : "",
        expanded: !!(existing?.Error),
        existingId: existing?.id,
      }];
    });
  };

  const openPanel = (panel: "USAGE" | "ORDER" | "CASH") => {
    setActivePanel(panel);
    setShowDropdown(false);
    setShowUsageDropdown(false);
  };

  const closePanel = () => {
    setActivePanel(null);
    setUsageSearch("");
    setShowUsageDropdown(false);
    setOrderSearch("");
    setShowOrderDropdown(false);
  };

  // Shared header cell style helpers
  const hdrLeft   = { fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" } as React.CSSProperties;
  const hdrCenter = { ...hdrLeft, textAlign: "center" as const };

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

      {/* TOP AREA */}
      <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", flexShrink: 0 }}>

        {/* Branch name header */}
        <button
          onClick={() => {
            if (searchMode !== "idle") {
              setSearchMode("idle");
              setSearch("");
              setSelectedProduct(null);
              setShowDropdown(false);
            } else {
              onBack?.();
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

        {/* USAGE / ORDER / CASH tabs — above search bar */}
        {!showDropdown && !selectedProduct && (
          <div style={{
            display: "flex", gap: "28px",
            borderBottom: "0.5px solid hsl(var(--border))",
            marginBottom: "20px",
          }}>
            {(["USAGE", "ORDER", "CASH"] as const).map(btn => (
              <button
                key={btn}
                onClick={() => openPanel(btn)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "0 0 12px 0",
                  fontSize: "clamp(16px, 4.5vw, 24px)", fontWeight: 300,
                  letterSpacing: "0.08em", fontFamily: "Raleway, inherit",
                  color: "hsl(var(--foreground))",
                  opacity: 0.28,
                  borderBottom: "2px solid transparent",
                  marginBottom: "-1px",
                  transition: "opacity 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = "0.8";
                  e.currentTarget.style.borderBottomColor = "hsl(var(--foreground))";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = "0.28";
                  e.currentTarget.style.borderBottomColor = "transparent";
                }}
              >
                {btn}
              </button>
            ))}
          </div>
        )}

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

      </div>

      {/* MIDDLE SCROLLABLE */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column", paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px" }}>

        {/* Dropdown */}
        {showDropdown && search.length > 0 && (() => {
          const q = search.toLowerCase();
          const allMatched = products.filter(p =>
            p["PRODUCT NAME"].toLowerCase().includes(q) &&
            (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
          );
          const favourites = allMatched.filter(p =>  isBoudoirFav(p));
          const colours    = allMatched.filter(p => !isBoudoirFav(p) &&  isYes(p["Colour"]));
          const regular    = allMatched.filter(p => !isBoudoirFav(p) && !isYes(p["Colour"]));
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
            <div style={{ flex: 1, overflowY: "auto" }}>
              {favourites.length > 0 && (
                <>
                  <SectionHeader label="Boudoir Favourites" />
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

        {/* Content area */}
        {!showDropdown && (
          <div style={{ paddingTop: "16px", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>

            {/* Product card */}
            {selectedProduct && (
              <div style={{ flexShrink: 0, marginBottom: "24px", paddingBottom: "20px", borderBottom: "0.5px solid hsl(var(--border))" }}>
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
                    onClick={() => toggleFavourite(selectedProduct)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
                  >
                    <Star
                      size={16}
                      fill={isBoudoirFav(selectedProduct) ? "hsl(var(--foreground))" : "none"}
                      color="hsl(var(--foreground))"
                    />
                  </button>
                </div>
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

            {/* Spacer + Recent label */}
            {!selectedProduct && <div style={{ flexShrink: 0, height: "4vh" }} />}
            {!selectedProduct && (
              <div style={{ flexShrink: 0, fontSize: "16px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "12px" }}>
                Recent
              </div>
            )}

            {/* Log table */}
            <div style={{ flex: 1, overflowX: "hidden", overflowY: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>

                {/* Header row */}
                {selectedProduct ? (
                  <div style={{ display: "grid", gridTemplateColumns: "55px 28px 32px 1fr 18px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                    <div style={hdrLeft}>Date</div>
                    <div style={hdrCenter}>Qty</div>
                    <div style={hdrCenter}>Bal</div>
                    <div style={hdrCenter}>Type</div>
                    <div />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 28px 32px 70px 18px", gap: "4px", paddingTop: "8px", paddingBottom: "10px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                    <div style={hdrLeft}>Date</div>
                    <div style={hdrLeft}>Product</div>
                    <div style={hdrCenter}>Qty</div>
                    <div style={hdrCenter}>Bal</div>
                    <div style={hdrCenter}>Type</div>
                    <div />
                  </div>
                )}

                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                  {loadingLog && (
                    <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading...</div>
                  )}
                  {!loadingLog && activeLog.length === 0 && (
                    <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>
                  )}
                  {!loadingLog && (() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const cutoff = new Date(today); cutoff.setDate(today.getDate() - 6);
                    return activeLog.map((row, idx) => {
                    const dateStr = new Date(row.DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                    const prevDateStr = idx > 0 ? new Date(activeLog[idx - 1].DATE).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
                    const showDate = dateStr !== prevDateStr;
                    const dateSeparator = showDate && idx > 0;
                    const isReversing = reversing === row.id;
                    return selectedProduct ? (
                      <div key={row.id} style={{
                        display: "grid", gridTemplateColumns: "55px 28px 32px 1fr 18px", gap: "4px",
                        padding: "8px 0",
                        borderTop: dateSeparator ? "0.5px solid hsl(var(--border) / 0.5)" : "none",
                        marginTop: dateSeparator ? "4px" : "0",
                        alignItems: "center",
                      }}>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{showDate ? dateStr : ""}</div>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
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
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{showDate ? dateStr : ""}</div>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>{row["PRODUCT NAME"] || "—"}</div>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", textAlign: "center" }}>{row.QTY > 0 ? "+" : ""}{row.QTY}</div>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["ENDING BALANCE"] ?? "—"}</div>
                        <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>{row.TYPE || "—"}</div>
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
                    });
                  })()}
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
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100dvh",
        background: "hsl(var(--background))",
        zIndex: 200,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", paddingBottom: "0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>USAGE</span>
            <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
              <X size={18} />
            </button>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", cursor: showUsageDropdown ? "pointer" : "default" }}
            onClick={() => { if (showUsageDropdown) dismissUsageDropdown(); }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textTransform: "uppercase" }}>
              Enter Today's Stock Movements
            </span>
            <span style={{ fontSize: "11px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}
            </span>
          </div>

          <div style={{ borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "12px", marginBottom: "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                ref={usageInputRef}
                type="text"
                inputMode="search"
                value={usageSearch}
                onChange={e => { setUsageSearch(e.target.value); setShowUsageDropdown(true); }}
                onFocus={() => setShowUsageDropdown(true)}
                placeholder="Select product..."
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: "14px", fontFamily: "Raleway, inherit", fontWeight: 300,
                  color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))",
                }}
              />
              <button
                onMouseDown={e => {
                  e.preventDefault();
                  if (showUsageDropdown) {
                    dismissUsageDropdown();
                  } else {
                    setShowUsageDropdown(true);
                    usageInputRef.current?.focus();
                  }
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", flexShrink: 0, display: "flex", alignItems: "center" }}
              >
                {showUsageDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {usageSearch.length > 0 && (
                <button onClick={() => { setUsageSearch(""); setShowUsageDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div style={{ borderBottom: "0.5px solid hsl(var(--border))", paddingTop: "12px", paddingBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>Salon Use</span>
                <ChevronDown size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <ChevronLeft size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", minWidth: "28px", textAlign: "center", color: "hsl(var(--foreground))" }}>1</span>
                <ChevronRight size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
            </div>
          </div>
        </div>

        {showUsageDropdown && (
          <div style={{
            flexShrink: 0,
            background: "hsl(var(--background))",
            maxHeight: "55vh", overflowY: "auto",
            paddingLeft: "12px", paddingRight: "12px",
          }}>
            {(() => {
              const sectionLabel = (label: string) => (
                <div key={label} style={{ paddingTop: "12px", paddingBottom: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>{label}</div>
              );
              const renderRow = (p: OfficeProduct, showStar?: boolean) => (
                <div
                  key={p.id}
                  onMouseDown={() => handleAddUsageProduct(p)}
                  style={{
                    padding: "11px 0",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit",
                    color: usageEntries.find(e => e.productName === p["PRODUCT NAME"]) ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {showStar && <Star size={11} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6, flexShrink: 0 }} />}
                    {p["PRODUCT NAME"]}
                  </span>
                  {(p as any)[BALANCE_KEY] != null && (
                    <span style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginLeft: "8px" }}>{(p as any)[BALANCE_KEY]}</span>
                  )}
                </div>
              );
              const sections: React.ReactNode[] = [];
              if (usageFavs.length > 0)    { sections.push(sectionLabel("Boudoir Favourites")); usageFavs.forEach(p => sections.push(renderRow(p, true))); }
              if (usageRegular.length > 0) { sections.push(sectionLabel("Products"));           usageRegular.forEach(p => sections.push(renderRow(p))); }
              if (usageColours.length > 0) { sections.push(sectionLabel("Colours"));            usageColours.forEach(p => sections.push(renderRow(p))); }
              if (sections.length === 0) return <div style={{ padding: "14px 0", fontSize: "13px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>No products found</div>;
              return sections;
            })()}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px" }}
          onClick={() => setShowUsageDropdown(false)}>
          {usageEntries.length === 0 && (
            <div style={{ paddingTop: "24px", fontSize: "13px", fontWeight: 300, color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>
              Select a product above to add it
            </div>
          )}
          {usageEntries.map(entry => (
            <div key={entry.id} style={{ paddingTop: "12px", paddingBottom: "12px", borderBottom: "0.5px solid hsl(var(--border))" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", flex: 1 }}>{entry.productName}</span>
                <button
                  onClick={() => setUsageEntries(prev => prev.filter(e => e.id !== entry.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  onClick={() => cycleType(entry.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontSize: "11px", fontWeight: 300, letterSpacing: "0.06em",
                    fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {entry.type}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  <button
                    onClick={() => setUsageEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: Math.max(1, e.qty - 1) } : e))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", minWidth: "28px", textAlign: "center" }}>{entry.qty}</span>
                  <button
                    onClick={() => setUsageEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: e.qty + 1 } : e))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {usageEntries.length > 0 && (
          <div style={{ flexShrink: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px", paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)", borderTop: "0.5px solid hsl(var(--border))" }}>
            <button
              onClick={handleUsageSubmit}
              disabled={usageSubmitting}
              style={{
                background: "hsl(var(--foreground))", color: "hsl(var(--background))",
                border: "none", cursor: usageSubmitting ? "default" : "pointer",
                padding: "10px 24px", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "Raleway, inherit",
                opacity: usageSubmitting ? 0.5 : 1,
              }}
            >
              {usageSubmitting ? "Saving..." : "Submit"}
            </button>
            {usageSuccess && (
              <span style={{ marginLeft: "16px", fontSize: "11px", color: "hsl(var(--green, 120 60% 40%))", letterSpacing: "0.06em" }}>✓ Saved</span>
            )}
            {usageError && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em" }}>✗ {usageError}</div>
            )}
          </div>
        )}
      </div>, document.body
      )}

      {/* ORDER Panel */}
      {activePanel === "ORDER" && createPortal(
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100dvh",
        background: "hsl(var(--background))",
        zIndex: 200,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Fixed header */}
        <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", paddingBottom: "0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>ORDER</span>
            <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
              <X size={18} />
            </button>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", cursor: showOrderDropdown ? "pointer" : "default" }}
            onClick={() => { if (showOrderDropdown) dismissOrderDropdown(); }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textTransform: "uppercase" }}>
              Enter Today's Order
            </span>
            <span style={{ fontSize: "11px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}
            </span>
          </div>
          <div style={{ borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "12px", marginBottom: "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                ref={orderInputRef}
                type="text"
                inputMode="search"
                value={orderSearch}
                onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }}
                onFocus={() => setShowOrderDropdown(true)}
                placeholder="Select product..."
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: "14px", fontFamily: "Raleway, inherit", fontWeight: 300,
                  color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))",
                }}
              />
              <button
                onMouseDown={e => {
                  e.preventDefault();
                  if (showOrderDropdown) dismissOrderDropdown();
                  else { setShowOrderDropdown(true); orderInputRef.current?.focus(); }
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", flexShrink: 0, display: "flex", alignItems: "center" }}
              >
                {showOrderDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {orderSearch.length > 0 && (
                <button onClick={() => { setOrderSearch(""); setShowOrderDropdown(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown list */}
        {showOrderDropdown && (
          <div style={{
            flexShrink: 0,
            background: "hsl(var(--background))",
            maxHeight: "55vh", overflowY: "auto",
            paddingLeft: "12px", paddingRight: "12px",
          }}>
            {(() => {
              const sectionLabel = (label: string) => (
                <div key={label} style={{ paddingTop: "12px", paddingBottom: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>{label}</div>
              );
              const renderRow = (p: OfficeProduct, showStar?: boolean) => (
                <div
                  key={p.id}
                  onMouseDown={() => handleAddOrderProduct(p)}
                  style={{
                    padding: "11px 0",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit",
                    color: orderEntries.find(e => e.productName === p["PRODUCT NAME"]) ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {showStar && <Star size={11} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6, flexShrink: 0 }} />}
                    {p["PRODUCT NAME"]}
                  </span>
                  {(p as any)[BALANCE_KEY] != null && (
                    <span style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginLeft: "8px" }}>{(p as any)[BALANCE_KEY]}</span>
                  )}
                </div>
              );
              const sections: React.ReactNode[] = [];
              if (orderFavs.length > 0)    { sections.push(sectionLabel("Boudoir Favourites")); orderFavs.forEach(p => sections.push(renderRow(p, true))); }
              if (orderRegular.length > 0) { sections.push(sectionLabel("Products"));            orderRegular.forEach(p => sections.push(renderRow(p))); }
              if (orderColours.length > 0) { sections.push(sectionLabel("Colours"));             orderColours.forEach(p => sections.push(renderRow(p))); }
              if (sections.length === 0) return <div style={{ padding: "14px 0", fontSize: "13px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>No products found</div>;
              return sections;
            })()}
          </div>
        )}

        {/* Scrollable area */}
        <div
          style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px" }}
          onClick={() => setShowOrderDropdown(false)}
        >
          {orderEntries.length === 0 && !pendingOrder && !confirmSuccess && (
            <div style={{ paddingTop: "24px", fontSize: "13px", fontWeight: 300, color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>
              Select a product above to add it
            </div>
          )}
          {confirmSuccess && lastConfirmedEntries && (() => {
            const d = new Date();
            const dd = String(d.getDate()).padStart(2,"0");
            const mm = String(d.getMonth()+1).padStart(2,"0");
            const yy = String(d.getFullYear()).slice(-2);
            const confirmedGrn = `BOU ${dd}${mm}${yy}`;
            return (
              <div style={{ paddingTop: "24px" }}>
                <div style={{ fontSize: "13px", fontWeight: 300, color: "hsl(120 60% 40%)", fontFamily: "Raleway, inherit", marginBottom: "12px" }}>✓ Order confirmed</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={handleResetOrder}
                    style={{ background: "none", border: "0.5px solid hsl(var(--border))", cursor: "pointer", padding: "8px 14px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}
                  >Reset</button>
                </div>
                <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                  <button
                    onClick={() => generateGRNPdf(lastConfirmedEntries!, confirmedGrn)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}
                  ><FileText size={10} />GRN PDF</button>
                  <button
                    onClick={() => exportToExcel(lastConfirmedEntries!, confirmedGrn)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}
                  ><Download size={10} />Export</button>
                </div>
              </div>
            );
          })()}

          {/* Order entries */}
          {orderEntries.map(entry => {
            const product = products.find(p => p["PRODUCT NAME"] === entry.productName);
            const balance = product ? (product as any)[BALANCE_KEY] : null;
            return (
              <div key={entry.id} style={{ paddingTop: "12px", paddingBottom: "12px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", flex: 1 }}>{entry.productName}</span>
                  <button
                    onClick={() => setOrderEntries(prev => prev.filter(e => e.id !== entry.id))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}
                  >
                    <X size={13} />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>Balance</span>
                    <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{balance ?? "—"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <button
                      onClick={() => setOrderEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: Math.max(1, e.qty - 1) } : e))}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", minWidth: "28px", textAlign: "center" }}>{entry.qty}</span>
                    <button
                      onClick={() => setOrderEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: e.qty + 1 } : e))}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Submit Order button */}
          {orderEntries.length > 0 && (
            <div style={{ marginTop: "20px", marginBottom: "8px" }}>
              <button
                onClick={handleOrderSubmit}
                style={{
                  background: "hsl(var(--foreground))", color: "hsl(var(--background))",
                  border: "none", cursor: "pointer",
                  padding: "10px 24px", fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  fontFamily: "Raleway, inherit",
                }}
              >
                Submit Order
              </button>
            </div>
          )}

          {/* Order Summary Preview */}
          {pendingOrder && (
            <div style={{ marginTop: "32px", borderTop: "0.5px solid hsl(var(--border))", paddingTop: "20px", paddingBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{ fontSize: "22px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "-0.02em" }}>Order Summary</div>
                <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", letterSpacing: "0.08em" }}>{pendingOrder.grn}</div>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", marginBottom: "16px" }}>
                Pending · Tap qty to edit · Click × to remove
              </div>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 56px 48px 20px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "8px", marginBottom: "4px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>Product</div>
                <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>Cur Bal</div>
                <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>Qty</div>
                <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>End Bal</div>
                <div />
              </div>
              {/* Pending rows */}
              {pendingOrder.entries.map((entry, idx) => {
                const isEditing = editingPendingIdx === idx;
                const parsedEdit = parseInt(editingPendingQty);
                const displayQty = isEditing && !isNaN(parsedEdit) && parsedEdit > 0 ? parsedEdit : entry.qty;
                return (
                  <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr 48px 56px 48px 20px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", padding: "8px 0", alignItems: "center" }}>
                    <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", wordBreak: "break-word" }}>{entry.productName}</div>
                    <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{entry.starting}</div>
                    <div style={{ textAlign: "center" }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editingPendingQty}
                          onChange={e => setEditingPendingQty(e.target.value)}
                          onBlur={() => {
                            if (!isNaN(parsedEdit) && parsedEdit > 0) {
                              setPendingOrder(prev => {
                                if (!prev) return prev;
                                const entries = prev.entries.map((e, i) =>
                                  i === idx ? { ...e, qty: parsedEdit, ending: e.starting + parsedEdit } : e
                                );
                                return { ...prev, entries };
                              });
                            }
                            setEditingPendingIdx(null);
                            setEditingPendingQty("");
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") { setEditingPendingIdx(null); setEditingPendingQty(""); }
                          }}
                          autoFocus
                          style={{ width: "44px", textAlign: "center", fontSize: "13px", fontFamily: "Raleway, inherit", fontWeight: 300, background: "none", border: "0.5px solid hsl(var(--border))", color: "hsl(var(--foreground))", padding: "2px", outline: "none" }}
                        />
                      ) : (
                        <span
                          onClick={() => { setEditingPendingIdx(idx); setEditingPendingQty(String(entry.qty)); }}
                          style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(120 60% 40%)", cursor: "pointer", display: "inline-block", minWidth: "32px" }}
                        >+{entry.qty}</span>
                      )}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{entry.starting + displayQty}</div>
                    <button
                      onClick={() => {
                        setPendingOrder(prev => {
                          if (!prev) return prev;
                          const entries = prev.entries.filter((_, i) => i !== idx);
                          return entries.length === 0 ? null : { ...prev, entries };
                        });
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 70% 50%)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
              {/* Notes */}
              <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                <textarea
                  value={grnNotes}
                  onChange={e => setGrnNotes(e.target.value)}
                  placeholder="Add notes (optional)"
                  rows={2}
                  style={{
                    width: "100%", background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))", fontSize: "13px", fontFamily: "Raleway, inherit", fontWeight: 300,
                    padding: "8px", resize: "none", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px" }}>
                <button
                  onClick={handleConfirmOrder}
                  disabled={orderConfirming}
                  style={{
                    background: "hsl(var(--foreground))", color: "hsl(var(--background))",
                    border: "none", cursor: orderConfirming ? "default" : "pointer",
                    padding: "10px 24px", fontSize: "11px", fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    fontFamily: "Raleway, inherit",
                    opacity: orderConfirming ? 0.5 : 1,
                  }}
                >
                  {orderConfirming ? "Saving..." : "Confirm Order"}
                </button>
                <button
                  onClick={handleResetOrder}
                  style={{
                    background: "none", border: "0.5px solid hsl(var(--border))", cursor: "pointer",
                    padding: "10px 20px", fontSize: "11px", fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))",
                  }}
                >
                  Reset
                </button>
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                <button
                  onClick={() => generateGRNPdf(pendingOrder.entries.map(e => ({ productName: e.productName, starting: e.starting, qty: e.qty, ending: e.starting + e.qty })), pendingOrder.grn)}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, fontSize: "10px", fontWeight: 300,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))",
                  }}
                >
                  <FileText size={10} />
                  GRN PDF
                </button>
                <button
                  onClick={() => exportToExcel(pendingOrder.entries.map(e => ({ productName: e.productName, starting: e.starting, qty: e.qty, ending: e.starting + e.qty })), pendingOrder.grn)}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, fontSize: "10px", fontWeight: 300,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))",
                  }}
                >
                  <Download size={10} />
                  Export
                </button>
              </div>
              {orderError && (
                <div style={{ fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em", marginBottom: "8px" }}>✗ {orderError}</div>
              )}
            </div>
          )}

          {/* All Orders */}
          {allOrderGroups.length > 0 && (
            <div style={{ marginTop: "40px", paddingBottom: "max(env(safe-area-inset-bottom, 24px), 24px)" }}>
              <div style={{ borderTop: "0.5px solid hsl(var(--border))", paddingTop: "24px", marginBottom: "16px" }}>
                <div style={{ fontSize: "22px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "-0.02em", marginBottom: "4px" }}>All Orders</div>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>By date · Tap to expand</div>
              </div>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "8px", marginBottom: "4px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>Date</div>
                <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>GRN</div>
                <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>Items</div>
                {expandedGRNs.size > 0 ? (
                  <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em", textAlign: "center" }}>Bal</div>
                ) : <div />}
              </div>
              {allOrderGroups.map(group => (
                <React.Fragment key={group.key}>
                  <div
                    onClick={() => toggleGRN(group.key)}
                    style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", padding: "10px 0", alignItems: "center", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                      {new Date(group.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{group.grn}</div>
                    <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{group.rows.length}</div>
                    <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", textAlign: "center", transition: "transform 0.15s", transform: expandedGRNs.has(group.key) ? "rotate(180deg)" : "rotate(0deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>▾</div>
                  </div>
                  {expandedGRNs.has(group.key) && group.rows.map(row => (
                    <div key={row.id} style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px 32px", gap: "4px", borderBottom: "0.5px solid hsl(var(--border))", padding: "8px 0", alignItems: "center", background: "hsl(var(--card))" }}>
                      <div style={{ fontSize: "10px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", paddingLeft: "8px" }}>—</div>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>{row["PRODUCT NAME"]}</div>
                      <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(120 60% 40%)", textAlign: "center" }}>+{row.QTY}</div>
                      <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>{row["ENDING BALANCE"]}</div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>, document.body
      )}

      {/* CASH Panel */}
      {activePanel === "CASH" && createPortal(
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100dvh",
        background: "hsl(var(--background))",
        zIndex: 200,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", paddingBottom: "0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>CASH</span>
              <span style={{ fontSize: "14px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>Month Total: RM {monthGSTTotal.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}>
              <X size={18} />
            </button>
          </div>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 48px 58px 20px", gap: "4px", paddingBottom: "8px" }}>
            {(["Date","GST","Credit","QR","Cash"] as const).map((lbl, i) => (
              <div key={lbl} style={{ fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "#000", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "center" }}>{lbl}</div>
            ))}
            <div />
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", paddingLeft: "12px", paddingRight: "12px", paddingBottom: "max(env(safe-area-inset-bottom, 24px), 24px)" }}>

          {/* 7-day entry rows */}
          {cashEntries.map((entry, idx) => {
            const total = parseFloat(entry.totalGST) || 0;
            const credit = parseFloat(entry.credit) || 0;
            const qr = parseFloat(entry.qr) || 0;
            const err = parseFloat(entry.error) || 0;
            const computedCash = entry.cashOverride !== "" ? (parseFloat(entry.cashOverride) || 0) : total - credit - qr - err;
            const hasData = entry.totalGST !== "" || entry.credit !== "" || entry.qr !== "";
            const dateObj = new Date(entry.date + "T00:00:00");
            const dateLabel = dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            const isToday = idx === 0;
            const inputStyle: React.CSSProperties = { width: "100%", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))", textAlign: "center", padding: "2px 0", boxSizing: "border-box" };
            return (
              <div key={entry.date} style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 48px 58px 20px", gap: "4px", alignItems: "center", padding: "9px 0" }}>
                  <div style={{ fontSize: "11px", fontWeight: hasData ? 700 : 300, fontFamily: "Raleway, inherit", color: hasData ? "#000" : "hsl(var(--muted-foreground))", letterSpacing: "0.02em" }}>{dateLabel}</div>
                  <input type="number" inputMode="decimal" value={entry.totalGST} onChange={e => setCashEntries(prev => prev.map((en, i) => i !== idx ? en : { ...en, totalGST: e.target.value, cashOverride: "" }))} placeholder="0" style={inputStyle} />
                  <input type="number" inputMode="decimal" value={entry.credit} onChange={e => setCashEntries(prev => prev.map((en, i) => i !== idx ? en : { ...en, credit: e.target.value, cashOverride: "" }))} placeholder="0" style={inputStyle} />
                  <input type="number" inputMode="decimal" value={entry.qr} onChange={e => setCashEntries(prev => prev.map((en, i) => i !== idx ? en : { ...en, qr: e.target.value, cashOverride: "" }))} placeholder="0" style={inputStyle} />
                  <input
                    type="number" inputMode="decimal"
                    value={hasData || entry.cashOverride !== "" ? (entry.cashOverride !== "" ? entry.cashOverride : String(computedCash)) : ""}
                    onChange={e => setCashEntries(prev => prev.map((en, i) => i !== idx ? en : { ...en, cashOverride: e.target.value }))}
                    placeholder="0"
                    style={{ ...inputStyle, color: hasData ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                  />
                  <button
                    onClick={() => setCashEntries(prev => prev.map((en, i) => i !== idx ? en : { ...en, expanded: !en.expanded }))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: entry.expanded || entry.error !== "" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {entry.expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
                {entry.expanded && (
                  <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 48px 58px 20px", gap: "4px", paddingBottom: "10px", alignItems: "flex-end" }}>
                    <div style={{ gridColumn: "1" }} />
                    <div style={{ gridColumn: "2", display: "flex", flexDirection: "column", gap: "3px", alignItems: "center" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>Error</div>
                      <input type="number" inputMode="decimal" value={entry.error} onChange={e => setCashEntries(prev => prev.map((en, i) => i !== idx ? en : { ...en, error: e.target.value, cashOverride: "" }))} placeholder="0" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", textAlign: "center", padding: "2px 0" }} />
                    </div>
                    <div style={{ gridColumn: "3 / 6", display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-start" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>Note</div>
                      <input type="text" value={entry.errorNote} onChange={e => setCashEntries(prev => prev.map((en, i) => i !== idx ? en : { ...en, errorNote: e.target.value }))} placeholder="Explanation..." style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", padding: "2px 0", textAlign: "left" }} />
                    </div>
                    <div style={{ gridColumn: "6", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                      {idx !== 0 && (
                        <button onClick={() => handleDeleteCashEntry(entry, idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add row button */}
          <div style={{ paddingTop: "8px", paddingBottom: "4px" }}>
            <button
              onClick={handleAddCashRow}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", padding: "4px 0" }}
            >
              Add +
            </button>
          </div>

          {/* Submit */}
          <div style={{ paddingTop: "20px", paddingBottom: "24px", borderBottom: "0.5px solid hsl(var(--border))" }}>
            <button
              onClick={handleCashSubmit}
              disabled={cashSubmitting}
              style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", cursor: cashSubmitting ? "default" : "pointer", padding: "10px 24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", opacity: cashSubmitting ? 0.5 : 1 }}
            >
              {cashSubmitting ? "Saving..." : "Submit"}
            </button>
            {cashSuccess && <span style={{ marginLeft: "16px", fontSize: "11px", color: "hsl(120 60% 40%)", letterSpacing: "0.06em" }}>✓ Saved</span>}
            {cashError && <div style={{ marginTop: "8px", fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em" }}>✗ {cashError}</div>}
          </div>

          {/* Recent / Month / Deposit toggle */}
          <div style={{ paddingTop: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "24px" }}>
                <button
                  onClick={() => setCashView("recent")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 6px 0", fontSize: "13px", fontWeight: cashView === "recent" ? 700 : 300, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", borderBottom: cashView === "recent" ? "1.5px solid hsl(var(--foreground))" : "1.5px solid transparent" }}
                >
                  Recent
                </button>
                <button
                  onClick={() => setCashView("month")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 6px 0", fontSize: "13px", fontWeight: cashView === "month" ? 700 : 300, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", borderBottom: cashView === "month" ? "1.5px solid hsl(var(--foreground))" : "1.5px solid transparent" }}
                >
                  {currentMonthName}
                </button>
                <button
                  onClick={() => setCashView("deposit")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 6px 0", fontSize: "13px", fontWeight: cashView === "deposit" ? 700 : 300, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", borderBottom: cashView === "deposit" ? "1.5px solid hsl(var(--foreground))" : "1.5px solid transparent" }}
                >
                  Deposit
                </button>
              </div>
              {cashView !== "deposit" && (
                <div style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", paddingBottom: "6px" }}>
                  Total: RM {(cashView === "recent" ? recentGSTTotal : monthGSTTotal).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              {cashView === "deposit" && (
                <button
                  onClick={exportDepositCsv}
                  title="Export to Excel"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 6px 0", color: "hsl(var(--foreground))", display: "flex", alignItems: "center" }}
                >
                  <Download size={15} />
                </button>
              )}
            </div>
            {/* Log table header */}
            {cashView !== "deposit" && (
              <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 48px 58px", gap: "4px", paddingBottom: "8px", borderBottom: "0.5px solid hsl(var(--border))" }}>
                {(["Date","GST","Credit","QR","Cash"] as const).map((lbl, i) => (
                  <div key={lbl} style={{ fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "#000", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "center" }}>{lbl}</div>
                ))}
              </div>
            )}
            {cashView !== "deposit" && loadingCashLog && <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0", fontFamily: "Raleway, inherit" }}>Loading...</div>}
            {cashView !== "deposit" && !loadingCashLog && cashLogFiltered.length === 0 && <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0", fontFamily: "Raleway, inherit" }}>No entries</div>}
            {cashView !== "deposit" && !loadingCashLog && cashLogFiltered.map(row => {
              const editableCols: Array<{key: string, align: "center"|"left"}> = [
                { key: "Total GST", align: "center" },
                { key: "Credit", align: "center" },
                { key: "QR", align: "center" },
                { key: "Cash", align: "center" },
              ];
              return (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 48px 58px", gap: "4px", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid hsl(var(--border) / 0.5)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{new Date(row.Date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                  {editableCols.map(({ key, align }) => {
                    const isEditing = editingLogCell?.id === row.id && editingLogCell?.col === key;
                    return (
                      <div key={key} style={{ textAlign: align }}>
                        {isEditing ? (
                          <input
                            autoFocus
                            type="number"
                            inputMode="decimal"
                            value={editingLogValue}
                            onChange={e => setEditingLogValue(e.target.value)}
                            onBlur={() => handleLogCellSave(row.id, key, editingLogValue)}
                            onKeyDown={e => { if (e.key === "Enter") handleLogCellSave(row.id, key, editingLogValue); if (e.key === "Escape") setEditingLogCell(null); }}
                            style={{ width: "100%", background: "none", border: "none", borderBottom: "0.5px solid hsl(var(--foreground))", outline: "none", fontSize: "11px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", textAlign: align, padding: "1px 0" }}
                          />
                        ) : (
                          <div
                            onClick={() => { setEditingLogCell({ id: row.id, col: key }); setEditingLogValue(String(row[key] ?? "")); }}
                            style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", cursor: "text", minHeight: "16px" }}
                          >
                            {row[key] ?? "—"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* ── Deposit tab ── */}
            {cashView === "deposit" && (
              <div style={{ paddingTop: "8px" }}>

                {/* Date range + cash total */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#000", letterSpacing: "0.08em", fontFamily: "Raleway, inherit", marginBottom: "6px" }}>From</div>
                    <select
                      value={depStart}
                      onChange={e => setDepStart(e.target.value)}
                      style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                    >
                      <option value="">Select date</option>
                      {currentMonthDates.map(d => (
                        <option key={d} value={d}>{new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#000", letterSpacing: "0.08em", fontFamily: "Raleway, inherit", marginBottom: "6px" }}>To</div>
                    <select
                      value={depEnd}
                      onChange={e => setDepEnd(e.target.value)}
                      style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                    >
                      <option value="">Select date</option>
                      {currentMonthDates.map(d => (
                        <option key={d} value={d}>{new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#000", letterSpacing: "0.08em", fontFamily: "Raleway, inherit", marginBottom: "4px" }}>Total Cash</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                      {depCashTotal !== null ? `RM ${depCashTotal.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                    </div>
                  </div>
                </div>

                {/* Denomination table */}
                <div style={{ borderTop: "0.5px solid hsl(var(--border))", paddingTop: "12px" }}>
                  {/* Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "80px 60px 1fr", gap: "0", marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#000", letterSpacing: "0.08em", fontFamily: "Raleway, inherit" }}>Denomination</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#000", letterSpacing: "0.08em", fontFamily: "Raleway, inherit", textAlign: "center" }}>Count</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#000", letterSpacing: "0.08em", fontFamily: "Raleway, inherit", textAlign: "right" }}>Amount</div>
                  </div>
                  {denominations.map(({ key, label, value }) => {
                    const count = denomCounts[key] || "";
                    const amount = key === "coins"
                      ? (parseFloat(count) || 0)
                      : (parseInt(count) || 0) * value;
                    return (
                      <div key={key} style={{ display: "grid", gridTemplateColumns: "80px 60px 1fr", gap: "0", alignItems: "center", padding: "6px 0", borderBottom: "0.5px solid hsl(var(--border) / 0.4)" }}>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{label}</div>
                        <div style={{ textAlign: "center" }}>
                          <input
                            type={key === "coins" ? "number" : "number"}
                            inputMode="decimal"
                            value={count}
                            onChange={e => setDenomCounts(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="0"
                            style={{ width: "48px", background: "none", border: "none", outline: "none", fontSize: "12px", fontFamily: "Raleway, inherit", fontWeight: 300, color: "hsl(var(--foreground))", textAlign: "center", padding: "0" }}
                          />
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "right" }}>
                          {amount > 0 ? `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                        </div>
                      </div>
                    );
                  })}

                  {/* Totals row */}
                  <div style={{ display: "grid", gridTemplateColumns: "80px 60px 1fr", gap: "0", alignItems: "center", padding: "10px 0 4px 0" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "#000" }}>Counted</div>
                    <div />
                    <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "#000", textAlign: "right" }}>
                      RM {denomTotal.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Match indicator */}
                  {denomDiff !== null && (
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", paddingTop: "6px" }}>
                      {denomDiff === 0 ? (
                        <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(120 50% 35%)" }}>✓ Matched</span>
                      ) : (
                        <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", color: denomDiff > 0 ? "hsl(120 50% 35%)" : "hsl(0 65% 50%)" }}>
                          {denomDiff > 0 ? "+" : ""}RM {denomDiff.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {denomDiff > 0 ? "over" : "under"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>, document.body
      )}

    </div>
  );
};

export default BoudoirSimple;
