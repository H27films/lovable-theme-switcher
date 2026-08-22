import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { THERAPISTS as DEFAULT_THERAPISTS } from "@/lib/branchSimpleUtils";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  branch: string;
}

export const SettingsModal = ({ open, onClose, branch }: SettingsModalProps) => {
  const [therapists, setTherapists] = useState<string[]>([]);
  const [newTherapist, setNewTherapist] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTherapists = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("Therapists")
        .select("*")
        .eq("branch", branch);

      if (!error && data && data.length > 0) {
        setTherapists(data.map((t: any) => t.name));
      } else {
        setTherapists([...DEFAULT_THERAPISTS]);
      }
    } catch {
      setTherapists([...DEFAULT_THERAPISTS]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchTherapists();
  }, [open, branch]);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTherapist.trim();
    if (!trimmed) return;
    const upper = trimmed.toUpperCase();
    if (therapists.includes(upper)) {
      setNewTherapist("");
      return;
    }

    const updated = [...therapists, upper];
    setTherapists(updated);
    setNewTherapist("");

    try {
      await (supabase as any)
        .from("Therapists")
        .insert({ branch: branch, name: upper });
    } catch (err) {
      console.error("Error saving therapist:", err);
    }
    window.dispatchEvent(new Event("therapists_updated"));
  };

  const handleRemove = async (name: string) => {
    const updated = therapists.filter(t => t !== name);
    setTherapists(updated);

    try {
      await (supabase as any)
        .from("Therapists")
        .delete()
        .eq("branch", branch)
        .eq("name", name);
    } catch (err) {
      console.error("Error deleting therapist:", err);
    }
    window.dispatchEvent(new Event("therapists_updated"));
  };

  if (!open) return null;

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 2000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "hsl(var(--background))", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "380px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", border: "1px solid hsl(var(--border))", fontFamily: "Raleway, inherit" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SettingsIcon size={18} />
            <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{branch} Settings</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}><X size={20} /></button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", marginBottom: "8px" }}>
            Therapists ({branch}) {loading && "..."}
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
        </div>

        <button onClick={onClose} style={{ width: "100%", background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: "999px", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginTop: "8px" }}>Done</button>
      </div>
    </div>,
    document.body
  );
};
