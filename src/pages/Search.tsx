import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Building2, Search as SearchIcon, X, Star, ChevronUp, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sortLogByBalance } from "@/lib/branchSimpleUtils";

interface Product {
  id: number;
  "PRODUCT NAME": string;
  SUPPLIER?: string;
  "SUPPLIER PRICE"?: number | null;
  "BRANCH PRICE"?: number | null;
  "CUSTOMER PRICE"?: number | null;
  "STAFF PRICE"?: number | null;
  "OFFICE BALANCE"?: number | null;
  "OFFICE SECTION"?: string;
  "BOUDOIR BALANCE"?: number | null;
  "CHIC NAILSPA BALANCE"?: number | null;
  "NUR YADI BALANCE"?: number | null;
  PAR?: number | null;
  "OFFICE FAVOURITE"?: boolean | string;
  "Colour"?: boolean | string;
  "UNITS/ORDER"?: number | null;
}

interface ProductLog {
  id: string;
  DATE: string;
  GRN?: string;
  SUPPLIER?: string;
  QTY: number;
  BRANCH?: string;
  TYPE?: string;
  "OFFICE BALANCE"?: number | null;
}

interface SearchProps {
  onBack?: () => void;
}

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("en-MY", { month: "short", day: "2-digit" });
  } catch {
    return d;
  }
};

// Past Data ordering: newest date first; within the same date, lowest ending balance first
const sortPastData = (rows: ProductLog[]) => sortLogByBalance(rows, r => r["OFFICE BALANCE"]);

