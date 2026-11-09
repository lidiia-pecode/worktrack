"use client";

import { UsersRound } from "lucide-react";

import { PeopleReportRow } from "@/types";
import { formatDayMonthLabel, formatReportHours } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { isDeactivatedUser } from "@/lib/utils/user";
import { daysOffLabel, percentOf } from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { ReportBar } from "./ReportBar";
import { ReportCardTitle } from "./ReportCardTitle";
import { AttentionLegend } from "./ReportRow";
import { CompactRow, ReportColumn, ReportTable } from "./ReportTable";

const NO_FIGURE = "—";

/**
 * The line under a name, in muted text so the name never wraps for it: their
 * teams, where they joined or left the team filtered to, whether they left
 * the company, and their days off. "Legacy Support · deactivated · 2 days off".
 */
const detailOf = (person: PeopleReportRow, isTeamFiltered: boolean) => {
  const moves = isTeamFiltered
    ? (person.teams[0]?.moves ?? []).map(
        ({ direction, date }) =>
          `${direction === "in" ? "joined" : "moved out"} ${formatDayMonthLabel(date)}`,
      )
    : [];
  const teams = isTeamFiltered
    ? []
    : [person.teams.map((team) => team.name).join(", ")];

  return [
    ...teams,
    ...moves,
    isDeactivatedUser(person) && "deactivated",
    person.timeOffDays > 0 && daysOffLabel(person.timeOffDays),
  ]
    .filter(Boolean)
    .join(" · ");
};

/** How far logged time is from what was expected, either way. */
const gapOf = (person: PeopleReportRow) =>
  Math.abs(person.loggedMinutes - person.expectedMinutes);

/**
 * The table opens on the people furthest from what was expected, under or
 * over, so they stand out; those expected to work nothing come last.
 */
const byGap = (people: PeopleReportRow[]) =>
  [...people].sort(
    (a, b) =>
      Number(a.expectedMinutes === 0) - Number(b.expectedMinutes === 0) ||
      gapOf(b) - gapOf(a),
  );

const shareOfExpected = (person: PeopleReportRow) =>
  person.expectedMinutes > 0
    ? person.loggedMinutes / person.expectedMinutes
    : null;

const shareLabel = (person: PeopleReportRow) => {
  const share = shareOfExpected(person);
  return share === null ? NO_FIGURE : `${Math.round(share * 100)}%`;
};

const isOverExpected = (person: PeopleReportRow) =>
  (shareOfExpected(person) ?? 0) > 1;

const billableLabel = (person: PeopleReportRow) =>
  person.loggedMinutes > 0
    ? `${percentOf(person.billableMinutes, person.loggedMinutes)}%`
    : NO_FIGURE;

const barOf = (person: PeopleReportRow) => (
  <ReportBar
    value={person.loggedMinutes}
    reference={person.expectedMinutes}
    billable={person.billableMinutes}
    className="flex-1"
  />
);

/** Where the columns don't fit: "56h of 176h", then the shares. */
const compactOf = (person: PeopleReportRow): CompactRow => ({
  figure:
    person.expectedMinutes > 0
      ? `${formatReportHours(person.loggedMinutes)} of ${formatReportHours(person.expectedMinutes)}`
      : formatReportHours(person.loggedMinutes),
  note: (
    <>
      <span className={cn(isOverExpected(person) && "text-warning-text")}>
        {person.expectedMinutes > 0 ? shareLabel(person) : "nothing expected"}
      </span>
      {person.loggedMinutes > 0 && ` · ${billableLabel(person)} billable`}
    </>
  ),
  bar: barOf(person),
});

const COLUMNS: ReportColumn<PeopleReportRow>[] = [
  {
    header: "Logged",
    numeric: true,
    width: "w-24",
    cell: (person) => formatReportHours(person.loggedMinutes),
    sortValue: (person) => person.loggedMinutes,
  },
  {
    header: "Expected",
    numeric: true,
    width: "w-24",
    cell: (person) =>
      person.expectedMinutes > 0
        ? formatReportHours(person.expectedMinutes)
        : NO_FIGURE,
    sortValue: (person) =>
      person.expectedMinutes > 0 ? person.expectedMinutes : null,
  },
  {
    header: "Of expected",
    numeric: true,
    width: "w-56",
    cell: (person) => (
      <span className="flex items-center gap-3">
        {barOf(person)}
        <span
          className={cn("w-12", isOverExpected(person) && "text-warning-text")}
        >
          {shareLabel(person)}
        </span>
      </span>
    ),
    sortValue: shareOfExpected,
  },
  {
    header: "Billable",
    numeric: true,
    width: "w-24",
    cell: billableLabel,
    sortValue: (person) =>
      person.loggedMinutes > 0
        ? person.billableMinutes / person.loggedMinutes
        : null,
  },
];

type PeopleCardProps = {
  people: PeopleReportRow[];
  /** The people Needs attention names, with why. */
  marked: Map<string, string>;
  /** Narrowed to one team, so each row is that team's days. */
  isTeamFiltered?: boolean;
  onOpenPerson: (userId: string) => void;
};

/**
 * Everyone in the period once: what they logged, what they were expected to
 * work, how much of it they logged and how much of that is billable. The rows
 * add up to the period.
 */
export const PeopleCard = ({
  people,
  marked,
  isTeamFiltered = false,
  onOpenPerson,
}: PeopleCardProps) => (
  <Card as="section" aria-labelledby="report-people" className="p-6">
    <ReportCardTitle id="report-people" title="People" icon={UsersRound}>
      {marked.size > 0 && <AttentionLegend />}
    </ReportCardTitle>

    <div className="mt-3">
      <ReportTable
        label="People"
        rows={byGap(people)}
        getKey={(person) => person.userId}
        getName={(person) => person.name}
        getDetail={(person) => detailOf(person, isTeamFiltered)}
        getFlag={(person) => marked.get(person.userId)}
        onOpen={(person) => onOpenPerson(person.userId)}
        nameHeader="Person"
        columns={COLUMNS}
        noun={["person", "people"]}
        compact={compactOf}
      />
    </div>
  </Card>
);
