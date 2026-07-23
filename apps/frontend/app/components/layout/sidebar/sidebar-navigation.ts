import {
  Activity,
  FolderKanban,
  FolderTree,
  LayoutDashboard,
} from "lucide-react";

export const managerNavigation = [
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Activities",
    href: "/activities",
    icon: Activity,
  },
  {
    label: "Categories",
    href: "/categories",
    icon: FolderTree,
  },
];

export const employeeNavigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];
