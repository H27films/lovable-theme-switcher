import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { Star } from "lucide-react";
import { isYes } from "@/lib/branchSimpleUtils";
import { type OfficeProduct } from "@/lib/branchSimple";
import { dropdownNavChannelStore } from "@/hooks/useDropdownKeyboardNavigation";
import { ResultRow } from "./ResultRow";

interface ProductListProps {
  products: any[];
  isFav: (p: any) => boolean;
  balanceKey: keyof OfficeProduct;
  favouritesLabel: string;
  search: string;
  showDropdown: boolean;
  onSelect: (p: any) => void;
  alreadyAdded?: Set<string>;
  /** Colour flag lookup (defaults to the product's own Colour column) */
  isColour?: (p: any) => boolean;
  /** Display label lookup (defaults to the product's own PRODUCT NAME) */
  nameOf?: (p: any) => string;
  /** Restrict the dropdown to these AllFileProducts ids (Favourites SOURCE ID) */
  allowedIds?: Set<number>;
}

const SectionHeader = ({ label }: { label: string }) => (
  <div style={{
    fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
    color: "#1a1a1a", fontFamily: "Raleway, inherit",
    paddingTop: "14px", paddingBottom: "4px",
  }}>{label}</div>
);

const ProductRow = ({
  p, last, isFav, balanceKey, onSelect, alreadyAdded, nameOf, isActive,
}: {
  p: any; last: boolean; isFav: (p: any) => boolean;
  balanceKey: keyof OfficeProduct; onSelect: (p: any) => void; alreadyAdded?: Set<string>;
  nameOf?: (p: any) => string; isActive?: boolean;
}) => {
  const added = alreadyAdded?.has(p["PRODUCT NAME"]);
  const bal = (p as any)[balanceKey];
  return (
    <ResultRow
      isActive={isActive}
      onSelect={() => {
        if (!added) onSelect(p);
      }}
      style={{
        padding: "12px 0",
        borderBottom: last ? "none" : "0.5px solid hsl(var(--border))",
        cursor: added ? "default" : "pointer",
        opacity: added ? 0.4 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: 1 }}>
          <Star
            size={11}
            fill="hsl(var(--foreground))"
            color="hsl(var(--foreground))"
            style={{ flexShrink: 0, visibility: isFav(p) ? "visible" : "hidden" }}
          />
          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", minWidth: 0 }}>
            {nameOf ? nameOf(p) : p["PRODUCT NAME"]}
          </div>
        </div>
        {bal != null && (
          <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: Number(bal) > 0 ? "hsl(142 65% 30%)" : Number(bal) < 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))", marginLeft: "8px", flexShrink: 0 }}>
            {bal}
          </div>
        )}
      </div>
    </ResultRow>
  );
};

export const ProductList = ({
  products, isFav, balanceKey, favouritesLabel, search, showDropdown, onSelect, alreadyAdded,
  isColour, allowedIds, nameOf,
}: ProductListProps) => {
  // NOTE: every hook runs before the `showDropdown` early return below.
  const colourOf = isColour ?? ((p: any) => isYes(p["Colour"]));
  const getName = nameOf ?? ((p: any) => p["PRODUCT NAME"]);

  const q = search.toLowerCase();
  const matchedRaw = products.filter(p =>
    getName(p)?.toLowerCase().includes(q) &&
    (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1) &&
    (!allowedIds || allowedIds.has(Number(p.id)))
  );

  const uniqueMap = new Map<string, any>();
  matchedRaw.forEach(p => {
    const name = getName(p);
    if (name && !uniqueMap.has(name)) {
      uniqueMap.set(name, p);
    }
  });
  const allMatched = Array.from(uniqueMap.values());

  const byName = (a: any, b: any) => getName(a).localeCompare(getName(b));
  const favourites = allMatched.filter(p => isFav(p)).sort(byName);
  const colours    = allMatched.filter(p => !isFav(p) && colourOf(p)).sort(byName);
  const regular    = allMatched.filter(p => !isFav(p) && !colourOf(p)).sort(byName);
  const hasResults = favourites.length > 0 || colours.length > 0 || regular.length > 0;

  // Latest items / callbacks for the sibling bridge — kept in refs so the
  // registration effect never churns (the getter reads them live).
  const flatItemsRef = useRef<any[]>([]);
  flatItemsRef.current = [...favourites, ...regular, ...colours];
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const alreadyAddedRef = useRef(alreadyAdded);
  alreadyAddedRef.current = alreadyAdded;

  // Register with the <Search/> input's keyboard bridge while visible.
  useEffect(() => {
    if (!showDropdown) return;
    const channel = {
      get items() {
        return flatItemsRef.current;
      },
      selectAt: (index: number) => {
        const item = flatItemsRef.current[index];
        if (!item) return;
        if (alreadyAddedRef.current?.has(item["PRODUCT NAME"])) return;
        onSelectRef.current(item);
      },
    };
    dropdownNavChannelStore.publish(channel);
    return () => dropdownNavChannelStore.unpublish(channel);
  }, [showDropdown]);

  // Current keyboard highlight pushed down by Search.
  const navSnapshot = useSyncExternalStore(
    dropdownNavChannelStore.subscribe,
    dropdownNavChannelStore.getSnapshot
  );
  const activeIdx = navSnapshot.activeIndex;

  if (!showDropdown) return null;

  // Absolute row positions for highlight comparison (render order:
  // Favourites → Products → Colours).
  const regularStart = favourites.length;
  const coloursStart = favourites.length + regular.length;

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: "90px", marginBottom: "44px", marginLeft: "-12px", marginRight: "-12px", paddingLeft: "12px", paddingRight: "12px" }}>
      {favourites.length > 0 && (
        <>
          <SectionHeader label={favouritesLabel} />
          {favourites.map((p, i) => (
            <ProductRow key={p.id} p={p} last={i === favourites.length - 1} isActive={activeIdx === i} isFav={isFav} balanceKey={balanceKey} onSelect={onSelect} alreadyAdded={alreadyAdded} nameOf={nameOf} />
          ))}
        </>
      )}
      {regular.length > 0 && (
        <>
          <SectionHeader label="Products" />
          {regular.map((p, i) => <ProductRow key={p.id} p={p} last={i === regular.length - 1} isActive={activeIdx === regularStart + i} isFav={isFav} balanceKey={balanceKey} onSelect={onSelect} alreadyAdded={alreadyAdded} nameOf={nameOf} />)}
        </>
      )}
      {colours.length > 0 && (
        <>
          <SectionHeader label="Colours" />
          {colours.map((p, i) => <ProductRow key={p.id} p={p} last={i === colours.length - 1} isActive={activeIdx === coloursStart + i} isFav={isFav} balanceKey={balanceKey} onSelect={onSelect} alreadyAdded={alreadyAdded} nameOf={nameOf} />)}
        </>
      )}
      {!hasResults && (
        <div style={{ padding: "20px 0", fontSize: "15px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>No results found</div>
      )}
    </div>
  );
};
