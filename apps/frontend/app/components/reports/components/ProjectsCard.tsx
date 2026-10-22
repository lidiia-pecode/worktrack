import { HoursReportRow } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import {
  groupProjectsByClient,
  hourScaleOf,
  peopleCountLabel,
  percentOf,
} from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { AgainstPlanRow } from "./AgainstPlanRow";
import { BarLegend } from "./HourBar";
import { ReportAxisRow } from "./ReportRow";

type ProjectsCardProps = {
  projects: HoursReportRow[];
  onOpenProject: (projectId: string) => void;
};

/** Each project's logged hours against its plan, under its client, on one scale. */
export const ProjectsCard = ({
  projects,
  onOpenProject,
}: ProjectsCardProps) => {
  const scale = hourScaleOf(projects);

  return (
    <Card as="section" aria-labelledby="report-projects" className="p-5">
      <h2 id="report-projects" className="text-base font-semibold">
        Projects
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Hours logged against the plan, by client
      </p>

      <div className="mt-4">
        <BarLegend showExpected={false} past="Logged past the plan" />
      </div>

      <div className="mt-3 @container">
        <ReportAxisRow scale={scale} />
        {groupProjectsByClient(projects).map((client) => (
          <section
            key={client.key}
            aria-label={client.name ?? "Internal work"}
            className="mt-3"
          >
            <div className="flex items-baseline justify-between gap-3 pb-1.5">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {client.name ?? "Internal work"}
              </h3>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatDuration(client.loggedMinutes)} ·{" "}
                {percentOf(client.billableMinutes, client.loggedMinutes)}%
                billable
              </p>
            </div>
            <ul>
              {client.projects.map((project) => (
                <AgainstPlanRow
                  key={project.id}
                  row={project}
                  scale={scale}
                  detail={peopleCountLabel(project.peopleCount)}
                  onOpen={() => onOpenProject(project.id!)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
};
