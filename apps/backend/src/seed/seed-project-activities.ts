import { DataSource } from 'typeorm';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { Project } from 'src/projects/entities/project.entity';
import { Activity } from 'src/activities/entities/activity.entity';

import { PROJECTS } from './seed-config';

export async function seedProjectActivities(
  dataSource: DataSource,
  companyId: string,
) {
  const repo = dataSource.getRepository(ProjectActivity);
  const projects = await dataSource
    .getRepository(Project)
    .findBy({ companyId });
  const activities = await dataSource
    .getRepository(Activity)
    .findBy({ companyId });

  let created = 0;

  for (const data of PROJECTS) {
    const project = projects.find((p) => p.name === data.name);

    if (!project) throw new Error(`Project "${data.name}" not found`);

    for (const activityName of data.activities) {
      const activity = activities.find((a) => a.name === activityName);

      if (!activity) throw new Error(`Activity "${activityName}" not found`);

      const existing = await repo.findOneBy({
        companyId,
        projectId: project.id,
        activityId: activity.id,
      });

      if (!existing) {
        await repo.save(
          repo.create({
            companyId,
            projectId: project.id,
            activityId: activity.id,
            isActive: true,
          }),
        );
        created += 1;
      }
    }
  }

  console.log(`✅ Project activities seeded (${created} new)`);
}
