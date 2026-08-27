import {
  Activity,
  Clock3,
  FolderKanban,
  FolderTree,
  Users,
} from "lucide-react";

export const managerNavigation = [
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
];

export const employeeNavigation = [
  {
    label: "Timesheet",
    href: "/dashboard",
    icon: Clock3,
  },
];
