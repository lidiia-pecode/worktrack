import { ReactNode } from "react";

import { EmptyState } from "../EmptyState";
import { LoadingState } from "../LoadingState";

interface AssignedListProps<T> {
  items: T[];
  getId: (item: T) => string;
  renderLeading: (item: T) => ReactNode;
  getPrimary: (item: T) => string;
  getSecondary?: (item: T) => string | null | undefined;
  renderTrailing?: (item: T) => ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
}

export const AssignedList = <T,>({
  items,
  getId,
  renderLeading,
  getPrimary,
  getSecondary,
  renderTrailing,
  emptyMessage = "Nothing assigned yet.",
  isLoading = false,
  loadingMessage = "Loading...",
}: AssignedListProps<T>) => {
  if (isLoading) {
    return <LoadingState size="compact" title={loadingMessage} />;
  }

  if (items.length === 0) {
    return <EmptyState size="compact" title={emptyMessage} />;
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={getId(item)} className="flex items-center gap-3 p-3">
          {renderLeading(item)}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {getPrimary(item)}
            </p>

            {getSecondary?.(item) && (
              <p className="truncate text-xs text-muted-foreground">
                {getSecondary(item)}
              </p>
            )}
          </div>

          {renderTrailing && (
            <div className="flex shrink-0 items-center gap-2">
              {renderTrailing(item)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};
