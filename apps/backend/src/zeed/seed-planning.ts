import { DataSource } from 'typeorm';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { User } from 'src/users/entities/user.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { UserRole } from 'src/users/enums/UserRole.enum';

export async function seedPlanning(dataSource: DataSource, companyId: string) {
  const planningRepo = dataSource.getRepository(PlanningEntry);
  const userRepo = dataSource.getRepository(User);
  const paRepo = dataSource.getRepository(ProjectActivity);

  const employees = await userRepo.findBy({
    companyId,
    role: UserRole.EMPLOYEE,
  });

  const manager = await userRepo.findOneBy({
    companyId,
    role: UserRole.MANAGER,
  });

  const projectActivities = await paRepo.findBy({
    companyId,
    isActive: true,
  });

  if (employees.length === 0 || projectActivities.length === 0) {
    console.log(
      '⚠️ Skipping planning seed: No employees or project activities found.',
    );
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];

    const projectActivity = projectActivities[i % projectActivities.length];

    const existing = await planningRepo.findOneBy({
      companyId,
      userId: employee.id,
      projectActivityId: projectActivity.id,
      date: today,
    });

    if (!existing) {
      const entry = planningRepo.create({
        companyId,
        userId: employee.id,
        projectActivityId: projectActivity.id,
        createdById: manager?.id,
        date: today,
        plannedMinutes: 480,
        note: 'Planned full day feature development',
      });

      await planningRepo.save(entry);
    }
  }

  console.log('✅ Planning entries seeded via Repository');
}
