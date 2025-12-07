import type { ReactNode } from "react";

export interface MultiSelectItem {
  id: string | number;
  label: string;
  selected: boolean;
}

interface MultiSelectGridProps {
  items: MultiSelectItem[];
  onToggle: (id: string | number) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onClear?: () => void;
  title?: string;
  emptyMessage?: string | ReactNode;
  showLabel?: boolean;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export default function MultiSelectGrid({
  items,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClear,
  title = "Select Items",
  emptyMessage = "No items available",
  showLabel = true,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
}: MultiSelectGridProps) {
  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {title && (
          <h3 className="text-sm font-medium text-gray-700">
            {title} ({selectedCount}/{items.length} selected)
          </h3>
        )}
        <div className="flex space-x-2">
          {onSelectAll && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-indigo-600 hover:underline"
            >
              Select all
            </button>
          )}
          {onDeselectAll && (
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-xs text-gray-600 hover:underline"
            >
              Deselect all
            </button>
          )}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-red-600 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {emptyMessage}
        </div>
      ) : (
        <div className={`grid grid-cols-${columns.xs || 1} sm:grid-cols-${columns.sm || 2} md:grid-cols-${columns.md || 3} lg:grid-cols-${columns.lg || 4} gap-3`}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`flex items-center space-x-3 border p-3 rounded-lg transition-all ${
                item.selected
                  ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => onToggle(item.id)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                onClick={(e) => e.stopPropagation()}
              />
              {showLabel && (
                <div
                  className={`text-sm flex-1 text-left ${
                    item.selected ? "text-indigo-900 font-medium" : "text-gray-800"
                  }`}
                >
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
