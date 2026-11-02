"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  fromISODate,
  MAX_REPORT_RANGE_DAYS,
  toISODate,
} from "@/lib/utils/date";
import {
  CalendarUnit,
  containsDate,
  lastShownDay,
  PeriodUnit,
  periodLabel,
  periodOf,
  ShownPeriod,
  stepPeriod,
  switchUnit,
} from "@/lib/utils/shown-period";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";

import { BackToNowButton } from "../../shared/buttons/BackToNowButton";
import { DateFieldTrigger, DateRangePicker } from "../../shared/inputs";
import { calendarTabStop, MonthCalendar } from "../../shared/MonthCalendar";
import { SegmentedControl } from "../../shared/SegmentedControl";

const UNITS: { value: PeriodUnit; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

/** Sized like Team time's week button, and taller on a phone like its arrows. */
const PERIOD_BUTTON_CLASS = "h-9 w-auto max-sm:h-10";

type PeriodPickerProps = {
  period: ShownPeriod;
  unit: CalendarUnit;
  today: string;
  firstDay?: string;
  onChange: (period: ShownPeriod) => void;
};

/** The calendar behind a month, quarter or year: a day picked shows its period. */
const CalendarPeriodPicker = ({
  period,
  unit,
  today,
  firstDay,
  onChange,
}: PeriodPickerProps) => {
  const [open, setOpen] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const marked = hoveredDay ? periodOf(unit, hoveredDay) : period;
  const openingDay = fromISODate(lastShownDay(period.range, today));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setHoveredDay(null);
      }}
    >
      <DateFieldTrigger
        label={periodLabel(period)}
        className={PERIOD_BUTTON_CLASS}
      />

      <PopoverContent
        className="w-76"
        initialFocus={() => calendarTabStop(calendarRef.current)}
      >
        <div ref={calendarRef}>
          <MonthCalendar
            initialMonth={openingDay}
            selection={{
              start: fromISODate(marked.range.dateFrom),
              end: fromISODate(marked.range.dateTo),
            }}
            selectionLabel={`in the ${unit}`}
            autoFocusDate={openingDay}
            minDate={firstDay ? fromISODate(firstDay) : undefined}
            maxDate={fromISODate(today)}
            onSelectDay={(day) => {
              onChange(periodOf(unit, toISODate(day)));
              setOpen(false);
            }}
            onHoverDay={(day) => setHoveredDay(day && toISODate(day))}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

type ReportPeriodControlProps = {
  period: ShownPeriod;
  /** The company's today; nothing after it can be chosen. */
  today: string;
  /** The company's first day; unknown until the company has loaded. */
  firstDay?: string;
  onChange: (period: ShownPeriod) => void;
};

/**
 * The period Reports shows: arrows that step by its unit, its name opening a
 * calendar, the Month / Quarter / Year / Custom switch, and a way back to the
 * current period.
 */
export const ReportPeriodControl = ({
  period,
  today,
  firstDay,
  onChange,
}: ReportPeriodControlProps) => {
  // Switching to Custom opens the range calendar, since choosing it is the next step.
  const [opensRangePicker, setOpensRangePicker] = useState(false);

  const calendarUnit = period.unit === "custom" ? null : period.unit;
  const unitName = calendarUnit ?? "period";
  const previous = stepPeriod(period, -1);
  const next = stepPeriod(period, 1);

  const changeUnit = (unit: PeriodUnit) => {
    setOpensRangePicker(unit === "custom");
    onChange(switchUnit(period, unit, today));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-lg border border-border">
          <Button
            variant="ghost"
            size="iconSm"
            className="w-9 rounded-none max-sm:size-10"
            aria-label={`Previous ${unitName}`}
            disabled={!!firstDay && previous.range.dateTo < firstDay}
            onClick={() => onChange(previous)}
          >
            <ChevronLeft size={16} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            className="w-9 rounded-none border-0 border-l border-border max-sm:size-10"
            aria-label={`Next ${unitName}`}
            disabled={next.range.dateFrom > today}
            onClick={() => onChange(next)}
          >
            <ChevronRight size={16} aria-hidden />
          </Button>
        </div>

        {calendarUnit ? (
          <CalendarPeriodPicker
            period={period}
            unit={calendarUnit}
            today={today}
            firstDay={firstDay}
            onChange={onChange}
          />
        ) : (
          <DateRangePicker
            startDate={period.range.dateFrom}
            endDate={period.range.dateTo}
            label={periodLabel(period)}
            minDate={firstDay}
            maxDate={today}
            maxDays={MAX_REPORT_RANGE_DAYS}
            defaultOpen={opensRangePicker}
            onChange={(dateFrom, dateTo) =>
              onChange({ unit: "custom", range: { dateFrom, dateTo } })
            }
            className={PERIOD_BUTTON_CLASS}
          />
        )}
      </div>

      <SegmentedControl
        label="Period"
        options={UNITS}
        value={period.unit}
        onChange={changeUnit}
        className="max-sm:order-last max-sm:grid max-sm:w-full max-sm:grid-flow-col max-sm:auto-cols-fr"
      />

      {calendarUnit && !containsDate(period.range, today) && (
        <BackToNowButton
          label={`Back to this ${calendarUnit}`}
          onClick={() => onChange(periodOf(calendarUnit, today))}
        />
      )}
    </div>
  );
};
