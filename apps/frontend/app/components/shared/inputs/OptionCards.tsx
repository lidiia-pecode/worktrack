"use client";

import { cn } from "@/lib/utils/cn";

export interface OptionCard<T extends string> {
  value: T;
  label: string;
  /** One line on what choosing it means. */
  description: string;
}

interface OptionCardsProps<T extends string> {
  /** The radio group's name, unique on the page. */
  name: string;
  value: T;
  options: OptionCard<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

/** A choice between a few options, each saying what it means: radios drawn as cards. */
export const OptionCards = <T extends string>({
  name,
  value,
  options,
  onChange,
  disabled = false,
  className,
}: OptionCardsProps<T>) => (
  <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
    {options.map((option) => (
      <label
        key={option.value}
        className={cn(
          "flex cursor-pointer flex-col gap-0.5 rounded-lg border border-border bg-card px-3.5 py-2.5 transition-colors hover:bg-muted/20",
          "has-checked:border-brand has-checked:bg-brand-subtle",
          "has-focus-visible:ring-2 has-focus-visible:ring-ring/30",
          "has-disabled:cursor-not-allowed has-disabled:opacity-50",
        )}
      >
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          disabled={disabled}
          className="sr-only"
        />
        <span className="text-sm font-medium text-foreground">
          {option.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {option.description}
        </span>
      </label>
    ))}
  </div>
);
