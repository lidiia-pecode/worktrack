"use client";

import { forwardRef, useId } from "react";

import { Field, fieldControlClassName, fieldMessageId } from "./field";
import { cn } from "@/lib/utils/cn";

type InputProps = {
  label?: string;
  error?: string;
  description?: React.ReactNode;
  endAdornment?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, description, id, className, endAdornment, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <Field id={inputId} label={label} description={description} error={error}>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={fieldMessageId(inputId, { error, description })}
            className={cn(
              fieldControlClassName(!!error),
              "h-11",
              endAdornment && "pr-11",
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
      </Field>
    );
  },
);

Input.displayName = "Input";

export default Input;
