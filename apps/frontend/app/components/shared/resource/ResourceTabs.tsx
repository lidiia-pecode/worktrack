"use client";

import { KeyboardEvent, ReactNode } from "react";

import { getNextTabIndex } from "@/lib/utils/tabs";

interface ResourceTabListProps {
  label: string;
  className?: string;
  children: ReactNode;
}

export const ResourceTabList = ({
  label,
  className,
  children,
}: ResourceTabListProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const currentIndex = tabs.findIndex((tab) => tab === event.target);
    if (currentIndex === -1) return;

    const nextIndex = getNextTabIndex(event.key, currentIndex, tabs.length);
    if (nextIndex === null) return;

    event.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={["flex items-center gap-1 border-b border-border", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};

interface ResourceTabButtonProps {
  id: string;
  controls: string;
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

export const ResourceTabButton = ({
  id,
  controls,
  active,
  label,
  icon,
  onClick,
}: ResourceTabButtonProps) => {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={[
        "group relative flex items-center gap-2",
        "px-3 py-2.5",
        "text-sm font-medium",
        "transition-colors",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-ring",
        "focus-visible:ring-offset-2",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "transition-colors",
          active ? "text-brand" : "text-muted-foreground",
        ].join(" ")}
      >
        {icon}
      </span>

      <span>{label}</span>

      <span
        aria-hidden="true"
        className={[
          "absolute inset-x-2 -bottom-px h-0.5 rounded-full",
          "transition-all",
          active ? "bg-brand opacity-100" : "bg-transparent opacity-0",
        ].join(" ")}
      />
    </button>
  );
};
