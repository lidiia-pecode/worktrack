import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/** The week's plans, which Log my time and Team time show beside the time logged. */
export const PLANS_LOAD_ERROR =
  "Plans for this week couldn't load, so they aren't shown.";

type PartLoadErrorProps = {
  /** What is missing and what that means, e.g. "Plans couldn't load, so they aren't shown." */
  children: ReactNode;
  onRetry: () => void;
};

/**
 * A secondary part of a page that failed to load, said in one quiet line with
 * a way to try again, while the rest of the page stays usable. A page whose
 * main data fails shows `ErrorState` instead.
 */
export const PartLoadError = ({ children, onRetry }: PartLoadErrorProps) => (
  <div
    role="status"
    className="mt-3 flex items-center gap-2 rounded-lg border border-warning-border bg-warning-subtle py-1.5 pr-1.5 pl-3 text-sm text-warning-text"
  >
    <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
    <span className="min-w-0 flex-1">{children}</span>
    <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
      Try again
    </Button>
  </div>
);
