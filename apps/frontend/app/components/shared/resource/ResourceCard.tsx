import { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface ResourceCardProps {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
}

export const ResourceCard = ({
  icon,
  title,
  subtitle,
  actions,
  children,
  onClick,
}: ResourceCardProps) => (
  <Card
    as="article"
    className={cn(
      "relative",
      onClick &&
        "transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md",
    )}
  >
    <div className="flex items-start gap-4 p-5">
      {icon && (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          {icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-card-foreground">
          {onClick ? (
            <button
              type="button"
              onClick={onClick}
              className="block w-full cursor-pointer truncate text-left outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h2>

        {subtitle && <div className="mt-1 text-xs">{subtitle}</div>}
      </div>

      {actions && (
        <div className="relative flex shrink-0 items-center gap-1">
          {actions}
        </div>
      )}
    </div>

    {children && (
      <div className="border-t border-border px-5 py-4">{children}</div>
    )}
  </Card>
);
