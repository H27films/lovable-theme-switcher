import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight, Search, Star, ChevronDown, FileText, Download } from "lucide-react";

interface BalanceRow {
  "Product Name": string;
  "Starting Balance": number;
  "Favourite": string | null;
}

interface LogRow {
  id: number;
  Date: string;
  "Product Name": string;
  Type: string;
  Qty: number;
  "Starting Balance": number;
  "Ending Balance": number;
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

function ProductDropdown({ entry, sortedBalances, onSelect, onSearch, onToggle, onClose, showBalance }: {
  entry: { productName: string; showProductDropdown: boolean; productSearch: string };
  sortedBalances: BalanceRow[];
  onSelect: (name: string) => void;
  onSearch: (val: string) => void;
  onToggle: () => void;
  onClose: () => void;
  showBalance?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const border = "hsl(var(--border))";
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";
  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  const filtered = entry.productSearch
    ? sortedBalances.filter(b => b["Product Name"].toLowerCase().includes(entry.productSearch.toLowerCase()))
    : sortedBalances;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (entry.showProductDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [entry.showProductDropdown, onClose]);

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
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
            {filtered.map(row => (
              <div
                key={row["Product Name"]}
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors"
                style={{ borderBottom: `1px solid ${border}` }}
                onMouseDown={() => onSelect(row["Product Name"])}
                onMouseEnter={e => (e.currentTarget.style.background = cardBg)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-light">{row["Product Name"]}</span>
                  {row["Favourite"] === "Yes" && <Star size={9} fill="currentColor" style={dim} />}
                </div>
                {showBalance && <span className="text-[11px]" style={{ color: "hsl(var(--foreground))" }}>{row["Starting Balance"]}</span>}
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

  return (
    <div ref={ref} className="relative flex-shrink-0" style={{ width: "110px" }}>
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
          {TYPES.map(t => (
            <div
              key={t}
              className="px-3 py-2 text-[11px] font-light cursor-pointer transition-colors"
              style={{ borderBottom: `1px solid ${border}` }}
              onMouseDown={() => onSelect(t)}
              onMouseEnter={e => (e.currentTarget.style.background = cardBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >{t}</div>
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

  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [entries, setEntries] = useState<EntryLine[]>(makeEntries());
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [orderEntries, setOrderEntries] = useState<OrderLine[]>(makeOrderEntries());
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [reversing, setReversing] = useState<number | null>(null);
  const [showOrderSummaryPanel, setShowOrderSummaryPanel] = useState(false);

  const [stockSearch, setStockSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<BalanceRow | null>(null);
  const [showStockDropdown, setShowStockDropdown] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchBalances = useCallback(async () => {
    try {
      const result = await (supabase as any).from("Boudoir Balance").select("*");
      if (result.error) console.error("Fetch balances error:", result.error);
      if (result.data) {
        const sorted = result.data.sort((a: BalanceRow, b: BalanceRow) =>
          a["Product Name"].localeCompare(b["Product Name"])
        );
        setBalances(sorted);
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const { data, error } = await (supabase as any)
        .from("BoudoirLog")
        .select("*")
        .gte("Date", cutoff.toISOString().split("T")[0]);
      if (error) console.error("Fetch log error:", error);
      if (data) {
        setLog(data.sort((a: LogRow, b: LogRow) => b.Date.localeCompare(a.Date) || b.id - a.id));
      }
    } catch (err) {
      console.error("Error fetching log:", err);
    }
  }, []);

  useEffect(() => { fetchBalances(); fetchLog(); }, [fetchBalances, fetchLog]);

  const toggleFavourite = async (productName: string, current: string | null) => {
    const newVal = current === "Yes" ? null : "Yes";
    await (supabase as any).from("Boudoir Balance").update({ "Favourite": newVal }).eq("Product Name", productName);
    await fetchBalances();
    setSelectedProduct(prev => prev ? { ...prev, "Favourite": newVal } : null);
  };

  const sortedBalances = [
    ...balances.filter(b => b["Favourite"] === "Yes"),
    ...balances.filter(b => b["Favourite"] !== "Yes"),
  ];

  const filteredStockProducts = stockSearch.length > 0
    ? sortedBalances.filter(b => b["Product Name"].toLowerCase().includes(stockSearch.toLowerCase()))
    : sortedBalances;

  const handleSelectProduct = (row: BalanceRow) => {
    setSelectedProduct(row);
    setStockSearch(row["Product Name"]);
    setShowStockDropdown(false);
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
    setSubmitting(true);
    try {
      for (const entry of valid) {
        const balance = balances.find(b => b["Product Name"] === entry.productName);
        const currentBalance = Number(balance?.["Starting Balance"] ?? 0);
        const endingBalance = currentBalance - Number(entry.qty);
        await (supabase as any).from("BoudoirLog").insert({
          "Date": today,
          "Product Name": entry.productName,
          "Type": entry.type,
          "Qty": -Number(entry.qty),
          "Starting Balance": currentBalance,
          "Ending Balance": endingBalance,
        });
        await (supabase as any).from("Boudoir Balance")
          .update({ "Starting Balance": endingBalance })
          .eq("Product Name", entry.productName);
      }
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      await (supabase as any).from("BoudoirLog").delete().lt("Date", cutoff.toISOString().split("T")[0]);
      await fetchBalances();
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
  const todayOrders = log.filter(r => r.Type === "Order" && r.Date === today);

  const reverseUsage = async (row: LogRow) => {
    setReversing(row.id);
    try {
      await (supabase as any).from("Boudoir Balance")
        .update({ "Starting Balance": row["Starting Balance"] })
        .eq("Product Name", row["Product Name"]);
      await (supabase as any).from("BoudoirLog").delete().eq("id", row.id);
      await fetchBalances();
      await fetchLog();
    } catch (err) { console.error("Reverse usage error:", err); }
    setReversing(null);
  };

  const reverseOrder = async (row: LogRow) => {
    setReversing(row.id);
    try {
      // Revert balance back to Starting Balance before this order
      await (supabase as any).from("Boudoir Balance")
        .update({ "Starting Balance": row["Starting Balance"] })
        .eq("Product Name", row["Product Name"]);
      // Delete the log row
      await (supabase as any).from("BoudoirLog").delete().eq("id", row.id);
      await fetchBalances();
      await fetchLog();
    } catch (err) { console.error("Reverse error:", err); }
    setReversing(null);
  };

  const orderSummary = orderEntries
    .filter(e => e.productName)
    .map(e => {
      const balance = balances.find(b => b["Product Name"] === e.productName);
      const current = Number(balance?.["Starting Balance"] ?? 0);
      const orderQty = Number(e.qty);
      return { productName: e.productName, current, orderQty, ending: current + orderQty };
    });

  const handleOrderSubmit = async () => {
    const valid = orderEntries.filter(e => e.productName && e.qty > 0);
    if (!valid.length) return;
    setOrderSubmitting(true);
    try {
      for (const entry of valid) {
        const balance = balances.find(b => b["Product Name"] === entry.productName);
        const currentBalance = Number(balance?.["Starting Balance"] ?? 0);
        const endingBalance = currentBalance + Number(entry.qty);
        await (supabase as any).from("BoudoirLog").insert({
          "Date": today,
          "Product Name": entry.productName,
          "Type": "Order",
          "Qty": Number(entry.qty),
          "Starting Balance": currentBalance,
          "Ending Balance": endingBalance,
        });
        await (supabase as any).from("Boudoir Balance")
          .update({ "Starting Balance": endingBalance })
          .eq("Product Name", entry.productName);
      }
      await fetchBalances();
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

  const allTodayOrders = log.filter(r => r.Type === "Order" && r.Date === today);
  const hasOrderNotification = allTodayOrders.length > 0;

  const exportToExcel = () => {
    const rows = [
      ["Product Name", "Starting Balance", "Order Qty", "Ending Balance"],
      ...allTodayOrders.map(r => [r["Product Name"], r["Starting Balance"], r.Qty, r["Ending Balance"]])
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
      <div className="max-w-[760px] mx-auto px-5">
        {/* Top bar */}
        <div className="flex justify-between items-center py-6 border-b" style={{ borderColor: border }}>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[13px] tracking-[0.15em] uppercase text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            <span>PRICE LIST</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-[11px] tracking-[0.15em] uppercase" style={dim}>Boudoir</span>
            <ThemeToggle theme={theme} toggle={toggle} font={font} cycleFont={cycleFont} />
          </div>
        </div>

        <div className="py-12">

          {/* ── SECTION 1: Current Stock ── */}
          <div className="mb-12">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[11px] font-normal tracking-[0.2em] uppercase text-dim mb-1" style={dim}>Current Stock</h1>
                  <p className="text-[28px] font-light tracking-tight">
                    {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                {mode === "order" && (
                  <button
                    onClick={() => setShowOrderSummaryPanel(true)}
                    className="flex items-center gap-2 transition-colors relative"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                    onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                  >
                    <div className="relative">
                      <FileText size={14} />
                      {hasOrderNotification && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: "hsl(var(--green))" }} />
                      )}
                    </div>
                    <span className="text-[11px] tracking-wider uppercase">Order Summary</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>{balances.length} products · Boudoir</p>
            </div>

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
                />
                {stockSearch && (
                  <button onClick={() => { setStockSearch(""); setSelectedProduct(null); }} style={dim}><X size={13} /></button>
                )}
              </div>
              {showStockDropdown && filteredStockProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 border max-h-[220px] overflow-y-auto scrollbar-thin"
                  style={{ background: "hsl(var(--popover))", borderColor: borderActive, marginTop: "2px" }}>
                  {filteredStockProducts.map(row => (
                    <div key={row["Product Name"]}
                      className="flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${border}` }}
                      onMouseDown={() => handleSelectProduct(row)}
                      onMouseEnter={e => (e.currentTarget.style.background = cardBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-light">{row["Product Name"]}</span>
                        {row["Favourite"] === "Yes" && <Star size={9} fill="currentColor" style={dim} />}
                      </div>
                      <span className="text-[12px]" style={{ color: "hsl(var(--foreground))" }}>{row["Starting Balance"]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (() => {
              const productLog = log.filter(r => r["Product Name"] === selectedProduct["Product Name"]);
              return (
                <div className="surface-box p-6">
                  {/* Balance + favourite row */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[11px] tracking-wider uppercase mb-1" style={dim}>Current Balance</p>
                      <p className="text-[15px] font-light">{selectedProduct["Product Name"]}</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => toggleFavourite(selectedProduct["Product Name"], selectedProduct["Favourite"])}
                        className="transition-colors"
                        style={{ color: selectedProduct["Favourite"] === "Yes" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                        onMouseLeave={e => (e.currentTarget.style.color = selectedProduct["Favourite"] === "Yes" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))")}>
                        <Star size={16} fill={selectedProduct["Favourite"] === "Yes" ? "currentColor" : "none"} />
                      </button>
                      <div className="text-right">
                        <p className="text-[32px] font-light leading-none" style={{
                          color: selectedProduct["Starting Balance"] <= 1 ? "hsl(var(--red))" : "hsl(var(--foreground))"
                        }}>{selectedProduct["Starting Balance"]}</p>
                        <p className="text-[10px] tracking-wider uppercase mt-1" style={dim}>units</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent activity for this product */}
                  {productLog.length > 0 && (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: border }}>
                          <th className="label-uppercase font-normal text-left pb-2 pt-1">Date</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Type</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Starting Bal</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Qty</th>
                          <th className="label-uppercase font-normal text-center pb-2 pt-1">Ending Bal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productLog.map(row => (
                          <tr key={row.id} className="border-b" style={{ borderColor: border }}>
                            <td className="text-[12px] font-light py-2" style={dim}>
                              {new Date(row.Date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </td>
                            <td className="text-[11px] font-light py-2 text-center tracking-wider uppercase" style={dim}>{row.Type}</td>
                            <td className="text-[12px] font-light py-2 text-center" style={dim}>{row["Starting Balance"]}</td>
                            <td className="text-[12px] font-light py-2 text-center" style={{ color: row.Type === "Order" ? "hsl(var(--green))" : "hsl(var(--red))" }}>
                              {row.Qty}
                            </td>
                            <td className="text-[12px] font-light py-2 text-center">{row["Ending Balance"]}</td>
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
                <p className="text-[11px] tracking-wider uppercase mb-4" style={dim}>Enter today's stock movements</p>
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
                        sortedBalances={sortedBalances}
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
              </div>
            )}

            {/* ── Order panel ── */}
            {mode === "order" && (
              <div>
                <p className="text-[11px] tracking-wider uppercase mb-4" style={dim}>Add stock from a new order</p>
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
                    const balance = balances.find(b => b["Product Name"] === entry.productName);
                    const currentBal = balance?.["Starting Balance"] ?? null;
                    return (
                      <div key={entry.id} className="flex items-stretch gap-2">
                        <span className="text-[10px] w-4 text-right flex-shrink-0 pt-2.5" style={dim}>{idx + 1}</span>
                        <ProductDropdown
                          entry={entry}
                          sortedBalances={sortedBalances}
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
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">Ending Bal.</th>
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
                      <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>Submitted today — click × to reverse</p>
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
                            <td className="text-[13px] font-light py-3">{row["Product Name"]}</td>
                            <td className="text-[13px] font-light py-3 text-center" style={dim}>{row["Starting Balance"]}</td>
                            <td className="text-[13px] font-light py-3 text-center" style={{ color: "hsl(var(--green))" }}>{row.Qty > 0 ? "+" : ""}{row.Qty}</td>
                            <td className="text-[13px] font-light py-3 text-center">{row["Ending Balance"]}</td>
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

                {/* Recent Orders — last 14 days, type Order only */}
                <div className="mt-10">
                  <div className="mb-5">
                    <h2 className="text-[22px] font-light tracking-tight">Recent Orders</h2>
                    <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>Last 14 days</p>
                  </div>
                  {log.filter(r => r.Type === "Order").length === 0 ? (
                    <p className="text-[13px]" style={dim}>No orders yet</p>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: borderActive }}>
                          <th className="label-uppercase font-normal text-left pb-3 pt-2">Date</th>
                          <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">Qty</th>
                          <th className="label-uppercase font-normal text-center pb-3 pt-2">Ending Bal.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.filter(r => r.Type === "Order").map(row => (
                          <tr key={row.id} className="border-b table-row-hover" style={{ borderColor: border }}>
                            <td className="text-[12px] font-light py-3" style={dim}>
                              {new Date(row.Date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </td>
                            <td className="text-[13px] font-light py-3">{row["Product Name"]}</td>
                            <td className="text-[13px] font-light py-3 text-center" style={{ color: "hsl(var(--green))" }}>{row.Qty > 0 ? "+" : ""}{row.Qty}</td>
                            <td className="text-[13px] font-light py-3 text-center">{row["Ending Balance"]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 3: Recent Activity (Daily Usage mode only) ── */}
          {mode === "usage" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[22px] font-light tracking-tight">Recent Activity</h2>
                <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>Last 14 days</p>
              </div>
              {log.length === 0 ? (
                <p className="text-[13px]" style={dim}>No entries yet</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b" style={{ borderColor: borderActive }}>
                      <th className="label-uppercase font-normal text-left pb-3 pt-2">Date</th>
                      <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                      <th className="label-uppercase font-normal text-center pb-3 pt-2">Type</th>
                      <th className="label-uppercase font-normal text-center pb-3 pt-2">Qty</th>
                      <th className="label-uppercase font-normal text-center pb-3 pt-2">Ending Bal.</th>
                      <th className="w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {log.map(row => {
                      const canReverse = row.Date === today || row.Date === yesterdayStr;
                      return (
                        <tr key={row.id} className="border-b table-row-hover" style={{ borderColor: border }}>
                          <td className="text-[12px] font-light py-3 text-dim">
                            {new Date(row.Date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </td>
                          <td className="text-[13px] font-light py-3 text-dim">{row["Product Name"]}</td>
                          <td className="text-[11px] font-light py-3 text-center tracking-wider uppercase" style={dim}>{row.Type}</td>
                          <td className="text-[13px] font-light py-3 text-center" style={{ color: row.Qty < 0 ? "hsl(var(--red))" : "hsl(var(--green))" }}>{row.Qty}</td>
                          <td className="text-[13px] font-light py-3 text-center">{row["Ending Balance"]}</td>
                          <td className="py-3 text-center">
                            {canReverse && (
                              <button
                                onClick={() => reverseUsage(row)}
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
                  </tbody>
                </table>
              )}
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
                  {today} · {allTodayOrders.length} {allTodayOrders.length === 1 ? "item" : "items"}
                </p>
              </div>
              <button onClick={() => setShowOrderSummaryPanel(false)} style={dim}
                onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
                <X size={16} />
              </button>
            </div>

            {allTodayOrders.length === 0 ? (
              <p className="text-[13px]" style={dim}>No orders submitted today.</p>
            ) : (
              <>
                <table className="w-full border-collapse mb-8">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "hsl(var(--border-active))" }}>
                      <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                      <th className="label-uppercase font-normal text-center pb-3 pt-2">Prev Bal</th>
                      <th className="label-uppercase font-normal text-center pb-3 pt-2">Order Qty</th>
                      <th className="label-uppercase font-normal text-center pb-3 pt-2">New Bal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTodayOrders.map(row => (
                      <tr key={row.id} className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
                        <td className="text-[13px] font-light py-3">{row["Product Name"]}</td>
                        <td className="text-[13px] font-light py-3 text-center" style={dim}>{row["Starting Balance"]}</td>
                        <td className="text-[13px] font-light py-3 text-center" style={{ color: "hsl(var(--green))" }}>{row.Qty > 0 ? "+" : ""}{row.Qty}</td>
                        <td className="text-[13px] font-light py-3 text-center">{row["Ending Balance"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}