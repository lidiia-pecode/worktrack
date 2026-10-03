import Link from "next/link";
import { useId } from "react";

import { cn } from "@/lib/utils/cn";

import {
  gettingStarted,
  isActivePath,
  NavigationGroup,
  NavigationItem,
} from "./sidebar-navigation";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none";

type NavigationLinkProps = {
  item: NavigationItem;
  isActive: boolean;
  onNavigate?: () => void;
};

const NavigationLink = ({
  item,
  isActive,
  onNavigate,
}: NavigationLinkProps) => {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        FOCUS_RING,
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          !isActive &&
            "text-muted-foreground group-hover:text-sidebar-accent-foreground",
        )}
        aria-hidden="true"
      />
      {item.label}
    </Link>
  );
};

type NavigationGroupListProps = {
  group: NavigationGroup;
  pathname: string;
  onNavigate?: () => void;
};

const NavigationGroupList = ({
  group,
  pathname,
  onNavigate,
}: NavigationGroupListProps) => {
  const headingId = useId();

  return (
    <div className="border-t border-sidebar-border pt-4 first:border-t-0 first:pt-0">
      {group.label && (
        <p
          id={headingId}
          className="mb-1.5 px-3 text-xs font-semibold text-muted-foreground"
        >
          {group.label}
        </p>
      )}

      <ul
        aria-labelledby={group.label ? headingId : undefined}
        className="space-y-0.5"
      >
        {group.items.map((item) => (
          <li key={item.href}>
            <NavigationLink
              item={item}
              isActive={isActivePath(pathname, item.href)}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

type SidebarNavigationProps = {
  groups: NavigationGroup[];
  pathname: string;
  onNavigate?: () => void;
};

export const SidebarNavigation = ({
  groups,
  pathname,
  onNavigate,
}: SidebarNavigationProps) => (
  <nav aria-label="Main" className="space-y-4">
    {groups.map((group) => (
      <NavigationGroupList
        key={group.label ?? "main"}
        group={group}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    ))}
  </nav>
);

type GettingStartedLinkProps = {
  isSetupOpen: boolean;
  pathname: string;
  onNavigate?: () => void;
};

/** The owner's help area: the setup checklist while it's open, then a guide. */
export const GettingStartedLink = ({
  isSetupOpen,
  pathname,
  onNavigate,
}: GettingStartedLinkProps) => {
  const Icon = gettingStarted.icon;
  const isActive = isActivePath(pathname, gettingStarted.href);

  return (
    <Link
      href={gettingStarted.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-brand-strong p-3 transition-colors",
        FOCUS_RING,
        isActive ? "bg-brand-muted" : "bg-brand-subtle hover:bg-brand-muted",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">
          {gettingStarted.label}
        </span>
        <span className="block text-xs text-muted-foreground">
          {isSetupOpen
            ? "Finish setting up your company"
            : "How WorkTrack fits together"}
        </span>
      </span>
    </Link>
  );
};
