"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = {
  label?: string;
  error?: string;
  description?: string;
  labelClassname?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      description,
      id,
      className,
      labelClassname,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium text-foreground",
              labelClassname,
            )}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : description
                ? `${inputId}-description`
                : undefined
          }
          className={cn(
            "w-full min-w-0 rounded-lg border px-3.5 py-2.5 text-sm outline-none",
            "bg-input text-input-foreground placeholder:text-input-placeholder",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
            "disabled:cursor-not-allowed disabled:opacity-50",

            error
              ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
              : "border-input-placeholder/50",

            className,
          )}
          {...props}
        />

        {description && !error && (
          <p
            id={`${inputId}-description`}
            className="text-xs text-muted-foreground"
          >
            {description}
          </p>
        )}

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
