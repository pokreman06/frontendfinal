function DashboardPage() {
  const stats = [
    { label: "Total Users", value: "2,543", change: "+12%", positive: true },
    { label: "Active Sessions", value: "847", change: "+23%", positive: true },
    { label: "API Calls", value: "125K", change: "-5%", positive: false },
    { label: "Success Rate", value: "99.2%", change: "+0.3%", positive: true },
  ];

  const recentActivity = [
    { action: "User login", user: "john.doe@example.com", time: "2 min ago" },
    { action: "Profile updated", user: "jane.smith@example.com", time: "15 min ago" },
    { action: "Password changed", user: "bob.wilson@example.com", time: "1 hour ago" },
    { action: "New user registered", user: "alice.brown@example.com", time: "2 hours ago" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor your application metrics and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
          >
            <p className="text-sm font-medium text-gray-600 mb-1">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {stat.value}
            </p>
            <span
              className={`inline-flex items-center text-sm font-medium ${
                stat.positive ? "text-green-600" : "text-red-600"
              }`}
            >
              {stat.positive ? "↑" : "↓"} {stat.change}
            </span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0"
              >
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.user}</p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors group">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-5 h-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="font-medium text-gray-900">Add New User</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-5 h-5 text-purple-600"
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
                <span className="font-medium text-gray-900">Generate Report</span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-medium text-gray-900">System Settings</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;