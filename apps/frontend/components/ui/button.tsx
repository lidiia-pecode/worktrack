"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center",
    "rounded-lg border border-transparent",
    "text-sm font-semibold whitespace-nowrap",
    "transition-all duration-200",
    "outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "active:scale-[0.98] lg:cursor-pointer",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-brand text-brand-foreground",
          "shadow-lg shadow-glow-primary",
          "hover:bg-brand-hover",
        ],

        complete: [
          "bg-brand-secondary text-brand-foreground",
          "shadow-lg shadow-glow-secondary",
          "hover:bg-brand-secondary-hover",
        ],

        secondary: [
          "border border-border",
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80",
        ],

        outline: [
          "border border-border",
          "bg-transparent text-foreground",
          "hover:bg-accent hover:text-accent-foreground",
        ],

        ghost: [
          "bg-transparent text-muted-foreground",
          "hover:bg-muted hover:text-foreground",
        ],

        destructive: [
          "border border-destructive/20",
          "bg-destructive/10 text-destructive-text",
          "hover:bg-destructive/20",
        ],

        success: [
          "border border-success/20",
          "bg-success/10 text-success-text",
          "hover:bg-success/20",
        ],

        warning: [
          "border border-warning/20",
          "bg-warning/10 text-warning-text",
          "hover:bg-warning/20",
        ],

        gradient: [
          "bg-gradient-to-r from-brand to-brand-secondary",
          "text-brand-foreground",
          "shadow-lg shadow-glow-primary",
          "hover:from-brand-hover hover:to-brand-secondary-hover",
        ],

        link: ["h-auto bg-transparent p-0 text-primary", "hover:underline"],

        neutral: [
          "border border-neutral-300",
          "bg-neutral-100 text-neutral-800",
          "shadow-sm",
          "hover:border-neutral-400",
          "hover:bg-neutral-200",
          "hover:text-neutral-900",
        ],

        pastel: [
          "border border-brand/15",
          "bg-brand-subtle text-brand",
          "hover:bg-brand/15",
        ],
      },

      size: {
        xs: "h-7 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 gap-1.5 rounded-md px-3 text-sm",
        md: "h-10 gap-2 px-4",
        lg: "h-11 gap-2 px-5 text-base",
        xl: "h-12 gap-2.5 px-6 text-base",

        iconXs: "size-6 rounded-md",
        iconSm: "size-8 rounded-md",
        icon: "size-10",
        iconLg: "size-12 rounded-lg",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      )}

      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
