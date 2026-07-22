import { ReactNode } from "react";
import clsx from "clsx";

type EntityListProps<T> = {
  items: readonly T[];

  renderItem: (item: T) => ReactNode;

  className?: string;

  gridClassName?: string;
};

export function EntityList<T>({
  items,
  renderItem,
  className,
  gridClassName,
}: EntityListProps<T>) {
  return (
    <div className={clsx("flex flex-col grow", className)}>
      <div
        className={clsx(
          "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          gridClassName,
        )}
      >
        {items.map(renderItem)}
      </div>
    </div>
  );
}
