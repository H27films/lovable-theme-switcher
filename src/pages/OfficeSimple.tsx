import React, { useState, useRef, useEffect } from "react";
import { X, Search, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  "OfficeFavourites": string | null;
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
  "BOUDOIR BALANCE"?: number;
  "CHIC NAILSPA BALANCE"?: number;
  "NUR YADI BALANCE"?: number;
}



interface OfficeSimpleProps {
  onBack: () => void;
  onBackToMain: () => void;
  products: OfficeProduct[];
}

const hdrStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: "hsl(var(--muted-foreground))", textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const OfficeSimple = ({ onBack, onBackToMain, products }: OfficeSimpleProps) => {
  const [searchMode, setSearchMode] = useState<"idle" | "active" | "result" | "supplier">("idle");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const BRANCH_NAME = "OFFICE";
  const BALANCE_KEY = "OFFICE BALANCE" as keyof OfficeProduct;

  // ── Recent log state ──────────────────────────────────────────
  const [logRows, setLogRows] = useState<LogRow[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoadingLog(true);
    (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("TYPE", "Order")
      .order("DATE", { ascending: false })
      .limit(300)
      .then(({ data }: { data: LogRow[] | null }) => {
        setLogRows(data || []);
        setLoadingLog(false);
      });
  }, []);

  // Group log rows by GRN
  interface GrnGroup {
    grn: string;
    date: string;
    branch: string;
    rows: LogRow[];
  }

  const grnGroups: GrnGroup[] = (() => {
    const map = new Map<string, GrnGroup>();
    for (const row of logRows) {
      const grn = row.GRN || `no-grn-${row.id}`;
      if (!map.has(grn)) {
        map.set(grn, { grn, date: row.DATE, branch: row.BRANCH, supplier: row.SUPPLIER ?? "—", rows: [] });
      }
      map.get(grn)!.rows.push(row);
    }
    // Sort by most recent date (already ordered from Supabase, but map preserves insertion order)
    return Array.from(map.values());
  })();

  const toggleGRN = (grn: string) => {
    setExpandedGRNs(prev => {
      const next = new Set(prev);
      if (next.has(grn)) next.delete(grn); else next.add(grn);
      return next;
    });
  };

  const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div style={{
      minHeight: "100dvh",
      background: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      fontFamily: "'Raleway', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* TOP AREA */}
      <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "28px", flexShrink: 0 }}>

        {/* Branch name header — tappable to go back */}
        <button
          onClick={() => {
            if (searchMode !== "idle") {
              setSearchMode("idle");
              setSearch("");
              setSelectedProduct(null);
              setSelectedSupplier(null);
              setShowDropdown(false);
            } else {
              onBack();
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

        {/* Search input row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Search size={15} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
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
              // Keep result/supplier view on focus — typing will clear it
            }}
            placeholder="Enter Product / Supplier"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: "15px", fontFamily: "Raleway, inherit",
              color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))",
            }}
          />
          {search.length > 0 && searchMode !== "result" && searchMode !== "supplier" && (
            <button
              onClick={() => { setSearch(""); setSelectedProduct(null); setSelectedSupplier(null); setShowDropdown(false); setSearchMode("active"); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* MIDDLE SCROLLABLE */}
      <div style={{ flex: 1, overflowY: "auto", paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px" }}>

        {/* Dropdown */}
        {showDropdown && search.length > 0 && (() => {
          const q = search.toLowerCase();
          const allMatched = products.filter(p =>
            p["PRODUCT NAME"].toLowerCase().includes(q) &&
            (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
          );
          const isTrue = (v: any) => v === true || v === "TRUE" || v === "true" || v === 1;
          const favourites = allMatched.filter(p => isTrue(p["OfficeFavourites"])).slice(0, 6);
          const colours = allMatched.filter(p => !isTrue(p["OfficeFavourites"]) && isTrue(p["Colour"])).slice(0, 6);
          const regular = allMatched.filter(p => !isTrue(p["OfficeFavourites"]) && !isTrue(p["Colour"])).slice(0, 6);
          const matchedSuppliers = Array.from(new Set(
            products.map(p => p["SUPPLIER"]).filter((s): s is string => !!s && s.toLowerCase().includes(q))
          )).sort().slice(0, 5);
          const hasResults = favourites.length > 0 || colours.length > 0 || regular.length > 0 || matchedSuppliers.length > 0;

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
              <div style={{ fontSize: "12px", marginTop: "2px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{p["SUPPLIER"]}</div>
            </div>
          );

          return (
            <div>
              {matchedSuppliers.map((supplier) => (
                <div
                  key={`sup-${supplier}`}
                  onClick={() => { setSelectedSupplier(supplier); setSearch(supplier); setShowDropdown(false); setSearchMode("supplier"); }}
                  style={{ padding: "12px 0", borderBottom: "0.5px solid hsl(var(--border))", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{supplier}</span>
                  <Building2 size={11} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4, flexShrink: 0, marginLeft: "5px" }} />
                </div>
              ))}
              {favourites.length > 0 && (
                <>
                  <SectionHeader label="Office Favourites" />
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

        {/* Product result card */}
        {searchMode === "result" && selectedProduct && !showDropdown && (
          <div style={{ paddingTop: "20px" }}>
            <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, fontFamily: "Raleway, inherit", lineHeight: 1.3, color: "hsl(var(--foreground))", marginBottom: "0" }}>
              {selectedProduct["PRODUCT NAME"]}
            </div>
            <div style={{ borderBottom: "0.5px solid hsl(var(--border))", margin: "16px 0" }} />
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "6px" }}>Supplier</div>
              <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["SUPPLIER"] || "—"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "18px", columnGap: "12px", marginBottom: "20px" }}>
              {([
                { label: "Supplier Price", val: selectedProduct["SUPPLIER PRICE"] },
                { label: "Branch Price", val: selectedProduct["BRANCH PRICE"] },
                { label: "Customer Price", val: selectedProduct["CUSTOMER PRICE"] },
                { label: "Staff Price", val: selectedProduct["STAFF PRICE"] },
              ] as { label: string; val: number | null }[]).map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{val != null ? `RM ${val.toFixed(2)}` : "—"}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div style={{ gridColumn: "1 / 3" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Office Balance</div>
                <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["OFFICE BALANCE"] ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Store Room</div>
                <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{selectedProduct["OFFICE SECTION"] || "—"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", paddingBottom: "24px" }}>
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
          </div>
        )}

        {/* Supplier result */}
        {searchMode === "supplier" && selectedSupplier && !showDropdown && (
          <div style={{ paddingTop: "20px" }}>
            <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "20px" }}>
              {selectedSupplier}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", paddingBottom: "8px", borderBottom: "0.5px solid hsl(var(--border))", marginBottom: "4px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em" }}>Product</div>
              <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", minWidth: "64px" }}>Price</div>
              <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", minWidth: "36px" }}>Bal</div>
            </div>
            {products
              .filter(p => p["SUPPLIER"] === selectedSupplier && (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1))
              .sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]))
              .map((p, i, arr) => (
                <div
                  key={p.id}
                  onClick={() => { setSelectedProduct(p); setSelectedSupplier(null); setSearchMode("result"); }}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px",
                    padding: "11px 0",
                    borderBottom: i < arr.length - 1 ? "0.5px solid hsl(var(--border))" : "none",
                    cursor: "pointer", alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{p["PRODUCT NAME"]}</div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "right", minWidth: "64px" }}>
                    {p["SUPPLIER PRICE"] != null ? `RM ${p["SUPPLIER PRICE"].toFixed(2)}` : "—"}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "right", minWidth: "36px" }}>
                    {(p as any)[BALANCE_KEY] ?? "—"}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── RECENT SECTION (idle only) ──────────────────────────── */}
        {searchMode === "idle" && !showDropdown && (
          <div style={{ paddingTop: "12px", display: "flex", flexDirection: "column", flex: 1 }}>

            <div style={{ fontSize: "16px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "12px" }}>
              Recent
            </div>

            {/* Header row — 6 cols: Date | GRN | Supplier | Items | Bal (only when expanded) | chevron */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px",
              gap: "6px",
              paddingBottom: "8px",
              borderBottom: "0.5px solid hsl(var(--border))",
            }}>
              <div style={hdrStyle}>Date</div>
              <div style={hdrStyle}>GRN</div>
              <div style={hdrStyle}>Supplier</div>
              <div style={{ ...hdrStyle, textAlign: "center" }}>Items</div>
              <div style={{ ...hdrStyle, textAlign: "center", visibility: expandedGRNs.size > 0 ? "visible" : "hidden" }}>Bal</div>
              <div />
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {loadingLog && (
                <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>Loading...</div>
              )}
              {!loadingLog && grnGroups.length === 0 && (
                <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>No entries</div>
              )}
              {!loadingLog && grnGroups.map((group) => {
                const isOpen = expandedGRNs.has(group.grn);
                return (
                  <div key={group.grn}>
                    {/* Collapsed / summary row */}
                    <div
                      onClick={() => toggleGRN(group.grn)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px",
                        gap: "6px",
                        padding: "9px 0",
                        borderBottom: isOpen ? "none" : "0.5px solid hsl(var(--border) / 0.4)",
                        cursor: "pointer",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                        {fmtDate(group.date)}
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.02em" }}>
                        {group.grn}
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {group.supplier}
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
                        {group.rows.length}
                      </div>
                      <div />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))" }}>
                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>
                    </div>

                    {/* Expanded product rows — no sub-header; product spans GRN+Supplier cols */}
                    {isOpen && (
                      <div style={{ paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border) / 0.4)" }}>
                        {group.rows.map((row, idx) => (
                          <div
                            key={row.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr 0.7fr 36px 36px 18px",
                              gap: "6px",
                              padding: "5px 0",
                              borderTop: idx > 0 ? "0.5px solid hsl(var(--border) / 0.25)" : "none",
                              alignItems: "center",
                            }}
                          >
                            {/* empty date cell */}
                            <div />
                            {/* product name spans GRN + Supplier cols */}
                            <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", gridColumn: "2 / 4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row["PRODUCT NAME"]}
                            </div>
                            {/* Qty under Items col */}
                            <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>
                              {(row.BRANCH || "").toLowerCase() === "office" ? `+${row.QTY}` : `-${row.QTY}`}
                            </div>
                            {/* Bal under Bal col */}
                            <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
                              {row["OFFICE BALANCE"] ?? "—"}
                            </div>
                            {/* empty chevron cell */}
                            <div />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM BLUR BAR */}
      <div style={{
        flexShrink: 0, paddingLeft: "12px", paddingRight: "12px",
        paddingTop: "8px", paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)",
        filter: "blur(1px)", opacity: 0.25,
      }}>
        {(["SEARCH", "ORDER"] as const).map(item => (
          <button
            key={item}
            onClick={item === "SEARCH" ? onBackToMain : undefined}
            style={{
              display: "block", fontSize: "clamp(13px, 3.5vw, 20px)", fontWeight: 300,
              letterSpacing: "0.06em", color: "hsl(var(--foreground))",
              background: "none", border: "none", cursor: item === "SEARCH" ? "pointer" : "default", textAlign: "left",
              fontFamily: "Raleway, inherit", lineHeight: 1.35, padding: 0,
            }}
          >
            {item}
          </button>
        ))}
      </div>

    </div>
  );
};

export default OfficeSimple;
