
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import { supabaseAuth } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Subscribe before reading the initial session
    // so auth changes are not missed during initialization.
    const {
      data: { subscription },
    } = supabaseAuth.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;

        setSession(nextSession);
        setLoading(false);
      }
    );

    // Restore an existing session on page refresh.
    void supabaseAuth.auth.getSession().then(
      ({ data, error }) => {
        if (!active) return;

        if (error) {
          setSession(null);
        } else {
          setSession(data.session);
        }

        setLoading(false);
      }
    ).catch(() => {
      if (!active) return;

      setSession(null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } =
      await supabaseAuth.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signOut,
    }),
    [session, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access authenticated user and session
 * from any client component.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
}
