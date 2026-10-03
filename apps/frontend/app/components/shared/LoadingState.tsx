import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type LoadingStateProps = {
  title?: string;
  description?: string;
  /** `compact` fits inside a dialog, list or section, and shows the title only. */
  size?: "page" | "compact";
  className?: string;
};

export const LoadingState = ({
  title = "Loading...",
  description = "Please wait while we fetch your data.",
  size = "page",
  className,
}: LoadingStateProps) => {
  if (size === "compact") {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {title}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "flex min-h-[420px] flex-col items-center justify-center px-6 text-center",
        className,
      )}
    >
      <Loader2
        className="mb-6 h-10 w-10 animate-spin text-primary"
        aria-hidden="true"
      />

      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
};
