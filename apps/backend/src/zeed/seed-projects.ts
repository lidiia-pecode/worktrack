import { DataSource } from 'typeorm';
import { Project } from 'src/projects/entities/project.entity';
import { User } from 'src/users/entities/user.entity';
import { ProjectStatus } from 'src/projects/enums/ProjectStatus.enum';

export async function seedProjects(dataSource: DataSource) {
  const projectRepo = dataSource.getRepository(Project);
  const userRepo = dataSource.getRepository(User);

  const users = await userRepo.find();

  const getUser = (username: string) => {
    const user = users.find((u) => u.username === username);

    if (!user) {
      throw new Error(`User "${username}" not found`);
    }

    return user;
  };

  const projects = [
    {
      name: 'WorkTrack',
      description: 'Time tracking platform',
      users: [getUser('john'), getUser('alice'), getUser('bob')],
    },
    {
      name: 'CRM System',
      description: 'Internal CRM',
      users: [getUser('alice'), getUser('emma')],
    },
    {
      name: 'Mobile App',
      description: 'iOS & Android application',
      users: [getUser('john'), getUser('michael')],
    },
    {
      name: 'Landing Page',
      description: 'Marketing website',
      users: [getUser('emma')],
    },
    {
      name: 'Internal Tools',
      description: 'Company internal tools',
      users: [getUser('bob'), getUser('michael')],
    },
  ];

  for (const data of projects) {
    let project = await projectRepo.findOne({
      where: { name: data.name },
      relations: ['users'],
    });

    if (!project) {
      project = projectRepo.create({
        name: data.name,
        description: data.description,
        status: ProjectStatus.ACTIVE,
        users: data.users,
      });
    } else {
      project.description = data.description;
      project.status = ProjectStatus.ACTIVE;
      project.users = data.users;
    }

    await projectRepo.save(project);
  }

  console.log('✅ Projects seeded');
}
