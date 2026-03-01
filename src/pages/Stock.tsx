import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight, Package } from "lucide-react";

interface BalanceRow {
  product_name: string;
  starting_balance: number;
}

interface LogRow {
  id: number;
  date: string;
  product_name: string;
  type: string;
  qty: number;
  ending_balance: number;
}

interface EntryLine {
  id: number;
  product_name: string;
  type: string;
  qty: number;
}

const TYPES = ["Salon Use", "Customer", "Staff"];

export default function Stock() {
  const navigate = useNavigate();
  const { theme, toggle, font, cycleFont } = useTheme();

  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [entries, setEntries] = useState<EntryLine[]>([
    { id: 1, product_name: "", type: "Salon Use", qty: 1 },
    { id: 2, product_name: "", type: "Salon Use", qty: 1 },
    { id: 3, product_name: "", type: "Salon Use", qty: 1 },
    { id: 4, product_name: "", type: "Salon Use", qty: 1 },
    { id: 5, product_name: "", type: "Salon Use", qty: 1 },
  ]);

  const today = new Date().toISOString().split("T")[0];
  const todayDisplay = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const fetchBalances = useCallback(async () => {
    try {
      const { data } = await (supabase as any).from("Boudoir Balance").select("*").order("product_name");
      if (data) setBalances(data);
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      const { data } = await (supabase as any)
        .from("BoudoirLog")
        .select("*")
        .gte("date", cutoffStr)
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      if (data) setLog(data);
    } catch (err) {
      console.error("Error fetching log:", err);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
    fetchLog();
  }, [fetchBalances, fetchLog]);

  const addEntry = () => {
    setEntries(prev => [...prev, { id: Date.now(), product_name: "", type: "Salon Use", qty: 1 }]);
  };

  const removeEntry = (id: number) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateEntry = (id: number, field: keyof EntryLine, value: string | number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async () => {
    const valid = entries.filter(e => e.product_name && e.qty > 0);
    if (!valid.length) return;

    setSubmitting(true);
    try {
      for (const entry of valid) {
        const balance = balances.find(b => b.product_name === entry.product_name);
        const currentBalance = balance?.starting_balance ?? 0;
        const endingBalance = currentBalance - entry.qty;

        // Write to BoudoirLog
        await (supabase as any).from("BoudoirLog").insert({
          date: today,
          product_name: entry.product_name,
          type: entry.type,
          qty: entry.qty,
          ending_balance: endingBalance,
        });

        // Update Boudoir Balance
        await (supabase as any)
          .from("Boudoir Balance")
          .update({ starting_balance: endingBalance })
          .eq("product_name", entry.product_name);
      }

      // Cleanup logs older than 14 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      await (supabase as any).from("BoudoirLog").delete().lt("date", cutoff.toISOString().split("T")[0]);

      await fetchBalances();
      await fetchLog();

      setEntries([
        { id: 1, product_name: "", type: "Salon Use", qty: 1 },
        { id: 2, product_name: "", type: "Salon Use", qty: 1 },
        { id: 3, product_name: "", type: "Salon Use", qty: 1 },
        { id: 4, product_name: "", type: "Salon Use", qty: 1 },
        { id: 5, product_name: "", type: "Salon Use", qty: 1 },
      ]);

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error("Submit error:", err);
    }
    setSubmitting(false);
  };

  const filteredBalances = search
    ? balances.filter(b => b.product_name.toLowerCase().includes(search.toLowerCase()))
    : balances;

  const productNames = balances.map(b => b.product_name);

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* Top bar */}
      <div className="flex justify-between items-center px-8 py-6 border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 transition-colors"
            style={{ color: "hsl(var(--muted-foreground))" }}
            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
          >
            <ArrowLeft size={15} />
            <span className="text-[11px] tracking-[0.15em] uppercase">Main</span>
          </button>
          <div style={{ width: "1px", height: "16px", background: "hsl(var(--border))" }} />
          <div className="flex items-center gap-2">
            <Package size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
            <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>Stock</span>
          </div>
          <span className="text-[13px] font-light" style={{ color: "hsl(var(--foreground))" }}>Boudoir</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[11px] tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>{todayDisplay}</span>
          <ThemeToggle theme={theme} toggle={toggle} font={font} cycleFont={cycleFont} />
        </div>
      </div>

      {/* Main content — two columns */}
      <div className="flex gap-0 h-[calc(100vh-73px)]">

        {/* LEFT — Entry panel */}
        <div className="w-[480px] flex-shrink-0 flex flex-col border-r overflow-y-auto" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="p-8 flex-1">
            <div className="mb-8">
              <h2 className="text-[22px] font-light tracking-tight mb-1">Daily Usage</h2>
              <p className="text-[11px] tracking-wider uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>Enter today's stock movements</p>
            </div>

            {/* Entry lines */}
            <div className="space-y-3 mb-6">
              {entries.map((entry, idx) => (
                <div key={entry.id} className="flex items-center gap-2">

                  {/* Row number */}
                  <span className="text-[10px] w-4 text-right flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>{idx + 1}</span>

                  {/* Product dropdown */}
                  <select
                    value={entry.product_name}
                    onChange={e => updateEntry(entry.id, "product_name", e.target.value)}
                    className="flex-1 text-[13px] font-light py-2 px-3 rounded-none border outline-none transition-colors"
                    style={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border-active))",
                      color: entry.product_name ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <option value="">Select product...</option>
                    {productNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>

                  {/* Type dropdown */}
                  <select
                    value={entry.type}
                    onChange={e => updateEntry(entry.id, "type", e.target.value)}
                    className="text-[11px] font-light py-2 px-2 rounded-none border outline-none flex-shrink-0"
                    style={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border-active))",
                      color: "hsl(var(--foreground))",
                      width: "110px",
                    }}
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  {/* Qty arrows */}
                  <div className="flex items-center border flex-shrink-0" style={{ borderColor: "hsl(var(--border-active))", background: "hsl(var(--card))" }}>
                    <button
                      onClick={() => updateEntry(entry.id, "qty", Math.max(1, entry.qty - 1))}
                      className="px-2 py-2 transition-colors"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                      onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-[13px] font-light px-3 min-w-[32px] text-center" style={{ color: "hsl(var(--foreground))" }}>{entry.qty}</span>
                    <button
                      onClick={() => updateEntry(entry.id, "qty", entry.qty + 1)}
                      className="px-2 py-2 transition-colors"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                      onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="flex-shrink-0 transition-colors"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--red))")}
                    onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add line */}
            <button
              onClick={addEntry}
              className="flex items-center gap-1.5 mb-8 transition-colors text-[11px] tracking-wider uppercase"
              style={{ color: "hsl(var(--muted-foreground))" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
            >
              <Plus size={11} /> Add another product
            </button>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="minimal-btn px-8"
              style={{ opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? "Saving..." : "Submit"}
            </button>

            {submitSuccess && (
              <p className="text-[11px] mt-3 tracking-wider" style={{ color: "hsl(var(--green))" }}>
                ✓ Stock updated successfully
              </p>
            )}
          </div>

          {/* Log at bottom of left column */}
          <div className="border-t p-8" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-[10px] tracking-[0.18em] uppercase mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>Last 14 days</p>
            <div className="space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin">
              {log.length === 0 ? (
                <p className="text-[12px]" style={{ color: "hsl(var(--muted-foreground))" }}>No entries yet</p>
              ) : (
                log.map(row => (
                  <div key={row.id} className="flex items-center justify-between gap-3 py-1.5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-light truncate">{row.product_name}</p>
                      <p className="text-[10px] tracking-wider uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>{row.type} · {new Date(row.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px]" style={{ color: "hsl(var(--muted-foreground))" }}>−{row.qty}</p>
                      <p className="text-[11px] font-light">bal. {row.ending_balance}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Current stock snapshot */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 pt-8 pb-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-[22px] font-light tracking-tight mb-1">Current Stock</h2>
              <p className="text-[11px] tracking-wider uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>{balances.length} products</p>
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="minimal-input text-[13px] font-light py-1.5"
              style={{ width: "200px" }}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: "hsl(var(--border-active))" }}>
                  <th className="label-uppercase font-normal text-left pb-3 pt-2">Product</th>
                  <th className="label-uppercase font-normal text-center pb-3 pt-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map(row => (
                  <tr key={row.product_name} className="border-b table-row-hover" style={{ borderColor: "hsl(var(--border))" }}>
                    <td className="text-[13px] font-light py-3 text-dim">{row.product_name}</td>
                    <td className="text-[13px] font-light py-3 text-center">
                      <span style={{
                        color: row.starting_balance <= 0
                          ? "hsl(var(--red))"
                          : row.starting_balance <= 3
                            ? "hsl(var(--green))"
                            : "hsl(var(--foreground))"
                      }}>
                        {row.starting_balance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
