import {
  Activity,
  FolderKanban,
  FolderTree,
  LayoutDashboard,
  Users,
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

  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
];

export const employeeNavigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];
