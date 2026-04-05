import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import SearchSimple from "./SearchSimple";
import BranchesPage from "./BranchesPage";
import OrderSimple from "./OrderSimple";
import OfficeSimple from "./OfficeSimple";
import BoudoirSimple from "./BoudoirSimple";
import ChicSimple from "./ChicSimple";
import NurYadiSimple from "./NurYadiSimple";
import { X, Search, Building2, ChevronDown, ChevronUp, Star } from "lucide-react";

const hdrStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: "hsl(var(--muted-foreground))", textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

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
  "BOUDOIR FAVOURITE": string | boolean | null;
  "CHIC NAILSPA FAVOURITE": string | boolean | null;
  "NUR YADI FAVOURITE": string | boolean | null;
}

const SubLandingSimple = () => {
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
    }, 280);
  };

  const navigateBack = () => {
    setTransitionPhase("section-leaving");
    setTimeout(() => {
      setActiveSection(null);
      setActiveBranch(null);
      setBranchTransitionPhase("at-list");
      setSimpleSearchMode("idle");
      setSimpleSearch("");
      setSimpleSelectedProduct(null);
      setSimpleSelectedSupplier(null);
      setSimpleShowDropdown(false);
      setSimpleUsageOpen(false);
      setTransitionPhase("menu-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionPhase("at-menu")));
    }, 280);
  };

  const [activeBranch, setActiveBranch] = useState<"office" | "boudoir" | "chic" | "nuryadi" | null>(null);
  const [branchTransitionPhase, setBranchTransitionPhase] = useState<
    "at-list" | "list-leaving" | "page-entering" | "at-page" | "page-leaving" | "list-entering"
  >("at-list");

  const navigateToBranch = (branch: "office" | "boudoir" | "chic" | "nuryadi") => {
    setBranchTransitionPhase("list-leaving");
    setTimeout(() => {
      setActiveBranch(branch);
      setBranchTransitionPhase("page-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setBranchTransitionPhase("at-page")));
    }, 280);
  };

  const navigateBackToBranches = () => {
    setBranchTransitionPhase("page-leaving");
    setTimeout(() => {
      setActiveBranch(null);
      setBranchTransitionPhase("list-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setBranchTransitionPhase("at-list")));
    }, 280);
  };

  const navigateBackToMain = () => {
    setBranchTransitionPhase("page-leaving");
    setTransitionPhase("section-leaving");
    setTimeout(() => {
      setActiveBranch(null);
      setActiveSection(null);
      setBranchTransitionPhase("at-list");
      setSimpleSearchMode("idle");
      setSimpleSearch("");
      setSimpleSelectedProduct(null);
      setSimpleSelectedSupplier(null);
      setSimpleShowDropdown(false);
      setSimpleUsageOpen(false);
      setTransitionPhase("menu-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionPhase("at-menu")));
    }, 280);
  };

  const [simpleSearchMode, setSimpleSearchMode] = useState<"idle" | "active" | "result" | "supplier">("idle");
  const [simpleSearch, setSimpleSearch] = useState("");
  const [simpleShowDropdown, setSimpleShowDropdown] = useState(false);
  const [simpleSelectedProduct, setSimpleSelectedProduct] = useState<OfficeProduct | null>(null);
  const [simpleSelectedSupplier, setSimpleSelectedSupplier] = useState<string | null>(null);
  const simpleInputRef = useRef<HTMLInputElement>(null);

  // ── Product log for selected product card ──────────────────────
  const [simpleProductLog, setSimpleProductLog] = useState<any[]>([]);
  const [simpleProductLogLoading, setSimpleProductLogLoading] = useState(false);

  useEffect(() => {
    if (!simpleSelectedProduct) { setSimpleProductLog([]); return; }
    setSimpleProductLogLoading(true);
    (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("PRODUCT NAME", simpleSelectedProduct["PRODUCT NAME"])
      .order("DATE", { ascending: false })
      .limit(30)
      .then(({ data }: any) => {
        setSimpleProductLog(data || []);
        setSimpleProductLogLoading(false);
      });
  }, [simpleSelectedProduct]);

  // ── Favourite state ────────────────────────────────────────────
  const [simpleIsFav, setSimpleIsFav] = useState(false);

  useEffect(() => {
    const v = simpleSelectedProduct ? (simpleSelectedProduct as any)["OFFICE FAVOURITE"] : null;
    setSimpleIsFav(v === true || v === "TRUE" || v === "true" || v === 1);
  }, [simpleSelectedProduct]);

  const toggleSimpleFav = async () => {
    if (!simpleSelectedProduct) return;
    const newVal = !simpleIsFav;
    setSimpleIsFav(newVal);
    const updated = { ...simpleSelectedProduct, "OFFICE FAVOURITE": newVal ? "TRUE" : null } as any;
    setSimpleSelectedProduct(updated);
    setProducts(prev => prev.map(p => p.id === simpleSelectedProduct.id ? { ...p, "OFFICE FAVOURITE": newVal ? "TRUE" : null } : p));
    await (supabase as any).from("AllFileProducts")
      .update({ "OFFICE FAVOURITE": newVal ? "TRUE" : null })
      .eq("id", simpleSelectedProduct.id);
  };

  // ── Usage form state ───────────────────────────────────────────
  const [simpleUsageOpen, setSimpleUsageOpen] = useState(false);
  const [simpleUsageType, setSimpleUsageType] = useState<"Personal Use" | "Expired">("Personal Use");
  const [simpleUsageQty, setSimpleUsageQty] = useState("");
  const [simpleUsageSubmitting, setSimpleUsageSubmitting] = useState(false);

  const submitSimpleUsage = async () => {
    if (!simpleSelectedProduct || !simpleUsageQty || isNaN(Number(simpleUsageQty)) || Number(simpleUsageQty) <= 0) return;
    setSimpleUsageSubmitting(true);
    const qty = Number(simpleUsageQty);
    const currentBal = simpleSelectedProduct["OFFICE BALANCE"] ?? 0;
    const newBal = currentBal - qty;
    const today = new Date().toISOString().split("T")[0];

    await (supabase as any).from("AllFileLog").insert({
      BRANCH: "Office",
      "PRODUCT NAME": simpleSelectedProduct["PRODUCT NAME"],
      QTY: -qty,
      TYPE: simpleUsageType,
      DATE: today,
      "OFFICE BALANCE": newBal,
    });

    await (supabase as any).from("AllFileProducts")
      .update({ "OFFICE BALANCE": newBal })
      .eq("id", simpleSelectedProduct.id);

    setSimpleSelectedProduct({ ...simpleSelectedProduct, "OFFICE BALANCE": newBal });
    setSimpleUsageQty("");
    setSimpleUsageOpen(false);
    setSimpleUsageSubmitting(false);

    const { data } = await (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("PRODUCT NAME", simpleSelectedProduct["PRODUCT NAME"])
      .order("DATE", { ascending: false })
      .limit(30);
    setSimpleProductLog(data || []);
  };

  const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  const menuTransitionStyle: React.CSSProperties = {
    transition: "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
    transform:
      transitionPhase === "menu-leaving" ? "translateX(-30%)" :
      transitionPhase === "menu-entering" ? "translateX(-30%)" : "translateX(0)",
    filter:
      transitionPhase === "menu-leaving" || transitionPhase === "menu-entering" ? "blur(6px)" : "blur(0px)",
    opacity: transitionPhase === "menu-leaving" || transitionPhase === "menu-entering" ? 0 : 1,
  };

  const sectionTransitionStyle: React.CSSProperties = {
    transition: "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
    transform:
      transitionPhase === "section-entering" ? "translateX(30%)" :
      transitionPhase === "section-leaving" ? "translateX(30%)" : "translateX(0)",
    filter:
      transitionPhase === "section-entering" || transitionPhase === "section-leaving" ? "blur(6px)" : "blur(0px)",
    opacity: transitionPhase === "section-entering" || transitionPhase === "section-leaving" ? 0 : 1,
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* Fixed theme toggle - only show when not in branch view (branch pages have their own toggle) */}
      <div style={{ position: "fixed", top: "28px", right: "20px", zIndex: 60, display: (activeBranch !== null || activeSection === "order") ? "none" : "block" }}>
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
              {(["BRANCHES", "SEARCH", "ORDER"] as const).map((item) => (
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
                      // Do nothing on focus — keep result/supplier view intact.
                    }}
                    placeholder="Enter Product / Supplier"
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

                {/* Dropdown */}
                {simpleShowDropdown && simpleSearch.length > 0 && (() => {
                  const q = simpleSearch.toLowerCase();
                  const allMatched = products.filter(p =>
                    p["PRODUCT NAME"].toLowerCase().includes(q) &&
                    (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
                  );
                  const isTrue = (v: any) => v === true || v === "TRUE" || v === "true" || v === 1;
                  const favourites = allMatched.filter(p => isTrue(p["OFFICE FAVOURITE"])).slice(0, 6);
                  const colours = allMatched.filter(p => !isTrue(p["OFFICE FAVOURITE"]) && isTrue(p["Colour"])).slice(0, 6);
                  const regular = allMatched.filter(p => !isTrue(p["OFFICE FAVOURITE"]) && !isTrue(p["Colour"])).slice(0, 6);
                  const matchedSuppliers = Array.from(new Set(
                    products
                      .map(p => p["SUPPLIER"])
                      .filter((s): s is string => !!s && s.toLowerCase().includes(q))
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
                      onClick={() => { setSimpleSelectedProduct(p); setSimpleSearch(p["PRODUCT NAME"]); setSimpleShowDropdown(false); setSimpleSearchMode("result"); }}
                      style={{ padding: "12px 0", borderBottom: last ? "none" : "0.5px solid hsl(var(--border))", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{p["PRODUCT NAME"]}</div>
                        {p["OFFICE BALANCE"] != null && (
                          <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginLeft: "8px", flexShrink: 0 }}>{p["OFFICE BALANCE"]}</div>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "2px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>{p["SUPPLIER"]}</div>
                    </div>
                  );

                  return (
                    <div>
                      {favourites.length > 0 && (
                        <>
                          <SectionHeader label="Office Favourites" />
                          {favourites.map((p, i) => <ProductRow key={p.id} p={p} last={i === favourites.length - 1} />)}
                        </>
                      )}
                      {matchedSuppliers.map((supplier) => (
                        <div
                          key={`sup-${supplier}`}
                          onClick={() => { setSimpleSelectedSupplier(supplier); setSimpleSearch(supplier); setSimpleShowDropdown(false); setSimpleSearchMode("supplier"); }}
                          style={{ padding: "12px 0", borderBottom: "0.5px solid hsl(var(--border))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{supplier}</span>
                            <Building2 size={11} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4, flexShrink: 0 }} />
                          </div>
                        </div>
                      ))}
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
                {simpleSearchMode === "result" && simpleSelectedProduct && !simpleShowDropdown && (
                  <div style={{ paddingTop: "20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{ fontSize: "clamp(20px, 5.5vw, 28px)", fontWeight: 400, fontFamily: "Raleway, inherit", lineHeight: 1.3, color: "hsl(var(--foreground))", flex: 1 }}>
                        {simpleSelectedProduct["PRODUCT NAME"]}
                      </div>
                      <button
                        onClick={toggleSimpleFav}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: simpleIsFav ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", flexShrink: 0, marginTop: "4px" }}
                      >
                        <Star size={16} fill={simpleIsFav ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <div style={{ borderBottom: "0.5px solid hsl(var(--border))", margin: "16px 0" }} />
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "6px" }}>Supplier</div>
                      <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                        {simpleSelectedProduct["SUPPLIER"] || "—"}
                      </div>
                    </div>

                    {/* Prices + Office Balance + Store Room — all in same 2-col grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "18px", columnGap: "12px", marginBottom: "20px" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Supplier Price</div>
                        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{simpleSelectedProduct["SUPPLIER PRICE"] != null ? `RM ${simpleSelectedProduct["SUPPLIER PRICE"].toFixed(2)}` : "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Branch Price</div>
                        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{simpleSelectedProduct["BRANCH PRICE"] != null ? `RM ${simpleSelectedProduct["BRANCH PRICE"].toFixed(2)}` : "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Customer Price</div>
                        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{simpleSelectedProduct["CUSTOMER PRICE"] != null ? `RM ${simpleSelectedProduct["CUSTOMER PRICE"].toFixed(2)}` : "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Staff Price</div>
                        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{simpleSelectedProduct["STAFF PRICE"] != null ? `RM ${simpleSelectedProduct["STAFF PRICE"].toFixed(2)}` : "—"}</div>
                      </div>
                      {/* Office Balance + USE button */}
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Office Balance</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{simpleSelectedProduct["OFFICE BALANCE"] ?? "—"}</div>
                          <button
                            onClick={() => { setSimpleUsageOpen(o => !o); setSimpleUsageQty(""); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center" }}
                          >
                            {simpleUsageOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                        {/* Usage popover */}
                        {simpleUsageOpen && (
                          <div style={{
                            marginTop: "10px", padding: "10px 12px",
                            border: "0.5px solid hsl(var(--border))",
                            borderRadius: "8px", background: "hsl(var(--background))",
                          }}>
                            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                              {(["Personal Use", "Expired"] as const).map(t => (
                                <button
                                  key={t}
                                  onClick={() => setSimpleUsageType(t)}
                                  style={{
                                    flex: 1, padding: "4px 0", fontSize: "10px", fontWeight: 600,
                                    fontFamily: "Raleway, inherit", letterSpacing: "0.04em",
                                    textTransform: "uppercase", cursor: "pointer", borderRadius: "4px",
                                    border: simpleUsageType === t ? "1px solid hsl(var(--foreground))" : "0.5px solid hsl(var(--border))",
                                    background: simpleUsageType === t ? "hsl(var(--foreground))" : "none",
                                    color: simpleUsageType === t ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                                  }}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <input
                                type="number" min="1"
                                value={simpleUsageQty}
                                onChange={e => setSimpleUsageQty(e.target.value)}
                                placeholder="Qty"
                                style={{
                                  flex: 1, background: "none",
                                  border: "0.5px solid hsl(var(--border))",
                                  borderRadius: "4px", padding: "4px 8px", outline: "none",
                                  fontSize: "13px", fontFamily: "Raleway, inherit",
                                  color: "hsl(var(--foreground))",
                                }}
                              />
                              <button
                                onClick={() => setSimpleUsageOpen(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))" }}
                              >
                                <X size={14} />
                              </button>
                              <button
                                onClick={submitSimpleUsage}
                                disabled={simpleUsageSubmitting}
                                style={{
                                  background: "none",
                                  border: "1px solid hsl(var(--destructive))",
                                  borderRadius: "4px", padding: "3px 10px", cursor: "pointer",
                                  fontSize: "13px", fontFamily: "Raleway, inherit",
                                  color: "hsl(var(--destructive))",
                                  opacity: simpleUsageSubmitting ? 0.5 : 1,
                                }}
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Store Room — right col, aligned with Branch Price / Staff Price */}
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "4px" }}>Store Room</div>
                        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{simpleSelectedProduct["OFFICE SECTION"] || "—"}</div>
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
                          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>{(simpleSelectedProduct as any)[key] ?? "—"}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recent transactions for this product */}
                    <div style={{ borderTop: "0.5px solid hsl(var(--border))", paddingTop: "16px", paddingBottom: "24px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "10px" }}>Recent</div>
                      {/* Flat grid: header + data rows share the same column template */}
                      <div style={{ display: "grid", gridTemplateColumns: "54px 86px 1fr 32px 38px", columnGap: "8px" }}>
                        {/* Header cells */}
                        <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))" }}>Date</div>
                        <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))" }}>GRN</div>
                        <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))", textAlign: "center" as const }}>Supplier</div>
                        <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))", textAlign: "center" as const }}>Qty</div>
                        <div style={{ ...hdrStyle, paddingBottom: "6px", borderBottom: "0.5px solid hsl(var(--border))", textAlign: "right" as const }}>Bal</div>
                        {simpleProductLogLoading && (
                          <div style={{ gridColumn: "1/-1", fontSize: "11px", color: "hsl(var(--muted-foreground))", padding: "8px 0" }}>Loading...</div>
                        )}
                        {!simpleProductLogLoading && simpleProductLog.filter((r: any) => r.GRN).length === 0 && (
                          <div style={{ gridColumn: "1/-1", fontSize: "11px", color: "hsl(var(--muted-foreground))", padding: "8px 0" }}>No entries</div>
                        )}
                        {!simpleProductLogLoading && simpleProductLog.filter((r: any) => r.GRN).map((row: any, i: number, arr: any[]) => {
                          const isOffice = (row.BRANCH || "").toLowerCase() === "office";
                          const qty = Math.abs(row.QTY);
                          const qtyDisplay = isOffice ? `+${qty}` : `-${qty}`;
                          const cellStyle: React.CSSProperties = {
                            fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit",
                            padding: "6px 0",
                            borderBottom: i < arr.length - 1 ? "0.5px solid hsl(var(--border) / 0.3)" : "none",
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

                {/* Supplier result */}
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
                filter: "blur(1px)", opacity: 0.25,
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
            {activeSection === "search" && <SearchSimple onBack={navigateBack} />}
            {activeSection === "branches" && (
              <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))", fontFamily: "'Raleway', sans-serif", position: "relative", overflow: "hidden" }}>

                {/* LAYER 1: Branch list with ghost menu */}
                <div style={{
                  position: "absolute", inset: 0,
                  transition: "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
                  transform: branchTransitionPhase === "list-leaving" || branchTransitionPhase === "page-entering" || branchTransitionPhase === "at-page" || branchTransitionPhase === "page-leaving" ? "translateX(-30%)" : "translateX(0)",
                  filter: branchTransitionPhase === "list-leaving" ? "blur(6px)" : "blur(0px)",
                  opacity: branchTransitionPhase === "list-leaving" || branchTransitionPhase === "page-entering" || branchTransitionPhase === "at-page" || branchTransitionPhase === "page-leaving" ? 0 : 1,
                  pointerEvents: branchTransitionPhase === "at-list" ? "auto" : "none",
                }}>
                  <div style={{ display: "flex", position: "relative", minHeight: "100dvh", overflow: "hidden" }}>

                    {/* Ghost menu on left */}
                    <div
                      onClick={navigateBack}
                      style={{
                        position: "absolute", left: "-70%", top: 0, bottom: 0, width: "100%",
                        display: "flex", flexDirection: "column", justifyContent: "center",
                        paddingLeft: "0px", alignItems: "flex-end", cursor: "pointer",
                        opacity: 0.45, userSelect: "none", zIndex: 1,
                      }}
                    >
                      {(["BRANCHES", "SEARCH", "ORDER"] as const).map((item) => (
                        <div key={item} style={{
                          fontSize: "clamp(40px, 12vw, 64px)", fontWeight: 300, letterSpacing: "0.04em",
                          color: "hsl(var(--foreground))", lineHeight: 1, padding: "2px 0",
                          overflow: "hidden", whiteSpace: "nowrap",
                          filter: item === "BRANCHES" ? "blur(0.5px)" : "blur(1px)",
                        }}>{item}</div>
                      ))}
                    </div>

                    {/* Branch name buttons */}
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "35%", width: "100%" }}>
                      {([
                        { label: "OFFICE",   key: "office"   },
                        { label: "BOUDOIR",  key: "boudoir"  },
                        { label: "CHIC",     key: "chic"     },
                        { label: "NUR YADI", key: "nuryadi"  },
                      ] as { label: string; key: "office" | "boudoir" | "chic" | "nuryadi" }[]).map(({ label, key }) => (
                        <button
                          key={key}
                          onClick={() => navigateToBranch(key)}
                          style={{
                            display: "block", textAlign: "left", padding: "2px 0",
                            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                            fontSize: "clamp(40px, 12vw, 64px)", fontWeight: 300, letterSpacing: "0.05em",
                            color: "hsl(var(--foreground))", lineHeight: 1,
                            transition: "opacity 0.2s ease",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "0.5")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                  </div>
                </div>

                {/* LAYER 2: Branch page — slides in from right */}
                <div style={{
                  position: "absolute", inset: 0,
                  transition: "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
                  transform: branchTransitionPhase === "page-entering" ? "translateX(30%)" : branchTransitionPhase === "page-leaving" ? "translateX(30%)" : "translateX(0)",
                  filter: branchTransitionPhase === "page-entering" || branchTransitionPhase === "page-leaving" ? "blur(6px)" : "blur(0px)",
                  opacity: branchTransitionPhase === "at-page" ? 1 : 0,
                  pointerEvents: branchTransitionPhase === "at-page" ? "auto" : "none",
                }}>
                  {activeBranch === "office"   && <OfficeSimple   onBack={navigateBackToBranches} onBackToMain={navigateBackToMain} products={products} />}
                  {activeBranch === "boudoir"  && <BoudoirSimple  onBack={navigateBackToBranches} onBackToMain={navigateBackToMain} products={products} />}
                  {activeBranch === "chic"     && <ChicSimple     onBack={navigateBackToBranches} onBackToMain={navigateBackToMain} products={products} />}
                  {activeBranch === "nuryadi"  && <NurYadiSimple  onBack={navigateBackToBranches} onBackToMain={navigateBackToMain} products={products} />}
                </div>

              </div>
            )}
            {activeSection === "order" && <OrderSimple onBack={navigateBack} />}
          </div>
        )}

      </div>
    </div>
  );
};

export default SubLandingSimple;
