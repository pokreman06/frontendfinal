import { useEffect, useState } from "react";
import { loadToolCalls, loadToolCallStats } from "../query/apiClient";
import type { ToolCall } from "../query/apiClient";

export default function ToolCallsPage() {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [toolNameFilter, setToolNameFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, [page, pageSize, toolNameFilter]);

  const loadData = async () => {
    setLoading(true);
    const response = await loadToolCalls(page, pageSize, toolNameFilter);
    setToolCalls(response.toolCalls);
    setTotal(response.total);
    setTotalPages(response.totalPages);
    
    const statsData = await loadToolCallStats();
    setStats(statsData);
    setLoading(false);
  };

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tool Calls</h1>
        <p className="text-gray-600">View all agentic tool executions and their results</p>
      </div>

      {/* Statistics */}
      {stats.length > 0 && (
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.toolName} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 font-medium">{stat.toolName}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stat.count}</div>
              {stat.avgDurationMs && (
                <div className="text-xs text-gray-500 mt-1">Avg: {Math.round(stat.avgDurationMs)}ms</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filter Section */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Filter by tool name..."
            value={toolNameFilter}
            onChange={(e) => {
              setToolNameFilter(e.target.value);
              setPage(1);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Tool Calls List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : toolCalls.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tool calls found
          </div>
        ) : (
          toolCalls.map((toolCall) => (
            <div key={toolCall.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <button
                onClick={() => toggleExpanded(toolCall.id)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      {toolCall.toolName}
                    </span>
                    <span className="text-sm text-gray-600 line-clamp-1">
                      {toolCall.query}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(toolCall.executedAt).toLocaleString()}
                    {toolCall.durationMs && ` • ${toolCall.durationMs}ms`}
                  </div>
                </div>
                <div className="ml-4">
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedIds.has(toolCall.id) ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>

              {expandedIds.has(toolCall.id) && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="space-y-3">
                    {toolCall.query && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Query</h4>
                        <p className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200 break-words">
                          {toolCall.query}
                        </p>
                      </div>
                    )}

                    {toolCall.arguments && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Arguments</h4>
                        <pre className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 overflow-auto max-h-48">
                          {JSON.stringify(toolCall.arguments, null, 2)}
                        </pre>
                      </div>
                    )}

                    {toolCall.result && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Result</h4>
                        <pre className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 overflow-auto max-h-48">
                          {typeof toolCall.result === "string"
                            ? toolCall.result
                            : JSON.stringify(toolCall.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} tool calls
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page - 2 + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 rounded-lg ${
                      page === pageNum
                        ? "bg-blue-500 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
