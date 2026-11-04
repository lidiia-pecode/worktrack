"use client";

import { cn } from "@/lib/utils/cn";
import {
  FieldControlSize,
  fieldControlSizeClassName,
} from "@/components/ui/field";

type SegmentedControlProps<T extends string> = {
  /** Names the group for screen readers. */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** `sm` in a toolbar, `md` (the default) in a row of fields. */
  size?: FieldControlSize;
  className?: string;
};

/** A row of buttons choosing one of a few views, the chosen one pressed. */
export const SegmentedControl = <T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedControlProps<T>) => (
  <div
    role="group"
    aria-label={label}
    className={cn(
      "flex overflow-hidden border border-control-border",
      fieldControlSizeClassName[size],
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
          "border-l border-control-border px-3 text-xs transition first:border-l-0",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
          value === option.value
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-accent",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
