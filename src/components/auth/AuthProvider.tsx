"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_ROUTES = ["/auth/signin", "/auth/signup", "/auth/forgot-password", "/auth/callback"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }: { data: { session: Session | null } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, sess: Session | null) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (loading) return;
    if (!user && !PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
      router.push("/auth/signin");
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
