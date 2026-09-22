import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Project } from 'src/projects/entities/project.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';

/** Turns the emails and names used in `seed-config` into ids. */
export async function buildLookups(dataSource: DataSource, companyId: string) {
  const users = await dataSource.getRepository(User).findBy({ companyId });
  const projects = await dataSource
    .getRepository(Project)
    .findBy({ companyId });
  const activities = await dataSource
    .getRepository(Activity)
    .findBy({ companyId });
  const projectActivities = await dataSource
    .getRepository(ProjectActivity)
    .findBy({ companyId });

  return {
    userId(email: string): string {
      const user = users.find((u) => u.email === email);
      if (!user) throw new Error(`User "${email}" not found`);
      return user.id;
    },

    projectId(projectName: string): string {
      const project = projects.find((p) => p.name === projectName);
      if (!project) throw new Error(`Project "${projectName}" not found`);
      return project.id;
    },

    projectActivityId(projectName: string, activityName: string): string {
      const project = projects.find((p) => p.name === projectName);
      const activity = activities.find((a) => a.name === activityName);

      if (!project) throw new Error(`Project "${projectName}" not found`);
      if (!activity) throw new Error(`Activity "${activityName}" not found`);

      const link = projectActivities.find(
        (pa) => pa.projectId === project.id && pa.activityId === activity.id,
      );

      if (!link) {
        throw new Error(`"${activityName}" is not on project "${projectName}"`);
      }

      return link.id;
    },
  };
}
