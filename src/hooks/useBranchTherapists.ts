import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { THERAPISTS as DEFAULT_THERAPISTS } from "@/lib/branchSimpleUtils";

export const useBranchTherapists = (branchIdentifier: string) => {
  const [therapists, setTherapists] = useState<string[]>([...DEFAULT_THERAPISTS]);

  const fetchTherapists = useCallback(async () => {
    try {
      // Try matching against branch column variations (e.g. "CHIC", "Chic Nailspa", "chic", etc.)
      const upper = branchIdentifier.toUpperCase();
      const { data, error } = await (supabase as any)
        .from("Therapists")
        .select("name");

      if (!error && data && data.length > 0) {
        // Filter in memory or query exact matches
        const matched = data.filter((t: any) => {
          const b = String(t.branch || "").toUpperCase();
          return b.includes(upper) || upper.includes(b) || (upper === "CHIC" && b.includes("CHIC")) || (upper === "NUR YADI" && b.includes("NUR"));
        });

        if (matched.length > 0) {
          // Ensure unique names
          const uniqueNames = Array.from(new Set(matched.map((t: any) => t.name)));
          setTherapists(uniqueNames);
          return;
        }
      }

      setTherapists([...DEFAULT_THERAPISTS]);
    } catch {
      setTherapists([...DEFAULT_THERAPISTS]);
    }
  }, [branchIdentifier]);

  useEffect(() => {
    fetchTherapists();
    const handleUpdate = () => fetchTherapists();
    window.addEventListener("therapists_updated", handleUpdate);
    return () => window.removeEventListener("therapists_updated", handleUpdate);
  }, [fetchTherapists]);

  return therapists;
};

