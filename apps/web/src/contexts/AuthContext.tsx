import type { Session, User } from "@supabase/supabase-js";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize session — with error handling to prevent infinite loading
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Scope IndexedDB to this user to prevent cross-account data leaks
        if (session?.user?.id) {
          offlineDb.setUserId(session.user.id);
        }

        // Store GitHub token server-side if available (Rule #4 compliance)
        if (session?.provider_token) {
          vaultService.storeGitHubToken(session.provider_token).catch((err) => {
            console.warn("Failed to store GitHub token server-side:", err);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to get session:", err);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Scope IndexedDB to this user
      if (session?.user?.id) {
        offlineDb.setUserId(session.user.id);
      }

      // Store GitHub token server-side whenever it's available (e.g., on sign-in)
      if (session?.provider_token) {
        vaultService.storeGitHubToken(session.provider_token).catch((err) => {
          console.warn("Failed to store GitHub token server-side:", err);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGithub = async () => {
    try {
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          scopes: "repo", // required for git operations
        },
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || "Failed to sign in with GitHub");
    }
  };

  const signOut = async () => {
    // Clear user-scoped offline data to prevent cross-account data leaks
    try {
      await offlineDb.clearAll();
    } catch (err) {
      console.warn("Failed to clear offline data on sign out:", err);
    }
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{ session, user, loading, error, signInWithGithub, signOut, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
