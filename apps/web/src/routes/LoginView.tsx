import type React from "react";
import { useAuth } from "../contexts/AuthContext";

export const LoginView: React.FC = () => {
  const { signInWithGithub, loading, error } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream-shell p-4">
      <div className="p-8 border-4 border-ink-primary bg-paper-canvas shadow-neo-lg text-center max-w-sm w-full mx-4 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2 text-ink-primary">
            Aetherius
          </h1>
          <p className="text-sm font-mono text-ink-muted">
            Your Git-Backed Personal Vault
          </p>
        </div>

        {error && (
          <div className="p-3 bg-accent-pink/10 border-2 border-accent-pink text-accent-pink font-bold text-xs text-left">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={signInWithGithub}
          disabled={loading}
          className="neo-btn bg-accent-cobalt text-white w-full py-3 font-bold font-sans disabled:opacity-50 mt-4"
        >
          {loading ? "Loading..." : "Sign in with GitHub"}
        </button>
      </div>
    </div>
  );
};
