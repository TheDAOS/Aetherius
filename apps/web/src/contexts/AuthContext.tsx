import type { Session, User } from "@supabase/supabase-js";
import type React from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { offlineDb } from "../services/storage/offlineDb";
import { supabase } from "../services/supabaseClient";
import { vaultService } from "../services/vault";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  error: null,
  signInWithGithub: async () => {},
  signOut: async () => {},
  clearError: () => {},
});
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const settledUser = useRef<string | null>(null);
  const initialized = useRef(false);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    let eventSeen = false;
    const initialize = async (incoming: Session | null) => {
      const version = ++generation;
      const sameAccount =
        initialized.current &&
        settledUser.current === (incoming?.user.id ?? null);
      if (!sameAccount) {
        setLoading(true);
        setSession(null);
      }
      try {
        if (incoming?.user.id) offlineDb.setUserId(incoming.user.id);
        else offlineDb.setUserId(null);
        if (incoming?.provider_token)
          await vaultService.storeGitHubToken(incoming.provider_token);
        if (!alive || generation !== version) return;
        const clean = incoming ? { ...incoming } : null;
        if (clean) {
          delete clean.provider_token;
          delete clean.provider_refresh_token;
        }
        settledUser.current = incoming?.user.id ?? null;
        initialized.current = true;
        setSession(clean);
        setError(null);
      } catch (err) {
        if (alive && generation === version) {
          if (!sameAccount) setSession(null);
          setError((err as Error).message);
        }
      } finally {
        if (alive && generation === version) setLoading(false);
      }
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, incoming) => {
      eventSeen = true;
      // Never await SDK-auth-dependent work inside the auth callback/lock.
      setTimeout(() => {
        if (alive) void initialize(incoming);
      }, 0);
    });
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!alive || eventSeen) return;
        if (sessionError) {
          setError(sessionError.message);
          setLoading(false);
          return;
        }
        void initialize(data.session);
      })
      .catch((err) => {
        if (alive) {
          setError((err as Error).message);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      ++generation;
      subscription.unsubscribe();
    };
  }, []);
  const signInWithGithub = async () => {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { scopes: "repo", redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const signOut = async () => {
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
      // User-scoped drafts survive logout. They are never exposed to the next account.
      offlineDb.setUserId(null);
      settledUser.current = null;
      initialized.current = true;
      setSession(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };
  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        error,
        signInWithGithub,
        signOut,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
