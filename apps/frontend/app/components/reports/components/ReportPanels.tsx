"use client";

import { ReactNode, useId } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  HoursReportRow,
  PeopleReportRow,
  ReportQuery,
  ReportRange,
} from "@/types";
import { HoursReportGroupBy } from "@/types/enums";
import { useHoursReport } from "@/hooks/useHoursReport";
import { usePeopleReport } from "@/hooks/usePeopleReport";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { ABSENCE_TYPE_LABELS } from "@/lib/utils/absence";
import { cn } from "@/lib/utils/cn";
import { formatDayMonthLabel, formatReportHours } from "@/lib/utils/date";
import { listOf } from "@/lib/utils/report-attention";
import {
  againstExpected,
  partDaysLabel,
  PersonPart,
  personParts,
  percentOf,
} from "@/lib/utils/report-overview";
import { countLabel } from "@/lib/utils/text";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

import { CloseButton } from "../../shared/buttons/CloseButton";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { SidePanel } from "../../shared/SidePanel";
import { teamTimeHref } from "../../team/team-links";
import { AgainstPlanRow } from "./AgainstPlanRow";

const ReportPanel = ({
  focusKey,
  title,
  detail,
  isUpdating,
  onClose,
  children,
}: {
  focusKey: string;
  title: string;
  detail: string;
  /** The figures are still the previous period's while the new one loads. */
  isUpdating: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const titleId = useId();

  return (
    <SidePanel titleId={titleId} focusKey={focusKey} onClose={onClose}>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-sm font-semibold">
            {title}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <CloseButton aria-label="Close panel" onClick={onClose} />
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col gap-6 overflow-y-auto p-4",
          isUpdating && "opacity-60 transition-opacity",
        )}
        aria-busy={isUpdating}
      >
        {children}
      </div>
    </SidePanel>
  );
};

/** What the panel adds to its row, in one line: never the row's own figures again. */
const Facts = ({ facts }: { facts: { label: string; value: string }[] }) => (
  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
    {facts.map((fact) => (
      <div key={fact.label}>
        <dt className="text-muted-foreground">{fact.label}</dt>
        <dd className="font-medium tabular-nums">{fact.value}</dd>
      </div>
    ))}
  </dl>
);

const PanelSection = ({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) => (
  <section aria-label={title}>
    <div className="flex items-baseline justify-between gap-3 pb-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
    {children}
  </section>
);

/** A list loaded for the panel, with its own loading, error and empty notes. */
const PanelList = ({
  report,
  empty,
  children,
}: {
  report: ReturnType<typeof useHoursReport>;
  empty: string;
  children: (rows: HoursReportRow[]) => ReactNode;
}) => {
  if (report.isLoading) return <LoadingState size="compact" title="Loading…" />;
  if (report.isError) {
    return (
      <ErrorState
        size="compact"
        title="We couldn't load this list"
        onRetry={() => void report.refetch()}
      />
    );
  }
  if (!report.report?.rows.length) {
    return <p className="py-3 text-sm text-muted-foreground">{empty}</p>;
  }
  return <ul className="@container">{children(report.report.rows)}</ul>;
};

type PersonFactsProps = {
  person: PeopleReportRow;
  range: ReportRange;
  /** The last finished day; time off after it isn't counted yet. */
  countedUntil: string | null;
  /** Adds how many days off to their kinds, where no row above says it. */
  withDaysOff?: boolean;
};

/** What the person's row doesn't say: planned, billable and the kinds of time off. */
export const PersonFacts = ({
  person,
  range,
  countedUntil,
  withDaysOff = false,
}: PersonFactsProps) => {
  const absences = useAllAbsencesQuery({ ...range, userId: person.userId });
  const lastCountedDay = countedUntil ?? range.dateTo;
  // Only the kinds behind the counted days, so a vacation still to come isn't
  // named beside days off that don't include it.
  const absenceTypes = [
    ...new Set(
      absences.items
        .filter((absence) => absence.startDate <= lastCountedDay)
        .map((absence) => ABSENCE_TYPE_LABELS[absence.type]),
    ),
  ].join(", ");
  const timeOff = withDaysOff
    ? `${countLabel(person.timeOffDays, "day", "days")} · ${absenceTypes}`
    : absenceTypes;

  return (
    <Facts
      facts={[
        {
          label: "Planned",
          value:
            person.plannedMinutes > 0
              ? formatReportHours(person.plannedMinutes)
              : "Not planned",
        },
        {
          label: "Billable",
          value: `${formatReportHours(person.billableMinutes)} · ${percentOf(person.billableMinutes, person.loggedMinutes)}%`,
        },
        ...(person.timeOffDays > 0 && absenceTypes
          ? [{ label: "Time off", value: timeOff }]
          : []),
      ]}
    />
  );
};

export const PersonProjects = ({
  person,
  range,
}: {
  person: PeopleReportRow;
  range: ReportRange;
}) => {
  const projects = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.PROJECT,
    userId: person.userId,
  });

  return (
    <PanelList
      report={projects}
      empty="No time or plans on any project in this period."
    >
      {(rows) =>
        rows.map((row) => (
          <AgainstPlanRow
            key={row.id}
            row={row}
            detail={row.detail ?? "Internal work"}
          />
        ))
      }
    </PanelList>
  );
};

