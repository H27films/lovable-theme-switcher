import { useState, useRef, useEffect } from "react";
import { type ProductRow } from "@/hooks/usePriceLookup";

interface SearchBarProps {
  data: ProductRow[];
  onSelect: (row: ProductRow) => void;
}

export default function SearchBar({ data, onSelect }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = value.trim()
    ? data.filter(d => d.name.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 10)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

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
    <div ref={wrapRef} className="relative mb-10">
      <span className="label-uppercase block mb-2.5 text-xs tracking-[0.2em]">Search Product</span>
      <input
        type="text"
        className="minimal-input text-2xl font-light py-3"
        placeholder="Type product name..."
        value={value}
        onChange={e => { setValue(e.target.value); setOpen(!!e.target.value.trim()); }}
      />
      {open && matches.length > 0 && (
        <div className="absolute top-full left-0 right-0 dropdown-menu-custom max-h-60 overflow-y-auto z-50 scrollbar-thin">
          {matches.map(d => (
            <div
              key={d.name}
              className="dropdown-item-custom"
              onClick={() => { onSelect(d); setValue(""); setOpen(false); }}
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
