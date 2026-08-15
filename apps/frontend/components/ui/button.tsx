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
    "focus-visible:ring-2 focus-visible:ring-blue-500/50",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-blue-600 text-white",
          "shadow-lg shadow-blue-500/20",
          "hover:bg-blue-700",
          "focus-visible:ring-blue-500/50",
        ],

        secondary: [
          "bg-blue-50 text-blue-600",
          "border-blue-100",
          "hover:bg-blue-100 hover:border-blue-200",
          "dark:bg-blue-500/10 dark:text-blue-400",
          "dark:border-blue-500/20",
          "dark:hover:bg-blue-500/20",
        ],

        outline: [
          "border-slate-200 bg-white text-slate-700",
          "hover:bg-slate-50 hover:border-slate-300",
          "dark:border-white/10 dark:bg-white/[0.03]",
          "dark:text-slate-200",
          "dark:hover:bg-white/[0.06]",
        ],

        ghost: [
          "bg-transparent text-slate-500",
          "hover:bg-slate-100 hover:text-slate-900",
          "dark:text-slate-400",
          "dark:hover:bg-white/[0.06] dark:hover:text-white",
        ],

        destructive: [
          "bg-red-50 text-red-600",
          "border-red-100",
          "hover:bg-red-100",
          "dark:bg-red-500/10 dark:text-red-400",
          "dark:border-red-500/20",
        ],

        gradient: [
          "bg-gradient-to-r from-blue-600 to-indigo-500",
          "text-white",
          "shadow-lg shadow-blue-500/20",
          "hover:from-blue-700 hover:to-indigo-600",
        ],

        google: [
          "w-full",
          "bg-slate-700 text-white",
          "shadow-lg shadow-slate-900/10",
          "hover:bg-slate-600",
        ],

        link: [
          "h-auto bg-transparent p-0 text-blue-600",
          "hover:text-blue-700 hover:underline",
          "dark:text-blue-400 dark:hover:text-blue-300",
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
