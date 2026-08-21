import React from "react";
import { Star } from "lucide-react";
import { isYes } from "@/lib/branchSimpleUtils";
import { type OfficeProduct } from "@/lib/branchSimple";

interface ProductListProps {
  products: any[];
  isFav: (p: any) => boolean;
  balanceKey: keyof OfficeProduct;
  favouritesLabel: string;
  search: string;
  showDropdown: boolean;
  onSelect: (p: any) => void;
  alreadyAdded?: Set<string>;
}

const SectionHeader = ({ label }: { label: string }) => (
  <div style={{
    fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
    color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit",
    paddingTop: "14px", paddingBottom: "4px",
  }}>{label}</div>
);

const ProductRow = ({
  p, last, isFav, balanceKey, onSelect, alreadyAdded,
}: {
  p: any; last: boolean; isFav: (p: any) => boolean;
  balanceKey: keyof OfficeProduct; onSelect: (p: any) => void; alreadyAdded?: Set<string>;
}) => {
  const added = alreadyAdded?.has(p["PRODUCT NAME"]);
  return (
    <div
      key={p.id}
      onClick={() => !added && onSelect(p)}
      style={{
        padding: "12px 0",
        borderBottom: last ? "none" : "0.5px solid hsl(var(--border))",
        cursor: added ? "default" : "pointer",
        opacity: added ? 0.4 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", flex: 1 }}>
          {p["PRODUCT NAME"]}
        </div>
        {(p as any)[balanceKey] != null && (
          <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginLeft: "8px", flexShrink: 0 }}>
            {(p as any)[balanceKey]}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0, visibility: isFav(p) ? "visible" : "hidden" }}
        >
          <Star size={16} fill={isFav(p) ? "hsl(var(--foreground))" : "none"} color="hsl(var(--foreground))" />
        </button>
      </div>
    </div>
  );
};

export const ProductList = ({
  products, isFav, balanceKey, favouritesLabel, search, showDropdown, onSelect, alreadyAdded,
}: ProductListProps) => {
  if (!showDropdown || search.length === 0) return null;

  const q = search.toLowerCase();
  const allMatched = products.filter(p =>
    p["PRODUCT NAME"]?.toLowerCase().includes(q) &&
    (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
  );
  const favourites = allMatched.filter(p => isFav(p));
  const colours    = allMatched.filter(p => !isFav(p) && isYes(p["Colour"]));
  const regular    = allMatched.filter(p => !isFav(p) && !isYes(p["Colour"]));
  const hasResults = favourites.length > 0 || colours.length > 0 || regular.length > 0;

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: "90px" }}>
      {favourites.length > 0 && (
        <>
          <SectionHeader label={favouritesLabel} />
          {favourites.sort((a, b) => a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"])).map((p, i) => (
            <ProductRow key={p.id} p={p} last={i === favourites.length - 1} isFav={isFav} balanceKey={balanceKey} onSelect={onSelect} alreadyAdded={alreadyAdded} />
          ))}
        </>
      )}
      {regular.length > 0 && (
        <>
          <SectionHeader label="Products" />
          {regular.map((p, i) => <ProductRow key={p.id} p={p} last={i === regular.length - 1} isFav={isFav} balanceKey={balanceKey} onSelect={onSelect} alreadyAdded={alreadyAdded} />)}
        </>
      )}
      {colours.length > 0 && (
        <>
          <SectionHeader label="Colours" />
          {colours.map((p, i) => <ProductRow key={p.id} p={p} last={i === colours.length - 1} isFav={isFav} balanceKey={balanceKey} onSelect={onSelect} alreadyAdded={alreadyAdded} />)}
        </>
      )}
      {!hasResults && (
        <div style={{ padding: "20px 0", fontSize: "15px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>No results found</div>
      )}
    </div>
  );
};
