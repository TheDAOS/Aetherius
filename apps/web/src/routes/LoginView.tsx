import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginView: React.FC = () => {
  const { signInWithGithub, loading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream-shell">
      <div className="p-8 border-4 border-ink-primary bg-paper-canvas shadow-neo-lg text-center max-w-sm w-full mx-4">
        <h1 className="text-3xl font-bold font-serif mb-4 text-ink-primary">Aetherius</h1>
        <p className="text-sm font-mono text-ink-muted mb-8">Your Git-Backed Personal Vault</p>
        
        <button
          onClick={signInWithGithub}
          disabled={loading}
          className="neo-btn bg-accent-cobalt text-white w-full py-3 font-bold font-sans disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign in with GitHub'}
        </button>
      </div>
    </div>
  );
};
