import { DataSource } from 'typeorm';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';

import { PLANNING, OWNER_EMAIL, dayOfWeek } from './seed-config';
import { buildLookups } from './seed-lookups';

export async function seedPlanning(dataSource: DataSource, companyId: string) {
  const planningRepo = dataSource.getRepository(PlanningEntry);
  const lookup = await buildLookups(dataSource, companyId);
  const createdById = lookup.userId(OWNER_EMAIL);

  for (const item of PLANNING) {
    const userId = lookup.userId(item.email);
    const projectActivityId = lookup.projectActivityId(
      item.project,
      item.activity,
    );
    const date = dayOfWeek(item.day);

    const existing = await planningRepo.findOneBy({
      companyId,
      userId,
      projectActivityId,
      date,
    });

    if (!existing) {
      await planningRepo.save(
        planningRepo.create({
          companyId,
          userId,
          projectActivityId,
          createdById,
          date,
          plannedMinutes: item.minutes,
        }),
      );
    }
  }

  console.log(`✅ Planning entries seeded (${PLANNING.length})`);
}
