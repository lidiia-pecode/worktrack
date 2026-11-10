import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type StatusTextProps = {
  children: ReactNode;
  /** A dot before the text, where the state stands on its own line. */
  dot?: boolean;
  /** The brand colour marks the state things are normally in, such as an open month. */
  tone?: "neutral" | "brand";
  className?: string;
};

/**
 * A state that is just a fact, such as Archived, Deactivated or Open: quiet
 * text. A pill (`Badge variant="warning"`) is kept for a state someone has to
 * act on, such as No team.
 */
export const StatusText = ({
  children,
  dot = false,
  tone = "neutral",
  className,
}: StatusTextProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 text-xs font-normal whitespace-nowrap",
      tone === "brand" ? "text-brand" : "text-muted-foreground",
      className,
    )}
  >
    {dot && (
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "brand" ? "bg-brand" : "bg-muted-foreground",
        )}
      />
    )}
    {children}
  </span>
);
