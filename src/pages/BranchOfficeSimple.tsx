import React, { useState, useRef } from "react";
import { X, Search, Building2 } from "lucide-react";

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

interface BranchOfficeSimpleProps {
  onBack: () => void;
  onBackToMain: () => void;
  products: OfficeProduct[];
}

const BranchOfficeSimple = ({ onBack, onBackToMain, products }: BranchOfficeSimpleProps) => {
  const [searchMode, setSearchMode] = useState<"idle" | "active" | "result" | "supplier">("idle");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OfficeProduct | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const BRANCH_NAME = "OFFICE";
  const BALANCE_KEY = "OFFICE BALANCE" as keyof OfficeProduct;

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
      <div style={{ paddingLeft: "20px", paddingRight: "20px", paddingTop: "28px", flexShrink: 0 }}>

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
      <div style={{ flex: 1, overflowY: "auto", paddingLeft: "20px", paddingRight: "20px", paddingTop: "8px" }}>

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

      </div>

      {/* BOTTOM BLUR BAR */}
      <div style={{
        flexShrink: 0, paddingLeft: "20px", paddingRight: "20px",
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

export default BranchOfficeSimple;
