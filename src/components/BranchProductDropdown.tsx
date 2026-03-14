import React, { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Star } from "lucide-react";

type BranchProduct = {
  ["PRODUCT NAME"]: string;
  // Allow arbitrary extra fields like balances and favourites
  [key: string]: any;
};

interface BranchProductDropdownProps {
  entry: {
    productName: string;
    showProductDropdown: boolean;
    productSearch: string;
  };
  sortedProducts: BranchProduct[];
  onSelect: (name: string) => void;
  onSearch: (val: string) => void;
  onToggle: () => void;
  onClose: () => void;
  showBalance?: boolean;
  lineStyle?: boolean;
  favouriteKey?: string;
  balanceKey?: string;
}

export function BranchProductDropdown({
  entry,
  sortedProducts,
  onSelect,
  onSearch,
  onToggle,
  onClose,
  showBalance,
  lineStyle,
  favouriteKey,
  balanceKey,
}: BranchProductDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const border = "hsl(var(--border))";
  const borderActive = "hsl(var(--border-active))";
  const cardBg = "hsl(var(--card))";
  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  const filtered = (entry.productSearch
    ? sortedProducts.filter(p =>
        p["PRODUCT NAME"].toLowerCase().includes(entry.productSearch.toLowerCase()),
      )
    : sortedProducts
  )
    .slice()
    .sort((a, b) => {
      if (favouriteKey) {
        const af = (a as any)[favouriteKey] ? 0 : 1;
        const bf = (b as any)[favouriteKey] ? 0 : 1;
        if (af !== bf) return af - bf;
      }
      const isColourA =
        (a as any)["COLOUR"] === true ||
        (a as any)["COLOUR"] === "YES" ||
        (a as any)["COLOUR"] === "yes"
          ? 1
          : 0;
      const isColourB =
        (b as any)["COLOUR"] === true ||
        (b as any)["COLOUR"] === "YES" ||
        (b as any)["COLOUR"] === "yes"
          ? 1
          : 0;
      if (isColourA !== isColourB) return isColourA - isColourB;
      return a["PRODUCT NAME"].localeCompare(b["PRODUCT NAME"]);
    });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (entry.showProductDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [entry.showProductDropdown, onClose]);

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [entry.productSearch]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item]");
      (items[activeIndex] as HTMLElement | undefined)?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!entry.showProductDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? filtered[activeIndex] : filtered[0];
      if (target) {
        onSelect(target["PRODUCT NAME"]);
        setActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      onClose();
      setActiveIndex(-1);
    }
  };

  return (
    <div
      ref={ref}
      className={lineStyle ? "relative w-full" : "relative flex-1 max-w-[460px]"}
    >
      <div
        className={
          lineStyle
            ? "flex items-center justify-between px-0 cursor-pointer h-[40px] w-full"
            : "flex items-center justify-between px-3 py-2 cursor-pointer h-[34px]"
        }
        style={lineStyle ? {} : { background: cardBg, border: `1px solid ${borderActive}` }}
        onClick={onToggle}
      >
        <span
          className="text-[13px] font-light"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {entry.productName || "Select product..."}
        </span>
        <ChevronDown size={12} style={dim} />
      </div>

      {entry.showProductDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-[200] border"
          style={{ background: cardBg, borderColor: borderActive, marginTop: "2px" }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: border }}
          >
            <Search size={11} style={dim} />
            <input
              autoFocus
              type="text"
              className="flex-1 bg-transparent outline-none text-[13px] font-light"
              placeholder="Type to filter..."
              value={entry.productSearch}
              onChange={e => onSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div ref={listRef} className="max-h-[200px] overflow-y-auto scrollbar-thin">
            {filtered.map((p, i) => (
              <div
                key={p["PRODUCT NAME"]}
                data-item
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors"
                style={{
                  borderBottom: `1px solid ${border}`,
                  background:
                    i === activeIndex ? "hsl(var(--muted))" : "hsl(var(--card))",
                }}
                onMouseDown={() => {
                  onSelect(p["PRODUCT NAME"]);
                  setActiveIndex(-1);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="flex items-center gap-1.5">
                  {favouriteKey && (p as any)[favouriteKey] && (
                    <Star
                      size={10}
                      style={{
                        fill: "hsl(var(--foreground))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  )}
                  <span className="text-[13px] font-light">
                    {p["PRODUCT NAME"]}
                  </span>
                </div>
                {showBalance && balanceKey && (
                  <span
                    className="text-[11px]"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    {(p as any)[balanceKey]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

