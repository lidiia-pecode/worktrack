import { DataSource } from 'typeorm';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';

import { ACTIVITIES } from './seed-config';

export async function seedActivities(
  dataSource: DataSource,
  companyId: string,
) {
  const activityRepo = dataSource.getRepository(Activity);
  const categories = await dataSource
    .getRepository(ActCategory)
    .findBy({ companyId });

  for (const item of ACTIVITIES) {
    const category = categories.find((c) => c.name === item.category);

    if (!category) {
      throw new Error(`Activity category "${item.category}" not found`);
    }

    const existing = await activityRepo.findOneBy({
      companyId,
      categoryId: category.id,
      name: item.name,
    });

    if (!existing) {
      await activityRepo.save(
        activityRepo.create({
          companyId,
          categoryId: category.id,
          name: item.name,
          isAbsence: item.isAbsence ?? false,
          defaultBillable: item.billable,
          status: ActivityStatus.ACTIVE,
        }),
      );
    }
  }

  console.log(`✅ Activities seeded (${ACTIVITIES.length})`);
}
