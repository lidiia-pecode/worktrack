"use client";

import { ReactNode, useId, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  fieldControlClassName,
  fieldMessageId,
} from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type FormSelectProps = {
  id?: string;
  label?: string;
  "aria-label"?: string;
  value?: string;
  options: Option[];
  placeholder?: string;
  error?: string;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  onValueChange: (value: string) => void;
};

export const FormSelect = ({
  id,
  label,
  "aria-label": ariaLabel,
  value,
  options,
  placeholder = "Select an option",
  error,
  description,
  disabled,
  className,
  triggerClassName,
  onValueChange,
}: FormSelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label,
    [options, value],
  );

  return (
    <Field
      id={selectId}
      label={label}
      description={description}
      error={error}
      className={className}
    >
      <Select
        value={value ?? null}
        disabled={disabled}
        onValueChange={(newValue) => {
          if (newValue !== null) onValueChange(newValue);
        }}
      >
        <SelectTrigger
          id={selectId}
          aria-label={ariaLabel}
          aria-invalid={!!error}
          aria-describedby={fieldMessageId(selectId, { error, description })}
          className={cn(
            fieldControlClassName(!!error),
            "h-11",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder}>
            {() => (
              <span
                className={cn(
                  "truncate",
                  !selectedLabel && "text-input-placeholder",
                )}
              >
                {selectedLabel ?? placeholder}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent
          alignItemWithTrigger={false}
          side="bottom"
          align="start"
          sideOffset={6}
          className="rounded-lg border border-border py-1 shadow-lg"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="rounded-md py-2 pr-9 pl-3 text-sm"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
};
