import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const BRANCHES = ["Boudoir", "Chic Nailspa", "Nur Yadi"];

// The therapists table may have been created as "Therapists" or "therapists".
// Reads already try both; writes must too, otherwise saving blows up silently.
const THERAPISTS_TABLES = ["Therapists", "therapists"] as const;

/**
 * Try an operation against every possible therapists table name and return the
 * first result that didn't error (so reads and writes always hit the same table).
 */
const runTherapistsOperation = async <T,>(
  build: (table: string) => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> => {
  for (const table of THERAPISTS_TABLES) {
    const result = await build(table);
    if (!result.error) return result;
  }
  // Return the last attempt so the caller can surface the real error message.
  return build(THERAPISTS_TABLES[THERAPISTS_TABLES.length - 1]);
};

export const SettingsModalOffice = ({ open, onClose }: SettingsModalProps) => {
  const [activeBranch, setActiveBranch] = useState("Boudoir");
  const [therapists, setTherapists] = useState<string[]>([]);
  const [newTherapist, setNewTherapist] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchTherapists = async () => {
    setLoading(true);
    try {
      const { data, error } = await runTherapistsOperation<{ name: string }[]>((table) =>
        (supabase as any).from(table).select("name").eq("branch", activeBranch)
      );

      if (!error && data) {
        setTherapists(data.map((t: any) => String(t.name).trim().toUpperCase()));
      } else {
        console.error("Supabase error fetching therapists:", error);
        setTherapists([]);
      }
    } catch (err) {
      console.error("Fetch therapists error:", err);
      setTherapists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchTherapists();
  }, [open, activeBranch]);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTherapist.trim();
    if (!trimmed) return;
    const upper = trimmed.toUpperCase();
    if (therapists.includes(upper)) {
      setNewTherapist("");
      return;
    }

    setSaveError(null);

    // id and timestamp are auto-generated; we only supply branch + name
    const { error } = await runTherapistsOperation((table) =>
      (supabase as any).from(table).insert({ branch: activeBranch, name: upper }).select()
    );

    if (error) {
      console.error("Error saving therapist:", error);
      setSaveError(error?.message || "Could not save therapist. Check console for details.");
      return;
    }

    setTherapists(prev => [...prev, upper]);
    setNewTherapist("");
    window.dispatchEvent(new Event("therapists_updated"));
  };

  const handleRemove = async (name: string) => {
    setSaveError(null);

    const { error } = await runTherapistsOperation((table) =>
      (supabase as any)
        .from(table)
        .delete()
        .eq("branch", activeBranch)
        .eq("name", name)
    );

    if (error) {
      console.error("Error deleting therapist:", error);
      setSaveError(error?.message || "Could not delete therapist. Check console for details.");
      return;
    }

    setTherapists(prev => prev.filter(t => t !== name));
    window.dispatchEvent(new Event("therapists_updated"));
  };

  if (!open) return null;

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 2000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "hsl(var(--background))", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "380px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", border: "1px solid hsl(var(--border))", fontFamily: "Raleway, inherit" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SettingsIcon size={18} />
            <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Settings</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}><X size={20} /></button>
        </div>

        {/* Branch tabs */}
        <div style={{ display: "flex", gap: "18px", marginBottom: "18px" }}>
          {BRANCHES.map(name => (
            <button
              key={name}
              onClick={() => setActiveBranch(name)}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeBranch === name ? "2px solid hsl(var(--foreground))" : "2px solid transparent",
                cursor: "pointer",
                padding: "0 2px 6px 2px",
                fontSize: "13px",
                letterSpacing: "0.04em",
                fontFamily: "Raleway, inherit",
                color: activeBranch === name ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                fontWeight: activeBranch === name ? 700 : 400,
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", marginBottom: "8px" }}>
            Therapists ({activeBranch}) {loading && "..."}
          </div>
          <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
            {therapists.map(name => (
              <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "hsl(var(--card))", borderRadius: "8px", border: "0.5px solid hsl(var(--border))" }}>
                <span style={{ fontSize: "14px", fontWeight: 400 }}>{name}</span>
                <button onClick={() => handleRemove(name)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(0 70% 50%)", padding: "2px" }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAdd} style={{ display: "flex", gap: "8px" }}>
            <input type="text" value={newTherapist} onChange={e => setNewTherapist(e.target.value)} placeholder="Add therapist name..." style={{ flex: 1, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", outline: "none", color: "hsl(var(--foreground))" }} />
            <button type="submit" style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: "8px", padding: "0 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} /></button>
          </form>
          {saveError && (
            <div style={{ marginTop: "10px", fontSize: "11px", color: "hsl(0 70% 50%)", fontFamily: "Raleway, inherit", lineHeight: 1.4 }}>
              ✗ {saveError}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ width: "100%", background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: "999px", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginTop: "8px" }}>Done</button>
      </div>
    </div>,
    document.body
  );
};