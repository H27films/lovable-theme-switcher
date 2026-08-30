import { useState } from "react";
import ImportPanel from "./ImportPanel";
import ExportPanel from "./ExportPanel";

type ExportOption = "log" | "cash" | "order";
type ImportOption = "balance" | "log" | "cash";

interface SyncProps {
  onClose: () => void;
  /** Fired when the Import sub-screen closes (preserves the old ImportPanel close → log refresh behaviour). */
  onImportPanelClosed: () => void;
  /** Passed through to ImportPanel so balance imports refresh the product list. */
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

export default function Sync({ onClose, onImportPanelClosed, onProductsUpdated }: SyncProps) {
  const [mode, setMode] = useState<"export" | "import">("export");
  const [activeSub, setActiveSub] = useState<
    | { kind: "export"; type: ExportOption }
    | { kind: "import"; type: ImportOption }
    | null
  >(null);

  const options = mode === "export" ? EXPORT_OPTIONS : IMPORT_OPTIONS;

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
          padding: "3px",
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
              onClick={() => setMode(m)}
              style={{
                padding: "7px 20px",
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
            : "Choose what to import. Upload a CSV file using the provided templates."}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "24px" }}>
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveSub({ kind: mode, type: opt.key })}
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
                <div
                  style={{
                    fontSize: "16px", fontWeight: 600, fontFamily: "Raleway, inherit",
                    color: "hsl(var(--foreground))", letterSpacing: "0.06em", marginBottom: "4px",
                  }}
                >
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
      </div>

      {/* Sub-screens — reuse the existing panels, deep-linked to the tapped type */}
      {activeSub?.kind === "import" && (
        <ImportPanel
          initialType={activeSub.type}
          onClose={() => {
            setActiveSub(null);
            onImportPanelClosed();
          }}
          onProductsUpdated={onProductsUpdated}
        />
      )}
      {activeSub?.kind === "export" && (
        <ExportPanel initialType={activeSub.type} onClose={() => setActiveSub(null)} />
      )}
    </div>
  );
}