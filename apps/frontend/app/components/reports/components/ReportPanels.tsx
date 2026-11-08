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
          value:
            person.plannedMinutes > 0
              ? formatReportHours(person.plannedMinutes)
              : "Not planned",
        },
        {
          label: "Billable",
          value: `${formatReportHours(person.billableMinutes)} · ${percentOf(person.billableMinutes, person.loggedMinutes)}%`,
        },
        ...(person.timeOffDays > 0
          ? [
              {
                label: "Time off",
                value: countLabel(person.timeOffDays, "day", "days"),
              },
            ]
          : []),
        ...(withDaysWithoutTime && daysWithoutTime > 0
          ? [
              {
                label: "No time logged",
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

// A part outside the report, such as another team's days under a filter.
const OTHER_PART_FILL = "bg-muted-foreground/40";

/**
 * The person's whole period: what it covers, logged against expected, and
 * with more than one part or a team filter, a bar in parts by the hours
 * expected in each and a row per part with its days and figures.
 */
const PersonPeriod = ({
  person,
  parts,
  range,
  periodLabel,
  isFiltered,
}: {
  person: PeopleReportRow;
  parts: PersonPart[];
  range: ReportRange;
  periodLabel: string;
  isFiltered: boolean;
}) => (
  <section aria-label={periodLabel}>
    <Badge className="mb-2">{periodLabel}</Badge>
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
 * parts, their plan, billable time and days, and their projects. Their days
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
        <PersonPeriod
          person={row}
          parts={parts}
          range={range}
          periodLabel={periodLabel}
          isFiltered={Boolean(teamId)}
        />

        <PersonFacts person={row} withDaysWithoutTime />

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
