import { DataSource } from 'typeorm';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { ActCategoryStatus } from 'src/activity-categories/enums/category-status.enum';

import { CATEGORIES } from './seed-config';

export async function seedActivityCategories(
  dataSource: DataSource,
  companyId: string,
) {
  const categoryRepo = dataSource.getRepository(ActCategory);

  for (const name of CATEGORIES) {
    const existing = await categoryRepo.findOneBy({ companyId, name });

    if (!existing) {
      await categoryRepo.save(
        categoryRepo.create({
          companyId,
          name,
          status: ActCategoryStatus.ACTIVE,
        }),
      );
    }
  }

  console.log(`✅ Activity categories seeded (${CATEGORIES.length})`);
}
