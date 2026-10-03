import {
  Activity,
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

const teamTime = { label: "Team time", href: "/team", icon: CalendarRange };
const timesheet = { label: "Timesheet", href: "/timesheet", icon: Clock3 };
const planning = { label: "Planning", href: "/planning", icon: CalendarClock };
const reports = { label: "Reports", href: "/reports", icon: FileBarChart };

const users = { label: "Users", href: "/admin/users", icon: Users };
const teams = { label: "Teams", href: "/admin/teams", icon: Network };
const projects = {
  label: "Projects",
  href: "/admin/projects",
  icon: FolderKanban,
};
const activities = {
  label: "Activities",
  href: "/admin/activities",
  icon: Activity,
};
const categories = {
  label: "Categories",
  href: "/admin/categories",
  icon: FolderTree,
};
const periods = { label: "Periods", href: "/admin/periods", icon: LockKeyhole };

/** The owner's help area, kept apart from the menu groups. */
export const gettingStarted = {
  label: "Getting started",
  href: GETTING_STARTED_PATH,
  icon: Rocket,
};

export const navigationFor = (role: UserRole): NavigationGroup[] => {
  if (role === UserRole.EMPLOYEE) {
    return [{ items: [timesheet] }];
  }

  const manageItems = [users, teams, projects, activities, categories];

  if (role === UserRole.OWNER) {
    manageItems.push(periods);
  }

  return [
    { label: "Work", items: [teamTime, timesheet, planning, reports] },
    { label: "Manage", items: manageItems },
  ];
};

export const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
