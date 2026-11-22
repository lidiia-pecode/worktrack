"use client";

import { CalendarOff, UserRound } from "lucide-react";

import { UserRole } from "@/types/enums";
import { GRACE_DAYS } from "@/lib/utils/reporting-period";

import { PageHeader } from "../shared/PageHeader";
import { GuideCard } from "./workspace-setup/SetupGuide";
import { SetupStepItem } from "./workspace-setup/SetupStepRow";
import {
  myTime,
  people,
  periods,
  planning,
  projects,
  reports,
  settings,
  teamTime,
  timesheet,
} from "../layout/sidebar/sidebar-navigation";

const topic = (item: Omit<SetupStepItem, "completed">): SetupStepItem => ({
  ...item,
  completed: false,
});

const managerTopics = (tracksOwnTime: boolean): SetupStepItem[] => [
  topic({
    id: "team-time",
    title: teamTime.label,
    description:
      "Your team's week: who logged what, days with no time, absences. Correct an entry or add an absence for someone right in the grid.",
    icon: teamTime.icon,
    link: { label: "Open Team time", href: teamTime.href },
  }),
  topic({
    id: "planning",
    title: planning.label,
    description:
      "Plan your team's month by project. A plan can't go over someone's hours; one left above them after their hours change shows \"Over by\".",
    icon: planning.icon,
    link: { label: "Open Planning", href: planning.href },
  }),
  topic({
    id: "reports",
    title: reports.label,
    description:
      "Logged hours against expected and planned, by person and project. Needs attention names missing days and projects off plan; export to Excel.",
    icon: reports.icon,
    link: { label: "Open Reports", href: reports.href },
  }),
  topic({
    id: "projects",
    title: projects.label,
    description:
      "Create projects, choose their activities, and put your people, and yourself, on them. Only people on a project can log time to it.",
    icon: projects.icon,
    link: { label: "Open projects", href: projects.href },
  }),
  topic({
    id: "people",
    title: people.label,
    description:
      "Invite employees into your team by email. Their roles and working hours are set by the owner.",
    icon: people.icon,
    link: { label: "Open People", href: people.href },
  }),
  // Only while Log my time is in their menu.
  ...(tracksOwnTime
    ? [
        topic({
          id: "own-time",
          title: "Your own time",
          description:
            "Log your hours and absences, and review your month, like everyone else.",
          icon: timesheet.icon,
          link: { label: "Open Log my time", href: timesheet.href },
        }),
      ]
    : []),
  topic({
    id: "month-end",
    title: "Month end",
    description: `A month can still be changed for ${GRACE_DAYS} days after it ends, then it locks. Only the owner can reopen it to correct time.`,
    icon: periods.icon,
  }),
];

const EMPLOYEE_TOPICS: SetupStepItem[] = [
  topic({
    id: "log-time",
    title: "Log your time",
    description:
      "Click a day, pick a project and an activity, and enter the hours. You see the projects you're on.",
    icon: timesheet.icon,
    link: { label: "Open Log my time", href: timesheet.href },
  }),
  topic({
    id: "plans",
    title: "Plans",
    description:
      "A light block on a day is what your manager planned. Click it to log that time.",
    icon: planning.icon,
  }),
  topic({
    id: "absences",
    title: "Absences",
    description:
      "Add a holiday or a sick day; it lowers what's expected of you on those days.",
    icon: CalendarOff,
    link: { label: "Add an absence", href: timesheet.href },
  }),
  topic({
    id: "your-month",
    title: "Your month",
    description:
      "Hours against expected, days still to fill and your projects.",
    icon: myTime.icon,
    link: { label: "Open Review my time", href: myTime.href },
  }),
  topic({
    id: "month-end",
    title: "Month end",
    description: `You can still change a month for ${GRACE_DAYS} days after it ends, then it locks. To correct a locked month, ask your manager.`,
    icon: periods.icon,
  }),
  topic({
    id: "account",
    title: "Your account",
    description: "Change your name or password, or link your Google account.",
    icon: UserRound,
    link: { label: "Open Settings", href: settings.href },
  }),
];

type RoleGuideProps = {
  role: UserRole.MANAGER | UserRole.EMPLOYEE;
  tracksOwnTime: boolean;
};

/** Getting started for a manager or an employee: how WorkTrack works for them. */
export const RoleGuide = ({ role, tracksOwnTime }: RoleGuideProps) => {
  const isManager = role === UserRole.MANAGER;

  return (
    <section className="w-full max-w-3xl">
      <PageHeader
        title={
          isManager
            ? "How WorkTrack works for a manager"
            : "How WorkTrack works for you"
        }
        description="Each part links to where you do it. Come back whenever you need a reminder."
      />

      <GuideCard
        topics={isManager ? managerTopics(tracksOwnTime) : EMPLOYEE_TOPICS}
      />
    </section>
  );
};
