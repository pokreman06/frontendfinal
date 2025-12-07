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

      {/* Cards Grid - Main Features */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Chat & Agent Card */}
        <Link
          to="/chat"
          className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-blue-200 group"
        >
          <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-300 transition-colors">
            <svg
              className="w-6 h-6 text-blue-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Chat with AI Agent
          </h3>
          <p className="text-gray-700">
            Search the web, analyze content, and execute tools with our intelligent assistant
          </p>
        </Link>

        {/* Facebook Post Card */}
        <Link
          to="/facebook-post"
          className="bg-gradient-to-br from-blue-50 to-cyan-100 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-cyan-200 group"
        >
          <div className="w-12 h-12 bg-cyan-200 rounded-lg flex items-center justify-center mb-4 group-hover:bg-cyan-300 transition-colors">
            <svg
              className="w-6 h-6 text-cyan-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Create Facebook Posts
          </h3>
          <p className="text-gray-700">
            Generate, preview, and publish engaging posts with AI assistance and image support
          </p>
        </Link>
      </div>

      {/* Secondary Features Grid */}
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

        {/* Image Preferences Card */}
        <Link
          to="/image-preferences"
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-200 group"
        >
          <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pink-200 transition-colors">
            <svg
              className="w-6 h-6 text-pink-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Image Preferences
          </h3>
          <p className="text-gray-600">
            Manage themes, moods, and upload images
          </p>
        </Link>

        {/* Source Materials Card */}
        <Link
          to="/source-materials"
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-200 group"
        >
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Source Materials
          </h3>
          <p className="text-gray-600">
            Store and manage reference content
          </p>
        </Link>
      </div>

      {/* Content Management Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Image Preferences Details */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 border border-pink-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-pink-200 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-pink-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Image Management</h3>
          </div>
          <p className="text-gray-700 mb-3">
            Create and organize image generation preferences
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">•</span>
              <span>Define custom <strong>themes</strong> (cyberpunk, minimalist, etc.)</span>
            </li>
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">•</span>
              <span>Set image <strong>moods</strong> (energetic, serene, etc.)</span>
            </li>
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">•</span>
              <span>Upload and manage image files</span>
            </li>
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">•</span>
              <span>Auto-generate search queries from active preferences</span>
            </li>
          </ul>
          <Link
            to="/image-preferences"
            className="mt-4 inline-block px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
          >
            Go to Image Preferences
          </Link>
        </div>

        {/* Source Materials Details */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Content Library</h3>
          </div>
          <p className="text-gray-700 mb-3">
            Organize reference materials for smarter content creation
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-amber-600 mr-2">•</span>
              <span>Store URLs to webpages, articles, and resources</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2">•</span>
              <span>Support multiple content types (HTML, PDF, text)</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2">•</span>
              <span>Add descriptions and metadata</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2">•</span>
              <span>Use in post recommendations and AI context</span>
            </li>
          </ul>
          <Link
            to="/source-materials"
            className="mt-4 inline-block px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            Go to Source Materials
          </Link>
        </div>
      </div>

      {/* Workflow Info Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 border border-indigo-100 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Getting Started
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3 text-gray-700">
            <p className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">1.</span>
              <span>Set up <strong>Image Preferences</strong> with themes and moods for AI-generated images</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">2.</span>
              <span>Add <strong>Source Materials</strong> (articles, URLs, PDFs) as reference content</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">3.</span>
              <span>Chat with the AI Agent to search, analyze, and gather information</span>
            </p>
          </div>
          <div className="space-y-3 text-gray-700">
            <p className="flex items-start space-x-2">
              <span className="text-purple-600 font-bold">4.</span>
              <span>Create <strong>Facebook Posts</strong> with AI recommendations and images</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-purple-600 font-bold">5.</span>
              <span>Monitor metrics and posts in the <strong>Dashboard</strong></span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-purple-600 font-bold">6.</span>
              <span>Review tool usage in <strong>Tool Calls</strong> page for insights</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access Links */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/chat" className="text-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <div className="text-blue-600 font-semibold">💬 Chat</div>
          </Link>
          <Link to="/facebook-post" className="text-center p-3 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors">
            <div className="text-cyan-600 font-semibold">📱 Posts</div>
          </Link>
          <Link to="/image-preferences" className="text-center p-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors">
            <div className="text-pink-600 font-semibold">🎨 Images</div>
          </Link>
          <Link to="/source-materials" className="text-center p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
            <div className="text-amber-600 font-semibold">📚 Materials</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;