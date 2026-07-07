import { DataSource } from 'typeorm';
import { Activity } from 'src/activities/entities/activity.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';

export async function seedProjectActivities(dataSource: DataSource) {
  const projectRepo = dataSource.getRepository(Project);
  const activityRepo = dataSource.getRepository(Activity);
  const repo = dataSource.getRepository(ProjectActivity);

  const projects = await projectRepo.find();
  const activities = await activityRepo.find({
    relations: ['category'],
  });

  const getProject = (name: string) => {
    const project = projects.find((p) => p.name === name);

    if (!project) {
      throw new Error(`Project "${name}" not found`);
    }

    return project;
  };

  const getActivity = (name: string) => {
    const activity = activities.find((a) => a.name === name);

    if (!activity) {
      throw new Error(`Activity "${name}" not found`);
    }

    return activity;
  };

  const mappings = [
    {
      project: 'WorkTrack',
      activities: [
        'Backend',
        'Frontend',
        'Code Review',
        'Daily Standup',
        'Sprint Planning',
        'Documentation',
      ],
    },
    {
      project: 'CRM System',
      activities: ['Backend', 'Manual Testing', 'Client Meeting'],
    },
    {
      project: 'Mobile App',
      activities: ['Frontend', 'UI Design', 'UX Research'],
    },
    {
      project: 'Landing Page',
      activities: ['Frontend', 'UI Design'],
    },
    {
      project: 'Internal Tools',
      activities: ['Backend', 'Research', 'Bug Fixing'],
    },
  ];

  for (const mapping of mappings) {
    const project = getProject(mapping.project);

    for (const activityName of mapping.activities) {
      const activity = getActivity(activityName);

      const existing = await repo.findOne({
        where: {
          project: { id: project.id },
          activity: { id: activity.id },
        },
      });

      if (existing) {
        existing.isActive = true;
        await repo.save(existing);
        continue;
      }

      await repo.save(
        repo.create({
          project,
          activity,
          isActive: true,
        }),
      );
    }
  }

  console.log('✅ Project activities seeded');
}
