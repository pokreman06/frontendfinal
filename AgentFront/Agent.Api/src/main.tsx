import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from 'react-oidc-context';
import App from './App.tsx'
import { ImagePreferencesProvider } from './contexts/image_preferences_context.tsx';
// Load OIDC config from environment variables with defaults
const keycloakAuthority = import.meta.env.VITE_OIDC_AUTHORITY || "https://auth-dev.snowse.io/realms/DevRealm";
const apiUrl = import.meta.env.VITE_API_URL || "https://api.nagent.duckdns.org";

const oidcConfig = {
  authority: keycloakAuthority,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID || "nagent",
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI || window.location.origin + "/",
  post_logout_redirect_uri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI || window.location.origin + "/",
  response_type: "code",
  scope: import.meta.env.VITE_OIDC_SCOPE || "openid profile email",
  // Use backend as token endpoint to avoid CORS issues
  metadata: {
    authorization_endpoint: `${keycloakAuthority}/protocol/openid-connect/auth`,
    token_endpoint: `${apiUrl}/api/auth/token`,
    end_session_endpoint: `${keycloakAuthority}/protocol/openid-connect/logout`,
    userinfo_endpoint: `${keycloakAuthority}/protocol/openid-connect/userinfo`,
    issuer: keycloakAuthority,
  },
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ImagePreferencesProvider>

      <AuthProvider {...oidcConfig}>
        <Toaster position="top-right" reverseOrder={false} />
        <App />
      </AuthProvider>
    </ImagePreferencesProvider>
  </StrictMode>
)