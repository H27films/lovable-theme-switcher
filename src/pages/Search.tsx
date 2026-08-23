import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ArrowLeft, Building2, Search as SearchIcon, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: number;
  "PRODUCT NAME": string;
  SUPPLIER?: string;
  "OFFICE BALANCE"?: number | null;
  PAR?: number | null;
}

/** Row shape we read from the Favourites table (keyed to AllFileProducts via SOURCE ID). */
interface FavouriteRow {
  "SOURCE ID": number | null;
  "OFFICE FAVOURITE": string | null;
  COLOUR: string | null;
}

interface SearchProps {
  onBack?: () => void;
}

function belowPar(balance: number | null | undefined, par: number | null | undefined): boolean {
  if (balance == null || par == null) return false;
  return Number(balance) < Number(par);
}

export default function Search({ onBack }: SearchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Origin of this visit ("office" when navigated here from Office) – set via router state at navigation time
  const from = location.state?.from;
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tracks where the dropdown should sit when it's position: fixed (escapes clipping ancestors)
  const [dropdownTop, setDropdownTop] = useState<number>(0);

  const fg = "hsl(var(--foreground))";
  const dimColor = "hsl(var(--muted-foreground))";
  const border = "hsl(var(--border))";
  const redColor = "hsl(var(--red, 0 72% 51%))";

  // Fetch all products once on mount
  const fetchProducts = useCallback(async () => {
    let allData: Product[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("AllFileProducts")
        .select(`id, "PRODUCT NAME", SUPPLIER, "OFFICE BALANCE", PAR`)
        .range(from, from + batchSize - 1);
      if (error || !data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    setProducts(allData);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const [favourites, setFavourites] = useState<FavouriteRow[]>([]);

  // Fetch the Favourites table – source of truth for Office favourites & colour flags
  const fetchFavourites = useCallback(async () => {
    let allData: FavouriteRow[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("Favourites")
        .select(`"SOURCE ID", "OFFICE FAVOURITE", COLOUR`)
        .range(from, from + batchSize - 1);
      if (error || !data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    setFavourites(allData);
  }, []);

  useEffect(() => { fetchFavourites(); }, [fetchFavourites]);

  /** Favourite rows keyed by SOURCE ID (= AllFileProducts.id), mirroring useBranchFavourites. */
  const favBySourceId = useMemo(() => {
    const m = new Map<number, FavouriteRow>();
    favourites.forEach(r => { if (r["SOURCE ID"] != null) m.set(Number(r["SOURCE ID"]), r); });
    return m;
  }, [favourites]);

  const isOfficeFav = useCallback((p: Product) =>
    String(favBySourceId.get(Number(p.id))?.["OFFICE FAVOURITE"] ?? "").trim().toUpperCase() === "TRUE"
  , [favBySourceId]);

  const isColourProduct = useCallback((p: Product) =>
    String(favBySourceId.get(Number(p.id))?.["COLOUR"] ?? "").trim().toUpperCase() === "YES"
  , [favBySourceId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keep the fixed dropdown's top position in sync with the input row (handles resize/scroll of the page itself)
  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current) {
        setDropdownTop(containerRef.current.getBoundingClientRect().bottom);
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [showDropdown]);

  const nameSort = (a: Product, b: Product) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]);

  const q = query.trim().toLowerCase();

  // 1) Suppliers matching the query (distinct SUPPLIER values from AllFileProducts), A–Z
  //    (no cap here previously beyond 20 — left as-is since this list is a supplier index, not products)
  const suppliers = q.length > 0
    ? Array.from(new Set(
        products.map(p => p.SUPPLIER).filter((s): s is string => !!s && s.toLowerCase().includes(q))
      )).sort((a, b) => a.localeCompare(b))
    : [];

  const matched = q.length > 0 ? products.filter(p =>
    p["PRODUCT NAME"]?.toLowerCase().includes(q) ||
    p.SUPPLIER?.toLowerCase().includes(q)
  ) : [];

  // 2–4) Product groups (reusing favBySourceId-backed helpers):
  //      Office Favourites A–Z → non-fav colour-NO A–Z → non-fav colour-YES A–Z
  //      (30-result cap removed — all matches now render)
  const favs    = matched.filter(isOfficeFav).sort(nameSort);
  const regular = matched.filter(p => !isOfficeFav(p) && !isColourProduct(p)).sort(nameSort);
  const colours = matched.filter(p => !isOfficeFav(p) && isColourProduct(p)).sort(nameSort);

  const hasResults = suppliers.length > 0 || favs.length > 0 || regular.length > 0 || colours.length > 0;

  const handleSelect = (p: Product) => {
    setQuery(p["PRODUCT NAME"]);
    setSelectedProduct(p);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedProduct(null);
    setShowDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const sectionHeader: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: dimColor,
    paddingTop: 14,
    paddingBottom: 4,
  };

  const productRow = (p: Product, last: boolean) => (
    <div
      key={p.id}
      onMouseDown={() => handleSelect(p)}
      onTouchEnd={e => { e.preventDefault(); handleSelect(p); }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 4px",
        borderBottom: last ? "none" : `1px solid ${border}`,
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1, paddingRight: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p["PRODUCT NAME"]}
        </span>
        {p.SUPPLIER && (
          <span style={{ fontSize: 11, color: dimColor }}>{p.SUPPLIER}</span>
        )}
      </div>
      {p["OFFICE BALANCE"] != null && (
        <span style={{ fontSize: 13, fontWeight: 300, flexShrink: 0, color: belowPar(p["OFFICE BALANCE"], p.PAR) ? redColor : fg }}>
          {p["OFFICE BALANCE"]}
        </span>
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "hsl(var(--background))",
        color: fg,
        fontFamily: "'Raleway', sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* ── Top bar ── SEARCH title (matches SubLanding search view) + back arrow top right ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: "20px",
          paddingRight: "16px",
          paddingTop: "28px",
          paddingBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "clamp(22px, 6vw, 36px)",
            fontWeight: 300,
            letterSpacing: "0.08em",
            color: fg,
            fontFamily: "'Raleway', sans-serif",
            lineHeight: 1,
          }}
        >
          SEARCH
        </div>
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

      {/* ── Search bar + dropdown ── */}
      <div ref={containerRef} style={{ padding: "4px 20px 0", position: "relative" }}>
        {/* Input row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: `1px solid ${border}`,
            paddingBottom: 10,
          }}
        >
          <SearchIcon size={16} strokeWidth={1.5} style={{ color: dimColor, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Product"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setSelectedProduct(null);
            }}
            onFocus={() => { if (query.length > 0) setShowDropdown(true); }}
            autoComplete="off"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 16,
              fontWeight: 300,
              color: fg,
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
          />
          {query && (
            <button
              onMouseDown={e => { e.preventDefault(); handleClear(); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: dimColor, display: "flex", touchAction: "manipulation" }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── Dropdown ── position: fixed so it can't be clipped by any ancestor's overflow:hidden
             (e.g. a full-height app shell wrapping routed pages). Positioned via dropdownTop,
             which tracks the bottom edge of the input row. */}
        {showDropdown && hasResults && (
          <div
            style={{
              position: "fixed",
              top: dropdownTop,
              left: 20,
              right: 20,
              zIndex: 50,
              maxHeight: `calc(100dvh - ${dropdownTop}px - 16px)`,
              overflowY: "auto",
              background: "hsl(var(--background))",
              animation: "spFadeIn 0.18s ease",
            }}
          >
            {/* 1) Suppliers first — visually distinct group */}
            {suppliers.length > 0 && (
              <>
                <div style={sectionHeader}>Suppliers</div>
                {suppliers.map((s, i) => (
                  <div
                    key={`sup-${s}`}
                    onMouseDown={() => setQuery(s)}
                    onTouchEnd={e => { e.preventDefault(); setQuery(s); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "11px 4px",
                      borderBottom: i < suppliers.length - 1 ? `1px solid ${border}` : "none",
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                  >
                    <Building2 size={14} strokeWidth={1.4} style={{ color: dimColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 400, color: fg }}>{s}</span>
                  </div>
                ))}
              </>
            )}

            {/* 2) Office Favourites A–Z */}
            {favs.length > 0 && (
              <>
                <div style={sectionHeader}>Office Favourites</div>
                {favs.map((p, i) => productRow(p, i === favs.length - 1))}
              </>
            )}

            {/* 3) Non-favourites, colour NO */}
            {regular.length > 0 && (
              <>
                <div style={sectionHeader}>Products</div>
                {regular.map((p, i) => productRow(p, i === regular.length - 1))}
              </>
            )}

            {/* 4) Non-favourites, colour YES */}
            {colours.length > 0 && (
              <>
                <div style={sectionHeader}>Colours</div>
                {colours.map((p, i) => productRow(p, i === colours.length - 1))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Selected product info ── shown after selecting from dropdown */}
      {selectedProduct && !showDropdown && (
        <div
          style={{
            margin: "28px 12px 0",
            padding: "16px 0",
            borderTop: `1px solid ${border}`,
            animation: "spFadeIn 0.2s ease",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 400, marginBottom: 6 }}>{selectedProduct["PRODUCT NAME"]}</div>
          {selectedProduct.SUPPLIER && (
            <div style={{ fontSize: 12, color: dimColor, marginBottom: 4 }}>{selectedProduct.SUPPLIER}</div>
          )}
          <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
            {selectedProduct["OFFICE BALANCE"] != null && (
              <div>
                <div style={{ fontSize: 10, color: dimColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Balance</div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 300,
                  color: belowPar(selectedProduct["OFFICE BALANCE"], selectedProduct.PAR) ? redColor : fg,
                }}>
                  {selectedProduct["OFFICE BALANCE"]}
                </div>
              </div>
            )}
            {selectedProduct.PAR != null && (
              <div>
                <div style={{ fontSize: 10, color: dimColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Par</div>
                <div style={{ fontSize: 18, fontWeight: 300 }}>{selectedProduct.PAR}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spFadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}