// A part outside the report, such as another team's days under a filter.
const OTHER_PART_FILL = "bg-muted-foreground/40";

/**
 * The person's whole period: logged against expected, a bar in parts by the
 * hours expected in each, and a row per part with its days and figures.
 */
const PeriodParts = ({
  person,
  parts,
  range,
  isFiltered,
}: {
  person: PeopleReportRow;
  parts: PersonPart[];
  range: ReportRange;
  isFiltered: boolean;
}) => (
  <>
    <p className="text-xl font-semibold tabular-nums">
      {formatReportHours(person.loggedMinutes)}
      {person.expectedMinutes > 0 && (
        <span className="text-sm font-normal text-muted-foreground">
          {" "}
          of {formatReportHours(person.expectedMinutes)} expected
        </span>
      )}
    </p>

    {parts.length > 1 && person.expectedMinutes > 0 && (
      <div
        className="mt-2.5 flex h-3 gap-0.5 overflow-hidden rounded-full"
        aria-hidden
      >
        {parts.map((part) => (
          <span
            key={part.id}
            className={part.isInReport ? "bg-report-logged" : OTHER_PART_FILL}
            style={{ flexGrow: part.figures.expectedMinutes }}
          />
        ))}
      </div>
    )}

    {(isFiltered || parts.length > 1) && (
      <ul className="mt-3 flex flex-col gap-1.5">
        {parts.map((part) => (
          <li
            key={part.id}
            className={cn(
              "grid grid-cols-[0.75rem_1fr_auto] items-center gap-2.5 rounded-lg border px-2.5 py-2",
              isFiltered && part.isInReport
                ? "border-brand/25 bg-brand-subtle"
                : "border-border",
            )}
          >
            <span
              className={cn(
                "size-3 rounded-sm",
                part.isInReport ? "bg-report-logged" : OTHER_PART_FILL,
              )}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                {part.name}
                {isFiltered && part.kind === "team" && (
                  <Badge
                    variant={part.isInReport ? "default" : "neutral"}
                    size="sm"
                  >
                    {part.isInReport ? "In this report" : "Other team"}
                  </Badge>
                )}
              </span>
              <span className="block text-xs text-muted-foreground">
                {partDaysLabel(part, range)}
              </span>
            </span>
            <span className="text-sm font-semibold whitespace-nowrap tabular-nums">
              {againstExpected(
                part.figures.loggedMinutes,
                part.figures.expectedMinutes,
              )}
            </span>
          </li>
        ))}
      </ul>
    )}
  </>
);

type PersonPanelProps = {
  /** Their row in the list, which a team filter narrows to the team's days. */
  person: PeopleReportRow;
  range: ReportRange;
  /** "October 2026", heading the whole period. */
  periodName: string;
  /** "Whole month", "Whole quarter": says the panel isn't narrowed by a filter. */
  wholePeriodNote: string;
  /** Reports' team filter: its part is the one in the report. */
  teamId?: string;
  viewerId?: string;
  countedUntil: string | null;
  isUpdating: boolean;
  onClose: () => void;
};

