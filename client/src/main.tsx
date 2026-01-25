import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/react";
import { useEffect } from "react";
import App from "./App";
import "./index.css";
import { configureWorkspaceTokenReader } from "./lib/workspace-query";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is required to start OpenAEO.");
}

function ClerkTokenBridge() {
  const { getToken, userId, sessionId, orgId } = useAuth();
  const authScope = `${userId ?? "signed-out"}:${sessionId ?? "no-session"}:${orgId ?? "personal"}`;

  useEffect(() => {
    configureWorkspaceTokenReader(getToken, authScope);
  }, [getToken, authScope]);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey} signInUrl="/" signUpUrl="/signup">
    <ClerkTokenBridge />
    <App />
  </ClerkProvider>,
);
