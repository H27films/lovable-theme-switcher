import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export const DEFAULT_ENTRY_TYPES = ["Salon Use", "Customer", "Staff"] as const;

type EntryLike = {
  type: string;
  showTypeDropdown: boolean;
};

interface EntryTypeDropdownProps {
  entry: EntryLike;
  onSelect: (type: string) => void;
  onToggle: () => void;
  onClose: () => void;
  lineStyle?: boolean;
  types?: string[];
}

export function EntryTypeDropdown({
  entry,
  onSelect,
  onToggle,
  onClose,
  lineStyle,
  types = DEFAULT_ENTRY_TYPES as unknown as string[],
}: EntryTypeDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const borderActive = "hsl(var(--border-active))";
  const border = "hsl(var(--border))";
  const cardBg = "hsl(var(--card))";
  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (entry.showTypeDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [entry.showTypeDropdown, onClose]);

  // Reset when closed
  useEffect(() => {
    if (!entry.showTypeDropdown) setActiveIndex(-1);
  }, [entry.showTypeDropdown]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!entry.showTypeDropdown) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % types.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? types.length - 1 : i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const target = activeIndex >= 0 ? types[activeIndex] : types[0];
      onSelect(target);
      setActiveIndex(-1);
    } else if (e.key === "Escape") {
      onClose();
      setActiveIndex(-1);
    }
  };

  return (
    <div
      ref={ref}
      className={lineStyle ? "relative w-full" : "relative flex-shrink-0"}
      style={lineStyle ? {} : { width: "150px" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className={
          lineStyle
            ? "flex items-center justify-between px-0 cursor-pointer h-[28px] w-full"
            : "flex items-center justify-between px-2 py-2 cursor-pointer h-[34px]"
        }
        style={lineStyle ? {} : { background: cardBg, border: `1px solid ${borderActive}` }}
        onClick={onToggle}
      >
        <span className="text-[11px] font-light">{entry.type}</span>
        <ChevronDown size={11} style={dim} />
      </div>
      {entry.showTypeDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-[200] border"
          style={{ background: "hsl(var(--card))", borderColor: borderActive, marginTop: "2px" }}
        >
          {types.map((t, i) => (
            <div
              key={t}
              className="px-3 py-2 text-[11px] font-light cursor-pointer transition-colors"
              style={{
                borderBottom: `1px solid ${border}`,
                background: i === activeIndex ? "hsl(var(--muted))" : "hsl(var(--card))",
              }}
              onMouseDown={() => {
                onSelect(t);
                setActiveIndex(-1);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

