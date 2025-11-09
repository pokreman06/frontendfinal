import { useAuth } from "react-oidc-context";
import { Link } from "react-router-dom";

function HomePage() {
  const auth = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome back, {auth.user?.profile.name}!
        </h1>
        <p className="text-xl text-gray-600">
          You're successfully authenticated with Keycloak
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Dashboard Card */}
        <Link
          to="/dashboard"
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-200 group"
        >
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
            <svg
              className="w-6 h-6 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Dashboard
          </h3>
          <p className="text-gray-600">
            View your analytics and insights
          </p>
        </Link>

        {/* Profile Card */}
        <Link
          to="/profile"
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-200 group"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile</h3>
          <p className="text-gray-600">
            Manage your account settings
          </p>
        </Link>

        {/* Security Card */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Secured
          </h3>
          <p className="text-gray-600">
            Protected by Keycloak authentication
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 border border-indigo-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Getting Started
        </h2>
        <div className="space-y-3 text-gray-700">
          <p className="flex items-start space-x-2">
            <span className="text-indigo-600 font-bold">1.</span>
            <span>Explore the dashboard to see your data and analytics</span>
          </p>
          <p className="flex items-start space-x-2">
            <span className="text-indigo-600 font-bold">2.</span>
            <span>Update your profile information in the Profile section</span>
          </p>
          <p className="flex items-start space-x-2">
            <span className="text-indigo-600 font-bold">3.</span>
            <span>Your session is secure and managed by Keycloak</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;