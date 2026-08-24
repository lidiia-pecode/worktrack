import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex min-h-[360px] flex-1",
        "items-center justify-center",
        "rounded-2xl border border-dashed border-border",
        "bg-card/50 px-6 py-16 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex max-w-md flex-col items-center">
        {icon && (
          <div
            className="
              flex size-16
              items-center justify-center
              rounded-2xl
              bg-brand-subtle
              text-brand
              shadow-sm
            "
          >
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
}
