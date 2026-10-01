"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = {
  label?: string;
  error?: string;
  description?: string;
  endAdornment?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      description,
      id,
      className,
      endAdornment,
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
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative">
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
              endAdornment && "pr-11",

              error
                ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                : "border-input-placeholder/50",

              className,
            )}
            {...props}
          />

          {endAdornment && (
            <div className="absolute inset-y-0 right-1.5 flex items-center">
              {endAdornment}
            </div>
          )}
        </div>

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
            className="mt-1.5 text-xs text-destructive-text"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
