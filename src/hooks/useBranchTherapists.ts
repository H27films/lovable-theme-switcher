import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { THERAPISTS as DEFAULT_THERAPISTS } from "@/lib/branchSimpleUtils";

export const useBranchTherapists = (branchIdentifier: string) => {
  const [therapists, setTherapists] = useState<string[]>([...DEFAULT_THERAPISTS]);

  const fetchTherapists = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("Therapists")
        .select("name")
        .eq("branch", branchIdentifier);

      if (!error && data && data.length > 0) {
        setTherapists(data.map((t: any) => String(t.name).trim().toUpperCase()));
        return;
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


