import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
  /** `compact` fits inside a dialog, list or section. */
  size?: "page" | "compact";
  className?: string;
};

export const ErrorState = ({
  title = "Something went wrong",
  description = "We couldn't load the requested data. Please try again.",
  onRetry,
  action,
  size = "page",
  className,
}: ErrorStateProps) => {
  const actions = (onRetry || action) && (
    <>
      {onRetry && (
        <Button
          type="button"
          variant={size === "compact" ? "outline" : "primary"}
          size={size === "compact" ? "sm" : "md"}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}

      {action}
    </>
  );

  if (size === "compact") {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-center gap-3 py-6 text-center text-sm",
          className,
        )}
      >
        <p className="font-medium text-foreground">{title}</p>

        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[420px] flex-col items-center justify-center px-6 text-center",
        className,
      )}
    >
      <div className="mb-6 rounded-full border border-destructive/20 bg-destructive/10 p-5">
        <AlertTriangle
          className="h-8 w-8 text-destructive-text"
          aria-hidden="true"
        />
      </div>

      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {actions && <div className="mt-8 flex gap-3">{actions}</div>}
    </div>
  );
};
