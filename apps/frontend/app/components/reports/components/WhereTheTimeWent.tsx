"use client";

import { useState } from "react";

import { HoursReportRow } from "@/types";
import { cn } from "@/lib/utils/cn";
import { projectNeedsAttention } from "@/lib/utils/report-attention";
import { DateRange } from "@/lib/utils/report-period";
import { countLabel } from "@/lib/utils/text";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { AgainstPlanRow } from "./AgainstPlanRow";
import { KindOfWork } from "./KindOfWork";

export type WhereView = "projects" | "work";

const VIEWS: { value: WhereView; label: string }[] = [
  { value: "projects", label: "Projects" },
  { value: "work", label: "Kind of work" },
];

/** Projects shown at first; the rest open on request. */
const PROJECTS_SHOWN = 8;

const ProjectList = ({
  projects,
  onOpenProject,
}: {
  projects: HoursReportRow[];
  onOpenProject: (projectId: string) => void;
}) => {
  const [showsAll, setShowsAll] = useState(false);
  const shown = showsAll ? projects : projects.slice(0, PROJECTS_SHOWN);

  if (projects.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No time or plans on any project this month.
      </p>
    );
  }

  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">
        Hours logged against the plan
      </p>
      <ul className="mt-3 @container">
        {shown.map((project) => (
          <AgainstPlanRow
            key={project.id}
            row={project}
            detail={project.detail ?? "Internal work"}
            flag={
              projectNeedsAttention(project)
                ? project.plannedMinutes
                  ? "More than 10% off plan"
                  : "Logged with no plan"
                : undefined
            }
            onOpen={() => onOpenProject(project.id!)}
          />
        ))}
      </ul>
      {projects.length > PROJECTS_SHOWN && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto px-0"
          aria-expanded={showsAll}
          onClick={() => setShowsAll(!showsAll)}
        >
          {showsAll
            ? "Show fewer"
            : `Show all ${countLabel(projects.length, "project", "projects")}`}
        </Button>
      )}
    </>
  );
};

type WhereTheTimeWentProps = {
  range: DateRange;
  projects: HoursReportRow[];
  view: WhereView;
  onViewChange: (view: WhereView) => void;
  onOpenProject: (projectId: string) => void;
};

/** Where the month's time went: by project against the plan, or by kind of work. */
export const WhereTheTimeWent = ({
  range,
  projects,
  view,
  onViewChange,
  onOpenProject,
}: WhereTheTimeWentProps) => (
  <Card as="section" aria-labelledby="report-where" className="p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="report-where" className="text-base font-semibold">
        Where the time went
      </h2>
      <div
        role="group"
        aria-label="Show"
        className="flex h-8 overflow-hidden rounded-lg border border-border"
      >
        {VIEWS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => onViewChange(value)}
            className={cn(
              "border-l border-border px-3 text-sm transition first:border-l-0",
              "focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none focus-visible:ring-inset",
              view === value
                ? "bg-accent font-semibold text-accent-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    {view === "projects" ? (
      <ProjectList projects={projects} onOpenProject={onOpenProject} />
    ) : (
      <KindOfWork range={range} />
    )}
  </Card>
);
