import type { ReactNode } from "react";

export interface SelectionItem {
  id: string | number;
  label: string;
  thumbnail?: string; // Optional image URL for thumbnail
}

interface SelectionGridProps {
  items: SelectionItem[];
  selectedId?: string | number | null;
  onSelect: (id: string | number) => void;
  onDeselect?: () => void;
  showLabel?: boolean;
  title?: string;
  emptyMessage?: string | ReactNode;
  selectedMessage?: string | ReactNode;
  allowDeselect?: boolean;
  columns?: {
    xs?: number; // default: 3
    sm?: number; // default: 4
    md?: number; // default: 6
    lg?: number; // default: 8
  };
}

export default function SelectionGrid({
  items,
  selectedId,
  onSelect,
  onDeselect,
  showLabel = true,
  title = "Select an Item",
  emptyMessage = "No items available",
  selectedMessage = "Item selected.",
  allowDeselect = true,
  columns = { xs: 3, sm: 4, md: 6, lg: 8 },
}: SelectionGridProps) {
  const isSelected = (id: string | number) => selectedId === id;

  const gridColsClass = `grid grid-cols-${columns.xs || 3} sm:grid-cols-${columns.sm || 4} md:grid-cols-${columns.md || 6} lg:grid-cols-${columns.lg || 8} gap-3`;

  return (
    <div>
      {title && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {title}
        </label>
      )}

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {emptyMessage}
        </div>
      ) : (
        <div className={gridColsClass}>
          {allowDeselect && (
            <button
              type="button"
              onClick={() => onDeselect?.()}
              className={`relative h-20 rounded-lg border-2 flex items-center justify-center transition-all ${
                !selectedId
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
              title="Clear selection"
            >
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {!selectedId && (
                <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          )}

          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`relative h-20 rounded-lg border-2 overflow-hidden transition-all flex items-center justify-center ${
                isSelected(item.id)
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              title={item.label}
            >
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center px-2 py-1">
                  {showLabel && (
                    <div className="text-xs text-gray-700 font-medium truncate">
                      {item.label}
                    </div>
                  )}
                </div>
              )}

              {isSelected(item.id) && (
                <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-blue-600"
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
          <span className="text-sm text-blue-800">{selectedMessage}</span>
        </div>
      )}
    </div>
  );
}
