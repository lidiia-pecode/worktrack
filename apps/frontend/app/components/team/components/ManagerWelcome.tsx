"use client";

import { UserRound } from "lucide-react";

import { useTeamOptions } from "@/hooks/useTeams";

import { WelcomeCard, type WelcomeItem } from "../../shared/WelcomeCard";
import {
  planning,
  projects,
  reports,
  settings,
  teamTime,
  timesheet,
} from "../../layout/sidebar/sidebar-navigation";

interface ManagerWelcomeProps {
  userId: string;
  firstName: string;
  tracksOwnTime: boolean;
}

const TEAM_TIME_ITEM: WelcomeItem = {
  icon: teamTime.icon,
  title: "Your team's time",
  description: "See who logged what each week, and correct it right here.",
};

const PLANNING_ITEM: WelcomeItem = {
  icon: planning.icon,
  title: "Plan their month",
  description: "Book their time on projects in Planning.",
  href: planning.href,
};

const OWN_TIME_ITEM: WelcomeItem = {
  icon: timesheet.icon,
  title: "Log your own time",
  description: "Your hours and absences, in Log my time.",
  href: timesheet.href,
};

const REPORTS_ITEM: WelcomeItem = {
  icon: reports.icon,
  title: "Report on hours",
  description: "Logged against expected and planned, in Reports.",
  href: reports.href,
};

const PROJECTS_ITEM: WelcomeItem = {
  icon: projects.icon,
  title: "Projects",
  description:
    "Create projects, choose their activities and put people on them.",
  href: projects.href,
};

const ACCOUNT_ITEM: WelcomeItem = {
  icon: UserRound,
  title: "Your account",
  description: "Your name, password and Google sign-in, in Settings.",
  href: settings.href,
};

export const managerWelcomeKey = (userId: string) =>
  `worktrack:manager-welcome:${userId}`;

const teamNames = (names: string[]) =>
  new Intl.ListFormat("en", { type: "conjunction" }).format(names);

export const ManagerWelcome = ({
  userId,
  firstName,
  tracksOwnTime,
}: ManagerWelcomeProps) => {
  const { options: teams, isLoading } = useTeamOptions();

  if (isLoading) return null;

  const leadsTeam = teams.length > 0;
  // Without time of their own, Log my time is out of their menu.
  const ownItem = tracksOwnTime ? OWN_TIME_ITEM : REPORTS_ITEM;

  const status = leadsTeam
    ? `You lead ${teamNames(teams.map((team) => team.label))}.`
    : "You don't lead a team yet. When you do, its people and their time appear here.";

  return (
    <WelcomeCard
      dismissKey={managerWelcomeKey(userId)}
      firstName={firstName}
      status={status}
      items={
        leadsTeam
          ? [TEAM_TIME_ITEM, PLANNING_ITEM, ownItem]
          : [PROJECTS_ITEM, ownItem, ACCOUNT_ITEM]
      }
      className="mb-6"
    />
  );
};
