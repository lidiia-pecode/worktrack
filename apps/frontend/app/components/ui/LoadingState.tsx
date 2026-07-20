import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function LoadingState({
  title = "Loading...",
  description = "Please wait while we fetch your data.",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[420px] flex-col items-center justify-center px-6 text-center",
        className,
      )}
    >
      <Loader2 className="mb-6 h-10 w-10 animate-spin text-primary" />

      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
