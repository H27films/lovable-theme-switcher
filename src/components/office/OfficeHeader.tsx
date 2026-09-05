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

/* Menu animation timings: rows pop in top-to-bottom, then collapse out
   bottom-to-top (reverse order) when the menu closes. */
const MENU_ENTRY_STAGGER_MS = 50;
const MENU_EXIT_STAGGER_MS = 40;
const MENU_EXIT_DURATION_MS = 200;

export const OfficeHeader = ({ onOpenSync }: OfficeHeaderProps) => {
  /** "closed" → unmounted; "open" → staggered pop-in; "closing" → reverse staggered collapse */
  const [menuState, setMenuState] = useState<"closed" | "open" | "closing">("closed");
  const closeTimerRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { tablet, toggle: toggleTablet } = useTabletMode();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Menu entries — every action/trigger is unchanged; only the layout & styling are new.
  // (Closing is handled by the button wrapper via closeMenu, so onSelect holds just the action.)
  const menuItems: MenuItem[] = [
    {
      key: "sync",
      label: "Sync",
      icon: RefreshCw,
      onSelect: () => onOpenSync?.(),
    },
    {
      key: "view",
      label: tablet ? "Phone View" : "Tablet View",
      icon: tablet ? Tablet : Laptop,
      onSelect: () => toggleTablet(),
    },
    {
      key: "settings",
      label: "Settings",
      icon: SettingsIcon,
      onSelect: () => setShowSettingsModal(true),
    },
  ];

  const rowItems = menuItems.filter((item) => item.variant !== "grid");
  const gridItems = menuItems.filter((item) => item.variant === "grid");

  /** Collapse the menu in reverse stagger order (bottom pill first), then unmount. */
  const closeMenu = () => {
    if (menuState !== "open") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMenuState("closed");
      return;
    }
    const totalItems = rowItems.length + gridItems.length;
    const exitTotalMs = Math.max(totalItems - 1, 0) * MENU_EXIT_STAGGER_MS + MENU_EXIT_DURATION_MS;
    setMenuState("closing");
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setMenuState("closed");
    }, exitTotalMs);
  };

  /** Open the menu (cancels a pending collapse if re-opened mid-close). */
  const openMenu = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuState("open");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    if (menuState === "open") document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuState, closeMenu]);

  // Clear a pending collapse timer if the header unmounts mid-animation.
  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <>
      <div style={{ position: "relative", flexShrink: 0 }} ref={dropdownRef}>
          <button onClick={() => (menuState === "open" ? closeMenu() : openMenu())} aria-label="Menu" aria-expanded={menuState === "open"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "none", border: "none", cursor: "pointer", padding: 0, color: "black" }}>
            <Menu size={24} color="black" />
          </button>

          {menuState !== "closed" && (
            /* iOS Apple Books–style segmented floating menu — identical to the
               branch headers: a stack of individual floating cream pill rows.
               Opens with a top-to-bottom pop-in; closes with the reverse
               bottom-to-top collapse before unmounting. */
            <div className={`absolute right-0 top-[44px] z-[1000] flex w-52 flex-col gap-1.5${menuState === "closing" ? " pointer-events-none" : ""}`}>
              {rowItems.map((item, i) => (
                <button
                  key={item.key}
                  onClick={() => { closeMenu(); item.onSelect(); }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-black/5 bg-raised px-4 py-3 text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-150 hover:bg-card active:scale-95 active:bg-card ${menuState === "closing" ? "animate-menu-pop-out" : "animate-menu-pop"}`}
                  style={{
                    fontFamily: "Raleway, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    letterSpacing: "0.04em",
                    textAlign: "left",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                    /* Exit runs in reverse: the bottom pill leaves first. */
                    animationDelay: menuState === "closing"
                      ? `${(gridItems.length + (rowItems.length - 1 - i)) * MENU_EXIT_STAGGER_MS}ms`
                      : `${i * MENU_ENTRY_STAGGER_MS}ms`,
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
                      onClick={() => { closeMenu(); item.onSelect(); }}
                      aria-label={item.label}
                      className={`flex aspect-square items-center justify-center rounded-2xl border border-black/5 bg-raised text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-150 hover:bg-card active:scale-95 active:bg-card ${menuState === "closing" ? "animate-menu-pop-out" : "animate-menu-pop"}`}
                      style={{
                        cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                        animationDelay: menuState === "closing"
                          ? `${(gridItems.length - 1 - i) * MENU_EXIT_STAGGER_MS}ms`
                          : `${(rowItems.length + i) * MENU_ENTRY_STAGGER_MS}ms`,
                      }}
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