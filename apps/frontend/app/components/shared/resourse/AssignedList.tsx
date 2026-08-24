import { ReactNode } from "react";

interface AssignedListProps<T> {
  items: T[];
  getId: (item: T) => string;
  renderLeading: (item: T) => ReactNode;
  getPrimary: (item: T) => string;
  getSecondary?: (item: T) => string | null | undefined;
  renderTrailing?: (item: T) => ReactNode;
  emptyMessage?: string;
}

export function AssignedList<T>({
  items,
  getId,
  renderLeading,
  getPrimary,
  getSecondary,
  renderTrailing,
  emptyMessage = "Nothing assigned yet.",
}: AssignedListProps<T>) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={getId(item)} className="flex items-center gap-3 py-3">
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
}
