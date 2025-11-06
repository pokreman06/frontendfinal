import { StrictMode, type JSX } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast';
import App from './App.tsx'
import { AuthProvider, useAuth } from "react-oidc-context";
import React from 'react';

const oidcConfig = {
  authority: "https://auth-dev.snowse.io/realms/DevRealm",
  client_id: "nagent",
  redirect_uri: "http://client.nagent.duckdns.org/",
  response_type: "code",
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {... oidcConfig}>
    
      <Toaster position="top-right" reverseOrder={false} />
      <RequireAuth>
        <App />
      </RequireAuth>
    </AuthProvider>

  </StrictMode>
)
function RequireAuth({ children }: { children: JSX.Element }) {
  const auth = useAuth();

  // Redirect once when unauthenticated
  React.useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      auth.signinRedirect().catch(err => console.error("Signin redirect error:", err));
    }
  }, [auth.isLoading, auth.isAuthenticated, auth]);

  if (auth.isLoading) return <div>Loading...</div>;
  if (!auth.isAuthenticated) return <div>Redirecting to login...</div>;

  return children;
}
