import { StrictMode, type JSX } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast';
import App from './App.tsx'
import { AuthProvider, useAuth } from "react-oidc-context";

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

  if (auth.isLoading) return <div>Loading...</div>;
  if (!auth.isAuthenticated) {
    
    auth.signinRedirect();
    return <div>Redirecting to login...</div>;
  }
  if (!auth.isAuthenticated) {
    return <div>Redirecting to login...</div>;
  }

  return children;
}