export default function Search({ onBack }: SearchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"active" | "result" | "supplier">("active");
  const inputRef = useRef<HTMLInputElement>(null);

  // Product detail state
  const [productLog, setProductLog] = useState<ProductLog[]>([]);
  const [productLogLoading, setProductLogLoading] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageType, setUsageType] = useState<"Personal Use" | "Expired">("Personal Use");
  const [usageQty, setUsageQty] = useState("");
  const [usageSubmitting, setUsageSubmitting] = useState(false);
  const [isFav, setIsFav] = useState(false);

  const fg = "hsl(var(--foreground))";
  const dimColor = "hsl(var(--muted-foreground))";
  const border = "hsl(var(--border))";

  // Fetch all products — simplified like SubLanding
  const fetchProducts = useCallback(async () => {
    let allData: Product[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("AllFileProducts")
        .select("*")
        .range(from, from + batchSize - 1);
      if (error || !data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    setProducts(allData);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Simplified helpers — check directly on product object
  const isOfficeFav = useCallback((p: Product) => {
    const v = (p as any)["OFFICE FAVOURITE"];
    return v === true || v === "TRUE" || v === "true" || v === 1;
  }, []);

  const isColourProduct = useCallback((p: Product) => {
    const v = (p as any)["Colour"];
    return v === true || v === "YES" || v === "yes" || v === 1;
  }, []);

const fetchProductLog = useCallback(async (productName: string) => {
  setProductLogLoading(true);
  try {
    if (!productName) {
      setProductLog([]);
      return;
    }
    const { data, error } = await (supabase as any)
      .from("AllFileLog")
      .select(`id, DATE, GRN, SUPPLIER, QTY, BRANCH, TYPE, "OFFICE BALANCE"`)
      .eq("PRODUCT NAME", productName)
      .order("DATE", { ascending: false })
      .limit(30);
    if (error) throw error;
    setProductLog(sortPastData(data || []));
  } catch (err) {
    console.error("Error fetching product log:", err);
    setProductLog([]);
  } finally {
    setProductLogLoading(false);
  }
}, []);

  const toggleFav = async () => {
    if (!selectedProduct) return;
    const newVal = !isFav;
    setIsFav(newVal);
    const updated = { ...selectedProduct, "OFFICE FAVOURITE": newVal ? "TRUE" : null } as any;
    setSelectedProduct(updated);
    setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, "OFFICE FAVOURITE": newVal ? "TRUE" : null } : p));
    await (supabase as any).from("AllFileProducts")
      .update({ "OFFICE FAVOURITE": newVal ? "TRUE" : null })
      .eq("id", selectedProduct.id);
  };

const submitUsage = async () => {
  if (!selectedProduct || !usageQty || isNaN(Number(usageQty)) || Number(usageQty) <= 0) return;
  setUsageSubmitting(true);
  const qty = Number(usageQty);
  const currentBal = selectedProduct["OFFICE BALANCE"] ?? 0;
  const newBal = currentBal - qty;
  const today = new Date().toISOString().split("T")[0];

  await (supabase as any).from("AllFileLog").insert({
    BRANCH: "Office",
    "PRODUCT NAME": selectedProduct["PRODUCT NAME"],
    QTY: -qty,
    TYPE: usageType,
    DATE: today,
    "OFFICE BALANCE": newBal,
  });

  await (supabase as any).from("AllFileProducts")
    .update({ "OFFICE BALANCE": newBal })
    .eq("id", selectedProduct.id);

  setSelectedProduct({ ...selectedProduct, "OFFICE BALANCE": newBal });
  setUsageQty("");
  setUsageOpen(false);
  setUsageSubmitting(false);

  const { data } = await (supabase as any)
    .from("AllFileLog")
    .select(`id, DATE, GRN, SUPPLIER, QTY, BRANCH, TYPE, \"OFFICE BALANCE\"`)
    .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"])
    .order("DATE", { ascending: false })
    .limit(30);
  setProductLog(sortPastData(data || []));
};

const handleSelectProduct = (p: Product) => {
  setSearch(p["PRODUCT NAME"]);
  setSelectedProduct(p);
  setSelectedSupplier(null);
  setShowDropdown(false);
  setSearchMode("result");
  setIsFav(isOfficeFav(p));
  fetchProductLog(p["PRODUCT NAME"]);
};

  const handleSelectSupplier = (supplier: string) => {
    setSearch(supplier);
    setSelectedSupplier(supplier);
    setSelectedProduct(null);
    setShowDropdown(false);
    setSearchMode("supplier");
  };

  const handleClear = () => {
    setSearch("");
    setSelectedProduct(null);
    setSelectedSupplier(null);
    setShowDropdown(false);
    setSearchMode("active");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const hdrStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: dimColor,
  };

  const sectionHeader: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: dimColor,
    fontFamily: "Raleway, inherit",
    paddingTop: 14,
    paddingBottom: 4,
  };

  const sectionHeaderBlack: React.CSSProperties = {
    ...sectionHeader,
    color: "#1a1a1a",
  };

  // Colour the office balance shown in the dropdown rows:
  // 0 -> black, negative -> red, positive -> dark green
  const balanceColor = (b: number | null | undefined) => {
    if (b == null) return dimColor;
    if (b > 0) return "hsl(142 65% 30%)";
    if (b < 0) return "hsl(0 70% 50%)";
    return fg;
  };

  // Dropdown logic — NO .slice() limits
  const dropdownContent = search.length > 0 && showDropdown ? (() => {
    const q = search.toLowerCase();
    const allMatched = products.filter(p =>
      p["PRODUCT NAME"]?.toLowerCase().includes(q) &&
      (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
    );

    const favourites = allMatched.filter(p => isOfficeFav(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));
    const colours = allMatched.filter(p => !isOfficeFav(p) && isColourProduct(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));
    const regular = allMatched.filter(p => !isOfficeFav(p) && !isColourProduct(p)).sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]));
    
    const matchedSuppliers = Array.from(new Set(
      products
        .map(p => p.SUPPLIER)
        .filter((s): s is string => !!s && s.toLowerCase().includes(q))
    )).sort();

    return { favourites, colours, regular, matchedSuppliers };
  })() : null;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "hsl(var(--background))", color: fg, fontFamily: "'Raleway', sans-serif" }}>
      {/* TOP BAR — with back button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: "20px",
        paddingRight: "16px",
        paddingTop: "28px",
        paddingBottom: "12px",
        
      }}>
        <button
          onClick={() => {
            if (from === "office") navigate("/simple/office");
            else onBack?.();
          }}
          title="Back to Office"
          style={{ fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", color: fg, fontFamily: "'Raleway', sans-serif", lineHeight: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
        >
          SEARCH
          <span style={{ fontSize: "15px", fontWeight: 200, letterSpacing: "0.08em", color: "hsl(var(--muted-foreground) / 0.65)", marginLeft: "6px" }}>OFFICE</span>
        </button>
        <button
          onClick={() => {
            if (from === "office") navigate("/simple/office");
            else onBack?.();
          }}
          aria-label="Back"
          title="Back"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: fg, display: "flex", alignItems: "center", touchAction: "manipulation" }}
        >
          <svg width="36" height="16" viewBox="0 0 36 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="30" y1="8" x2="1" y2="8" />
            <polyline points="9,1 1,8 9,15" />
          </svg>
        </button>
      </div>

      {/* SEARCH INPUT */}
      <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <SearchIcon size={15} style={{ color: dimColor, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={searchMode === "result" || searchMode === "supplier" ? "" : search}
            onChange={e => {
              const val = e.target.value;
              setSearch(val);
              setSelectedProduct(null);
              setSelectedSupplier(null);
              setSearchMode("active");
              setShowDropdown(val.length > 0);
            }}
            onFocus={() => {
              if (search.length > 0) setShowDropdown(true);
            }}
            placeholder="Enter Product / Supplier"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: "15px", fontFamily: "Raleway, inherit",
              color: fg, caretColor: fg,
            }}
          />
          {search.length > 0 && searchMode !== "result" && searchMode !== "supplier" && (
            <button
              onClick={handleClear}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: dimColor }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* MIDDLE SCROLLABLE AREA */}
      <div style={{ flex: 1, overflowY: "auto", paddingLeft: "20px", paddingRight: "20px", paddingTop: "12px" }}>

        {/* DROPDOWN — inline, all results shown, NO limits */}
        {dropdownContent && showDropdown && (() => {
          const { favourites, colours, regular, matchedSuppliers } = dropdownContent;
          const hasResults = favourites.length > 0 || colours.length > 0 || regular.length > 0 || matchedSuppliers.length > 0;

          if (!hasResults) {
            return <div style={{ padding: "20px 0", fontSize: "15px", color: dimColor }}>No results found</div>;
          }

          return (
            <div>
              {/* Suppliers */}
              {matchedSuppliers.length > 0 && <div style={sectionHeaderBlack}>Suppliers</div>}
              {matchedSuppliers.map((supplier) => (
                <div
                  key={`sup-${supplier}`}
                  onClick={() => handleSelectSupplier(supplier)}
                  style={{
                    padding: "12px 20px",
                    marginLeft: "-20px",
                    marginRight: "-20px",
                    borderBottom: `1px solid ${border}`,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 300, color: fg }}>{supplier}</span>
                    <Building2 size={11} style={{ color: dimColor, opacity: 0.4, flexShrink: 0 }} />
                  </div>
                </div>
              ))}

              {/* Office Favourites */}
              {favourites.length > 0 && (
                <>
                  <div style={sectionHeaderBlack}>Office Favourites</div>
                  {favourites.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      style={{
                        padding: "12px 20px",
                        marginLeft: "-20px",
                        marginRight: "-20px",
                        borderBottom: i === favourites.length - 1 ? "none" : `1px solid ${border}`,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "15px", fontWeight: 300, color: fg, display: "flex", alignItems: "center", gap: "6px" }}>
                          <Star size={12} fill="currentColor" style={{ color: "#000", flexShrink: 0 }} />
                          <span>{p["PRODUCT NAME"]}</span>
                        </div>
                        {p["OFFICE BALANCE"] != null && (
                          <div style={{ fontSize: "14px", fontWeight: 300, color: balanceColor(p["OFFICE BALANCE"]), marginLeft: "8px", flexShrink: 0 }}>
                            {p["OFFICE BALANCE"]}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "2px", color: dimColor }}>{p.SUPPLIER}</div>
                    </div>
                  ))}
                </>
              )}

              {/* Regular Products */}
              {regular.length > 0 && (
                <>
                  <div style={sectionHeaderBlack}>Products</div>
                  {regular.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      style={{
                        padding: "12px 20px",
                        marginLeft: "-20px",
                        marginRight: "-20px",
                        borderBottom: i === regular.length - 1 ? "none" : `1px solid ${border}`,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>{p["PRODUCT NAME"]}</div>
                        {p["OFFICE BALANCE"] != null && (
                          <div style={{ fontSize: "14px", fontWeight: 300, color: balanceColor(p["OFFICE BALANCE"]), marginLeft: "8px", flexShrink: 0 }}>
                            {p["OFFICE BALANCE"]}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "2px", color: dimColor }}>{p.SUPPLIER}</div>
                    </div>
                  ))}
                </>
              )}

              {/* Colours */}
              {colours.length > 0 && (
                <>
                  <div style={sectionHeader}>Colours</div>
                  {colours.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      style={{
                        padding: "12px 20px",
                        marginLeft: "-20px",
                        marginRight: "-20px",
                        borderBottom: i === colours.length - 1 ? "none" : `1px solid ${border}`,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>{p["PRODUCT NAME"]}</div>
                        {p["OFFICE BALANCE"] != null && (
                          <div style={{ fontSize: "14px", fontWeight: 300, color: balanceColor(p["OFFICE BALANCE"]), marginLeft: "8px", flexShrink: 0 }}>
                            {p["OFFICE BALANCE"]}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "2px", color: dimColor }}>{p.SUPPLIER}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })()}

        {/* PRODUCT RESULT */}
        {searchMode === "result" && selectedProduct && !showDropdown && (
          <div style={{ paddingTop: "20px", paddingBottom: "40px" }}>
            {/* Product name + favorite */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, lineHeight: 1.3, color: fg, flex: 1 }}>
                {selectedProduct["PRODUCT NAME"]}
              </div>
              <button onClick={toggleFav} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: isFav ? fg : dimColor, flexShrink: 0, marginTop: "4px" }}>
                <Star size={16} fill={isFav ? "currentColor" : "none"} />
              </button>
            </div>
            <div style={{ height: "20px" }} />
            {/* Supplier */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: fg, marginBottom: "6px" }}>Supplier</div>
              <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>{selectedProduct.SUPPLIER || "—"}</div>
            </div>

            {/* Prices grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "18px", columnGap: "12px", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: fg, marginBottom: "4px" }}>Supplier Price</div>
                <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>
                  {selectedProduct["SUPPLIER PRICE"] != null ? `RM ${selectedProduct["SUPPLIER PRICE"].toFixed(2)}` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: fg, marginBottom: "4px" }}>Branch Price</div>
                <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>
                  {selectedProduct["BRANCH PRICE"] != null ? `RM ${selectedProduct["BRANCH PRICE"].toFixed(2)}` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: fg, marginBottom: "4px" }}>Customer Price</div>
                <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>
                  {selectedProduct["CUSTOMER PRICE"] != null ? `RM ${selectedProduct["CUSTOMER PRICE"].toFixed(2)}` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: fg, marginBottom: "4px" }}>Staff Price</div>
                <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>
                  {selectedProduct["STAFF PRICE"] != null ? `RM ${selectedProduct["STAFF PRICE"].toFixed(2)}` : "—"}
                </div>
              </div>
              {/* Office Balance + Usage */}
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: fg, marginBottom: "4px" }}>Office Balance</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>{selectedProduct["OFFICE BALANCE"] ?? "—"}</div>
                  <button
                    onClick={() => { setUsageOpen(o => !o); setUsageQty(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: dimColor, display: "flex", alignItems: "center" }}
                  >
                    {usageOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
                {usageOpen && (
                  <div style={{ marginTop: "10px", padding: "10px 12px", border: `0.5px solid ${border}`, borderRadius: "8px", background: "hsl(var(--background))" }}>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                      {(["Personal Use", "Expired"] as const).map(t => (
                        <button key={t} onClick={() => setUsageType(t)} style={{
                          flex: 1, padding: "4px 0", fontSize: "10px", fontWeight: 600,
                          letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", borderRadius: "4px",
                          border: usageType === t ? `1px solid ${fg}` : `0.5px solid ${border}`,
                          background: usageType === t ? fg : "none",
                          color: usageType === t ? "hsl(var(--background))" : dimColor,
                        }}>{t}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input type="number" min="1" value={usageQty} onChange={e => setUsageQty(e.target.value)} placeholder="Qty"
                        style={{ flex: 1, background: "none", border: `0.5px solid ${border}`, borderRadius: "4px", padding: "4px 8px", outline: "none", fontSize: "13px", color: fg }} />
                      <button onClick={() => setUsageOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: dimColor }}>
                        <X size={14} />
                      </button>
                      <button onClick={submitUsage} disabled={usageSubmitting} style={{
                        background: "none", border: "1px solid hsl(var(--destructive))", borderRadius: "4px",
                        padding: "3px 10px", cursor: "pointer", fontSize: "13px", color: "hsl(var(--destructive))", opacity: usageSubmitting ? 0.5 : 1,
                      }}>✓</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Store Room */}
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: fg, marginBottom: "4px" }}>Store Room</div>
                <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>{selectedProduct["OFFICE SECTION"] || "—"}</div>
              </div>
            </div>

            {/* Branch balances */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", paddingBottom: "20px" }}>
              {([
                { label: "Boudoir", key: "BOUDOIR BALANCE" },
                { label: "Chic Nailspa", key: "CHIC NAILSPA BALANCE" },
                { label: "Nur Yadi", key: "NUR YADI BALANCE" },
              ] as { label: string; key: keyof Product }[]).map(({ label, key }) => (
                <div key={label}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: fg, marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "15px", fontWeight: 300, color: fg }}>
                    {(selectedProduct as any)[key] ?? "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Past Data transactions */}
            <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: "20px", paddingBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.06em", color: fg, marginBottom: "10px" }}>Past Data</div>
              <div style={{ display: "grid", gridTemplateColumns: "54px 86px 1fr 32px 38px", columnGap: "8px" }}>
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "54px 86px 1fr 32px 38px",
                    columnGap: "8px",
                    borderBottom: `0.5px solid ${border}`,
                  }}
                >
                  <div style={{ ...hdrStyle, color: fg, textTransform: "capitalize", paddingBottom: "6px" }}>Date</div>
                  <div style={{ ...hdrStyle, color: fg, textTransform: "capitalize", paddingBottom: "6px" }}>GRN</div>
                  <div style={{ ...hdrStyle, color: fg, textTransform: "capitalize", paddingBottom: "6px", textAlign: "center" }}>Supplier</div>
                  <div style={{ ...hdrStyle, color: fg, textTransform: "capitalize", paddingBottom: "6px", textAlign: "center" }}>Qty</div>
                  <div style={{ ...hdrStyle, color: fg, textTransform: "capitalize", paddingBottom: "6px", textAlign: "right" }}>Bal</div>
                </div>
                
                {productLogLoading && <div style={{ gridColumn: "1/-1", fontSize: "11px", color: dimColor, padding: "8px 0" }}>Loading...</div>}
                {!productLogLoading && productLog.filter(r => r.GRN).length === 0 && (
                  <div style={{ gridColumn: "1/-1", fontSize: "11px", color: dimColor, padding: "8px 0" }}>No entries</div>
                )}
                {!productLogLoading && productLog.filter(r => r.GRN).map((row, i, arr) => {
                  const isOffice = (row.BRANCH || "").toLowerCase() === "office";
                  const qty = Math.abs(row.QTY);
                  const qtyDisplay = isOffice ? `+${qty}` : `-${qty}`;
                  const qtyColor = isOffice ? "hsl(142 65% 30%)" : "hsl(0 70% 50%)";
                  const cellStyle: React.CSSProperties = {
                    fontSize: "11px", fontWeight: 300,
                    padding: "6px 0",
                  };
                  return (
                    <div
                      key={row.id}
                      style={{
                        gridColumn: "1 / -1",
                        display: "grid",
                        gridTemplateColumns: "54px 86px 1fr 32px 38px",
                        columnGap: "8px",
                        borderBottom: i < arr.length - 1 ? `0.5px solid ${border}` : "none",
                      }}
                    >
                      <div style={{ ...cellStyle, color: dimColor, whiteSpace: "nowrap" }}>{fmtDate(row.DATE)}</div>
                      <div style={{ ...cellStyle, color: fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.GRN}</div>
                      <div style={{ ...cellStyle, color: dimColor, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.SUPPLIER || "—"}</div>
                      <div style={{ ...cellStyle, color: qtyColor, textAlign: "center" }}>{qtyDisplay}</div>
                      <div style={{ ...cellStyle, color: dimColor, textAlign: "right" }}>{row["OFFICE BALANCE"] ?? "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUPPLIER RESULT */}
        {searchMode === "supplier" && selectedSupplier && !showDropdown && (
          <div style={{ paddingTop: "20px", paddingBottom: "40px" }}>
            <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, color: fg, marginBottom: "20px" }}>
              {selectedSupplier}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", paddingBottom: "8px", borderBottom: `0.5px solid ${border}`, marginBottom: "4px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: dimColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>Product</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: dimColor, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", minWidth: "64px" }}>Price</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: dimColor, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", minWidth: "36px" }}>Bal</div>
            </div>
            {products
              .filter(p => p.SUPPLIER === selectedSupplier && (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1))
              .sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]))
              .map((p, i, arr) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px",
                    padding: "11px 0",
                    borderBottom: i < arr.length - 1 ? `0.5px solid ${border}` : "none",
                    cursor: "pointer", alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 300, color: fg }}>{p["PRODUCT NAME"]}</div>
                  <div style={{ fontSize: "13px", fontWeight: 300, color: dimColor, textAlign: "right", minWidth: "64px" }}>
                    {p["SUPPLIER PRICE"] != null ? `RM ${p["SUPPLIER PRICE"].toFixed(2)}` : "—"}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, color: fg, textAlign: "right", minWidth: "36px" }}>
                    {p["OFFICE BALANCE"] ?? "—"}
                  </div>
                </div>
              ))}
          </div>
        )}

      </div>
    </div>
  );
}