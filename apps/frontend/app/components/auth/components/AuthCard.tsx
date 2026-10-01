import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

interface AuthCardProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export const AuthCard = ({
  title,
  description,
  children,
  footer,
}: AuthCardProps) => (
  <div className="w-full rounded-2xl border border-border/80 bg-card p-7 shadow-raised sm:p-8">
    {title && (
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    )}

    {children && <div className={cn(title && "mt-7")}>{children}</div>}

    {footer && (
      <div className="mt-5 text-center text-sm leading-6 text-muted-foreground">
        {footer}
      </div>
    )}
  </div>
);

export const AuthLink = ({
  className,
  ...props
}: ComponentProps<typeof Link>) => (
  <Link
    className={cn("font-medium text-brand hover:underline", className)}
    {...props}
  />
);
