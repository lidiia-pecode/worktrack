"use client";

import { Building2, Lock, UserRound, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type SettingsTab = "profile" | "security" | "company";

type Props = {
  activeTab: SettingsTab;
  isOwner: boolean;
  onChange: (tab: SettingsTab) => void;
};

type SettingsNavItem = {
  id: SettingsTab;
  label: string;
  description: string;
  icon: LucideIcon;
};

const items: SettingsNavItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Personal information",
    icon: UserRound,
  },
  {
    id: "security",
    label: "Security",
    description: "Password and account security",
    icon: Lock,
  },
  {
    id: "company",
    label: "Company",
    description: "Workspace preferences",
    icon: Building2,
  },
];

export const SettingsSidebar = ({ activeTab, isOwner, onChange }: Props) => {
  const visibleItems = isOwner
    ? items
    : items.filter((item) => item.id !== "company");

  return (
    <aside className="w-full shrink-0 md:w-60">
      <nav className="space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left",
                "border border-transparent transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                active
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  "border transition-colors",
                  active
                    ? "border-blue-500/30 bg-blue-500/20 text-blue-300"
                    : "border-white/5 bg-white/[0.04] text-slate-400 group-hover:text-slate-300",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-blue-300" : "text-slate-200",
                  )}
                >
                  {item.label}
                </div>

                <div className="mt-0.5 truncate text-xs text-slate-400">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
