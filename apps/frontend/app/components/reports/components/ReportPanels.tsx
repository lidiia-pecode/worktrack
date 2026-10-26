"use client";

import { ReactNode, useId } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HoursReportRow, PeopleReportRow, ReportRange } from "@/types";
import { HoursReportGroupBy } from "@/types/enums";
import { useHoursReport } from "@/hooks/useHoursReport";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { ABSENCE_TYPE_LABELS } from "@/lib/utils/absence";
import { cn } from "@/lib/utils/cn";
import { formatReportHours } from "@/lib/utils/date";
import { percentOf } from "@/lib/utils/report-overview";
import { countLabel } from "@/lib/utils/text";

import { buttonVariants } from "@/components/ui/button";

import { CloseButton } from "../../shared/buttons/CloseButton";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { SidePanel } from "../../shared/SidePanel";
import { PERSON_PARAM } from "../../team/useOpenedPerson";
import { AgainstPlanRow } from "./AgainstPlanRow";
import { PersonDayGrid } from "./PersonDayGrid";

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

/** Planned, billable and the kinds of time off: what the person's row doesn't say. */
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

/** A person's projects, logged against plan. */
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
      empty="No time or plans on any project this month."
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

type PersonPanelProps = {
  person: PeopleReportRow;
  range: ReportRange;
  countedUntil: string | null;
  isUpdating: boolean;
  onClose: () => void;
};

/** One person's month: what the row doesn't say, their days and their projects. */
export const PersonPanel = ({
  person,
  range,
  countedUntil,
  isUpdating,
  onClose,
}: PersonPanelProps) => {
  const withoutTime = person.daysWithoutTime.length;

  return (
    <ReportPanel
      focusKey={person.userId}
      title={person.name}
      detail={person.position ?? "No position"}
      isUpdating={isUpdating}
      onClose={onClose}
    >
      <PersonFacts person={person} range={range} countedUntil={countedUntil} />

      <PanelSection
        title="Day by day"
        note={
          withoutTime > 0
            ? `${countLabel(withoutTime, "day", "days")} with no time logged`
            : undefined
        }
      >
        <PersonDayGrid
          person={person}
          range={range}
          countedUntil={countedUntil}
        />
      </PanelSection>

      <PanelSection title="Projects" note="Logged against planned">
        <PersonProjects person={person} range={range} />
      </PanelSection>

      <div className="mt-auto border-t border-border pt-4">
        <Link
          href={`/team?${PERSON_PARAM}=${person.userId}`}
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
  range: ReportRange;
  isUpdating: boolean;
  onClose: () => void;
};

/** One project's month: its billable time and the people on it. */
export const ProjectPanel = ({
  project,
  range,
  isUpdating,
  onClose,
}: ProjectPanelProps) => {
  const people = useHoursReport({
    ...range,
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
