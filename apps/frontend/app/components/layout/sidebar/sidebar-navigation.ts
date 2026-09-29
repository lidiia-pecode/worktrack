import {
  Activity,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  Clock3,
  FolderKanban,
  FileBarChart,
  FolderTree,
  ListChecks,
  Users,
} from "lucide-react";

import { GETTING_STARTED_PATH } from "@/lib/constants";

import { NavigationItem } from "./SidebarNavigation";

export const managerNavigation: NavigationItem[] = [
  {
    label: "Getting started",
    href: GETTING_STARTED_PATH,
    icon: ListChecks,
    ownerOnly: true,
  },
  {
    label: "Team time",
    href: "/team",
    icon: CalendarRange,
  },
  {
    label: "Planning",
    href: "/planning",
    icon: CalendarClock,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileBarChart,
  },
  {
    label: "Timesheet",
    href: "/timesheet",
    icon: Clock3,
  },
  {
    label: "Teams",
    href: "/admin/teams",
    icon: Users,
  },

  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },

  {
    label: "Projects",
    href: "/admin/projects",
    icon: FolderKanban,
  },
  {
    label: "Activities",
    href: "/admin/activities",
    icon: Activity,
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    label: "Periods",
    href: "/admin/periods",
    icon: CalendarCheck,
    ownerOnly: true,
  },
];

export const employeeNavigation: NavigationItem[] = [
  {
    label: "Timesheet",
    href: "/timesheet",
    icon: Clock3,
  },
];
