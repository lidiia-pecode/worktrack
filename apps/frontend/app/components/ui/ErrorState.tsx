import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;

  description?: string;

  onRetry?: () => void;

  action?: ReactNode;

  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load the requested data. Please try again.",

  onRetry,

  action,

  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[420px] flex-col items-center justify-center px-6 text-center",
        className,
      )}
    >
      <div className="mb-6 rounded-full border border-destructive/20 bg-destructive/10 p-5">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <div className="mt-8 flex gap-3">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}

        {action}
      </div>
    </div>
  );
}
