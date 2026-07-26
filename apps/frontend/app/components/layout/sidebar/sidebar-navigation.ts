import {
  Activity,
  FolderKanban,
  FolderTree,
  LayoutDashboard,
} from "lucide-react";

export const managerNavigation = [
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
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];
