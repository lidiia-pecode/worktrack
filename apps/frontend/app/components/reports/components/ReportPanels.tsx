"use client";

import { ReactNode, useId, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Absence, HoursReportRow, PeopleReportRow } from "@/types";
import { HoursReportGroupBy } from "@/types/enums";
import { useHoursReport } from "@/hooks/useHoursReport";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_SHORT_LABELS,
} from "@/lib/utils/absence";
import { cn } from "@/lib/utils/cn";
import {
  formatDuration,
  formatSignedDuration,
  formatWeekdayLabel,
  fromISODate,
} from "@/lib/utils/date";
import { DateRange } from "@/lib/utils/report-period";
import {
  DAY_GRID_MAX_DAYS,
  describeAgainstPlan,
  HourScale,
  hourScaleOf,
  NARROW_TICK_INTERVALS,
  percentOf,
  personDays,
  ReportDay,
} from "@/lib/utils/report-overview";

import { buttonVariants } from "@/components/ui/button";

import { CloseButton } from "../../shared/buttons/CloseButton";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { SidePanel } from "../../shared/SidePanel";
import { PERSON_PARAM } from "../../team/useOpenedPerson";
import { BarLegend, HourBar } from "./HourBar";
import { ReportAxisRow, ReportRow } from "./ReportRow";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysIn = ({ dateFrom, dateTo }: DateRange) =>
  Math.round(
    (fromISODate(dateTo).getTime() - fromISODate(dateFrom).getTime()) /
      MS_PER_DAY,
  ) + 1;

const ReportPanel = ({
  focusKey,
  title,
  detail,
  onClose,
  children,
}: {
  focusKey: string;
  title: string;
  detail: string;
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
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        {children}
      </div>
    </SidePanel>
  );
};

