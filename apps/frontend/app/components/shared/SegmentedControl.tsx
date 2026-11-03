"use client";

import { cn } from "@/lib/utils/cn";

type SegmentedControlProps<T extends string> = {
  /** Names the group for screen readers. */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** A row of buttons choosing one of a few views, the chosen one pressed. */
export const SegmentedControl = <T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) => (
  <div
    role="group"
    aria-label={label}
    className={cn(
      "flex h-8 overflow-hidden rounded-lg border border-border",
      className,
    )}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          "border-l border-border px-3 text-sm transition first:border-l-0",
          "focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none focus-visible:ring-inset",
          value === option.value
            ? "bg-accent font-semibold text-accent-foreground"
            : "text-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
