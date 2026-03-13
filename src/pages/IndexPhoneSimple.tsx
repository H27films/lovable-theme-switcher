import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import SearchPage from "./SearchPage";
import BranchesPage from "./BranchesPage";
import OrderPage from "./OrderPage";
import { X, Search } from "lucide-react";

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
}

const IndexPhoneSimple = () => {
  const { theme, setTheme } = useTheme();
  const isSandTheme = theme === "sand";
  const toggleTheme = () => setTheme(isSandTheme ? "light" : "sand");

  const [products, setProducts] = useState<OfficeProduct[]>([]);

  useEffect(() => {
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
  }, []);

  const [activeSection, setActiveSection] = useState<"search" | "branches" | "order" | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<
    "at-menu" | "menu-leaving" | "section-entering" | "at-section" | "section-leaving" | "menu-entering"
  >("at-menu");

  const navigateTo = (section: "search" | "branches" | "order") => {
    setTransitionPhase("menu-leaving");
    setTimeout(() => {
      setActiveSection(section);
      setTransitionPhase("section-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionPhase("at-section")));
    }, 350);
  };

  const navigateBack = () => {
    setTransitionPhase("section-leaving");
    setTimeout(() => {
      setActiveSection(null);
      setSimpleSearchMode("idle");
      setSimpleSearch("");
      setSimpleSelectedProduct(null);
      setSimpleSelectedSupplier(null);
      setSimpleShowDropdown(false);
      setTransitionPhase("menu-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionPhase("at-menu")));
    }, 350);
  };

  const [simpleSearchMode, setSimpleSearchMode] = useState<"idle" | "active" | "result" | "supplier">("idle");
  const [simpleSearch, setSimpleSearch] = useState("");
  const [simpleShowDropdown, setSimpleShowDropdown] = useState(false);
  const [simpleSelectedProduct, setSimpleSelectedProduct] = useState<OfficeProduct | null>(null);
  const [simpleSelectedSupplier, setSimpleSelectedSupplier] = useState<string | null>(null);
  const simpleInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  const menuTransitionStyle: React.CSSProperties = {
    transition: "transform 0.38s cubic-bezier(0.4,0,0.2,1), filter 0.38s ease, opacity 0.38s ease",
    transform:
      transitionPhase === "menu-leaving" ? "translateY(-20%)" :
      transitionPhase === "menu-entering" ? "translateY(20%)" : "translateY(0)",
    filter:
      transitionPhase === "menu-leaving" || transitionPhase === "menu-entering" ? "blur(14px)" : "blur(0px)",
    opacity: transitionPhase === "menu-leaving" || transitionPhase === "menu-entering" ? 0 : 1,
  };

  const sectionTransitionStyle: React.CSSProperties = {
    transition: "transform 0.38s cubic-bezier(0.4,0,0.2,1), filter 0.38s ease, opacity 0.38s ease",
    transform:
      transitionPhase === "section-entering" ? "translateY(25%)" :
      transitionPhase === "section-leaving" ? "translateY(-20%)" : "translateY(0)",
    filter:
      transitionPhase === "section-entering" || transitionPhase === "section-leaving" ? "blur(14px)" : "blur(0px)",
    opacity: transitionPhase === "section-entering" || transitionPhase === "section-leaving" ? 0 : 1,
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* Fixed theme toggle */}
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 60 }}>
        <span onClick={toggleTheme} style={{ cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center" }} title="Switch theme">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </span>
      </div>

      <div className="max-w-full mx-auto px-3">

        {/* Home Menu */}
        {activeSection === null && (
          <div style={{ position: "relative", minHeight: "100dvh", overflow: "hidden", ...menuTransitionStyle }}>

            {/* Idle: 3 items centered */}
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              justifyContent: "center", paddingLeft: "12px",
              opacity: simpleSearchMode === "idle" ? 1 : 0,
              transform: simpleSearchMode === "idle" ? "translateY(0)" : "translateY(-5%)",
              transition: "opacity 0.38s ease, transform 0.38s ease",
              pointerEvents: simpleSearchMode === "idle" ? "auto" : "none",
            }}>
              {(["SEARCH", "BRANCHES", "ORDER"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    if (item === "SEARCH") { setSimpleSearchMode("active"); setTimeout(() => simpleInputRef.current?.focus(), 420); }
                    else if (item === "ORDER") { navigateTo("order"); }
                    else { navigateTo("branches"); }
                  }}
                  style={{
                    display: "block", textAlign: "left", padding: "2px 0",
                    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: "clamp(40px, 12vw, 64px)", fontWeight: 300, letterSpacing: "0.05em",
                    color: "hsl(var(--foreground))", lineHeight: 1,
                    transition: "opacity 0.2s ease", overflow: "hidden", width: "100%",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.5")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
                    <span style={{ flexShrink: 0 }}>{item}</span>
                    <span style={{ fontSize: "clamp(40px, 12vw, 64px)", fontWeight: 300, letterSpacing: "0.05em", opacity: 0.07, marginLeft: "0.25em" }}>{item}</span>
                    <span style={{ fontSize: "clamp(40px, 12vw, 64px)", fontWeight: 300, letterSpacing: "0.05em", opacity: 0.05, marginLeft: "0.25em" }}>{item}</span>
                    <span style={{ fontSize: "clamp(40px, 12vw, 64px)", fontWeight: 300, letterSpacing: "0.05em", opacity: 0.03, marginLeft: "0.25em" }}>{item}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Active/Result: Search expanded */}
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              opacity: simpleSearchMode !== "idle" ? 1 : 0,
              transform: simpleSearchMode !== "idle" ? "translateY(0)" : "translateY(5%)",
              transition: "opacity 0.38s ease, transform 0.38s ease",
              pointerEvents: simpleSearchMode !== "idle" ? "auto" : "none",
            }}>

              {/* TOP AREA — SEARCH label + search bar */}
              <div style={{ paddingLeft: "20px", paddingRight: "20px", paddingTop: "28px", flexShrink: 0 }}>

                {/* SEARCH label — only shown in active mode, hidden completely on result/supplier */}
                {simpleSearchMode === "active" && (
                  <button
                    onClick={() => { setSimpleSearchMode("idle"); setSimpleSearch(""); setSimpleSelectedProduct(null); setSimpleSelectedSupplier(null); setSimpleShowDropdown(false); }}
                    style={{
                      display: "block", fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300,
                      letterSpacing: "0.08em", color: "hsl(var(--foreground))",
                      background: "none", border: "none", cursor: "pointer", textAlign: "left",
                      padding: 0, fontFamily: "Raleway, inherit", lineHeight: 1, marginBottom: "16px", width: "100%",
                    }}
                  >
                    SEARCH
                  </button>
                )}

                {/* Search input row */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Search size={15} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
                  <input
                    ref={simpleInputRef}
                    type="text"
                    inputMode="search"
                    value={simpleSearchMode === "result" || simpleSearchMode === "supplier" ? "" : simpleSearch}
                    onChange={e => {
                      const val = e.target.value;
                      setSimpleSearch(val);
                      setSimpleSelectedProduct(null);
                      setSimpleSelectedSupplier(null);
                      setSimpleSearchMode("active");
                      setSimpleShowDropdown(val.length > 0);
                    }}
                    onFocus={() => {
                      if (simpleSearchMode === "result" || simpleSearchMode === "supplier") {
                        setSimpleSearch("");
                        setSimpleSelectedProduct(null);
                        setSimpleSelectedSupplier(null);
                        setSimpleSearchMode("active");
                      }
                    }}
                    placeholder="Enter Product.."
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      fontSize: "15px", fontFamily: "Raleway, inherit",
                      color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))",
                    }}
                  />
                  {simpleSearch.length > 0 && simpleSearchMode !== "result" && simpleSearchMode !== "supplier" && (
                    <button
                      onClick={() => { setSimpleSearch(""); setSimpleSelectedProduct(null); setSimpleSelectedSupplier(null); setSimpleShowDropdown(false); setSimpleSearchMode("active"); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* MIDDLE SCROLLABLE AREA */}
              <div style={{ flex: 1, overflowY: "auto", paddingLeft: "20px", paddingRight: "20px", paddingTop: "8px" }}>

                {/* Dropdown — products + suppliers */}
                {simpleShowDropdown && simpleSearch.length > 0 && (() => {
                  const q = simpleSearch.toLowerCase();
                  const matchedProducts = products.filter(p =>
                    p["PRODUCT NAME"].toLowerCase().includes(q) &&
                    (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
                  ).slice(0, 12);
                  const matchedSuppliers = Array.from(new Set(
                    products
                      .map(p => p["SUPPLIER"])
                      .filter((s): s is string => !!s && s.toLowerCase().includes(q))
                  )).sort().slice(0, 5);
                  const hasResults = matchedProducts.length > 0 || matchedSuppliers.length > 0;
                  return (
                    <div>
                      {matchedSuppliers.map((supplier) => (
                        <div
                          key={`sup-${supplier}`}
                          onClick={() => { setSimpleSelectedSupplier(supplier); setSimpleSearch(supplier); setSimpleShowDropdown(false); setSimpleSearchMode("supplier"); }}
                          style={{
                            padding: "12px 0", borderBottom: "0.5px solid hsl(var(--border))",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                          }}
                        >
                          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{supplier}</div>
                          <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>Supplier</div>
                        </div>
                      ))}
                      {matchedProducts.map((p, i, arr) => (
                        <div
                          key={p.id}
                          onClick={() => { setSimpleSelectedProduct(p); setSimpleSearch(p["PRODUCT NAME"]); setSimpleShowDropdown(false); setSimpleSearchMode("result"); }}
                          style={{
                            padding: "12px 0",
                            borderBottom: i < arr.length - 1 ? "0.5px solid hsl(var(--border))" : "none",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{p["PRODUCT NAME"]}</div>
                          <div style={{ fontSize: "12px", marginTop: "2px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{p["SUPPLIER"]}</div>
                        </div>
                      ))}
                      {!hasResults && (
                        <div style={{ padding: "20px 0", fontSize: "15px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>No results found</div>
                      )}
                    </div>
                  );
                })()}

                {/* Product result card */}
                {simpleSearchMode === "result" && simpleSelectedProduct && !simpleShowDropdown && (
                  <div style={{ paddingTop: "20px" }}>

                    {/* Product name */}
                    <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, fontFamily: "Raleway, inherit", lineHeight: 1.3, color: "hsl(var(--foreground))", marginBottom: "0" }}>
                      {simpleSelectedProduct["PRODUCT NAME"]}
                    </div>

                    <div style={{ borderBottom: "0.5px solid hsl(var(--border))", margin: "16px 0" }} />

                    {/* Supplier section */}
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "6px" }}>Supplier</div>
                      <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                        {simpleSelectedProduct["SUPPLIER"] || "—"}
                      </div>
                    </div>

                    {/* Prices — bold label, light value, gap between each pair */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "18px", columnGap: "12px", marginBottom: "20px" }}>
                      {([
                        { label: "Supplier Price", val: simpleSelectedProduct["SUPPLIER PRICE"] },
                        { label: "Branch Price", val: simpleSelectedProduct["BRANCH PRICE"] },
                        { label: "Customer Price", val: simpleSelectedProduct["CUSTOMER PRICE"] },
                        { label: "Staff Price", val: simpleSelectedProduct["STAFF PRICE"] },
                      ] as { label: string; val: number | null }[]).map(({ label, val }) => (
                        <div key={label}>
                          <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>{label}</div>
                          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                            {val != null ? `RM ${val.toFixed(2)}` : "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Office Balance + Store Room */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                      <div style={{ gridColumn: "1 / 3" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Office Balance</div>
                        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{simpleSelectedProduct["OFFICE BALANCE"] ?? "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Store Room</div>
                        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{simpleSelectedProduct["OFFICE SECTION"] || "—"}</div>
                      </div>
                    </div>

                    {/* Branch balances */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", paddingBottom: "24px" }}>
                      {([
                        { label: "Boudoir", key: "BOUDOIR BALANCE" },
                        { label: "Chic Nailspa", key: "CHIC NAILSPA BALANCE" },
                        { label: "Nur Yadi", key: "NUR YADI BALANCE" },
                      ] as { label: string; key: keyof OfficeProduct }[]).map(({ label, key }) => (
                        <div key={label}>
                          <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>{label}</div>
                          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{(simpleSelectedProduct as any)[key] ?? "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supplier result — list all products for that supplier */}
                {simpleSearchMode === "supplier" && simpleSelectedSupplier && !simpleShowDropdown && (
                  <div style={{ paddingTop: "20px" }}>
                    <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "20px" }}>
                      {simpleSelectedSupplier}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", paddingBottom: "8px", borderBottom: "0.5px solid hsl(var(--border))", marginBottom: "4px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em" }}>Product</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", minWidth: "64px" }}>Price</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", minWidth: "36px" }}>Bal</div>
                    </div>
                    {products
                      .filter(p => p["SUPPLIER"] === simpleSelectedSupplier && (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1))
                      .sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]))
                      .map((p, i, arr) => (
                        <div
                          key={p.id}
                          onClick={() => { setSimpleSelectedProduct(p); setSimpleSelectedSupplier(null); setSimpleSearchMode("result"); }}
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
                            {p["OFFICE BALANCE"] ?? "—"}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

              </div>

              {/* BRANCHES + ORDER — always pinned to very bottom */}
              <div style={{
                flexShrink: 0, paddingLeft: "20px", paddingRight: "20px",
                paddingTop: "8px", paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)",
                filter: "blur(2px)", opacity: 0.25,
              }}>
                {(["BRANCHES", "ORDER"] as const).map(item => (
                  <button
                    key={item}
                    onClick={() => { setSimpleSearchMode("idle"); setSimpleSearch(""); setSimpleSelectedProduct(null); setSimpleSelectedSupplier(null); setSimpleShowDropdown(false); }}
                    style={{
                      display: "block", fontSize: "clamp(13px, 3.5vw, 20px)", fontWeight: 300,
                      letterSpacing: "0.06em", color: "hsl(var(--foreground))",
                      background: "none", border: "none", cursor: "pointer", textAlign: "left",
                      fontFamily: "Raleway, inherit", lineHeight: 1.35, padding: 0,
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>

            </div>

          </div>
        )}

        {/* Section pages */}
        {activeSection !== null && (
          <div style={sectionTransitionStyle}>
            {activeSection === "search" && <SearchPage onBack={navigateBack} />}
            {activeSection === "branches" && <BranchesPage onBack={navigateBack} />}
            {activeSection === "order" && <OrderPage onBack={navigateBack} />}
          </div>
        )}

      </div>
    </div>
  );
};

export default IndexPhoneSimple;