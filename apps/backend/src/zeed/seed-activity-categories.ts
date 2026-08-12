import { DataSource } from 'typeorm';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { ActCategoryStatus } from 'src/activity-categories/enums/category-status';

export async function seedActivityCategories(
  dataSource: DataSource,
  companyId: string,
) {
  const categoryRepo = dataSource.getRepository(ActCategory);

  const categoryNames = [
    'Development',
    'Meetings',
    'Quality Assurance',
    'Design',
    'Management',
  ];

  for (const name of categoryNames) {
    const existing = await categoryRepo.findOne({
      where: { companyId, name },
    });

    if (!existing) {
      const category = categoryRepo.create({
        companyId,
        name,
        status: ActCategoryStatus.ACTIVE,
      });

      await categoryRepo.save(category);
    }
  }

  console.log('✅ Activity categories seeded via Repository');
}
