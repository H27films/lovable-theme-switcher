import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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
  color: "#000000",
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

const pillButtonStyle: React.CSSProperties = {
  background: "#ffffff",
  color: "hsl(var(--foreground))",
  border: "0.5px solid hsl(var(--border))",
  cursor: "pointer",
  padding: "5px 12px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.1em",
  fontFamily: "Raleway, inherit",
  textTransform: "uppercase",
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
      onClick={onClose}
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
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "520px", margin: "0 12px 0", background: "hsl(var(--background))", borderRadius: "20px", boxShadow: "0 -4px 30px rgba(0,0,0,0.2)", padding: "20px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.04em", fontFamily: "Raleway, inherit", color: "#000000", marginBottom: "2px" }}>
              {new Date(row.DATE).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 300, letterSpacing: "0.06em", fontFamily: "Raleway, inherit" }}>
              {row["PRODUCT NAME"]}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: "8px", display: "flex", alignItems: "center", flexShrink: 0, marginTop: "-4px" }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={labelStyle}>QTY</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button 
              onClick={() => setQty(prev => (parseInt(prev || "0") - 1).toString())}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ChevronLeft size={14} />
            </button>
            <input 
              type="text" 
              inputMode="numeric" 
              value={qty} 
              onChange={e => setQty(e.target.value)} 
              style={{ 
                ...inputStyle, 
                width: "60px", 
                padding: "6px 10px", 
                fontSize: "13px",
                textAlign: "center",
                background: "#ffffff"
              }} 
            />
            <button 
              onClick={() => setQty(prev => (parseInt(prev || "0") + 1).toString())}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "48px", marginBottom: "20px" }}>
          <div>
            <div style={labelStyle}>Type</div>
            <button 
              onClick={() => setType(prev => {
                const idx = USAGE_TYPES.indexOf(prev);
                return USAGE_TYPES[(idx + 1) % USAGE_TYPES.length];
              })} 
              style={{
                ...pillButtonStyle,
                background: "#ffffff",
                color: "hsl(var(--foreground))",
              }}
            >
              {type}
            </button>
          </div>
          <div>
            <div style={labelStyle}>Therapist</div>
            <button 
              onClick={cycleTherapist} 
              style={{
                ...pillButtonStyle,
                background: therapist ? "#ffffff" : "none",
                color: therapist ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              }}
            >
              {therapist ? therapist : "NONE"}
            </button>
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