"use client";

import { useState } from "react";

import { PeopleReportRow } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import {
  HourScale,
  hourScale,
  sortPeople,
  TEAM_ORDERS,
  TeamOrder,
} from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { BarLegend, HourBar } from "./HourBar";
import { ReportAxisRow, ReportRow } from "./ReportRow";

const daysOff = (days: number) => `${days} ${days === 1 ? "day" : "days"} off`;

/** Expected and planned hours in words; a missing one is said, never shown as 0h. */
const otherValues = ({ expectedMinutes, plannedMinutes }: PeopleReportRow) => [
  expectedMinutes > 0
    ? `${formatDuration(expectedMinutes)} expected`
    : "nothing expected",
  plannedMinutes > 0
    ? `${formatDuration(plannedMinutes)} planned`
    : "not planned",
];

type PersonRowProps = {
  person: PeopleReportRow;
  scale: HourScale;
  onOpen: (userId: string) => void;
};

const PersonRow = ({ person, scale, onOpen }: PersonRowProps) => {
  const logged = formatDuration(person.loggedMinutes);
  const others = otherValues(person);

  return (
    <ReportRow
      name={person.name}
      onOpen={() => onOpen(person.userId)}
      detail={person.position}
      note={person.timeOffDays > 0 ? daysOff(person.timeOffDays) : undefined}
      bar={
        <HourBar
          scale={scale}
          logged={person.loggedMinutes}
          expected={person.expectedMinutes}
          planned={person.plannedMinutes}
          label={`${person.name}: ${logged} logged, ${others.join(", ")}`}
        />
      }
      figure={
        <>
          {logged}{" "}
          <span className="font-normal text-muted-foreground">logged</span>
        </>
      }
      subFigure={others.join(" · ")}
    />
  );
};

type TeamCardProps = {
  people: PeopleReportRow[];
  onOpenPerson: (userId: string) => void;
};

/** Each person's logged hours against what they were expected to work and what was planned. */
export const TeamCard = ({ people, onOpenPerson }: TeamCardProps) => {
  const [order, setOrder] = useState<TeamOrder>("name");
  const scale = hourScale(
    Math.max(
      0,
      ...people.flatMap((person) => [
        person.loggedMinutes,
        person.expectedMinutes,
        person.plannedMinutes,
      ]),
    ),
  );

  return (
    <Card as="section" aria-labelledby="report-team" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="report-team" className="text-base font-semibold">
            Team
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hours logged, against what each person was expected to work and what
            was planned
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div
            role="group"
            aria-label="Order the team"
            className="flex h-8 overflow-hidden rounded-lg border border-border"
          >
            {TEAM_ORDERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={order === value}
                onClick={() => setOrder(value)}
                className={cn(
                  "border-l border-border px-3 text-sm transition first:border-l-0",
                  "focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none focus-visible:ring-inset",
                  order === value
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {TEAM_ORDERS.find(({ value }) => value === order)!.hint}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <BarLegend showExpected past="Logged past expected" />
      </div>

      <div className="mt-3 @container">
        <ReportAxisRow scale={scale} />
        <ul aria-label="People">
          {sortPeople(people, order).map((person) => (
            <PersonRow
              key={person.userId}
              person={person}
              scale={scale}
              onOpen={onOpenPerson}
            />
          ))}
        </ul>
      </div>
    </Card>
  );
};
