import { DataSource } from 'typeorm';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';

export async function seedActivities(
  dataSource: DataSource,
  companyId: string,
) {
  const activityRepo = dataSource.getRepository(Activity);
  const categoryRepo = dataSource.getRepository(ActCategory);

  const categories = await categoryRepo.findBy({ companyId });

  const getCategoryId = (categoryName: string): string => {
    const found = categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    if (!found) {
      throw new Error(`Activity category "${categoryName}" not found`);
    }
    return found.id;
  };

  const activitiesData = [
    {
      name: 'Backend',
      category: 'Development',
      isAbsence: false,
      defaultBillable: true,
    },
    {
      name: 'Frontend',
      category: 'Development',
      isAbsence: false,
      defaultBillable: true,
    },
    {
      name: 'Code Review',
      category: 'Development',
      isAbsence: false,
      defaultBillable: true,
    },
    {
      name: 'Bug Fixing',
      category: 'Development',
      isAbsence: false,
      defaultBillable: true,
    },

    {
      name: 'Daily Standup',
      category: 'Meetings',
      isAbsence: false,
      defaultBillable: false,
    },
    {
      name: 'Sprint Planning',
      category: 'Meetings',
      isAbsence: false,
      defaultBillable: false,
    },
    {
      name: 'Client Meeting',
      category: 'Meetings',
      isAbsence: false,
      defaultBillable: true,
    },

    {
      name: 'Manual Testing',
      category: 'Quality Assurance',
      isAbsence: false,
      defaultBillable: true,
    },
    {
      name: 'Automation Testing',
      category: 'Quality Assurance',
      isAbsence: false,
      defaultBillable: true,
    },

    {
      name: 'UI Design',
      category: 'Design',
      isAbsence: false,
      defaultBillable: true,
    },
    {
      name: 'UX Research',
      category: 'Design',
      isAbsence: false,
      defaultBillable: true,
    },

    {
      name: 'Documentation',
      category: 'Management',
      isAbsence: false,
      defaultBillable: false,
    },
    {
      name: 'Vacation',
      category: 'Management',
      isAbsence: true,
      defaultBillable: false,
    },
  ];

  for (const item of activitiesData) {
    const categoryId = getCategoryId(item.category);

    const existing = await activityRepo.findOneBy({
      companyId,
      categoryId,
      name: item.name,
    });

    if (!existing) {
      const activity = activityRepo.create({
        companyId,
        categoryId,
        name: item.name,
        isAbsence: item.isAbsence,
        defaultBillable: item.defaultBillable,
        status: ActivityStatus.ACTIVE,
      });

      await activityRepo.save(activity);
    }
  }

  console.log('✅ Activities seeded via Repository');
}
