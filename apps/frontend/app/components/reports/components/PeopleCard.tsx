"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";

import { PeopleReportRow } from "@/types";
import { isDeactivatedUser } from "@/lib/utils/user";
import { againstExpected, daysOffLabel } from "@/lib/utils/report-overview";
import { countLabel } from "@/lib/utils/text";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { MoveBadges } from "../../shared/week/MoveBadges";
import { ReportBar } from "./ReportBar";
import { ReportCardTitle } from "./ReportCardTitle";
import { AttentionLegend, ReportRow } from "./ReportRow";

/** People shown at first; the rest open on request. */
const PEOPLE_SHOWN = 10;

/** Their position and the teams they were in during the period. */
const detailOf = (person: PeopleReportRow) =>
  [person.position, person.teams.map((team) => team.name).join(", ")]
    .filter(Boolean)
    .join(" · ");

const PersonRow = ({
  person,
  isTeamFiltered,
  flag,
  onOpen,
}: {
  person: PeopleReportRow;
  /** Under a team filter the row says where they joined or left the team. */
  isTeamFiltered: boolean;
  /** Why Needs attention names them, when it does. */
  flag?: string;
  onOpen: (userId: string) => void;
}) => {
  const figure = againstExpected(person.loggedMinutes, person.expectedMinutes);

  return (
    <ReportRow
      name={person.name}
      onOpen={() => onOpen(person.userId)}
      detail={detailOf(person)}
      note={
        person.timeOffDays > 0 ? daysOffLabel(person.timeOffDays) : undefined
      }
      flag={flag}
      status={
        <>
          {isDeactivatedUser(person) && (
            <Badge variant="neutral">Deactivated</Badge>
          )}
          {isTeamFiltered && (
            <MoveBadges moves={person.teams[0]?.moves ?? []} />
          )}
        </>
      }
      bar={
        <ReportBar
          value={person.loggedMinutes}
          reference={person.expectedMinutes}
          billable={person.billableMinutes}
          label={`${person.name}: ${figure} expected`}
        />
      }
      figure={figure}
      subFigure={person.expectedMinutes > 0 ? undefined : "nothing expected"}
    />
  );
};

type PeopleCardProps = {
  people: PeopleReportRow[];
  /** The people Needs attention names, with why. */
  marked: Map<string, string>;
  /** Narrowed to one team, so each row is that team's days. */
  isTeamFiltered?: boolean;
  onOpenPerson: (userId: string) => void;
};

/**
 * Everyone in the period once, each with one bar of what they logged against
 * what they were expected to work, so the rows add up to the period.
 */
export const PeopleCard = ({
  people,
  marked,
  isTeamFiltered = false,
  onOpenPerson,
}: PeopleCardProps) => {
  const [showsAll, setShowsAll] = useState(false);
  const shown = showsAll ? people : people.slice(0, PEOPLE_SHOWN);

  return (
    <Card as="section" aria-labelledby="report-people" className="p-6">
      <ReportCardTitle id="report-people" title="People" icon={UsersRound}>
        <p className="text-sm text-muted-foreground">
          Hours logged against what each person was expected to work
        </p>
        {marked.size > 0 && <AttentionLegend />}
      </ReportCardTitle>

      <ul className="mt-3 @container">
        {shown.map((person) => (
          <PersonRow
            key={person.userId}
            person={person}
            isTeamFiltered={isTeamFiltered}
            flag={marked.get(person.userId)}
            onOpen={onOpenPerson}
          />
        ))}
      </ul>
      {people.length > PEOPLE_SHOWN && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto px-0 max-sm:h-auto"
          aria-expanded={showsAll}
          onClick={() => setShowsAll(!showsAll)}
        >
          {showsAll
            ? "Show fewer"
            : `Show all ${countLabel(people.length, "person", "people")}`}
        </Button>
      )}
    </Card>
  );
};
