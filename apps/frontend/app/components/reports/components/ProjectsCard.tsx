import { HoursReportRow } from "@/types";
import { formatDuration, formatSignedDuration } from "@/lib/utils/date";
import { groupProjectsByClient, percentOf } from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { ReportRow } from "./ReportRow";
import { TargetBar, TargetBarLegend } from "./TargetBar";

const peopleText = (count: number | null) =>
  count ? `${count} ${count === 1 ? "person" : "people"}` : undefined;

type ProjectRowProps = {
  project: HoursReportRow;
  onOpen: (projectId: string) => void;
};

const ProjectRow = ({ project, onOpen }: ProjectRowProps) => {
  const name = project.name ?? "";
  const open = () => onOpen(project.id!);
  const logged = formatDuration(project.totalMinutes);
  const planned = project.plannedMinutes ?? 0;

  if (planned === 0) {
    return (
      <ReportRow
        name={name}
        onOpen={open}
        detail={peopleText(project.peopleCount)}
        bar={
          <p className="text-sm text-muted-foreground">
            No plan for this period
          </p>
        }
        figure={
          <>
            {logged}{" "}
            <span className="font-normal text-muted-foreground">logged</span>
          </>
        }
        subFigure="No plan"
      />
    );
  }

  return (
    <ReportRow
      name={name}
      onOpen={open}
      detail={peopleText(project.peopleCount)}
      bar={
        <TargetBar
          value={project.totalMinutes}
          reference={planned}
          label={`${name}: ${logged} logged of ${formatDuration(planned)} planned`}
        />
      }
      figure={
        <>
          {logged}{" "}
          <span className="font-normal text-muted-foreground">
            of {formatDuration(planned)}
          </span>
        </>
      }
      subFigure={`${formatSignedDuration(project.totalMinutes - planned)} against plan`}
    />
  );
};

type ProjectsCardProps = {
  projects: HoursReportRow[];
  onOpenProject: (projectId: string) => void;
};

/** Each project's logged time against its plan, under its client. */
export const ProjectsCard = ({
  projects,
  onOpenProject,
}: ProjectsCardProps) => (
  <Card as="section" aria-labelledby="report-projects" className="p-5">
    <h2 id="report-projects" className="text-base font-semibold">
      Projects
    </h2>
    <p className="mt-0.5 text-sm text-muted-foreground">
      Logged time against the plan, by client
    </p>

    <div className="mt-4">
      <TargetBarLegend reference="Planned" past="Past the plan" />
    </div>

    {groupProjectsByClient(projects).map((client) => (
      <section
        key={client.key}
        aria-label={client.name ?? "Internal work"}
        className="mt-4"
      >
        <div className="flex items-baseline justify-between gap-3 pb-1.5">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {client.name ?? "Internal work"}
          </h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatDuration(client.loggedMinutes)} ·{" "}
            {percentOf(client.billableMinutes, client.loggedMinutes)}% billable
          </p>
        </div>
        <ul className="@container">
          {client.projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onOpen={onOpenProject}
            />
          ))}
        </ul>
      </section>
    ))}
  </Card>
);
