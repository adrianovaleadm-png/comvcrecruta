import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the active company id.
 * - If user is logged in as company member -> uses AuthContext.company.id
 * - In dev mode -> uses localStorage('dev_company_id') or falls back to oldest company.
 */
export function useCurrentCompanyId(): string | null {
  const { company } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(
    company?.id ?? (typeof window !== "undefined" ? localStorage.getItem("dev_company_id") : null)
  );

  useEffect(() => {
    if (company?.id) {
      setCompanyId(company.id);
      localStorage.setItem("dev_company_id", company.id);
      return;
    }
    const stored = localStorage.getItem("dev_company_id");
    if (stored) {
      setCompanyId(stored);
      return;
    }
    // Fallback: oldest company
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        setCompanyId(data.id);
        localStorage.setItem("dev_company_id", data.id);
      }
    })();
  }, [company?.id]);

  return companyId;
}
