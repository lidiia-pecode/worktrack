import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** The look every text-like control shares: inputs, selects and text areas. */
export const fieldControlClassName = (hasError?: boolean) =>
  cn(
    "w-full min-w-0 rounded-lg border border-input-placeholder/50 bg-input px-3.5 text-sm text-input-foreground outline-none transition",
    "placeholder:text-input-placeholder hover:bg-input/80",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
    "disabled:cursor-not-allowed disabled:opacity-50",
    hasError &&
      "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
  );

export const fieldLabelClassName =
  "mb-1.5 block text-sm font-medium text-foreground";

/** The id of the message under a field, for the control's `aria-describedby`. */
export const fieldMessageId = (
  id: string,
  { error, description }: { error?: string; description?: ReactNode },
) => {
  if (error) return `${id}-error`;
  if (description) return `${id}-description`;
  return undefined;
};

interface FieldProps {
  /** The control's id; the label points at it and the messages derive from it. */
  id: string;
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  /** For several controls answering one question: a fieldset with a legend. */
  group?: boolean;
  className?: string;
  children: ReactNode;
}

export const Field = ({
  id,
  label,
  description,
  error,
  group = false,
  className,
  children,
}: FieldProps) => {
  const Wrapper = group ? "fieldset" : "div";

  return (
    <Wrapper
      className={cn("w-full min-w-0", className)}
      aria-describedby={
        group ? fieldMessageId(id, { error, description }) : undefined
      }
    >
      {label &&
        (group ? (
          <legend className={fieldLabelClassName}>{label}</legend>
        ) : (
          <label
            id={`${id}-label`}
            htmlFor={id}
            className={fieldLabelClassName}
          >
            {label}
          </label>
        ))}

      {children}

      {description && !error && (
        <p
          id={`${id}-description`}
          className="mt-1.5 text-xs text-muted-foreground"
        >
          {description}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive-text">
          {error}
        </p>
      )}
    </Wrapper>
  );
};
