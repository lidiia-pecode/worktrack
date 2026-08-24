import { ReactNode } from "react";
import { FieldError } from "react-hook-form";

interface ResourceFormFieldProps {
  id: string;
  label: string;
  error?: FieldError;
  hint?: string;
  children: ReactNode;
}

export function ResourceFormField({
  id,
  label,
  error,
  hint,
  children,
}: ResourceFormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>

      {children}

      {error?.message ? (
        <p className="text-xs text-destructive">{error.message}</p>
      ) : hint ? (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
