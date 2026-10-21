"use client";

import { useState } from "react";

import { PeopleReportRow } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import { sortPeople, TEAM_SORTS, TeamSort } from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { FormSelect } from "../../shared/FormSelect";
import { ReportRow } from "./ReportRow";
import { TargetBar, TargetBarLegend } from "./TargetBar";

const daysOff = (days: number) => `${days} ${days === 1 ? "day" : "days"} off`;

const PersonRow = ({ person }: { person: PeopleReportRow }) => {
  const logged = formatDuration(person.loggedMinutes);
  const expected = formatDuration(person.expectedMinutes);
  const planned = formatDuration(person.plannedMinutes);

  return (
    <ReportRow
      name={person.name}
      detail={person.position}
      note={person.timeOffDays > 0 ? daysOff(person.timeOffDays) : undefined}
      bar={
        person.expectedMinutes > 0 ? (
          <TargetBar
            value={person.loggedMinutes}
            reference={person.expectedMinutes}
            planned={person.plannedMinutes}
            label={`${person.name}: ${logged} logged of ${expected} expected, ${planned} planned`}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Nothing expected</p>
        )
      }
      figure={
        <>
          {logged}{" "}
          <span className="font-normal text-muted-foreground">
            of {expected}
          </span>
        </>
      }
      subFigure={`${planned} planned`}
    />
  );
};

/** Each person's logged time against what they were expected to work. */
export const TeamCard = ({ people }: { people: PeopleReportRow[] }) => {
  const [sort, setSort] = useState<TeamSort>("name");

  return (
    <Card as="section" aria-labelledby="report-team" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="report-team" className="text-base font-semibold">
            Team
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Logged time against what each person was expected to work
          </p>
        </div>
        <FormSelect
          aria-label="Sort the team"
          className="w-48"
          triggerClassName="h-9"
          value={sort}
          options={TEAM_SORTS}
          onValueChange={(value) => setSort(value as TeamSort)}
        />
      </div>

      <div className="mt-4">
        <TargetBarLegend
          reference="Expected"
          past="Past expected"
          showPlanned
        />
      </div>

      <ul aria-label="People" className="mt-2">
        {sortPeople(people, sort).map((person) => (
          <PersonRow key={person.userId} person={person} />
        ))}
      </ul>
    </Card>
  );
};
