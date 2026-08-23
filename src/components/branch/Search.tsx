import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface SearchProps {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  searchMode: "idle" | "active" | "result";
  setSearchMode: React.Dispatch<React.SetStateAction<"idle" | "active" | "result">>;
  selectedProduct: any;
  setSelectedProduct: React.Dispatch<React.SetStateAction<any>>;
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  autoFocus: boolean;
  closeSearch: () => void;
}

export const Search = ({
  search,
  setSearch,
  searchMode,
  setSearchMode,
  selectedProduct,
  setSelectedProduct,
  showDropdown,
  setShowDropdown,
  autoFocus,
  closeSearch,
}: SearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", padding: "0 12px" }}>
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        value={searchMode === "result" ? "" : search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          setSelectedProduct(null);
          setSearchMode("active");
          setShowDropdown(val.length > 0);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={selectedProduct ? selectedProduct["PRODUCT NAME"] : "Select Product"}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          outline: "none",
          fontSize: "15px",
          fontFamily: "Raleway, inherit",
          color: "hsl(var(--foreground))",
          caretColor: "hsl(var(--foreground))",
          padding: "8px 0",
        }}
      />
      {search.length > 0 && searchMode !== "result" && (
        <button
          onClick={() => {
            setSearch("");
            setSelectedProduct(null);
            setShowDropdown(false);
            setSearchMode("idle");
            closeSearch();
          }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
