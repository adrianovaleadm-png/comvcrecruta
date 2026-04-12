import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CompanyMember = Database["public"]["Tables"]["company_members"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  companyMember: CompanyMember | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyMember, setCompanyMember] = useState<CompanyMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);

    if (data?.user_type === "empresa") {
      const { data: memberData } = await supabase
        .from("company_members")
        .select("*")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      setCompanyMember(memberData);

      if (memberData) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("*")
          .eq("id", memberData.company_id)
          .single();
        setCompany(companyData);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setCompany(null);
          setCompanyMember(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCompany(null);
    setCompanyMember(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, company, companyMember, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
