import { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;

  description?: string;

  icon?: ReactNode;

  action?: ReactNode;

  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[420px] flex-col items-center justify-center px-6 text-center",
        className,
      )}
    >
      <div className="mb-6 rounded-full border bg-muted p-5">
        {icon ?? <Inbox className="h-8 w-8 text-muted-foreground" />}
      </div>

      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
