import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Search, X, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface Product {
  id: number;
  "PRODUCT NAME": string;
  SUPPLIER?: string;
  "OFFICE BALANCE"?: number | null;
  PAR?: number | null;
}

interface SearchPageProps {
  onBack: () => void;
}

function belowPar(balance: number | null | undefined, par: number | null | undefined): boolean {
  if (balance == null || par == null) return false;
  return Number(balance) < Number(par);
}

export default function SearchPage({ onBack }: SearchPageProps) {
  const { theme, setTheme } = useTheme();
  const isSand = theme === "sand";
  const handleToggle = () => setTheme(isSand ? "light" : "sand");

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const results = query.length > 0
    ? products
        .filter(p => p["PRODUCT NAME"]?.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]))
        .slice(0, 30)
    : [];

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
      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 16px 12px 12px",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: fg, display: "flex", alignItems: "center", touchAction: "manipulation" }}
        >
          <ChevronLeft size={24} strokeWidth={1.5} />
        </button>
        <button
          onClick={handleToggle}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: fg, display: "flex", alignItems: "center", touchAction: "manipulation" }}
          title={isSand ? "Switch to Light" : "Switch to Sand"}
        >
          <Sun size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Search bar + dropdown ── */}
      <div ref={containerRef} style={{ padding: "4px 12px 0", position: "relative" }}>
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
          <Search size={16} strokeWidth={1.5} style={{ color: dimColor, flexShrink: 0 }} />
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

        {/* ── Dropdown ── clean, no box */}
        {showDropdown && results.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 12,
              right: 12,
              zIndex: 50,
              maxHeight: "60dvh",
              overflowY: "auto",
              animation: "spFadeIn 0.18s ease",
            }}
          >
            {results.map((p, i) => (
              <div
                key={p.id}
                onMouseDown={() => handleSelect(p)}
                onTouchEnd={e => { e.preventDefault(); handleSelect(p); }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 4px",
                  borderBottom: i < results.length - 1 ? `1px solid ${border}` : "none",
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
                  <span style={{
                    fontSize: 13,
                    fontWeight: 300,
                    flexShrink: 0,
                    color: belowPar(p["OFFICE BALANCE"], p.PAR) ? redColor : fg,
                  }}>
                    {p["OFFICE BALANCE"]}
                  </span>
                )}
              </div>
            ))}
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
