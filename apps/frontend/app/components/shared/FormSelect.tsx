"use client";

import { useId, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type FormSelectProps = {
  id?: string;
  label?: string;
  value?: string;
  options: Option[];
  placeholder?: string;
  error?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  onValueChange: (value: string) => void;
};

export function FormSelect({
  id,
  label,
  value,
  options,
  placeholder = "Select an option",
  error,
  description,
  disabled,
  className,
  triggerClassName,
  onValueChange,
}: FormSelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label,
    [options, value],
  );

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      <Select
        value={value ?? null}
        disabled={disabled}
        onValueChange={(newValue) => {
          if (newValue !== null) onValueChange(newValue);
        }}
      >
        <SelectTrigger
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            "h-11 w-full rounded-lg border-input-placeholder/50 bg-input px-3.5 text-sm text-input-foreground",
            "transition",
            "hover:bg-input/80",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
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

      {description && !error && (
        <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
      )}

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
