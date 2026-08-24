import React, { useState, useRef, useEffect } from "react";
import { Menu, Tablet, Laptop, Settings as SettingsIcon } from "lucide-react";
import { useTabletMode } from "@/hooks/useTabletMode";
import { SettingsModalOffice } from "./SettingsModalOffice";

export const OfficeHeader = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { tablet, toggle: toggleTablet } = useTabletMode();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
            </div>
          )}
      </div>

      <SettingsModalOffice open={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  );
};