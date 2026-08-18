import React from "react";
import { Star, Check, X } from "lucide-react";

interface BoudoirProductListProps {
  products: any[];
  isFav: (p: any) => boolean;
  usageSearch: string;
  setUsageSearch: React.Dispatch<React.SetStateAction<string>>;
  showUsageDropdown: boolean;
  setShowUsageDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  usageInputRef: React.RefObject<HTMLInputElement>;
}

const SectionHeader = ({ label }: { label: string }) => (
  <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit", paddingTop: "14px", paddingBottom: "4px" }}>{label}</div>
);

const ProductRow = ({ p, last }: { p: any; last: boolean }) => (
  <div
    key={p.id}
    onClick={() => {/* select product */}}
    style={{ padding: "12px 0", borderBottom: last ? "none" : "0.5px solid hsl(var(--border))", cursor: "pointer" }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", flex: 1 }}>{p["PRODUCT NAME"]}</div>
      <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginLeft: "8px", flexShrink: 0 }}>{p["BOUDOIR BALANCE"]}</div>
      <button
        onClick={() => {/* toggle favourite */}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
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
}: BoudoirProductListProps) => {
  const [searchMode, setSearchMode] = React.useState<"idle" | "active" | "result">("idle");
  const [search, setSearch] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);

  const usageFiltered = products.filter((p) =>
    p["PRODUCT NAME"].toLowerCase().includes(usageSearch.toLowerCase()) &&
    (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1)
  );

  const usageFavs = usageFiltered.filter((p) => isFav(p));
  const usageColours = usageFiltered.filter((p) => !isFav(p) && p["Colour"] && p["Colour"].toString().trim());
  const usageRegular = usageFiltered.filter((p) => !isFav(p) && !p["Colour"]);

  const orderFiltered = products.filter((p) => p["PRODUCT NAME"].toLowerCase().includes(usageSearch.toLowerCase()));
  const orderFavs = orderFiltered.filter((p) => isFav(p));
  const orderColours = orderFiltered.filter((p) => !isFav(p) && p["Colour"]);
  const orderRegular = orderFiltered.filter((p) => !isFav(p) && !p["Colour"]);

  const handleAddUsageProduct = (p: any) => {
    // add to usage entries
    setUsageSearch("");
    showUsageDropdown && usageInputRef.current?.blur();
  };

  const dismissUsageDropdown = () => {
    setShowUsageDropdown(false);
    setUsageSearch("");
    usageInputRef.current?.blur();
  };

  return (
    <div>
      {/* Favourites section */}
      {usageFavs.length > 0 && (
        <>
          <SectionHeader label="Boudoir Favourites" />
          {usageFavs.map((p, i) => (
            <ProductRow key={p.id} p={p} last={i === usageFavs.length - 1} />
          ))}
        </>
      )}

      {/* Regular products section */}
      {usageRegular.length > 0 && (
        <>
          <SectionHeader label="Products" />
          {usageRegular.map((p, i) => (
            <ProductRow key={p.id} p={p} last={i === usageRegular.length - 1} />
          ))}
        </>
      )}

      {/* Colours section */}
      {usageColours.length > 0 && (
        <>
          <SectionHeader label="Colours" />
          {usageColours.map((p, i) => (
            <ProductRow key={p.id} p={p} last={i === usageColours.length - 1} />
          ))}
        </>
      )}

      {!hasResults && (
        <div style={{ padding: "20px 0", fontSize: "15px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>No results found</div>
      )}
    </div>
  );
};