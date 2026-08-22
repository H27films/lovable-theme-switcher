import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { THERAPISTS as DEFAULT_THERAPISTS } from "@/lib/branchSimpleUtils";

export const useBranchTherapists = (branchIdentifier: string) => {
  const [therapists, setTherapists] = useState<string[]>([...DEFAULT_THERAPISTS]);

  const fetchTherapists = useCallback(async () => {
    try {
      const upper = (branchIdentifier || "").toUpperCase();
      const { data, error } = await (supabase as any)
        .from("Therapists")
        .select("branch, name");

      if (!error && data && data.length > 0) {
        const matched = data.filter((t: any) => {
          const b = String(t.branch || "").toUpperCase().trim();
          if (upper.includes("CHIC") && (b === "CHIC" || b.includes("CHIC"))) return true;
          if (upper.includes("NUR") && (b.includes("NUR") || b.includes("YADI"))) return true;
          if (upper.includes("BOUDOIR") && (b === "BOUDOIR" || b.includes("BOUDOIR"))) return true;
          return b === upper;
        });

        if (matched.length > 0) {
          const uniqueNames = Array.from(new Set(matched.map((t: any) => String(t.name).trim().toUpperCase())));
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


