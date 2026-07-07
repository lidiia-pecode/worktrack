import { DataSource } from 'typeorm';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';

export async function seedActivityCategories(dataSource: DataSource) {
  const repo = dataSource.getRepository(ActCategory);

  await repo.upsert(
    [
      { name: 'Development' },
      { name: 'Meetings' },
      { name: 'Quality Assurance' },
      { name: 'Design' },
      { name: 'Management' },
    ],
    {
      conflictPaths: ['name'],
    },
  );

  console.log('✅ Activity categories seeded');
}
