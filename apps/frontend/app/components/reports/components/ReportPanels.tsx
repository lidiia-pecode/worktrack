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
import { cn } from "@/lib/utils/cn";
import { formatReportHours } from "@/lib/utils/date";
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

// Each fact's mark, as the chart's legend and the week views draw it.
const PLANNED_MARK = "bg-report-planned";
const BILLABLE_MARK = "bg-stripes-billable";
const TIME_OFF_MARK = "border border-border bg-stripes-day-off";
// Needs attention's dot, as in the People table.
const NO_TIME_MARK = "rounded-full bg-warning";

type Fact = {
  label: string;
  value: string;
  /** The fact's colour, as a class on a small square before its label. */
  mark?: string;
};

/** What the panel adds to its row, in one line: never the row's own figures again. */
const Facts = ({ facts }: { facts: Fact[] }) => (
  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
    {facts.map((fact) => (
      <div key={fact.label}>
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          {fact.mark && (
            <span
              className={cn("size-2.5 shrink-0 rounded-sm", fact.mark)}
              aria-hidden
            />
          )}
          {fact.label}
        </dt>
        <dd className="font-medium tabular-nums">{fact.value}</dd>
      </div>
    ))}
  </dl>
);

/**
 * A list loaded for the panel under its heading, with its own loading and
 * error notes. An empty list is one line of text, without the heading.
 */
const PanelList = ({
  title,
  report,
  empty,
  children,
}: {
  /** The heading; none where the list sits in a titled card already. */
  title?: string;
  report: ReturnType<typeof useHoursReport>;
  empty: string;
  children: (rows: HoursReportRow[]) => ReactNode;
}) => {
  const rows = report.report?.rows ?? [];
  if (!report.isLoading && !report.isError && rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  const list = report.isLoading ? (
    <LoadingState size="compact" title="Loading…" />
  ) : report.isError ? (
    <ErrorState
      size="compact"
      title="We couldn't load this list"
      onRetry={() => void report.refetch()}
    />
  ) : (
    <ul className="@container">{children(rows)}</ul>
  );

  if (!title) return list;
  return (
    <section aria-label={title}>
      <h3 className="pb-2 text-sm font-semibold">{title}</h3>
      {list}
    </section>
  );
};

type PersonFactsProps = {
  person: PeopleReportRow;
  /** Adds how many expected days they logged nothing on, when there are any. */
  withDaysWithoutTime?: boolean;
};

/** Their plan, billable time, and days off, each a figure with no list behind it. */
export const PersonFacts = ({
  person,
  withDaysWithoutTime = false,
}: PersonFactsProps) => {
  const daysWithoutTime = person.daysWithoutTime.length;

  return (
    <Facts
      facts={[
        {
          label: "Planned",
          mark: PLANNED_MARK,
          value:
            person.plannedMinutes > 0
              ? formatReportHours(person.plannedMinutes)
              : "Not planned",
        },
        {
          label: "Billable",
          mark: BILLABLE_MARK,
          value: `${formatReportHours(person.billableMinutes)} · ${percentOf(person.billableMinutes, person.loggedMinutes)}%`,
        },
        ...(person.timeOffDays > 0
          ? [
              {
                label: "Time off",
                mark: TIME_OFF_MARK,
                value: countLabel(person.timeOffDays, "day", "days"),
              },
            ]
          : []),
        ...(withDaysWithoutTime && daysWithoutTime > 0
          ? [
              {
                label: "No time logged",
                mark: NO_TIME_MARK,
                value: countLabel(daysWithoutTime, "day", "days"),
              },
            ]
          : []),
      ]}
    />
  );
};

export const PersonProjects = ({
  person,
  range,
  title,
}: {
  person: PeopleReportRow;
  range: ReportRange;
  /** The list's heading, inside a panel. */
  title?: string;
}) => {
  const projects = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.PROJECT,
    userId: person.userId,
  });

  return (
    <PanelList
      title={title}
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

/** The person's whole period in one line: what it covers, and logged against expected. */
const PersonPeriod = ({
  person,
  periodLabel,
}: {
  person: PeopleReportRow;
  periodLabel: string;
}) => (
  <section
    aria-label={periodLabel}
    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
  >
    <Badge>{periodLabel}</Badge>
    <p className="text-sm text-muted-foreground tabular-nums">
      <span className="text-base font-semibold text-foreground">
        {formatReportHours(person.loggedMinutes)}
      </span>
      {person.expectedMinutes > 0 &&
        ` of ${formatReportHours(person.expectedMinutes)} expected`}
    </p>
  </section>
);

/**
 * The teams of their period in date order, each with its days and figures,
 * and the days outside the teams shown; under a team filter its team stands
 * out.
 */
const PersonTeams = ({
  parts,
  range,
  isFiltered,
}: {
  parts: PersonPart[];
  range: ReportRange;
  isFiltered: boolean;
}) => (
  <section aria-label="Teams">
    <h3 className="pb-2 text-sm font-semibold">Teams</h3>

    <ul className="flex flex-col gap-1.5">
      {parts.map((part) => (
        <li
          key={part.id}
          className={cn(
            "flex items-center justify-between gap-2.5 rounded-lg border px-2.5 py-2",
            isFiltered && part.isInReport
              ? "border-brand/25 bg-brand-subtle"
              : "border-border",
          )}
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">{part.name}</span>
            <span className="block text-xs text-muted-foreground">
              {[part.isArchived && "Archived", partDaysLabel(part, range)]
                .filter(Boolean)
                .join(" · ")}
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
  </section>
);

type PersonPanelProps = {
  /** Their row in the list, which a team filter narrows to the team's days. */
  person: PeopleReportRow;
  range: ReportRange;
  /** What the figures cover: "October 2026", "Nov 1 - Nov 7 so far". */
  periodLabel: string;
  /** Reports' team filter: its part is the one in the report. */
  teamId?: string;
  viewerId?: string;
  isUpdating: boolean;
  onClose: () => void;
};

/**
 * One person's whole period, under a team filter too: what it covers, their
 * plan, billable time and days, their teams, and their projects. Their days
 * themselves are in Team time.
 */
export const PersonPanel = ({
  person,
  range,
  periodLabel,
  teamId,
  viewerId,
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

    return (
      <>
        <PersonPeriod person={row} periodLabel={periodLabel} />

        <PersonFacts person={row} withDaysWithoutTime />

        {parts.length > 0 && (
          <PersonTeams
            parts={parts}
            range={range}
            isFiltered={Boolean(teamId)}
          />
        )}

        <PersonProjects person={row} range={range} title="Projects" />
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
            mark: BILLABLE_MARK,
            value: `${formatReportHours(project.billableMinutes)} · ${percentOf(project.billableMinutes, project.totalMinutes)}%`,
          },
        ]}
      />

      <PanelList
        title="People"
        report={people}
        empty="Nobody logged or planned time here."
      >
        {(rows) =>
          rows.map((row) => (
            <AgainstPlanRow key={row.id} row={row} detail={row.detail} />
          ))
        }
      </PanelList>
    </ReportPanel>
  );
};
