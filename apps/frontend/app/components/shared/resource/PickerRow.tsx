"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface PickerRowProps {
  selected: boolean;
  label: string;
  subtitle?: string | null;
  avatarText?: string;
  /** Listed so the subtitle can say why, but not choosable. */
  disabled?: boolean;
  onToggle: () => void;
}

export const PickerRow = ({
  selected,
  label,
  subtitle,
  avatarText,
  disabled = false,
  onToggle,
}: PickerRowProps) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected && "bg-brand-subtle text-brand",
        !selected && "text-foreground",
        !selected &&
          !disabled &&
          "hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          "bg-gradient-to-br from-brand to-brand-secondary text-brand-foreground",
        )}
      >
        {selected ? <Check className="size-3.5" /> : avatarText}
      </span>

      <span className="flex min-w-0 flex-col items-start">
        <span className="truncate font-medium">{label}</span>

        {subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
};
