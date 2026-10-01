import type { ReactNode } from "react";

import type { ActivityArchiveImpact } from "@/types";

export const MAX_NAMED_PROJECTS = 6;

const projectNames = (names: string[]): ReactNode => {
  const named = names.slice(0, MAX_NAMED_PROJECTS);
  const others = names.length - named.length;
  const items = others > 0 ? [...named, `${others} more`] : named;

  let elementIndex = 0;

  return new Intl.ListFormat("en", { type: "conjunction" })
    .formatToParts(items)
    .map((part, index) => {
      if (part.type !== "element") return part.value;

      const isName = elementIndex++ < named.length;

      return isName ? (
        <strong key={index} className="font-semibold text-foreground">
          {part.value}
        </strong>
      ) : (
        part.value
      );
    });
};

export const archiveImpactMessage = (
  impact?: ActivityArchiveImpact,
): ReactNode => {
  if (!impact) return "Checking which projects use it...";

  const keepsTime =
    "Time already logged on it stays in reports, and restoring it puts it back on the same projects.";

  if (impact.projects.length === 0) {
    return `No active project offers it now.`;
  }

  const names = projectNames(impact.projects.map((project) => project.name));

  return (
    <>
      It will be removed from the activity lists of {names}, so nobody can log
      new time on it there. {keepsTime}
    </>
  );
};
