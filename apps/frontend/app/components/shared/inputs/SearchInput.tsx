"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import Input from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  autoFocus = false,
  className,
  "aria-label": ariaLabel,
}: SearchInputProps) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="
          pointer-events-none
          absolute left-3 top-1/2 z-10
          size-4 -translate-y-1/2
          text-muted-foreground
        "
      />

      <Input
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="pr-9 pl-9"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="
            absolute right-2.5 top-1/2
            -translate-y-1/2
            rounded-full p-0.5
            text-muted-foreground
            transition-colors
            hover:text-foreground
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
};
