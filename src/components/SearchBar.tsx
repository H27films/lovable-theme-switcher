import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { type ProductRow } from "@/hooks/usePriceLookup";

interface SearchBarProps {
  data: ProductRow[];
  onSelect: (row: ProductRow) => void;
}

export default function SearchBar({ data, onSelect }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const expanded = hovered || focused || value.length > 0;

  const matches = value.trim()
  ? data.filter(d => d.name.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 10)
  : data.slice(0, 20);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item]");
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? matches[activeIndex] : matches[0];
      if (target) {
        onSelect(target);
        setValue("");
        setOpen(false);
        setActiveIndex(-1);
        setFocused(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const highlight = (name: string) => {
    const idx = name.toLowerCase().indexOf(value.trim().toLowerCase());
    if (idx === -1) return name;
    return (
      <>
        {name.slice(0, idx)}
        <span className="font-medium text-foreground">{name.slice(idx, idx + value.trim().length)}</span>
        {name.slice(idx + value.trim().length)}
      </>
    );
  };

  return (
    <div
      ref={wrapRef}
      className="relative mb-10"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center gap-2 cursor-pointer pb-2 relative"
        onClick={() => { setFocused(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        <Search size={18} strokeWidth={1.5} className={`transition-colors duration-300 ${hovered || expanded ? "text-muted-foreground" : "text-foreground"}`} />
        {!expanded && (
          <span className={`text-[15px] font-light transition-colors duration-300 ${hovered ? "text-muted-foreground" : "text-foreground"}`}>Search</span>
        )}
        {expanded && (
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-[15px] font-light"
            placeholder="Search"
            value={value}
            onChange={e => { setValue(e.target.value); setOpen(!!e.target.value.trim()); }}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-expanded={open}
          />
        )}
        {/* Animated underline */}
        <span
          className="absolute bottom-0 left-0 h-px transition-all duration-300 ease-out"
          style={{
            background: "hsl(var(--border-active))",
            width: hovered || expanded ? "100%" : "0%",
          }}
        />
      </div>

      {open && matches.length > 0 && (
        <div ref={listRef} className="absolute top-full left-0 right-0 dropdown-menu-custom max-h-60 overflow-y-auto z-50 scrollbar-thin">
          {matches.map((d, i) => (
            <div
              key={d.name}
              data-item
              className={`dropdown-item-custom ${i === activeIndex ? "bg-card text-foreground" : ""}`}
              onClick={() => { onSelect(d); setValue(""); setOpen(false); setActiveIndex(-1); setFocused(false); }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span>{highlight(d.name)}</span>
              <span className="text-xs font-normal text-foreground whitespace-nowrap flex-shrink-0">
                {d.cnyPrice ? `¥ ${parseFloat(d.cnyPrice).toFixed(2)}` : ""}
                {d.cnyPrice && d.oldPrice ? " / " : ""}
                {d.oldPrice ? `RM ${parseFloat(d.oldPrice).toFixed(2)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}