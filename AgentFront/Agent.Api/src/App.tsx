import { useAuth } from "react-oidc-context";

export default function App() {
  const auth = useAuth();
  // const email = auth.user?.profile.email
  // const ADMIN_EMAIL = "nathan.howell@students.snow.edu";

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }
  return (
    <>
    <div>It works</div>
    </>
  )
}

