"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type TimePickerProps = {
  hours: number;
  minutes: number;
  onHoursChange: (value: number) => void;
  onMinutesChange: (value: number) => void;
  className?: string;
  error?: boolean;
  minuteStep?: number;
  /** Names the pair where no visible label does, e.g. in a row of controls. */
  "aria-label"?: string;
};

const MAX_MINUTES = 24 * 60;

/**
 * Hours and minutes as one control the height of an input, so it sits beside
 * a select or a text field. Each field types, steps by arrow key, wheel or
 * its small chevrons, and the minutes carry into the hours.
 */
export const TimePicker = ({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  className,
  error,
  minuteStep = 5,
  "aria-label": ariaLabel,
}: TimePickerProps) => {
  const total = hours * 60 + minutes;

  // Steps move the whole duration, so minutes carry into the hours.
  const stepBy = (amount: number) => {
    const next = Math.max(0, Math.min(MAX_MINUTES, total + amount));
    onHoursChange(Math.floor(next / 60));
    onMinutesChange(next % 60);
  };

  const fieldProps = {
    canIncrease: total < MAX_MINUTES,
    canDecrease: total > 0,
  };

  return (
    <div
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-11 items-center rounded-lg border bg-input px-1.5 transition-colors",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        error
          ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
          : "border-input-placeholder/50",
        className,
      )}
    >
      <TimeField
        {...fieldProps}
        label="Hours"
        value={hours}
        max={24}
        onStep={(direction) => stepBy(direction * 60)}
        onChange={onHoursChange}
      />
      <span
        aria-hidden="true"
        className="px-0.5 pb-0.5 text-sm font-medium text-muted-foreground select-none"
      >
        :
      </span>
      <TimeField
        {...fieldProps}
        label="Minutes"
        value={minutes}
        max={59}
        onStep={(direction) => stepBy(direction * minuteStep)}
        onChange={onMinutesChange}
      />
    </div>
  );
};

const stepButtonClassName =
  "h-4 w-5 rounded-sm p-0 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30";

type TimeFieldProps = {
  label: string;
  value: number;
  max: number;
  canIncrease: boolean;
  canDecrease: boolean;
  onStep: (direction: 1 | -1) => void;
  onChange: (value: number) => void;
};

const TimeField = ({
  label,
  value,
  max,
  canIncrease,
  canDecrease,
  onStep,
  onChange,
}: TimeFieldProps) => {
  // What is typed, until the field commits it on blur.
  const [draft, setDraft] = useState<string | null>(null);

  const displayValue = draft ?? value.toString().padStart(2, "0");

  // Drops the draft, so the field shows the stepped value and commits that.
  const step = (direction: 1 | -1) => {
    setDraft(null);
    onStep(direction);
  };

  const commit = (raw: string) => {
    setDraft(null);
    if (raw !== "") onChange(Math.min(max, Number(raw)));
  };

  return (
    <div className="flex items-center">
      <input
        value={displayValue}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        inputMode="numeric"
        maxLength={2}
        onFocus={(e) => {
          setDraft(value.toString().padStart(2, "0"));
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(-2);
          setDraft(digits);
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp" && canIncrease) {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowDown" && canDecrease) {
            e.preventDefault();
            step(-1);
          }
        }}
        onWheel={(e) => {
          if (document.activeElement !== e.currentTarget) return;
          e.preventDefault();
          if (e.deltaY < 0 ? canIncrease : canDecrease) {
            step(e.deltaY < 0 ? 1 : -1);
          }
        }}
        className={cn(
          "w-7 rounded-md bg-transparent py-1 text-center text-sm leading-none font-semibold",
          "tabular-nums text-foreground outline-none transition-colors",
          "hover:bg-muted/40 focus:bg-brand-subtle focus:text-brand",
        )}
      />

      <div className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          tabIndex={-1}
          aria-label={`Increase: ${label}`}
          disabled={!canIncrease}
          className={stepButtonClassName}
          onClick={() => step(1)}
        >
          <ChevronUp className="size-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          tabIndex={-1}
          aria-label={`Decrease: ${label}`}
          disabled={!canDecrease}
          className={stepButtonClassName}
          onClick={() => step(-1)}
        >
          <ChevronDown className="size-3" />
        </Button>
      </div>
    </div>
  );
};
