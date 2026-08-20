import React from 'react';
import { WorkspaceView } from './routes/WorkspaceView';
import { LoginView } from './routes/LoginView';
import { useAuth } from './contexts/AuthContext';

export const App: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-cream-shell font-mono font-bold text-ink-primary">Loading Auth...</div>;
  }

  if (!session) {
    return <LoginView />;
  }

  return <WorkspaceView />;
};

export default App;
