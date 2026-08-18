import React from "react";
import { Star } from "lucide-react";
import { isYes } from "@/lib/branchSimpleUtils";
import { type OfficeProduct } from "@/lib/branchSimple";

interface BoudoirProductListProps {
  products: any[];
  isFav: (p: any) => boolean;
  usageSearch: string;
  setUsageSearch: React.Dispatch<React.SetStateAction<string>>;
  showUsageDropdown: boolean;
  setShowUsageDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  usageInputRef: React.RefObject<HTMLInputElement>;
  balanceKey: keyof OfficeProduct;
  favouriteKey: keyof OfficeProduct;
}

const SectionHeader = ({ label }: { label: string }) => (
  <div
    style={{
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "hsl(var(--muted-foreground))",
      fontFamily: "Raleway, inherit",
      paddingTop: "14px",
      paddingBottom: "4px",
    }}
  >
    {label}
  </div>
);

const ProductRow = ({
  p,
  last,
  isFav,
  onSelect,
  onToggleFav,
  balanceKey,
}: {
  p: any;
  last: boolean;
  isFav: (p: any) => boolean;
  onSelect: (p: any) => void;
  onToggleFav: (p: any) => void;
  balanceKey: keyof OfficeProduct;
}) => (
  <div
    key={p.id}
    onClick={() => onSelect(p)}
    style={{
      padding: "12px 0",
      borderBottom: last ? "none" : "0.5px solid hsl(var(--border))",
      cursor: "pointer",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div
        style={{
          fontSize: "15px",
          fontWeight: 300,
          fontFamily: "Raleway, inherit",
          color: "hsl(var(--foreground))",
          flex: 1,
        }}
      >
        {p["PRODUCT NAME"]}
      </div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 300,
          fontFamily: "Raleway, inherit",
          color: "hsl(var(--muted-foreground))",
          marginLeft: "8px",
          flexShrink: 0,
        }}
      >
        {p[balanceKey as string]}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav(p);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          flexShrink: 0,
        }}
      >
        <Star size={16} fill={isFav(p) ? "hsl(var(--foreground))" : "none"} color="hsl(var(--foreground))" />
      </button>
    </div>
  </div>
);

export const BoudoirProductList = ({
  products,
  isFav,
  usageSearch,
  setUsageSearch,
  showUsageDropdown,
  setShowUsageDropdown,
  usageInputRef,
  balanceKey,
  favouriteKey,
}: BoudoirProductListProps) => {
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);
  const [searchMode, setSearchMode] = React.useState<"idle" | "active" | "result">("idle");
  const [search, setSearch] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);

  const filtered = products.filter((p) =>
    p["PRODUCT NAME"]?.toLowerCase().includes(search.toLowerCase()) &&
    (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
  );

  const favs = filtered.filter((p) => isFav(p));
  const colours = filtered.filter((p) => !isFav(p) && p["Colour"] && p["Colour"].toString().trim());
  const regular = filtered.filter((p) => !isFav(p) && !p["Colour"]);
  const hasResults = favs.length > 0 || colours.length > 0 || regular.length > 0;

  const onSelect = (p: any) => {
    setSelectedProduct(p);
    setSearch(p["PRODUCT NAME"]);
    setShowDropdown(false);
    setSearchMode("result");
  };

  const onToggleFav = (p: any) => {
    // Toggle logic handled by parent
  };

  return (
    <div>
      {showDropdown && search.length > 0 && (
        <div style={{ position: "fixed", top: "80px", left: 0, right: 0, background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))", zIndex: 100, maxHeight: "40vh", overflowY: "auto" }}>
          {favs.length > 0 && (
            <>
              <SectionHeader label="Favourites" />
              {favs.map((p, i) => (
                <ProductRow key={p.id} p={p} last={i === favs.length - 1} isFav={isFav} onSelect={onSelect} onToggleFav={onToggleFav} balanceKey={balanceKey} />
              ))}
            </>
          )}
          {colours.length > 0 && (
            <>
              <SectionHeader label="Colours" />
              {colours.map((p, i) => (
                <ProductRow key={p.id} p={p} last={i === colours.length - 1} isFav={isFav} onSelect={onSelect} onToggleFav={onToggleFav} balanceKey={balanceKey} />
              ))}
            </>
          )}
          {regular.length > 0 && (
            <>
              <SectionHeader label="Products" />
              {regular.map((p, i) => (
                <ProductRow key={p.id} p={p} last={i === regular.length - 1} isFav={isFav} onSelect={onSelect} onToggleFav={onToggleFav} balanceKey={balanceKey} />
              ))}
            </>
          )}
          {!hasResults && (
            <div style={{ padding: "20px 0", fontSize: "15px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