/**
 * One person's whole period, under a team filter too: their parts, what the
 * row doesn't say, the days they logged nothing and their projects. Their
 * days themselves are in Team time.
 */
export const PersonPanel = ({
  person,
  range,
  periodName,
  wholePeriodNote,
  teamId,
  viewerId,
  countedUntil,
  isUpdating,
  onClose,
}: PersonPanelProps) => {
  // Their row over every day the viewer sees of theirs, not just the filter's.
  const whole = usePeopleReport({ ...range, userId: person.userId });
  const row = whole.report?.rows[0];

  const renderBody = () => {
    if (whole.isLoading) {
      return <LoadingState size="compact" title="Loading their period…" />;
    }
    if (whole.isError || !row) {
      return (
        <ErrorState
          size="compact"
          title="We couldn't load their period"
          onRetry={() => void whole.refetch()}
        />
      );
    }

    const parts = personParts(row, { teamId, viewerId });
    const withoutTime = row.daysWithoutTime.length;
    const showsParts = Boolean(teamId) || parts.length > 1;

    return (
      <>
        {showsParts && (
          <PanelSection title={periodName} note={wholePeriodNote}>
            <PeriodParts
              person={row}
              parts={parts}
              range={range}
              isFiltered={Boolean(teamId)}
            />
          </PanelSection>
        )}

        <PersonFacts person={row} range={range} countedUntil={countedUntil} />

        {withoutTime > 0 ? (
          <p className="text-sm">
            {`${countLabel(withoutTime, "day", "days")} with no time logged: ${listOf(row.daysWithoutTime.map(formatDayMonthLabel))}`}
          </p>
        ) : (
          row.expectedMinutes > 0 && (
            <p className="text-sm">Time logged on every expected day</p>
          )
        )}

        <PanelSection
          title="Projects"
          note={`${wholePeriodNote} · logged against planned`}
        >
          <PersonProjects person={row} range={range} />
        </PanelSection>
      </>
    );
  };

  return (
    <ReportPanel
      focusKey={person.userId}
      title={person.name}
      detail={person.position ?? "No position"}
      isUpdating={isUpdating || whole.isPlaceholderData}
      onClose={onClose}
    >
      {renderBody()}

      <div className="mt-auto border-t border-border pt-4">
        <Link
          // The week of the first day with no time, when there is one.
          href={teamTimeHref(person.userId, row?.daysWithoutTime[0])}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Open in Team time
          <ArrowRight />
        </Link>
      </div>
    </ReportPanel>
  );
};

type ProjectPanelProps = {
  project: HoursReportRow;
  /** The period and, when one is chosen, the team, whose people it lists. */
  query: ReportQuery;
  isUpdating: boolean;
  onClose: () => void;
};

/** One project's period: its billable time and the people on it. */
export const ProjectPanel = ({
  project,
  query,
  isUpdating,
  onClose,
}: ProjectPanelProps) => {
  const people = useHoursReport({
    ...query,
    groupBy: HoursReportGroupBy.PERSON,
    projectId: project.id,
  });

  return (
    <ReportPanel
      focusKey={project.id}
      title={project.name}
      detail={project.detail ?? "Internal work"}
      isUpdating={isUpdating}
      onClose={onClose}
    >
      <Facts
        facts={[
          {
            label: "Billable",
            value: `${formatReportHours(project.billableMinutes)} · ${percentOf(project.billableMinutes, project.totalMinutes)}%`,
          },
        ]}
      />

      <PanelSection title="People" note="Logged against planned">
        <PanelList report={people} empty="Nobody logged or planned time here.">
          {(rows) =>
            rows.map((row) => (
              <AgainstPlanRow key={row.id} row={row} detail={row.detail} />
            ))
          }
        </PanelList>
      </PanelSection>
    </ReportPanel>
  );
};
