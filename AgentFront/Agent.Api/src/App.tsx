import { useAuth } from "react-oidc-context";

export default function App() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Error: {auth.error.message}</div>;
  }

  if (!auth.isAuthenticated) {
    return <button onClick={() => auth.signinRedirect()}>Log in</button>;
  }

  return (
    <div>
      <h1>Welcome {auth.user?.profile.name}</h1>
      <button onClick={() => auth.signoutRedirect()}>Log out</button>
      {/* Your app content */}
    </div>
  );
}
