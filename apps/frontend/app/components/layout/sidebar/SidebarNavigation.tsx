import { cn } from "@/lib/utils";
import Link from "next/link";

import { ChevronRight, LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavigationProps = {
  navItems: NavigationItem[];
  pathname: string;
  onNavigate?: () => void;
};

export function SidebarNavigation({
  navItems,
  pathname,
  onNavigate,
}: NavigationProps) {
  return (
    <>
      <div className="mb-3 px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Management
        </span>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-3 transition-all duration-200",
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} />

                <span className="font-medium">{item.label}</span>
              </div>

              <ChevronRight
                size={16}
                className={cn(
                  isActive
                    ? "opacity-100"
                    : "opacity-0 transition-opacity group-hover:opacity-50",
                )}
              />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
