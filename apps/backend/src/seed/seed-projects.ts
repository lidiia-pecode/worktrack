import { DataSource, In } from 'typeorm';
import { Project } from 'src/projects/entities/project.entity';
import { User } from 'src/users/entities/user.entity';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';

import { PROJECTS } from './seed-config';

export async function seedProjects(dataSource: DataSource, companyId: string) {
  const projectRepo = dataSource.getRepository(Project);
  const userRepo = dataSource.getRepository(User);

  for (const data of PROJECTS) {
    const members = await userRepo.findBy({
      companyId,
      email: In(data.members),
    });

    let project = await projectRepo.findOne({
      where: { companyId, name: data.name },
      relations: ['users'],
    });

    if (!project) {
      project = projectRepo.create({
        companyId,
        name: data.name,
        clientName: data.clientName,
        description: data.description,
        status: ProjectStatus.ACTIVE,
        users: members,
      });
    } else {
      project.users = members;
    }

    await projectRepo.save(project);
  }

  console.log(`✅ Projects seeded (${PROJECTS.length})`);
}
