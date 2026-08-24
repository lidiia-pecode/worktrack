"use client";

import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type SelectProps = {
  label?: string;
  error?: string;
  description?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, description, id, className, disabled, children, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${selectId}-error`
                : description
                  ? `${selectId}-description`
                  : undefined
            }
            className={cn(
              "w-full min-w-0 appearance-none rounded-lg border px-3.5 py-2.5 pr-9 text-sm outline-none",
              "bg-input text-input-foreground",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
              "disabled:cursor-not-allowed disabled:opacity-50",

              error
                ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                : "border-input-placeholder/50",

              className,
            )}
            {...props}
          >
            {children}
          </select>

          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>

        {description && !error && (
          <p
            id={`${selectId}-description`}
            className="text-xs text-muted-foreground"
          >
            {description}
          </p>
        )}

        {error && (
          <p id={`${selectId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
