import { useState } from "react";
import ExportPanel from "./ExportPanel";
import { ImportForm, type ImportType } from "./ImportForm";

type ExportOption = "log" | "cash" | "order";
type ImportOption = "balance" | "log" | "cash";

interface SyncProps {
  onClose: () => void;
  /** Fired after a successful inline import so the office log refreshes. */
  onImported: () => void;
  /** Passed through to the inline Balance import so products refresh. */
  onProductsUpdated: () => Promise<void>;
}

const EXPORT_OPTIONS: { key: ExportOption; label: string; desc: string }[] = [
  { key: "log", label: "Log", desc: "Export entries from AllFileLog (orders, usage, etc.)" },
  { key: "cash", label: "Cash", desc: "Export entries from the Cash table" },
  { key: "order", label: "Order Forms", desc: "Export entries from the Order Submit table" },
];

const IMPORT_OPTIONS: { key: ImportOption; label: string; desc: string }[] = [
  { key: "balance", label: "Balance", desc: "Update Office, Boudoir, Chic & Nur Yadi balances in AllFileProducts" },
  { key: "log", label: "Log", desc: "Add new entries to AllFileLog (usage, orders, etc.)" },
  { key: "cash", label: "Cash", desc: "Add or update cash entries in the Cash table" },
];

export default function Sync({ onClose, onImported, onProductsUpdated }: SyncProps) {
  const [mode, setMode] = useState<"export" | "import">("export");
  const [activeSub, setActiveSub] = useState<{ kind: "export"; type: ExportOption } | null>(null);
  const [expandedImport, setExpandedImport] = useState<ImportOption | null>(null);

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "hsl(var(--background))", zIndex: 100,
        display: "flex", flexDirection: "column",
        fontFamily: "Raleway, inherit",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "24px 16px 16px", borderBottom: "0.5px solid hsl(var(--border))", flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          title="Back to Office"
          style={{
            fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em",
            color: "hsl(var(--foreground))", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0,
          }}
        >
          SYNC
        </button>
        <button
          onClick={onClose}
          aria-label="Back"
          title="Back"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: "hsl(var(--foreground))", display: "flex", alignItems: "center",
          }}
        >
          <svg width="36" height="16" viewBox="0 0 36 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="30" y1="8" x2="1" y2="8" />
            <polyline points="9,1 1,8 9,15" />
          </svg>
        </button>
      </div>

      {/* Export / Import pill toggle */}
      <div
        style={{
          display: "inline-flex",
          width: "fit-content",
          alignSelf: "flex-start",
          background: "hsl(var(--muted))",
          borderRadius: "999px",
          padding: "2px",
          gap: "3px",
          margin: "14px 16px 4px",
          flexShrink: 0,
        }}
      >
        {(["export", "import"] as const).map(m => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => { setMode(m); if (m === "export") setExpandedImport(null); }}
              style={{
                padding: "5px 20px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: active ? "#000" : "transparent",
                color: active ? "#fff" : "hsl(var(--muted-foreground))",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "Raleway, inherit",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                transition: "all 0.15s",
              }}
            >
              {m === "export" ? "Export" : "Import"}
            </button>
          );
        })}
      </div>

      {/* Option cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div
          style={{
            fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit",
            color: "hsl(var(--muted-foreground))", marginBottom: "12px", letterSpacing: "0.04em",
          }}
        >
          {mode === "export"
            ? "Choose what to export. Select a date range to filter results."
            : "Tap an option to expand it, then upload a CSV file."}
        </div>

        {mode === "export" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "24px" }}>
            {EXPORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setActiveSub({ kind: "export", type: opt.key })}
                style={{
                  background: "none", border: "0.5px solid hsl(var(--border))", borderRadius: "10px",
                  padding: "16px", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(var(--foreground))")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.06em", marginBottom: "4px" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                    {opt.desc}
                  </div>
                </div>
                <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "20px", lineHeight: 1 }}>›</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "24px" }}>
            {IMPORT_OPTIONS.map(opt => {
              const open = expandedImport === opt.key;
              return (
                <div
                  key={opt.key}
                  style={{
                    border: open ? "0.5px solid hsl(var(--foreground))" : "0.5px solid hsl(var(--border))",
                    borderRadius: "10px",
                    background: open ? "hsl(var(--card))" : "none",
                    overflow: "hidden",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = "hsl(var(--foreground))"; }}
                  onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = "hsl(var(--border))"; }}
                >
                  <button
                    onClick={() => setExpandedImport(open ? null : (opt.key as ImportOption))}
                    style={{
                      width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                      padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.06em", marginBottom: "4px" }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                        {opt.desc}
                      </div>
                    </div>
                    <span
                      style={{
                        color: "hsl(var(--muted-foreground))", fontSize: "20px", lineHeight: 1,
                        transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s",
                      }}
                    >
                      ›
                    </span>
                  </button>
                  {open && (
                    <div style={{ padding: "2px 16px 16px" }}>
                      <ImportForm
                        type={opt.key as ImportType}
                        onProductsUpdated={onProductsUpdated}
                        onImported={onImported}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export sub-screen — reuse the existing panel, deep-linked to the tapped type */}
      {activeSub?.kind === "export" && (
        <ExportPanel initialType={activeSub.type} onClose={() => setActiveSub(null)} />
      )}
    </div>
  );
}