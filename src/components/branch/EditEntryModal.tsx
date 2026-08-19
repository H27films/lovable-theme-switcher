import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { USAGE_TYPES, THERAPISTS, type UsageType } from "@/lib/branchSimpleUtils";
import { type LogRow } from "@/lib/branchSimple";

export interface EditEntryUpdates {
  qty: number;
  therapist: string | null;
  type: UsageType;
  notes: string;
}

interface EditEntryModalProps {
  row: LogRow;
  onSave: (updates: EditEntryUpdates) => void | Promise<void>;
  onClose: () => void;
}

// Convert a stored log row (TYPE / USAGE PILL) back into the pill value shown in the edit card.
const pillFromRow = (row: LogRow): UsageType => {
  const up = (row as any)["USAGE PILL"];
  if (up) {
    const u = String(up).toLowerCase();
    if (u.startsWith("foc")) return "FOC";
    if (u.startsWith("customer")) return "Customer";
    if (u.startsWith("staff")) return "Staff";
    if (u.startsWith("transfer")) return "Transfer";
    if (u.startsWith("salon")) return "Salon Use";
  }
  const t = row.TYPE;
  if (t === "Customer") return "Customer";
  if (t === "Staff") return "Staff";
  if (t === "Transfer") return "Transfer";
  return "Salon Use";
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontFamily: "Raleway, inherit",
  color: "hsl(var(--muted-foreground))",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "hsl(var(--card))",
  border: "0.5px solid hsl(var(--border))",
  color: "hsl(var(--foreground))",
  fontSize: "14px",
  fontFamily: "Raleway, inherit",
  fontWeight: 300,
  padding: "9px 12px",
  borderRadius: "10px",
  outline: "none",
  boxSizing: "border-box",
};

export const EditEntryModal = ({ row, onSave, onClose }: EditEntryModalProps) => {
  const [qty, setQty] = useState(String(row.QTY ?? 0));
  const [therapist, setTherapist] = useState<string | null>((row as any)["Therapist"] || null);
  const [type, setType] = useState<UsageType>(pillFromRow(row));
  const [notes, setNotes] = useState<string>((row as any)["NOTES"] || "");
  const [saving, setSaving] = useState(false);

  const cycleTherapist = () => {
    const order: (string | null)[] = [null, ...THERAPISTS];
    const idx = order.indexOf(therapist);
    setTherapist(order[(idx + 1) % order.length]);
  };

  const handleSave = async () => {
    const parsed = parseInt(qty, 10);
    if (isNaN(parsed)) return;
    setSaving(true);
    try {
      await onSave({ qty: parsed, therapist, type, notes });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 300,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "520px", margin: "0 12px 12px", background: "hsl(var(--background))", borderRadius: "20px", boxShadow: "0 -4px 30px rgba(0,0,0,0.2)", padding: "20px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div style={{ fontSize: "18px", fontWeight: 300, letterSpacing: "0.06em", fontFamily: "Raleway, inherit" }}>Edit Entry</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: "4px", display: "flex", alignItems: "center" }}><X size={16} /></button>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={labelStyle}>Product Name</div>
          <div style={{ ...inputStyle, background: "hsl(var(--muted) / 0.3)", opacity: 0.7, userSelect: "none" }}>{row["PRODUCT NAME"]}</div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={labelStyle}>Qty</div>
          <input type="text" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={labelStyle}>Therapist</div>
          <button onClick={cycleTherapist} style={pillButtonStyle}>{therapist ? therapist : "NONE"}</button>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={labelStyle}>Type</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {USAGE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  ...pillButtonStyle,
                  background: type === t ? "hsl(var(--foreground))" : "#ffffff",
                  color: type === t ? "hsl(var(--background))" : "hsl(var(--foreground))",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={labelStyle}>Notes</div>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} placeholder="Add note..." />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: "100%", background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", cursor: saving ? "default" : "pointer", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", borderRadius: "999px", opacity: saving ? 0.5 : 1 }}
        >
          {saving ? "Saving..." : "Update"}
        </button>
      </div>
    </div>,
    document.body
  );
};

