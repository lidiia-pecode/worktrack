import { DataSource } from 'typeorm';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { Project } from 'src/projects/entities/project.entity';

import { TIME_LOGS, dayOfWeek } from './seed-config';
import { buildLookups } from './seed-lookups';

export async function seedTimeLogs(dataSource: DataSource, companyId: string) {
  const timeLogRepo = dataSource.getRepository(TimeLog);
  const lookup = await buildLookups(dataSource, companyId);
  const activities = await dataSource
    .getRepository(Activity)
    .findBy({ companyId });
  const projects = await dataSource
    .getRepository(Project)
    .findBy({ companyId });

  for (const item of TIME_LOGS) {
    const userId = lookup.userId(item.email);
    const projectActivityId = lookup.projectActivityId(
      item.project,
      item.activity,
    );
    const date = dayOfWeek(item.day);

    const existing = await timeLogRepo.findOneBy({
      companyId,
      userId,
      projectActivityId,
      date,
    });

    if (!existing) {
      const activity = activities.find((a) => a.name === item.activity);
      const project = projects.find((p) => p.name === item.project);

      await timeLogRepo.save(
        timeLogRepo.create({
          companyId,
          userId,
          projectActivityId,
          date,
          minutes: item.minutes,
          // The same default the service applies: internal work starts off.
          isBillable:
            Boolean(project?.clientName) && (activity?.defaultBillable ?? true),
          note: `${item.activity} on ${item.project}`,
        }),
      );
    }
  }

  console.log(`✅ Time logs seeded (${TIME_LOGS.length})`);
}
