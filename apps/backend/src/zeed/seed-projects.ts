import { DataSource } from 'typeorm';
import { Project } from 'src/projects/entities/project.entity';
import { User } from 'src/users/entities/user.entity';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';

export async function seedProjects(dataSource: DataSource, companyId: string) {
  const projectRepo = dataSource.getRepository(Project);
  const userRepo = dataSource.getRepository(User);

  const projectsData = [
    {
      name: 'WorkTrack',
      clientName: 'Internal Product',
      description: 'Internal time tracking app',
      status: ProjectStatus.ACTIVE,
    },
    {
      name: 'CRM System',
      clientName: 'Fintech Group',
      description: 'Customer relationship management',
      status: ProjectStatus.ACTIVE,
    },
    {
      name: 'Mobile App',
      clientName: 'Retail Corp',
      description: 'E-commerce mobile app',
      status: ProjectStatus.ACTIVE,
    },
  ];

  const users = await userRepo.findBy({ companyId });

  for (const data of projectsData) {
    let project = await projectRepo.findOne({
      where: { companyId, name: data.name },
      relations: ['users'],
    });

    if (!project) {
      project = projectRepo.create({
        ...data,
        companyId,
        users,
      });
      await projectRepo.save(project);
    } else if (!project.users || project.users.length === 0) {
      project.users = users;
      await projectRepo.save(project);
    }
  }

  console.log('✅ Projects seeded via Repository');
}
