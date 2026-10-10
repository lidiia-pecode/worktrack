import type { ActivityArchiveImpact } from "@/types";

type ImpactProject = ActivityArchiveImpact["projects"][number];

/** Each project once, by name, when several activities share it. */
export const distinctProjects = (projects: ImpactProject[]): ImpactProject[] =>
  [...new Map(projects.map((project) => [project.id, project])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
