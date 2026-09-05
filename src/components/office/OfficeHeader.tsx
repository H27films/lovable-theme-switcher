import React, { useState, useRef, useEffect } from "react";
import { Menu, Tablet, Laptop, Settings as SettingsIcon, RefreshCw, type LucideIcon } from "lucide-react";
import { useTabletMode } from "@/hooks/useTabletMode";
import { SettingsModalOffice } from "./SettingsModalOffice";

interface OfficeHeaderProps {
  /** Open the Office Sync panel (state lives on the Office page) from the menu. */
  onOpenSync?: () => void;
}

/** One entry in the floating hamburger menu (Apple Books–style segmented pills) */
interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** "row" = full-width pill bar (default); "grid" = compact square tile in the quick-action grid below the rows */
  variant?: "row" | "grid";
  onSelect: () => void;
}

export const OfficeHeader = ({ onOpenSync }: OfficeHeaderProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { tablet, toggle: toggleTablet } = useTabletMode();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Menu entries — every action/trigger is unchanged; only the layout & styling are new.
  const menuItems: MenuItem[] = [
    {
      key: "sync",
      label: "Sync",
      icon: RefreshCw,
      onSelect: () => { setShowDropdown(false); onOpenSync?.(); },
    },
    {
      key: "view",
      label: tablet ? "Phone View" : "Tablet View",
      icon: tablet ? Tablet : Laptop,
      onSelect: () => { setShowDropdown(false); toggleTablet(); },
    },
    {
      key: "settings",
      label: "Settings",
      icon: SettingsIcon,
      onSelect: () => { setShowDropdown(false); setShowSettingsModal(true); },
    },
  ];

  const rowItems = menuItems.filter((item) => item.variant !== "grid");
  const gridItems = menuItems.filter((item) => item.variant === "grid");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  return (
    <>
      <div style={{ position: "relative", flexShrink: 0 }} ref={dropdownRef}>
          <button onClick={() => setShowDropdown(!showDropdown)} aria-label="Menu" aria-expanded={showDropdown} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "none", border: "none", cursor: "pointer", padding: 0, color: "black" }}>
            <Menu size={24} color="black" />
          </button>

          {showDropdown && (
            /* iOS Apple Books–style segmented floating menu — identical to the
               branch headers: a stack of individual floating cream pill rows.
               Rows pop in one after another (staggered menu-pop animation). */
            <div className="absolute right-0 top-[44px] z-[1000] flex w-52 flex-col gap-1.5">
              {rowItems.map((item, i) => (
                <button
                  key={item.key}
                  onClick={item.onSelect}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-black/5 bg-raised px-4 py-3 text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-150 hover:bg-card active:scale-95 active:bg-card animate-menu-pop"
                  style={{
                    fontFamily: "Raleway, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    letterSpacing: "0.04em",
                    textAlign: "left",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  <span className="font-normal">{item.label}</span>
                  <item.icon className="h-5 w-5 shrink-0 opacity-80" />
                </button>
              ))}

              {/* Optional quick-action grid: secondary compact toggles rendered
                  side-by-side below the full-width bars (currently unused). */}
              {gridItems.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {gridItems.map((item, i) => (
                    <button
                      key={item.key}
                      onClick={item.onSelect}
                      aria-label={item.label}
                      className="flex aspect-square items-center justify-center rounded-2xl border border-black/5 bg-raised text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-150 hover:bg-card active:scale-95 active:bg-card animate-menu-pop"
                      style={{ cursor: "pointer", WebkitTapHighlightColor: "transparent", animationDelay: `${(rowItems.length + i) * 50}ms` }}
                    >
                      <item.icon className="h-5 w-5 opacity-80" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>

      <SettingsModalOffice open={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  );
};