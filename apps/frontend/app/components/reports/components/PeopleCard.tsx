"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, UsersRound } from "lucide-react";

import { PeopleReportRow, TeamMove } from "@/types";
import { isDeactivatedUser } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";
import {
  againstExpected,
  daysOffLabel,
  FigureChange,
  groupPeopleByTeam,
  PEOPLE_SHOWN_OPEN,
  shareChange,
  TeamGroup,
} from "@/lib/utils/report-overview";
import { countLabel } from "@/lib/utils/text";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { MoveBadges } from "../../shared/week/MoveBadges";
import { ChangeTip } from "./ChangeTip";
import { ReportBar } from "./ReportBar";
import { ReportCardTitle } from "./ReportCardTitle";
import {
  AttentionDot,
  AttentionLegend,
  REPORT_ROW_COLUMNS,
  ReportRow,
} from "./ReportRow";

const PersonRow = ({
  person,
  moves,
  flag,
  onOpen,
}: {
  person: PeopleReportRow;
  /** Where they joined or left the team the row is under. */
  moves: TeamMove[];
  /** Why Needs attention names them, when it does. */
  flag?: string;
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
      flag={flag}
      status={
        <>
          {isDeactivatedUser(person) && (
            <Badge variant="neutral">Deactivated</Badge>
          )}
          <MoveBadges moves={moves} />
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

const TeamRows = ({
  group,
  change,
  previousName,
  marked,
  isOpen,
  onToggle,
  onOpenPerson,
}: {
  group: TeamGroup;
  /** Its logged share against the previous period's; none without one. */
  change: FigureChange | null;
  previousName: string;
  marked: Map<string, string>;
  isOpen: boolean;
  onToggle: () => void;
  onOpenPerson: (userId: string) => void;
}) => {
  const figure = againstExpected(group.loggedMinutes, group.expectedMinutes);
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  const needsAttention = group.people.some((person) =>
    marked.has(person.userId),
  );

  return (
    <li className="border-t border-border/60 first:border-t-0">
      {/* The toggle's hit area stretches over the whole row (its ::after), so
          a click anywhere folds the team, while the change's tip sits above it
          as a control of its own rather than inside the button. */}
      <div
        className={cn(
          REPORT_ROW_COLUMNS,
          "relative items-center gap-y-2 rounded-md py-3.5 transition-colors hover:bg-accent/50",
        )}
      >
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          className="col-span-2 flex min-w-0 items-start gap-2 text-left after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring @sm:col-span-1"
        >
          <Chevron className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span title={group.name} className="line-clamp-2 font-semibold">
                {group.name}
              </span>
              {group.isArchived && (
                <Badge variant="neutral" size="sm" className="shrink-0">
                  Archived
                </Badge>
              )}
              {needsAttention && !isOpen && (
                <AttentionDot title="Someone here needs attention" />
              )}
            </span>
            <span className="block text-xs text-muted-foreground">
              {countLabel(group.people.length, "person", "people")}
            </span>
          </span>
        </button>
        <ReportBar
          value={group.loggedMinutes}
          reference={group.expectedMinutes}
          billable={group.billableMinutes}
          label={`${group.name}: ${figure} expected`}
        />
        <span className="text-right tabular-nums">
          <span className="block text-sm font-semibold whitespace-nowrap">
            {figure}
          </span>
          {/* A team with no change shows none, so the rows that moved stand out. */}
          {change && change.points !== 0 && (
            <span className="relative z-10 text-xs text-muted-foreground">
              <ChangeTip change={change} previousName={previousName} />
            </span>
          )}
        </span>
      </div>
      {isOpen && (
        <ul className="pb-2 pl-6">
          {group.people.map((person) => (
            <PersonRow
              key={person.userId}
              person={person}
              moves={person.moves}
              flag={marked.get(person.userId)}
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
  /** The previous period's people, for each team's change; none without one. */
  previousPeople?: PeopleReportRow[];
  /** The period compared with, for the changes' tips. */
  previousName: string;
  /** The people Needs attention names, with why. */
  marked: Map<string, string>;
  /**
   * The one team the page is narrowed to: its people then stand in one plain
   * list, since their other teams would show as groups with part of their
   * totals (Phase 42, decision 9).
   */
  isOneTeam?: boolean;
  onOpenPerson: (userId: string) => void;
};

/**
 * People by team, each with one bar of what they logged against what they
 * were expected to work. A long list starts folded to its teams.
 */
export const PeopleCard = ({
  people,
  previousPeople,
  previousName,
  marked,
  isOneTeam = false,
  onOpenPerson,
}: PeopleCardProps) => {
  const groups = groupPeopleByTeam(people);
  const previousGroups = new Map(
    groupPeopleByTeam(previousPeople ?? []).map((group) => [group.id, group]),
  );
  const changeOf = (group: TeamGroup) => {
    const previous = previousGroups.get(group.id);
    return previous
      ? shareChange(
          { part: group.loggedMinutes, whole: group.expectedMinutes },
          { part: previous.loggedMinutes, whole: previous.expectedMinutes },
        )
      : null;
  };
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
        <ReportCardTitle id="report-people" title="People" icon={UsersRound}>
          <p className="text-sm text-muted-foreground">
            Hours logged against what each person was expected to work
          </p>
          {marked.size > 0 && <AttentionLegend />}
        </ReportCardTitle>
        {!isOneTeam && groups.length > 1 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 max-sm:h-auto"
            onClick={() => setAll(!allOpen)}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        )}
      </div>

      <ul className="mt-3 @container">
        {isOneTeam
          ? people.map((person) => (
              <PersonRow
                key={person.userId}
                person={person}
                moves={person.teams[0]?.moves ?? []}
                flag={marked.get(person.userId)}
                onOpen={onOpenPerson}
              />
            ))
          : groups.map((group) => (
              <TeamRows
                key={group.id}
                group={group}
                change={changeOf(group)}
                previousName={previousName}
                marked={marked}
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
