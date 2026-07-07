import { DataSource } from 'typeorm';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';

export async function seedActivities(dataSource: DataSource) {
  const activityRepo = dataSource.getRepository(Activity);
  const categoryRepo = dataSource.getRepository(ActCategory);

  const categories = await categoryRepo.find();

  const byName = (name: string) => {
    const category = categories.find((c) => c.name === name);

    if (!category) {
      throw new Error(`Category "${name}" not found`);
    }

    return category;
  };

  await activityRepo.upsert(
    [
      {
        name: 'Backend',
        category: byName('Development'),
      },
      {
        name: 'Frontend',
        category: byName('Development'),
      },
      {
        name: 'Code Review',
        category: byName('Development'),
      },
      {
        name: 'Bug Fixing',
        category: byName('Development'),
      },

      {
        name: 'Daily Standup',
        category: byName('Meetings'),
      },
      {
        name: 'Sprint Planning',
        category: byName('Meetings'),
      },
      {
        name: 'Client Meeting',
        category: byName('Meetings'),
      },

      {
        name: 'Manual Testing',
        category: byName('Quality Assurance'),
      },
      {
        name: 'Automation Testing',
        category: byName('Quality Assurance'),
      },

      {
        name: 'UI Design',
        category: byName('Design'),
      },
      {
        name: 'UX Research',
        category: byName('Design'),
      },

      {
        name: 'Documentation',
        category: byName('Management'),
      },
      {
        name: 'Research',
        category: byName('Management'),
      },
    ],
    {
      conflictPaths: ['name'],
    },
  );

  console.log('✅ Activities seeded');
}
