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
    const category = item.category
      ? categories.find((c) => c.name === item.category)
      : null;

    if (category === undefined) {
      throw new Error(`Activity category "${item.category}" not found`);
    }

    // Names are unique per company, whatever the category.
    const existing = await activityRepo.findOneBy({
      companyId,
      name: item.name,
    });

    if (!existing) {
      await activityRepo.save(
        activityRepo.create({
          companyId,
          categoryId: category?.id ?? null,
          name: item.name,
          defaultBillable: item.billable,
          status: item.status ?? ActivityStatus.ACTIVE,
        }),
      );
    }
  }

  console.log(`✅ Activities seeded (${ACTIVITIES.length})`);
}
