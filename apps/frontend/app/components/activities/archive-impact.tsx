import type { ReactNode } from "react";

import type { ActivityArchiveImpact } from "@/types";

export const MAX_NAMED = 6;

type ImpactProject = ActivityArchiveImpact["projects"][number];

/** Names in bold, as a sentence list, with the rest counted after the first few. */
export const boldNameList = (names: string[]): ReactNode => {
  const named = names.slice(0, MAX_NAMED);
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

/** Each project once, by name, when several activities share it. */
const distinctProjects = (projects: ImpactProject[]): ImpactProject[] =>
  [...new Map(projects.map((project) => [project.id, project])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );

const projectsImpactMessage = (
  projects: ImpactProject[],
  activityCount: number,
): ReactNode => {
  const isOne = activityCount === 1;
  const subject = isOne ? "It" : "They";
  const object = isOne ? "it" : "them";

  if (projects.length === 0) {
    return `No active project offers ${object} now.`;
  }

  const names = boldNameList(
    distinctProjects(projects).map(({ name }) => name),
  );

  return (
    <>
      {subject} will be removed from the activity lists of {names}, so nobody
      can log new time on {object} there. Time already logged on {object} stays
      in reports, and restoring {object} puts {object} back on the same
      projects.
    </>
  );
};

export const archiveImpactMessage = (
  impact?: ActivityArchiveImpact,
): ReactNode => {
  if (!impact) return "Checking which projects use it...";

  return projectsImpactMessage(impact.projects, 1);
};

export const activitiesArchiveImpactMessage = (
  activities: { projects: ImpactProject[] }[],
): ReactNode =>
  projectsImpactMessage(
    activities.flatMap((activity) => activity.projects),
    activities.length,
  );
