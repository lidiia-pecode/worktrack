import {
  Activity,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  Clock3,
  FileBarChart,
  FolderKanban,
  FolderTree,
  LockKeyhole,
  LucideIcon,
  Network,
  Rocket,
  Users,
} from "lucide-react";

import { GETTING_STARTED_PATH } from "@/lib/constants";
import { UserRole } from "@/types/enums";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  /** Left out when the role has only one group, where a label adds nothing. */
  label?: string;
  items: NavigationItem[];
};

export const teamTime = {
  label: "Team time",
  href: "/team",
  icon: CalendarRange,
};
export const timesheet = {
  label: "Log my time",
  href: "/timesheet",
  icon: Clock3,
};
export const myTime = {
  label: "Review my time",
  href: "/my-time",
  icon: CalendarCheck,
};
export const planning = {
  label: "Planning",
  href: "/planning",
  icon: CalendarClock,
};
export const reports = {
  label: "Reports",
  href: "/reports",
  icon: FileBarChart,
};

export const people = { label: "People", href: "/admin/users", icon: Users };
export const teams = { label: "Teams", href: "/admin/teams", icon: Network };
export const projects = {
  label: "Projects",
  href: "/admin/projects",
  icon: FolderKanban,
};
export const activities = {
  label: "Activities",
  href: "/admin/activities",
  icon: Activity,
};
export const categories = {
  label: "Categories",
  href: "/admin/categories",
  icon: FolderTree,
};
export const periods = {
  label: "Periods",
  href: "/admin/periods",
  icon: LockKeyhole,
};

/** The owner's help area, kept apart from the menu groups. */
export const gettingStarted = {
  label: "Getting started",
  href: GETTING_STARTED_PATH,
  icon: Rocket,
};

export const navigationFor = (role: UserRole): NavigationGroup[] => {
  if (role === UserRole.EMPLOYEE) {
    return [{ items: [timesheet, myTime] }];
  }

  // Company-wide structure (teams, the catalogue, periods) is the owner's;
  // managers run their people and projects.
  const manageItems =
    role === UserRole.OWNER
      ? [people, teams, projects, activities, categories, periods]
      : [people, projects];

  return [
    { label: "Work", items: [teamTime, timesheet, myTime, planning, reports] },
    { label: "Manage", items: manageItems },
  ];
};

export const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export const settings = { label: "Settings", href: "/settings" };

/** The current page's name, for the phone header, where the sidebar is hidden. */
export const pageLabelFor = (role: UserRole, pathname: string) =>
  [
    ...navigationFor(role).flatMap((group) => group.items),
    gettingStarted,
    settings,
  ].find((item) => isActivePath(pathname, item.href))?.label;
