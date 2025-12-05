import { useState } from "react";
import { usePost } from "../context/PostContext";

interface ToolCall {
  name: string;
  arguments?: any;
  result?: any;
}

interface ToolUsageDisplayProps {
  toolCalls?: ToolCall[];
}

export default function ToolUsageDisplay({ toolCalls: propToolCalls }: ToolUsageDisplayProps = {}) {
  const [hoveredTool, setHoveredTool] = useState<number | null>(null);
  const { postData } = usePost();

  // Use prop toolCalls if provided, otherwise use context
  const toolCalls = propToolCalls || postData?.toolCalls || [];

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        <svg
          className="w-4 h-4 mr-2 text-gray-500"
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
        Tools Used
      </h4>
      <div className="flex flex-wrap gap-2">
        {toolCalls.map((tool, idx) => (
          <div
            key={idx}
            className="relative"
            onMouseEnter={() => setHoveredTool(idx)}
            onMouseLeave={() => setHoveredTool(null)}
          >
            <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-200 transition-colors flex items-center space-x-1">
              <svg
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{tool.name}</span>
            </div>

            {/* Hover Tooltip */}
            {hoveredTool === idx && (
              <div className="absolute z-50 bottom-full left-0 mb-2 w-96 max-w-screen bg-white border border-gray-300 rounded-lg shadow-xl p-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      Tool Name
                    </div>
                    <div className="text-xs text-gray-900 font-mono bg-gray-50 p-2 rounded">
                      {tool.name}
                    </div>
                  </div>

                  {tool.arguments && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">
                        Arguments
                      </div>
                      <div className="text-xs text-gray-900 font-mono bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(tool.arguments, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {tool.result && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">
                        Result
                      </div>
                      <div className="text-xs text-gray-900 font-mono bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap break-words">
                          {typeof tool.result === "string"
                            ? tool.result
                            : JSON.stringify(tool.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Arrow pointer */}
                <div className="absolute top-full left-4 -mt-1">
                  <div className="w-3 h-3 bg-white border-r border-b border-gray-300 transform rotate-45"></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
