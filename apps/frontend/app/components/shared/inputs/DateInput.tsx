"use client";

import { forwardRef, useId } from "react";

import {
  Field,
  fieldControlClassName,
  fieldMessageId,
} from "@/components/ui/field";
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
      <Field
        id={inputId}
        label={label}
        description={description}
        error={error}
        className={className}
      >
        <input
          {...props}
          ref={ref}
          id={inputId}
          type="date"
          aria-invalid={!!error}
          aria-describedby={fieldMessageId(inputId, { error, description })}
          className={cn(fieldControlClassName(!!error), "h-11")}
        />
      </Field>
    );
  },
);