const Figures = ({
  figures,
}: {
  figures: { label: string; value: string; detail: string }[];
}) => (
  <dl className="grid grid-cols-2 gap-2">
    {figures.map((figure) => (
      <div
        key={figure.label}
        className="rounded-xl border border-border bg-card px-3.5 py-3"
      >
        <dt className="text-xs font-medium text-muted-foreground">
          {figure.label}
        </dt>
        <dd className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
          {figure.value}
        </dd>
        <dd className="text-xs text-muted-foreground">{figure.detail}</dd>
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

/** Logged time against a plan, on the list's scale; no plan draws no ring. */
const AgainstPlanRow = ({
  name,
  detail,
  row,
  scale,
}: {
  name: string;
  detail?: string | null;
  row: HoursReportRow;
  scale: HourScale;
}) => {
  const logged = formatDuration(row.totalMinutes);
  const againstPlan = describeAgainstPlan(row);

  return (
    <ReportRow
      name={name}
      detail={detail}
      bar={
        <HourBar
          scale={scale}
          logged={row.totalMinutes}
          planned={row.plannedMinutes}
          label={`${name}: ${logged} logged, ${againstPlan.replace(" · ", ", ")}`}
        />
      }
      figure={
        <>
          {logged}{" "}
          <span className="font-normal text-muted-foreground">logged</span>
        </>
      }
      subFigure={againstPlan}
    />
  );
};

/** A list loaded for the panel, with its own loading, error and empty notes. */
const PanelList = ({
  report,
  empty,
  children,
}: {
  report: ReturnType<typeof useHoursReport>;
  empty: string;
  children: (rows: HoursReportRow[], scale: HourScale) => ReactNode;
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
  const { rows } = report.report;
  const scale = hourScaleOf(rows, NARROW_TICK_INTERVALS);

  return (
    <div className="@container">
      <BarLegend showExpected={false} past="Logged past the plan" />
      <div className="mt-3">
        <ReportAxisRow scale={scale} />
        <ul>{children(rows, scale)}</ul>
      </div>
    </div>
  );
};

const DAY_STYLES: Record<ReportDay["kind"], string> = {
  logged: "border-brand/25 bg-brand-subtle",
  off: "border-border bg-stripes-brand",
  withoutTime: "border-dashed border-muted-foreground/50 bg-card",
  today: "border-border bg-card",
  nothingExpected: "border-border bg-card",
};

const DAY_LEGEND: { kind: ReportDay["kind"]; label: string }[] = [
  { kind: "logged", label: "Logged" },
  { kind: "off", label: "Day off" },
  { kind: "withoutTime", label: "No time logged" },
];

const absenceOn = (absences: Absence[], date: string) =>
  absences.find(
    (absence) => absence.startDate <= date && absence.endDate >= date,
  );

const DayGrid = ({
  person,
  absences,
  range,
  countedUntil,
}: {
  person: PeopleReportRow;
  absences: ReturnType<typeof useAllAbsencesQuery>;
  range: DateRange;
  countedUntil: string | null;
}) => {
  const summary = useTeamTimeSummary(range);

  const days = useMemo(() => {
    const row = summary.rows.find((entry) => entry.user.id === person.userId);

    return personDays({
      ...range,
      countedUntil,
      loggedByDate: new Map(
        (row?.days ?? []).map((day) => [day.date, day.minutes]),
      ),
      isOff: (date) => Boolean(absenceOn(absences.items, date)),
      daysWithoutTime: new Set(person.daysWithoutTime),
    });
  }, [summary.rows, absences.items, person, range, countedUntil]);

  // Days off come from the absences, so the grid waits for both.
  if (summary.isLoading || absences.isLoading) {
    return <LoadingState size="compact" title="Loading the days…" />;
  }
  if (summary.isError || absences.isError) {
    return (
      <ErrorState
        size="compact"
        title="We couldn't load the days"
        onRetry={() => {
          if (summary.isError) void summary.refetch();
          if (absences.isError) void absences.refetch();
        }}
      />
    );
  }

  const offLabel = (date: string) => {
    const absence = absenceOn(absences.items, date);
    return absence ? ABSENCE_TYPE_SHORT_LABELS[absence.type] : "Off";
  };

  return (
    <>
      <ul aria-label="Days" className="grid grid-cols-5 gap-1.5">
        {days.map((day) => (
          <li
            key={day.date}
            className={cn(
              "flex flex-col gap-0.5 rounded-lg border px-2 py-1.5",
              DAY_STYLES[day.kind],
            )}
          >
            <span className="text-2xs text-muted-foreground">
              {formatWeekdayLabel(fromISODate(day.date))}{" "}
              {fromISODate(day.date).getDate()}
            </span>
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                day.kind !== "logged" && "text-muted-foreground",
              )}
            >
              {day.kind === "logged"
                ? formatDuration(day.minutes)
                : day.kind === "off"
                  ? offLabel(day.date)
                  : day.kind === "withoutTime"
                    ? "No time"
                    : day.kind === "today"
                      ? "Today"
                      : "—"}
            </span>
          </li>
        ))}
      </ul>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {DAY_LEGEND.map(({ kind, label }) => (
          <li key={kind} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-3 rounded-sm border", DAY_STYLES[kind])}
              aria-hidden
            />
            {label}
          </li>
        ))}
      </ul>
    </>
  );
};

type PersonPanelProps = {
  person: PeopleReportRow;
  range: DateRange;
  countedUntil: string | null;
  onClose: () => void;
};

/** One person's period: figures, days and projects. */
export const PersonPanel = ({
  person,
  range,
  countedUntil,
  onClose,
}: PersonPanelProps) => {
  const projects = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.PROJECT,
    userId: person.userId,
  });
  const absences = useAllAbsencesQuery({ ...range, userId: person.userId });
  const absenceTypes = [
    ...new Set(
      absences.items.map((absence) => ABSENCE_TYPE_LABELS[absence.type]),
    ),
  ];
  const withoutTime = person.daysWithoutTime.length;

  return (
    <ReportPanel
      focusKey={person.userId}
      title={person.name}
      detail={person.position ?? "No position"}
      onClose={onClose}
    >
      <Figures
        figures={[
          {
            label: "Logged",
            value: formatDuration(person.loggedMinutes),
            detail: `of ${formatDuration(person.expectedMinutes)} expected`,
          },
          {
            label: "Planned",
            value: formatDuration(person.plannedMinutes),
            detail: `${formatSignedDuration(person.plannedMinutes - person.expectedMinutes)} against expected`,
          },
          {
            label: "Billable",
            value: formatDuration(person.billableMinutes),
            detail: `${percentOf(person.billableMinutes, person.loggedMinutes)}% of logged`,
          },
          {
            label: "Time off",
            value: `${person.timeOffDays} ${person.timeOffDays === 1 ? "day" : "days"}`,
            detail:
              absences.isLoading || absences.isError
                ? ""
                : absenceTypes.join(", ") || "None",
          },
        ]}
      />

      <PanelSection
        title="Day by day"
        note={
          withoutTime > 0
            ? `${withoutTime} ${withoutTime === 1 ? "day" : "days"} with no time logged`
            : undefined
        }
      >
        {daysIn(range) <= DAY_GRID_MAX_DAYS ? (
          <DayGrid
            person={person}
            absences={absences}
            range={range}
            countedUntil={countedUntil}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick two months or less to see each day.
          </p>
        )}
      </PanelSection>

      <PanelSection title="Projects" note="Logged against planned">
        <PanelList
          report={projects}
          empty="No time or plans on any project in this period."
        >
          {(rows, scale) =>
            rows.map((row) => (
              <AgainstPlanRow
                key={row.id}
                scale={scale}
                name={row.name ?? ""}
                detail={row.detail ?? "Internal work"}
                row={row}
              />
            ))
          }
        </PanelList>
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
  range: DateRange;
  onClose: () => void;
};

/** One project's period: figures and the people on it. */
export const ProjectPanel = ({
  project,
  range,
  onClose,
}: ProjectPanelProps) => {
  const people = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.PERSON,
    projectId: project.id!,
  });
  const planned = project.plannedMinutes ?? 0;

  return (
    <ReportPanel
      focusKey={project.id!}
      title={project.name ?? ""}
      detail={project.detail ?? "Internal work"}
      onClose={onClose}
    >
      <Figures
        figures={[
          {
            label: "Logged",
            value: formatDuration(project.totalMinutes),
            detail:
              planned > 0
                ? `of ${formatDuration(planned)} planned`
                : "No plan for this period",
          },
          {
            label: "Billable",
            value: formatDuration(project.billableMinutes),
            detail: `${percentOf(project.billableMinutes, project.totalMinutes)}% of logged`,
          },
        ]}
      />

      <PanelSection title="People" note="Logged against planned">
        <PanelList report={people} empty="Nobody logged or planned time here.">
          {(rows, scale) =>
            rows.map((row) => (
              <AgainstPlanRow
                key={row.id}
                scale={scale}
                name={row.name ?? ""}
                detail={row.detail}
                row={row}
              />
            ))
          }
        </PanelList>
      </PanelSection>
    </ReportPanel>
  );
};
