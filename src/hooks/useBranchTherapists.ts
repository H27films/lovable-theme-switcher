import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBranchTherapists = (branchIdentifier: string) => {
  const [therapists, setTherapists] = useState<string[]>([]);

  const fetchTherapists = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("Therapists")
        .select("name")
        .eq("branch", branchIdentifier);

      if (!error && data) {
        setTherapists(data.map((t: any) => String(t.name).trim().toUpperCase()));
        return;
      }
      setTherapists([]);
    } catch {
      setTherapists([]);
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


