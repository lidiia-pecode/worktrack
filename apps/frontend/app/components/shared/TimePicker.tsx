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
};

const MAX_MINUTES = 24 * 60;

export const TimePicker = ({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  className,
  error,
  minuteStep = 5,
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
      className={cn(
        "flex items-center justify-between gap-1 rounded-lg border p-2 transition-colors",
        error
          ? "border-destructive/40 bg-destructive/10 ring-1 ring-destructive/20"
          : "border-border bg-muted/20 ring-1 ring-border",
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
      <span className="select-none text-2xl font-light text-muted-foreground">
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
    <div className="flex flex-col items-center">
      <Button
        type="button"
        tabIndex={-1}
        aria-label={`Increase: ${label}`}
        disabled={!canIncrease}
        className="h-6 w-full rounded-sm bg-muted/40 p-0 text-muted-foreground hover:bg-transparent"
        onClick={() => step(1)}
      >
        <ChevronUp className="size-4" />
      </Button>

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
          "w-10 rounded-md bg-transparent py-1 text-center text-xl leading-none",
          "tabular-nums outline-none transition-colors",
          "hover:bg-muted/40 focus:bg-muted/40",
        )}
      />

      <Button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease: ${label}`}
        disabled={!canDecrease}
        className="h-6 w-full rounded-sm bg-muted/40 p-0 text-muted-foreground hover:bg-transparent"
        onClick={() => step(-1)}
      >
        <ChevronDown className="size-4" />
      </Button>
    </div>
  );
};
