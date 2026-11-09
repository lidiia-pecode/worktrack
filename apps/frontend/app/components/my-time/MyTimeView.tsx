"use client";

import { ReactNode, useId } from "react";
import { CalendarCheck } from "lucide-react";

import { PeopleReportRow, ReportRange } from "@/types";
import { usePeopleReport } from "@/hooks/usePeopleReport";
import { useShownMonth } from "@/hooks/useShownMonth";
import { cn } from "@/lib/utils/cn";
import {
  formatMonthLabel,
  formatReportHours,
  getMonthRange,
} from "@/lib/utils/date";
import { hoursAgainst, reportScope } from "@/lib/utils/report-overview";
import { countLabel } from "@/lib/utils/text";

import { Card } from "@/components/ui/card";

import { EmptyState } from "../shared/EmptyState";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { BackToNowButton } from "../shared/buttons/BackToNowButton";
import { ReportBar } from "../reports/components/ReportBar";
import { ReportMonthStepper } from "../reports/components/ReportMonthStepper";
import { PersonDayGrid } from "../reports/components/PersonDayGrid";
import {
  PersonFacts,
  PersonProjects,
} from "../reports/components/ReportPanels";

const weekOnTimesheet = (date: string) => `/timesheet?week=${date}`;

const MonthCard = ({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) => {
  const titleId = useId();

  return (
    <Card as="section" aria-labelledby={titleId} className="p-6">
      <h2 id={titleId} className="text-base font-semibold">
        {title}
      </h2>
      {note && <p className="mt-0.5 text-sm text-muted-foreground">{note}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
};

/**
 * How far logged time is from what was expected, in words. A locked month can
 * no longer be filled, so its gap is only "less than expected".
 */
const balanceOf = (
  { loggedMinutes, expectedMinutes }: PeopleReportRow,
  isOpen: boolean,
) => {
  if (expectedMinutes === 0) return "Nothing expected this month";
  const gap = expectedMinutes - loggedMinutes;
  if (gap > 0) {
    return `${formatReportHours(gap)} ${isOpen ? "still to log" : "less than expected"}`;
  }
  if (gap < 0) return `${formatReportHours(-gap)} more than expected`;
  return "Everything expected is logged";
};

const MonthTotal = ({
  person,
  isOpen,
}: {
  person: PeopleReportRow;
  isOpen: boolean;
}) => (
  <>
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="tabular-nums">
        <span className="text-3xl font-semibold tracking-tight">
          {formatReportHours(person.loggedMinutes)}
        </span>
        {person.expectedMinutes > 0 && (
          <span className="ml-1.5 text-muted-foreground">
            of {formatReportHours(person.expectedMinutes)} expected
          </span>
        )}
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {balanceOf(person, isOpen)}
      </p>
    </div>
    <ReportBar
      value={person.loggedMinutes}
      reference={person.expectedMinutes}
      billable={person.billableMinutes}
      label={`${hoursAgainst(person.loggedMinutes, person.expectedMinutes)} expected`}
      className="mt-3 h-2.5"
    />
  </>
);

export const MyTimeView = ({ userId }: { userId: string }) => {
  const { month, currentMonth, firstMonth, showMonth } = useShownMonth();
  const range: ReportRange = getMonthRange(month);

  // Their own row only, as Reports' panel asks for it.
  const people = usePeopleReport({ ...range, userId });
  const isUpdating = people.isPlaceholderData;
  const report = isUpdating ? null : people.report;
  const isNothingCounted = Boolean(
    report?.countedUntil && report.countedUntil < range.dateFrom,
  );
  const ownRow = people.report?.rows.find((row) => row.userId === userId);

  const renderMonth = () => {
    if (people.isLoading) {
      return (
        <LoadingState
          title="Loading your month"
          description="Adding up your time for this month."
        />
      );
    }

    if (people.isError || !people.report) {
      return (
        <ErrorState
          title="We couldn't load your month"
          description="Your figures for this month are unavailable right now."
          onRetry={() => void people.refetch()}
        />
      );
    }

    if (isNothingCounted) {
      return (
        <EmptyState
          title="Nothing counted yet"
          description="Only finished days count, and none of this month has finished yet."
          icon={<CalendarCheck />}
        />
      );
    }

    // Without a row of their own, nothing was expected, logged or planned.
    if (!ownRow) {
      return (
        <EmptyState
          title={`Nothing expected or logged in ${formatMonthLabel(month)}`}
          description="No working hours, time or plans this month."
          icon={<CalendarCheck />}
        />
      );
    }

    const withoutTime = ownRow.daysWithoutTime.length;
    const isOpen = people.report.isProvisional;

    return (
      <div
        className={cn(
          "@container flex flex-col gap-4",
          isUpdating && "opacity-60 transition-opacity",
        )}
        aria-busy={isUpdating}
      >
        <Card as="section" aria-label="Your month" className="p-6">
          <MonthTotal person={ownRow} isOpen={isOpen} />
          <div className="mt-5 border-t border-border pt-4">
            <PersonFacts person={ownRow} />
          </div>
        </Card>

        <div className="grid items-start gap-4 @5xl:grid-cols-[3fr_2fr]">
          <MonthCard
            title="Day by day"
            note={
              withoutTime > 0
                ? `${countLabel(withoutTime, "day", "days")} with no time logged${isOpen ? " · each opens its week" : ""}`
                : "Every working day has time logged"
            }
          >
            <PersonDayGrid
              person={ownRow}
              range={range}
              countedUntil={people.report.countedUntil}
              dayWithoutTimeHref={isOpen ? weekOnTimesheet : undefined}
            />
          </MonthCard>

          <MonthCard title="Projects">
            <PersonProjects person={ownRow} range={range} />
          </MonthCard>
        </div>
      </div>
    );
  };

  return (
    // Fills the page, so an empty state stretches to the bottom as on Log my time.
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <ReportMonthStepper
            month={month}
            currentMonth={currentMonth}
            companyFirstMonth={firstMonth}
            onChange={showMonth}
          />
          <p className="min-h-5 text-sm text-muted-foreground">
            {report && !isNothingCounted && reportScope(report)}
          </p>
        </div>

        {month !== currentMonth && (
          <BackToNowButton
            label="Back to this month"
            onClick={() => showMonth(currentMonth)}
          />
        )}
      </div>

      {renderMonth()}
    </div>
  );
};
