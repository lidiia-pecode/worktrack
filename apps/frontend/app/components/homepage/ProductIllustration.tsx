import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";

import { Avatar } from "../shared/Avatar";
import { ABSENCE_PATTERN } from "../timesheet/consts";
import {
  SAMPLE_PROJECTS,
  SAMPLE_REPORT,
  SAMPLE_TEAM,
  SAMPLE_WEEK,
} from "./sample-data";

const DAY_SCALE_MINUTES = 10 * 60;
const LABELLED_ENTRY_MIN_MINUTES = 3 * 60;

const toPercent = (minutes: number, scaleMinutes: number) =>
  `${(minutes / scaleMinutes) * 100}%`;

type IllustrationCardProps = {
  title: string;
  className?: string;
  children: ReactNode;
};

const IllustrationCard = ({
  title,
  className,
  children,
}: IllustrationCardProps) => (
  <div
    className={cn(
      "rounded-2xl border border-border bg-card p-4 shadow-xl shadow-glow-primary",
      className,
    )}
  >
    <p className="text-xs font-semibold text-muted-foreground">{title}</p>
    <div className="mt-3">{children}</div>
  </div>
);

const TimesheetCard = () => (
  <IllustrationCard title="Weekly timesheet">
    <div className="grid h-56 grid-cols-5 gap-1.5">
      {SAMPLE_WEEK.map(({ day, entries, absence }) => (
        <div key={day} className="flex flex-col">
          <p className="pb-1.5 text-center text-xs text-muted-foreground">
            {day}
          </p>

          <div
            className={cn(
              "flex flex-1 flex-col gap-1 rounded-lg",
              absence && cn(ABSENCE_PATTERN, "items-center justify-center"),
            )}
          >
            {absence && <Badge className="px-1.5 text-2xs">{absence}</Badge>}

            {entries.map(({ project, minutes }, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-md px-1.5 py-1.5 hyphens-auto"
                style={{
                  height: toPercent(minutes, DAY_SCALE_MINUTES),
                  backgroundColor: SAMPLE_PROJECTS[project].color,
                }}
              >
                {minutes >= LABELLED_ENTRY_MIN_MINUTES && (
                  <p className="text-xs leading-tight font-medium text-foreground/80">
                    {SAMPLE_PROJECTS[project].name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </IllustrationCard>
);

const TeamCard = ({ className }: { className?: string }) => (
  <IllustrationCard title="Team this week" className={className}>
    <ul className="space-y-2.5">
      {SAMPLE_TEAM.map((person) => (
        <li key={person.firstName} className="flex items-center gap-2.5">
          <Avatar user={person} size="xs" />

          <span className="flex-1 truncate text-sm text-foreground">
            {person.firstName} {person.lastName}
          </span>

          {"absence" in person ? (
            <Badge dot>{person.absence}</Badge>
          ) : (
            <span className="flex items-center gap-1.5 text-sm tabular-nums">
              <span className="font-semibold text-foreground">
                {formatDuration(person.minutes)}
              </span>

              {person.minutes < person.expectedMinutes && (
                <Badge variant="warning" className="px-1.5">
                  −{formatDuration(person.expectedMinutes - person.minutes)}
                </Badge>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  </IllustrationCard>
);

const reportMaxMinutes = Math.max(...SAMPLE_REPORT.map((row) => row.minutes));

const ReportCard = ({ className }: { className?: string }) => (
  <IllustrationCard title="Hours by project this month" className={className}>
    <ul className="space-y-2.5">
      {SAMPLE_REPORT.map(({ project, minutes }) => (
        <li key={project}>
          <div className="flex justify-between text-xs">
            <span className="text-foreground">
              {SAMPLE_PROJECTS[project].name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatDuration(minutes)}
            </span>
          </div>

          <div className="mt-1 h-1.5 rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-brand/70"
              style={{ width: toPercent(minutes, reportMaxMinutes) }}
            />
          </div>
        </li>
      ))}
    </ul>
  </IllustrationCard>
);

export const ProductIllustration = () => (
  <figure>
    <div aria-hidden="true" className="relative sm:pb-28">
      <div className="sm:mx-8">
        <TimesheetCard />
      </div>

      <TeamCard className="mt-4 sm:absolute sm:bottom-0 sm:left-0 sm:mt-0 sm:w-64" />

      <ReportCard className="mt-4 sm:absolute sm:bottom-8 sm:right-0 sm:mt-0 sm:w-60" />
    </div>

    <figcaption className="mt-6 text-center text-xs text-muted-foreground">
      Sample data: a week in the timesheet, the team&apos;s view and a monthly
      report.
    </figcaption>
  </figure>
);
