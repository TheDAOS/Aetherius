import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

import { AuthProvider } from "./contexts/AuthContext";
import { configurationError } from "./services/supabaseClient";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {configurationError ? (
        <main role="alert" className="p-8 font-mono">
          <h1>Aetherius setup required</h1>
          <p>{configurationError}</p>
        </main>
      ) : (
        <AuthProvider>
          <App />
        </AuthProvider>
      )}
    </React.StrictMode>,
  );
}
