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
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signInWithGithub: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "repo", // required for git operations
      },
    });
  };

  const signOut = async () => {
    // Clear user-scoped offline data to prevent cross-account data leaks
    try {
      await offlineDb.clearAll();
    } catch (err) {
      console.warn("Failed to clear offline data on sign out:", err);
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signInWithGithub, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
