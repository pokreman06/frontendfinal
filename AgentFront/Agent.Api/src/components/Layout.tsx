import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";

function Layout() {
  const auth = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-indigo-600">
                Nagent
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Home
              </Link>
              <Link
                to="/dashboard"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/dashboard")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/profile")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Profile
              </Link>
              <Link
                to="/query-themes"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/query-themes")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Query Themes
              </Link>
              <Link
                to="/source-materials"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/source-materials")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Source Materials
              </Link>
              <Link
                to="/imagepreference"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/imagepreference")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Image Preferences
              </Link>
              <Link
                to="/facebook-post"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/facebook-post")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Facebook Post
              </Link>
              <Link
                to="/chat"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/chat")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                AI Chat
              </Link>
              <Link
                to="/tool-calls"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/tool-calls")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Tool Calls
              </Link>
              <Link
                to="/tool-settings"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive("/tool-settings")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Tool Settings
              </Link>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {auth.user?.profile.name || "User"}
                </p>
                <p className="text-xs text-gray-500">
                  {auth.user?.profile.email}
                </p>
              </div>
              <button
                onClick={() => auth.signoutRedirect()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;