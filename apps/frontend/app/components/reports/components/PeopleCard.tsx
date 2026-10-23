"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { PeopleReportRow } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import { personNeedsAttention } from "@/lib/utils/report-attention";
import {
  daysOffLabel,
  groupPeopleByTeam,
  PEOPLE_SHOWN_OPEN,
  TeamGroup,
} from "@/lib/utils/report-overview";
import { countLabel } from "@/lib/utils/text";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { ReportBar } from "./ReportBar";
import { AttentionDot, ReportRow } from "./ReportRow";

/** "96h of 120h", or the hours alone when nothing was expected. */
const againstExpected = (logged: number, expected: number) =>
  expected > 0
    ? `${formatDuration(logged)} of ${formatDuration(expected)}`
    : formatDuration(logged);

const flagOf = (person: PeopleReportRow) =>
  !personNeedsAttention(person)
    ? undefined
    : person.daysWithoutTime.length > 0
      ? `${countLabel(person.daysWithoutTime.length, "day", "days")} with no time logged`
      : "Planned beyond their hours";

const PersonRow = ({
  person,
  onOpen,
}: {
  person: PeopleReportRow;
  onOpen: (userId: string) => void;
}) => {
  const figure = againstExpected(person.loggedMinutes, person.expectedMinutes);

  return (
    <ReportRow
      name={person.name}
      onOpen={() => onOpen(person.userId)}
      detail={person.position}
      note={
        person.timeOffDays > 0 ? daysOffLabel(person.timeOffDays) : undefined
      }
      flag={flagOf(person)}
      bar={
        <ReportBar
          value={person.loggedMinutes}
          reference={person.expectedMinutes}
          label={`${person.name}: ${figure} expected`}
        />
      }
      figure={figure}
      subFigure={person.expectedMinutes > 0 ? undefined : "nothing expected"}
    />
  );
};

const TeamRows = ({
  group,
  isOpen,
  onToggle,
  onOpenPerson,
}: {
  group: TeamGroup;
  isOpen: boolean;
  onToggle: () => void;
  onOpenPerson: (userId: string) => void;
}) => {
  const figure = againstExpected(group.loggedMinutes, group.expectedMinutes);
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  const needsAttention = group.people.some(personNeedsAttention);

  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="grid w-full grid-cols-[minmax(0,1fr)_10rem] items-center gap-x-4 gap-y-2 rounded-md py-3.5 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none @sm:grid-cols-[minmax(8rem,1fr)_minmax(0,1.2fr)_10rem]"
      >
        <span className="col-span-2 flex min-w-0 items-start gap-2 @sm:col-span-1">
          <Chevron className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-semibold">{group.name}</span>
              {needsAttention && !isOpen && (
                <AttentionDot title="Someone here needs attention" />
              )}
            </span>
            <span className="block text-xs text-muted-foreground">
              {countLabel(group.people.length, "person", "people")}
            </span>
          </span>
        </span>
        <ReportBar
          value={group.loggedMinutes}
          reference={group.expectedMinutes}
          label={`${group.name}: ${figure} expected`}
        />
        <span className="text-right text-sm font-semibold whitespace-nowrap tabular-nums">
          {figure}
        </span>
      </button>
      {isOpen && (
        <ul className="pb-2 pl-6">
          {group.people.map((person) => (
            <PersonRow
              key={person.userId}
              person={person}
              onOpen={onOpenPerson}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

type PeopleCardProps = {
  people: PeopleReportRow[];
  onOpenPerson: (userId: string) => void;
};

/**
 * People by team, each with one bar of what they logged against what they
 * were expected to work. A long list starts folded to its teams.
 */
export const PeopleCard = ({ people, onOpenPerson }: PeopleCardProps) => {
  const groups = groupPeopleByTeam(people);
  const startsOpen = people.length <= PEOPLE_SHOWN_OPEN;
  // Only the teams opened or folded by hand; the rest follow the default.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (group: TeamGroup) => toggled[group.id] ?? startsOpen;
  const allOpen = groups.every(isOpen);

  const setAll = (open: boolean) =>
    setToggled(Object.fromEntries(groups.map((group) => [group.id, open])));

  return (
    <Card as="section" aria-labelledby="report-people" className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="report-people" className="text-base font-semibold">
            People
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hours logged against what each person was expected to work
          </p>
        </div>
        {groups.length > 1 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => setAll(!allOpen)}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        )}
      </div>

      <ul className="mt-3 @container">
        {groups.map((group) => (
          <TeamRows
            key={group.id}
            group={group}
            isOpen={isOpen(group)}
            onToggle={() =>
              setToggled({ ...toggled, [group.id]: !isOpen(group) })
            }
            onOpenPerson={onOpenPerson}
          />
        ))}
      </ul>
    </Card>
  );
};
