import { ReactNode } from "react";

import { HoursReportRow, PeopleReport } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import {
  CLOSE_TO_PLAN_SHARE,
  isCloseToPlan,
  percentOf,
} from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { HourBar } from "./HourBar";

const Tile = ({
  label,
  figure,
  bar,
  children,
}: {
  label: string;
  figure: ReactNode;
  bar: ReactNode;
  children: ReactNode;
}) => (
  <Card as="section" aria-label={label} className="flex flex-col gap-3 p-5">
    <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
    <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
      {figure}
    </p>
    {bar}
    <p className="text-sm text-muted-foreground">{children}</p>
  </Card>
);

/** A share drawn as one bar: the part in the brand colour, the rest pale. */
const ShareBar = ({ percent }: { percent: number }) => (
  <div className="flex h-1.5 gap-0.5" aria-hidden>
    {percent > 0 && (
      <span
        className={cn(
          "bg-brand",
          percent < 100 ? "rounded-l-full" : "rounded-full",
        )}
        style={{ width: `${percent}%` }}
      />
    )}
    {percent < 100 && (
      <span
        className={cn(
          "flex-1 bg-brand-strong",
          percent > 0 ? "rounded-r-full" : "rounded-full",
        )}
      />
    )}
  </div>
);

type ReportTilesProps = {
  totals: PeopleReport["totals"];
  projects: HoursReportRow[];
};

/** The period at a glance: time against expected, billable time, projects close to plan. */
export const ReportTiles = ({ totals, projects }: ReportTilesProps) => {
  const { loggedMinutes, billableMinutes, expectedMinutes } = totals;
  const plannedProjects = projects.filter((row) => row.plannedMinutes);
  const closeToPlan = plannedProjects.filter(isCloseToPlan).length;
  const plannedMinutes = plannedProjects.reduce(
    (sum, row) => sum + (row.plannedMinutes ?? 0),
    0,
  );

  return (
    <div className="grid gap-4 @2xl:grid-cols-3">
      <Tile
        label="Time logged"
        figure={formatDuration(loggedMinutes)}
        bar={
          <HourBar
            className="h-1.5"
            // No axis on a tile, so no gridlines either.
            scale={{
              endMinutes: Math.max(loggedMinutes, expectedMinutes, 1),
              ticks: [],
            }}
            logged={loggedMinutes}
            expected={expectedMinutes}
            label={`${formatDuration(loggedMinutes)} logged of ${formatDuration(expectedMinutes)} expected`}
          />
        }
      >
        {expectedMinutes > 0
          ? `${percentOf(loggedMinutes, expectedMinutes)}% of the ${formatDuration(expectedMinutes)} the team was expected to work`
          : "Nobody was expected to work in this period"}
      </Tile>

      <Tile
        label="Billable"
        figure={formatDuration(billableMinutes)}
        bar={<ShareBar percent={percentOf(billableMinutes, loggedMinutes)} />}
      >
        {percentOf(billableMinutes, loggedMinutes)}% of logged time
      </Tile>

      <Tile
        label="Close to plan"
        figure={
          <>
            {closeToPlan}{" "}
            <span className="text-xl font-medium text-muted-foreground">
              of {plannedProjects.length}
            </span>
          </>
        }
        bar={
          <ShareBar percent={percentOf(closeToPlan, plannedProjects.length)} />
        }
      >
        {plannedProjects.length > 0
          ? `planned projects within ${CLOSE_TO_PLAN_SHARE * 100}% of their plan, of ${formatDuration(plannedMinutes)} planned`
          : "No project was planned in this period"}
      </Tile>
    </div>
  );
};
