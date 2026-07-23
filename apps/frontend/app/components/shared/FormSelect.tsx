"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type FormSelectProps = {
  value?: string;
  options: Option[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  onValueChange: (value: string) => void;
};

export function FormSelect({
  value,
  options,
  placeholder = "Select an option",
  error,
  disabled,
  className,
  triggerClassName,
  onValueChange,
}: FormSelectProps) {
  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label,
    [options, value],
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Select
        value={value ?? null}
        disabled={disabled}
        onValueChange={(newValue) => {
          if (newValue !== null) onValueChange(newValue);
        }}
      >
        <SelectTrigger
          aria-invalid={!!error}
          size="default"
          className={cn(
            "h-11 w-full rounded-md border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm",
            "transition-all duration-200",
            "hover:border-zinc-300 hover:bg-zinc-50/60",
            "focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/10",
            "disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400",
            "[&_svg]:transition-transform [&_svg]:duration-200",
            "aria-expanded:border-blue-300 aria-expanded:ring-3 aria-expanded:ring-blue-400/10 aria-expanded:[&_svg]:rotate-180",
            error &&
              "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/10",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder}>
            {() => (
              <span
                className={cn("truncate", !selectedLabel && "text-zinc-400")}
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
          className="rounded-xl border border-zinc-100 p-1.5 shadow-lg shadow-zinc-950/5"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="rounded-lg py-2 pr-8 pl-3 text-sm"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </div>
  );
}
