import React, { useState, useRef, useEffect } from "react";
import { Menu, Tablet, Laptop, Settings as SettingsIcon, Star, KeyRound, type LucideIcon } from "lucide-react";
import { useTabletMode } from "@/hooks/useTabletMode";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { SettingsModal } from "./SettingsModal";
import { Favourites } from "./Favourites";
import type { BranchKey } from "@/lib/branchSimple";

/** Hamburger "Favourites" is only shown for branches this feature supports */
const FAV_BRANCH_BY_NAME: Record<string, BranchKey> = {
  BOUDOIR: "boudoir",
  CHIC: "chic",
  "NUR YADI": "nuryadi",
};

/** One entry in the floating hamburger menu (Apple Books–style segmented pills) */
interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** "row" = full-width pill bar (default); "grid" = compact square tile in the quick-action grid below the rows */
  variant?: "row" | "grid";
  onSelect: () => void;
}

interface BranchHeaderProps {
  branch: string;
  onBack: () => void;
  /** Replaces the big title text (menu/favourites logic stays keyed off `branch`) */
  titleOverride?: string;
  /** Small lighter label shown to the right of the title (e.g. branch name on the search view) */
  secondaryLabel?: string;
  /** Called after the Favourites panel saves + confirms: closes Favourites and lets the branch reset to its default page */
  onFavouritesSubmitted?: () => void;
}

export const BranchHeader = ({ branch, onBack, titleOverride, secondaryLabel, onFavouritesSubmitted }: BranchHeaderProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { tablet, toggle: toggleTablet } = useTabletMode();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFavourites, setShowFavourites] = useState(false);

  const favBranch = FAV_BRANCH_BY_NAME[(branch ?? "").trim().toUpperCase()];

  // Menu entries — every action/trigger is unchanged; only the layout & styling are new.
  const menuItems: MenuItem[] = [
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
    ...(favBranch
      ? [{
          key: "favourites",
          label: "Favourites",
          icon: Star,
          onSelect: () => { setShowDropdown(false); setShowFavourites(true); },
        }]
      : []),
    {
      key: "password",
      label: "Change Password",
      icon: KeyRound,
      onSelect: () => { setShowDropdown(false); setShowPasswordModal(true); },
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px 0px 12px", width: "100%", boxSizing: "border-box" }}>
        <button onClick={onBack} style={{ display: "block", fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, flex: 1 }}>
          {titleOverride ?? branch}
          {secondaryLabel && (
            <span style={{ fontSize: "15px", fontWeight: 200, letterSpacing: "0.08em", color: "hsl(var(--muted-foreground) / 0.65)", marginLeft: "6px" }}>{secondaryLabel}</span>
          )}
        </button>

        <div style={{ position: "relative", flexShrink: 0 }} ref={dropdownRef}>
          <button onClick={() => setShowDropdown(!showDropdown)} aria-label="Menu" aria-expanded={showDropdown} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "none", border: "none", cursor: "pointer", padding: 0, color: "black" }}>
            <Menu size={24} color="black" />
          </button>

          {showDropdown && (
            /* iOS Apple Books–style segmented floating menu: a stack of
               individual floating cream pill rows instead of one boxed panel.
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
      </div>

      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} branch={branch} />
      {favBranch && (
        <Favourites open={showFavourites} onClose={() => setShowFavourites(false)} branch={favBranch} />
      )}
    </>
  );
};
