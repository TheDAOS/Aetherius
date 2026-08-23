import type React from "react";
import { useAuth } from "./contexts/AuthContext";
import { LoginView } from "./routes/LoginView";
import { WorkspaceView } from "./routes/WorkspaceView";

export const App: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-shell font-mono font-bold text-ink-primary">
        Loading Auth...
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return <WorkspaceView />;
};

export default App;
