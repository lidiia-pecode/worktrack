import { DataSource } from 'typeorm';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { Project } from 'src/projects/entities/project.entity';
import { Activity } from 'src/activities/entities/activity.entity';

export async function seedProjectActivities(
  dataSource: DataSource,
  companyId: string,
) {
  const repo = dataSource.getRepository(ProjectActivity);
  const projectRepo = dataSource.getRepository(Project);
  const activityRepo = dataSource.getRepository(Activity);

  const projects = await projectRepo.findBy({ companyId });
  const activities = await activityRepo.findBy({ companyId });

  const getProject = (name: string) => {
    const found = projects.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (!found) throw new Error(`Project "${name}" not found in company`);
    return found;
  };

  const getActivity = (name: string) => {
    const found = activities.find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    );
    if (!found) throw new Error(`Activity "${name}" not found in company`);
    return found;
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
  ];

  for (const m of mappings) {
    const project = getProject(m.project);

    for (const actName of m.activities) {
      const activity = getActivity(actName);

      const existing = await repo.findOneBy({
        companyId,
        projectId: project.id,
        activityId: activity.id,
      });

      if (!existing) {
        const pa = repo.create({
          companyId,
          projectId: project.id,
          activityId: activity.id,
          isActive: true,
        });

        await repo.save(pa);
      }
    }
  }

  console.log('✅ Project Activities seeded via Repository');
}
