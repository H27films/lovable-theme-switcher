import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBranchTherapists = (branchIdentifier: string) => {
  const [therapists, setTherapists] = useState<string[]>([]);

  const fetchTherapists = useCallback(async () => {
    try {
      let { data, error } = await (supabase as any)
        .from("Therapists")
        .select("name")
        .eq("branch", branchIdentifier);

      if (error || !data || data.length === 0) {
        const res2 = await (supabase as any)
          .from("therapists")
          .select("name")
          .eq("branch", branchIdentifier);
        if (!res2.error && res2.data) {
          data = res2.data;
          error = null;
        }
      }

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


