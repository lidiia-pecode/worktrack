import { HoursReportRow } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import {
  describeAgainstPlan,
  groupProjectsByClient,
  HourScale,
  hourScaleOf,
  percentOf,
} from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { BarLegend, HourBar } from "./HourBar";
import { ReportAxisRow, ReportRow } from "./ReportRow";

const peopleText = (count: number | null) =>
  count ? `${count} ${count === 1 ? "person" : "people"}` : undefined;

type ProjectRowProps = {
  project: HoursReportRow;
  scale: HourScale;
  onOpen: (projectId: string) => void;
};

const ProjectRow = ({ project, scale, onOpen }: ProjectRowProps) => {
  const name = project.name ?? "";
  const logged = formatDuration(project.totalMinutes);
  const againstPlan = describeAgainstPlan(project);

  return (
    <ReportRow
      name={name}
      onOpen={() => onOpen(project.id!)}
      detail={peopleText(project.peopleCount)}
      bar={
        <HourBar
          scale={scale}
          logged={project.totalMinutes}
          planned={project.plannedMinutes}
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
                <ProjectRow
                  key={project.id}
                  project={project}
                  scale={scale}
                  onOpen={onOpenProject}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
};
