import { In, Repository } from 'typeorm';

import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import type { Project } from 'src/projects/entities/project.entity';

export type OfferingProject = Pick<Project, 'id' | 'name'>;

/** The active projects that offer each activity now, by activity id. */
export const findOfferingProjects = async (
  projectActivityRepo: Repository<ProjectActivity>,
  companyId: string,
  activityIds: string[],
): Promise<Map<string, OfferingProject[]>> => {
  const projectsByActivity = new Map<string, OfferingProject[]>(
    activityIds.map((id) => [id, []]),
  );
  if (!activityIds.length) return projectsByActivity;

  const links = await projectActivityRepo.find({
    where: {
      companyId,
      activityId: In(activityIds),
      isActive: true,
      project: { status: ProjectStatus.ACTIVE },
    },
    relations: { project: true },
    order: { project: { name: 'ASC' } },
  });

  for (const { activityId, project } of links) {
    projectsByActivity
      .get(activityId)
      ?.push({ id: project.id, name: project.name });
  }

  return projectsByActivity;
};

/** Activities still linked to a project, archived projects included, since restoring one brings its links back; a removed link does not count. */
export const findActivitiesInUse = async (
  projectActivityRepo: Repository<ProjectActivity>,
  activityIds: string[],
): Promise<Set<string>> => {
  if (!activityIds.length) return new Set();

  const links = await projectActivityRepo.find({
    select: { activityId: true },
    where: { activityId: In(activityIds), isActive: true },
  });

  return new Set(links.map((link) => link.activityId));
};
