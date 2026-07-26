"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  hours: number;
  minutes: number;
  onHoursChange: (value: number) => void;
  onMinutesChange: (value: number) => void;
  className?: string;
};

export function TimePicker({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  className,
}: TimePickerProps) {
  return (
    <div className={cn("flex items-center justify-between gap-1", className)}>
      <TimeField
        label="Hours"
        value={hours}
        min={0}
        max={24}
        step={1}
        wrapOnStep={false}
        onChange={onHoursChange}
      />
      <span className="mt-2 select-none self-start text-2xl font-light text-muted-foreground">
        :
      </span>
      <TimeField
        label="Minutes"
        value={minutes}
        min={0}
        max={59}
        step={5}
        wrapOnStep
        onChange={onMinutesChange}
      />
    </div>
  );
}

type TimeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  wrapOnStep: boolean;
  onChange: (value: number) => void;
};

function TimeField({
  label,
  value,
  min,
  max,
  step,
  wrapOnStep,
  onChange,
}: TimeFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const displayValue = draft ?? value.toString().padStart(2, "0");
  const range = max - min + 1;

  const wrap = (n: number) => ((((n - min) % range) + range) % range) + min;
  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const step_ = (dir: 1 | -1) => {
    const next = value + dir * step;
    onChange(wrapOnStep ? wrap(next) : clamp(next));
  };

  const commit = (raw: string) => {
    if (raw === "") {
      setDraft(null);
      return;
    }
    onChange(clamp(Number(raw)));
    setDraft(null);
  };

  return (
    <div className="flex flex-col items-center">
      <Button
        type="button"
        tabIndex={-1}
        aria-label={`Increase: ${label}`}
        disabled={!wrapOnStep && value >= max}
        className="rounded-[2px] bg-slate-100 w-full h-3 p-0 text-muted-foreground hover:bg-transparent"
        onClick={() => step_(1)}
      >
        <ChevronUp className="size-3.5" />
      </Button>

      <input
        value={displayValue}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
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
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            step_(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            step_(-1);
          }
        }}
        onWheel={(e) => {
          if (document.activeElement !== e.currentTarget) return;
          e.preventDefault();
          step_(e.deltaY < 0 ? 1 : -1);
        }}
        className={cn(
          "w-8 rounded-md bg-transparent text-center text-xl leading-none",
          "tabular-nums outline-none transition-colors",
          "hover:bg-muted focus:bg-muted",
        )}
      />

      <Button
        type="button"

        tabIndex={-1}
        aria-label={`Decrease: ${label}`}
        disabled={!wrapOnStep && value <= min}
        className="rounded-[2px] bg-slate-100 w-full h-3 p-0 text-muted-foreground hover:bg-transparent"
        onClick={() => step_(-1)}
      >
        <ChevronDown className="size-3.5" />
      </Button>
    </div>
  );
}
