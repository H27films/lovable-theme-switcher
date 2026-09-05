import React, { useState, useRef, useEffect } from "react";
import { Menu, Tablet, Laptop, Settings as SettingsIcon, Star } from "lucide-react";
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
          <button onClick={() => setShowDropdown(!showDropdown)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "none", border: "none", cursor: "pointer", padding: 0, color: "black" }} aria-label="Menu">
            <Menu size={24} color="black" />
          </button>

          {showDropdown && (
            <div style={{ position: "absolute", top: "44px", right: "0px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)", zIndex: 1000, minWidth: "160px", padding: "4px" }}>
              <button onClick={() => { setShowDropdown(false); toggleTablet(); }} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", fontSize: "14px", fontWeight: 400, letterSpacing: "0.04em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", fontFamily: "Raleway, sans-serif", textAlign: "left" }}>
                {tablet ? <><Tablet size={16} /> Phone View</> : <><Laptop size={16} /> Tablet View</>}
              </button>
              <button onClick={() => { setShowDropdown(false); setShowSettingsModal(true); }} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", fontSize: "14px", fontWeight: 400, letterSpacing: "0.04em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", fontFamily: "Raleway, sans-serif", textAlign: "left" }}>
                <SettingsIcon size={16} /> Settings
              </button>
              {favBranch && (
                <button onClick={() => { setShowDropdown(false); setShowFavourites(true); }} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", fontSize: "14px", fontWeight: 400, letterSpacing: "0.04em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", fontFamily: "Raleway, sans-serif", textAlign: "left" }}>
                  <Star size={16} /> Favourites
                </button>
              )}
              <button onClick={() => { setShowDropdown(false); setShowPasswordModal(true); }} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", fontSize: "14px", fontWeight: 400, letterSpacing: "0.04em", color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", fontFamily: "Raleway, sans-serif", textAlign: "left" }}>
                Change Password
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} branch={branch} />
      {favBranch && (
        <Favourites
          open={showFavourites}
          onClose={() => setShowFavourites(false)}
          onSubmitted={onFavouritesSubmitted ? () => { setShowFavourites(false); onFavouritesSubmitted(); } : undefined}
          branch={favBranch}
        />
      )}
    </>
  );
};
