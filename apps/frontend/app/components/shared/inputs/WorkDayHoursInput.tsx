"use client";

import { forwardRef, ReactNode } from "react";

import { formatDuration } from "@/lib/utils/date";
import {
  MAX_WORK_DAY_HOURS,
  minutesPerWeekOf,
  WORK_DAY_STEP_HOURS,
} from "@/lib/forms/schemas/work-day.schema";

import Input from "@/components/ui/input";

import { NumberStepper } from "./NumberStepper";

/** The company's standard day, in the setup guide and in Settings. */
export const STANDARD_DAY_LABEL = "Standard working day";
export const STANDARD_DAY_NOTE = "For anyone without their own hours.";

type WorkDayHoursInputProps = {
  label: string;
  /** Hours, or NaN while the field is empty. */
  value: number;
  onChange: (hours: number) => void;
  onBlur?: () => void;
  name?: string;
  /** 1h for the company's standard day, 0h for a person (no fixed hours). */
  min: number;
  /** Said after the week's hours, or alone when there are none. */
  note?: ReactNode;
  error?: string;
  disabled?: boolean;
};

/**
 * Hours in a working day, the same field wherever they are set: the setup
 * guide, Settings and a person's form. The week they make is said under it.
 */
export const WorkDayHoursInput = forwardRef<
  HTMLInputElement,
  WorkDayHoursInputProps
>(
  (
    { label, value, onChange, onBlur, name, min, note, error, disabled },
    ref,
  ) => {
    const hasHours = Number.isFinite(value);
    const weekly =
      hasHours && value > 0
        ? `${formatDuration(minutesPerWeekOf(value))} a week`
        : null;

    const step = (direction: 1 | -1) => {
      const from = hasHours ? value : min;
      onChange(
        Math.min(
          MAX_WORK_DAY_HOURS,
          Math.max(min, from + direction * WORK_DAY_STEP_HOURS),
        ),
      );
    };

    return (
      <Input
        ref={ref}
        name={name}
        type="number"
        inputMode="decimal"
        min={min}
        max={MAX_WORK_DAY_HOURS}
        step={WORK_DAY_STEP_HOURS}
        value={hasHours ? value : ""}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        onBlur={onBlur}
        label={label}
        description={
          weekly && note ? (
            <>
              {weekly}. {note}
            </>
          ) : (
            (weekly ?? note)
          )
        }
        error={error}
        disabled={disabled}
        // The stepper stands in for the browser's own spin buttons.
        className="pr-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        endAdornment={
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-sm text-muted-foreground">
              h
            </span>
            <NumberStepper
              label={label}
              canIncrease={
                !disabled && (!hasHours || value < MAX_WORK_DAY_HOURS)
              }
              canDecrease={!disabled && hasHours && value > min}
              onStep={step}
            />
          </span>
        }
      />
    );
  },
);
WorkDayHoursInput.displayName = "WorkDayHoursInput";
