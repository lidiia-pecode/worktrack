"use client";

import { forwardRef, useId } from "react";

import { cn } from "@/lib/utils/cn";

type DateInputProps = {
  id?: string;
  label?: string;
  error?: string;
  description?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(
    { id, label, error, description, className, ...props },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <input
          {...props}
          ref={ref}
          id={inputId}
          type="date"
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : description
                ? `${inputId}-description`
                : undefined
          }
          className={cn(
            "h-11 w-full rounded-lg border border-input-placeholder/50 bg-input px-3.5 text-sm text-input-foreground",
            "outline-none transition hover:bg-input/80",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          )}
        />

        {description && !error && (
          <p
            id={`${inputId}-description`}
            className="mt-1.5 text-xs text-muted-foreground"
          >
            {description}
          </p>
        )}

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
