"use client";

import { useState } from "react";
import { FolderKanban } from "lucide-react";

import { HoursReportRow, ReportQuery } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatReportHours } from "@/lib/utils/date";
import { percentOf } from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { SegmentedControl } from "../../shared/SegmentedControl";

import { KindOfWork } from "./KindOfWork";
import { ReportCardTitle } from "./ReportCardTitle";
import { ReportBar } from "./ReportBar";
import { AttentionLegend } from "./ReportRow";
import { CompactRow, ReportColumn, ReportTable } from "./ReportTable";

type WhereView = "projects" | "work";

const VIEWS: { value: WhereView; label: string }[] = [
  { value: "projects", label: "Projects" },
  { value: "work", label: "Kind of work" },
];

const NO_FIGURE = "—";

/** Logged time past the plan, or short of it; none without a plan. */
const differenceOf = ({ totalMinutes, plannedMinutes }: HoursReportRow) =>
  plannedMinutes ? totalMinutes - plannedMinutes : null;

/** "+71.5h", "−49.5h", "0h" when logged matches the plan, "no plan". */
const DifferenceLabel = ({ project }: { project: HoursReportRow }) => {
  const difference = differenceOf(project);
  return (
    <span
      className={cn(
        "whitespace-nowrap",
        difference !== null && difference > 0 && "text-warning-text",
        difference === null && "text-muted-foreground",
      )}
    >
      {difference === null
        ? "no plan"
        : `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${formatReportHours(Math.abs(difference))}`}
    </span>
  );
};

const billableLabel = (project: HoursReportRow) =>
  project.totalMinutes > 0
    ? `${percentOf(project.billableMinutes, project.totalMinutes)}%`
    : NO_FIGURE;

const barOf = (project: HoursReportRow) => (
  <ReportBar
    value={project.totalMinutes}
    reference={project.plannedMinutes ?? 0}
    measuredAgainst="planned"
    billable={project.billableMinutes}
    className="flex-1"
  />
);

/** Where the columns don't fit: "731.5h of 660h", then the difference and billable share. */
const compactOf = (project: HoursReportRow): CompactRow => ({
  figure: project.plannedMinutes
    ? `${formatReportHours(project.totalMinutes)} of ${formatReportHours(project.plannedMinutes)}`
    : formatReportHours(project.totalMinutes),
  note: (
    <>
      <DifferenceLabel project={project} />
      {project.totalMinutes > 0 && ` · ${billableLabel(project)} billable`}
    </>
  ),
  bar: barOf(project),
});

const COLUMNS: ReportColumn<HoursReportRow>[] = [
  {
    header: "Logged",
    numeric: true,
    width: "w-24",
    cell: (project) => formatReportHours(project.totalMinutes),
    sortValue: (project) => project.totalMinutes,
  },
  {
    header: "Planned",
    numeric: true,
    width: "w-24",
    cell: (project) =>
      project.plannedMinutes
        ? formatReportHours(project.plannedMinutes)
        : NO_FIGURE,
    sortValue: (project) => project.plannedMinutes ?? 0,
  },
  {
    header: "Against plan",
    numeric: true,
    width: "w-60",
    cell: (project) => (
      <span className="flex items-center gap-3">
        {barOf(project)}
        <span className="w-16">
          <DifferenceLabel project={project} />
        </span>
      </span>
    ),
    sortValue: differenceOf,
  },
  {
    header: "Billable",
    numeric: true,
    width: "w-24",
    cell: billableLabel,
    sortValue: (project) =>
      project.totalMinutes > 0
        ? project.billableMinutes / project.totalMinutes
        : null,
  },
];

const ProjectList = ({
  projects,
  marked,
  onOpenProject,
}: {
  projects: HoursReportRow[];
  marked: Map<string, string>;
  onOpenProject: (projectId: string) => void;
}) => {
  if (projects.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No time or plans on any project in this period.
      </p>
    );
  }

  return (
    <>
      {marked.size > 0 && <AttentionLegend />}
      <div className="mt-3">
        <ReportTable
          label="Projects"
          rows={projects}
          getKey={(project) => project.id}
          getName={(project) => project.name}
          getDetail={(project) => project.detail ?? "Internal work"}
          getFlag={(project) => marked.get(project.id)}
          onOpen={(project) => onOpenProject(project.id)}
          nameHeader="Project"
          columns={COLUMNS}
          noun={["project", "projects"]}
          compact={compactOf}
        />
      </div>
    </>
  );
};

type WhereTheTimeWentProps = {
  query: ReportQuery;
  projects: HoursReportRow[];
  /** The projects Needs attention names, with why. */
  marked: Map<string, string>;
  onOpenProject: (projectId: string) => void;
};

/** Where the period's time went: by project against the plan, or by kind of work. */
export const WhereTheTimeWent = ({
  query,
  projects,
  marked,
  onOpenProject,
}: WhereTheTimeWentProps) => {
  const [view, setView] = useState<WhereView>("projects");

  return (
    <Card as="section" aria-labelledby="report-where" className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportCardTitle
          id="report-where"
          title="Where the time went"
          icon={FolderKanban}
        />
        <SegmentedControl
          label="Show"
          options={VIEWS}
          value={view}
          onChange={setView}
          size="sm"
        />
      </div>

      {view === "projects" ? (
        <ProjectList
          projects={projects}
          marked={marked}
          onOpenProject={onOpenProject}
        />
      ) : (
        <KindOfWork query={query} />
      )}
    </Card>
  );
};
