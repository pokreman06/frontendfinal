import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from 'react-oidc-context';
import App from './App.tsx'

// Load OIDC config from environment variables with defaults
const oidcConfig = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY || "https://auth-dev.snowse.io/realms/DevRealm",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID || "nagent",
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI || "http://client.nagent.duckdns.org/",
  post_logout_redirect_uri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI || "http://client.nagent.duckdns.org/",
  response_type: import.meta.env.VITE_OIDC_RESPONSE_TYPE || "code",
  scope: import.meta.env.VITE_OIDC_SCOPE || "openid profile email",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <Toaster position="top-right" reverseOrder={false} />
      <App />
    </AuthProvider>
  </StrictMode>
)