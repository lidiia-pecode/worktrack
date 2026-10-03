// src/components/ui/badge.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-subtle text-brand border border-brand/20",
        success: "bg-success/10 text-success-text border border-success/20",
        warning: "bg-warning/10 text-warning-text border border-warning/20",
        destructive:
          "bg-destructive/10 text-destructive-text border border-destructive/20",
        neutral: "bg-muted text-muted-foreground border border-border",
        // For a count that asks for attention, such as unread notifications.
        solid: "bg-brand text-brand-foreground border border-brand",
      },
      size: {
        md: "px-2.5 py-0.5 text-xs",
        // A count beside a label, such as a tab's.
        sm: "min-w-5 justify-center px-1.5 text-2xs tabular-nums",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({
  className,
  variant,
  size,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn("size-1.5 rounded-full", {
            "bg-brand": !variant || variant === "default",
            "bg-success": variant === "success",
            "bg-warning": variant === "warning",
            "bg-destructive": variant === "destructive",
            "bg-muted-foreground": variant === "neutral",
          })}
        />
      )}
      {children}
    </span>
  );
}
