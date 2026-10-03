import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** `compact` fits inside a dialog, list or section, and shows the title only. */
  size?: "page" | "compact";
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  size = "page",
  className,
}: EmptyStateProps) => {
  if (size === "compact") {
    return (
      <p
        className={cn(
          "py-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {title}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[360px] flex-1 items-center justify-center",
        "rounded-2xl border border-dashed border-border",
        "bg-card/50 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center">
        {icon && (
          <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-subtle text-brand shadow-sm">
            <div className="[&>svg]:size-8">{icon}</div>
          </div>
        )}

        <h2 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}

        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
};
