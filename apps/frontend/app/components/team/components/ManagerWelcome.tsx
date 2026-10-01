"use client";

import {
  BarChart3,
  CalendarRange,
  Clock,
  FolderKanban,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { useTeamOptions } from "@/hooks/useTeams";

import { WelcomeCard, type WelcomeItem } from "../../shared/WelcomeCard";

interface ManagerWelcomeProps {
  userId: string;
  firstName: string;
}

const TEAM_ITEMS: WelcomeItem[] = [
  {
    icon: UsersRound,
    title: "Your team's time",
    description: "See who logged what this week, and correct it, right here.",
  },
  {
    icon: CalendarRange,
    title: "Plan their week",
    description: "Book their time on projects, week by week, in Planning.",
  },
  {
    icon: BarChart3,
    title: "Report on their hours",
    description: "Hours, utilisation and planned against actual, in Reports.",
  },
  {
    icon: UserPlus,
    title: "Invite employees",
    description: "Invite people straight into a team you lead, from Users.",
  },
];

const OWN_ITEMS: WelcomeItem[] = [
  {
    icon: FolderKanban,
    title: "Projects and activities",
    description:
      "Create projects and activities in Projects, and put your people and yourself on them.",
  },
  {
    icon: Clock,
    title: "Your own time",
    description: "Log your own hours and absences in Timesheet.",
  },
];

export const managerWelcomeKey = (userId: string) =>
  `worktrack:manager-welcome:${userId}`;

const teamNames = (names: string[]) =>
  new Intl.ListFormat("en", { type: "conjunction" }).format(names);

export const ManagerWelcome = ({ userId, firstName }: ManagerWelcomeProps) => {
  const { options: teams, isLoading } = useTeamOptions();

  const leadsTeam = teams.length > 0;

  const status = isLoading
    ? "Checking which teams you lead..."
    : leadsTeam
      ? `You lead ${teamNames(teams.map((team) => team.label))}.`
      : "You don't lead a team yet. When you do, its people and their time appear here.";

  return (
    <WelcomeCard
      dismissKey={managerWelcomeKey(userId)}
      firstName={firstName}
      status={status}
      items={leadsTeam ? [...TEAM_ITEMS, ...OWN_ITEMS] : OWN_ITEMS}
      className="mb-6"
    />
  );
};
