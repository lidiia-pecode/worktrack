"use client";

import { useState } from "react";
import { FolderKanban } from "lucide-react";

import { HoursReportRow, ReportQuery } from "@/types";
import { countLabel } from "@/lib/utils/text";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { SegmentedControl } from "../../shared/SegmentedControl";

import { AgainstPlanRow } from "./AgainstPlanRow";
import { KindOfWork } from "./KindOfWork";
import { ReportCardTitle } from "./ReportCardTitle";
import { AttentionLegend } from "./ReportRow";

type WhereView = "projects" | "work";

const VIEWS: { value: WhereView; label: string }[] = [
  { value: "projects", label: "Projects" },
  { value: "work", label: "Kind of work" },
];

/** Projects shown at first; the rest open on request. */
const PROJECTS_SHOWN = 8;

const ProjectList = ({
  projects,
  marked,
  onOpenProject,
}: {
  projects: HoursReportRow[];
  marked: Map<string, string>;
  onOpenProject: (projectId: string) => void;
}) => {
  const [showsAll, setShowsAll] = useState(false);
  const shown = showsAll ? projects : projects.slice(0, PROJECTS_SHOWN);

  if (projects.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No time or plans on any project in this period.
      </p>
    );
  }

  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">
        Hours logged against the plan
      </p>
      {marked.size > 0 && <AttentionLegend />}
      <ul className="mt-3 @container">
        {shown.map((project) => (
          <AgainstPlanRow
            key={project.id}
            row={project}
            detail={project.detail ?? "Internal work"}
            flag={marked.get(project.id)}
            onOpen={() => onOpenProject(project.id)}
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
  query: ReportQuery;
  projects: HoursReportRow[];
  /** The projects Needs attention names, with why. */
  marked: Map<string, string>;
  /**
   * Whose time a project's figures are, which they don't say themselves:
   * "Mobile Squad's time only" for one team, "Your teams' time only" for a
   * manager.
   */
  scopeNote?: string;
  onOpenProject: (projectId: string) => void;
};

/** Where the period's time went: by project against the plan, or by kind of work. */
export const WhereTheTimeWent = ({
  query,
  projects,
  marked,
  scopeNote,
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
        >
          {scopeNote && (
            <p className="text-sm text-muted-foreground">{scopeNote}</p>
          )}
        </ReportCardTitle>
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
