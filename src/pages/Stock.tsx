import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight, Search, Star, ChevronDown } from "lucide-react";

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

const TYPES = ["Salon Use", "Customer", "Staff"];

const makeEntries = (): EntryLine[] => [1,2,3,4,5].map(id => ({
  id, productName: "", type: "Salon Use", qty: 1,
  showProductDropdown: false, showTypeDropdown: false, productSearch: "",
}));

// Custom dropdown component for product selection
function ProductDropdown({ entry, sortedBalances, onSelect, onSearch, onToggle, onClose }: {
  entry: EntryLine;
  sortedBalances: BalanceRow[];
  onSelect: (name: string) => void;
  onSearch: (val: string) => void;
  onToggle: () => void;
  onClose: () => void;
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
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
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
          {/* Search inside dropdown */}
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
                <span className="text-[11px]" style={dim}>{row["Starting Balance"]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom dropdown for type selection
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
        className="flex items-center justify-between px-2 py-2 cursor-pointer"
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

  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [entries, setEntries] = useState<EntryLine[]>(makeEntries());
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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

  // Entry helpers
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
        const currentBalance = balance?.["Starting Balance"] ?? 0;
        const endingBalance = currentBalance - entry.qty;
        await (supabase as any).from("BoudoirLog").insert({
          "Date": today, "Product Name": entry.productName,
          "Type": entry.type, "Qty": entry.qty, "Ending Balance": endingBalance,
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

  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };
  const border = "hsl(var(--border))";
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* Top bar */}
      <div className="flex justify-between items-center px-10 py-6 border-b" style={{ borderColor: border }}>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 transition-colors" style={dim}
            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>
            <ArrowLeft size={15} />
            <span className="text-[11px] tracking-[0.15em] uppercase">Price List</span>
          </button>
          <div style={{ width: "1px", height: "16px", background: border }} />
          <span className="text-[13px] font-light">Boudoir</span>
        </div>
        <ThemeToggle theme={theme} toggle={toggle} font={font} cycleFont={cycleFont} />
      </div>

      <div className="max-w-[760px] mx-auto px-5 py-12">

        {/* ── SECTION 1: Current Stock ── */}
        <div className="mb-12">
          <div className="mb-6">
            <div className="flex items-baseline gap-6">
              <h2 className="text-[22px] font-light tracking-tight">Current Stock</h2>
              <span className="text-[22px] font-light tracking-tight" style={dim}>
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </span>
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
                    <span className="text-[12px]" style={dim}>bal. {row["Starting Balance"]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="surface-box p-6 flex items-center justify-between">
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
                    color: selectedProduct["Starting Balance"] <= 0 ? "hsl(var(--red))"
                      : selectedProduct["Starting Balance"] <= 3 ? "hsl(var(--green))"
                      : "hsl(var(--foreground))"
                  }}>{selectedProduct["Starting Balance"]}</p>
                  <p className="text-[10px] tracking-wider uppercase mt-1" style={dim}>units</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: Daily Usage ── */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-[22px] font-light tracking-tight">Daily Usage</h2>
            <p className="text-[11px] tracking-wider uppercase mt-1" style={dim}>Enter today's stock movements</p>
          </div>

          <div className="space-y-3 mb-5">
            {entries.map((entry, idx) => (
              <div key={entry.id} className="flex items-center gap-2">
                <span className="text-[10px] w-4 text-right flex-shrink-0" style={dim}>{idx + 1}</span>

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

                <div className="flex items-center flex-shrink-0" style={{ border: `1px solid ${borderActive}`, background: cardBg }}>
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

                <button onClick={() => removeEntry(entry.id)} className="flex-shrink-0 transition-colors" style={dim}
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

        {/* ── SECTION 3: Last 14 Days ── */}
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
                </tr>
              </thead>
              <tbody>
                {log.map(row => (
                  <tr key={row.id} className="border-b table-row-hover" style={{ borderColor: border }}>
                    <td className="text-[12px] font-light py-3 text-dim">
                      {new Date(row.Date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </td>
                    <td className="text-[13px] font-light py-3 text-dim">{row["Product Name"]}</td>
                    <td className="text-[11px] font-light py-3 text-center tracking-wider uppercase" style={dim}>{row.Type}</td>
                    <td className="text-[13px] font-light py-3 text-center" style={dim}>−{row.Qty}</td>
                    <td className="text-[13px] font-light py-3 text-center">
                      <span style={{
                        color: row["Ending Balance"] <= 0 ? "hsl(var(--red))"
                          : row["Ending Balance"] <= 3 ? "hsl(var(--green))"
                          : "hsl(var(--foreground))"
                      }}>{row["Ending Balance"]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
