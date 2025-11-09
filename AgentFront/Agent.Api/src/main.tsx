import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from 'react-oidc-context';
import App from './App.tsx'

const oidcConfig = {
  authority: "https://auth-dev.snowse.io/realms/DevRealm",
  client_id: "nagent",
  redirect_uri: "http://client.nagent.duckdns.org/",  // Added trailing slash
  post_logout_redirect_uri: "http://client.nagent.duckdns.org/", // Added for logout
  response_type: "code",
  scope: "openid profile email", // Added scope
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