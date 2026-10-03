import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface CardProps extends ComponentProps<"div"> {
  as?: "div" | "section" | "article";
  /** `raised` lifts the card off a background of nearly the same colour. */
  elevation?: "flat" | "raised";
}

export const Card = ({
  as: Element = "div",
  elevation = "flat",
  className,
  ...props
}: CardProps) => (
  <Element
    className={cn(
      "overflow-hidden rounded-2xl border border-border bg-card text-card-foreground",
      elevation === "raised" ? "shadow-raised" : "shadow-sm",
      className,
    )}
    {...props}
  />
);

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Shown at the end of the header, such as a count or progress. */
  action?: ReactNode;
  titleId?: string;
  className?: string;
}

export const CardHeader = ({
  title,
  description,
  icon: Icon,
  action,
  titleId,
  className,
}: CardHeaderProps) => (
  <div
    className={cn(
      "flex items-center gap-3 border-b border-border px-6 py-4",
      className,
    )}
  >
    {Icon && (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
        <Icon className="size-5" aria-hidden="true" />
      </div>
    )}

    <div className="min-w-0 flex-1">
      <h2 id={titleId} className="text-base font-semibold text-foreground">
        {title}
      </h2>

      {description && (
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      )}
    </div>

    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardBody = ({ className, ...props }: ComponentProps<"div">) => (
  <div className={cn("p-6", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn(
      "flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4",
      className,
    )}
    {...props}
  />
);
