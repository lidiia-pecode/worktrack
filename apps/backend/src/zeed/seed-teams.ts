import { DataSource, IsNull } from 'typeorm';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { UserRole } from 'src/users/enums/UserRole.enum';

export async function seedTeams(dataSource: DataSource, companyId: string) {
  const teamRepo = dataSource.getRepository(Team);
  const membershipRepo = dataSource.getRepository(TeamMembership);
  const userRepo = dataSource.getRepository(User);

  const teamName = 'Core Development Team';

  let team = await teamRepo.findOneBy({ companyId, name: teamName });

  if (!team) {
    team = teamRepo.create({
      companyId,
      name: teamName,
      status: TeamStatus.ACTIVE,
    });
    team = await teamRepo.save(team);
  }

  const manager = await userRepo.findOneBy({
    companyId,
    role: UserRole.MANAGER,
  });

  const employees = await userRepo.findBy({
    companyId,
    role: UserRole.EMPLOYEE,
  });

  const today = new Date().toISOString().split('T')[0];

  if (manager) {
    const existingMembership = await membershipRepo.findOne({
      where: {
        teamId: team.id,
        userId: manager.id,
        leftAt: IsNull(),
      },
    });

    if (!existingMembership) {
      const membership = membershipRepo.create({
        companyId,
        teamId: team.id,
        userId: manager.id,
        roleInTeam: TeamRole.MANAGER,
        joinedAt: today,
      });

      await membershipRepo.save(membership);
    }
  }

  for (const emp of employees) {
    const existingMembership = await membershipRepo.findOne({
      where: {
        teamId: team.id,
        userId: emp.id,
        leftAt: IsNull(),
      },
    });

    if (!existingMembership) {
      const membership = membershipRepo.create({
        companyId,
        teamId: team.id,
        userId: emp.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: today,
      });

      await membershipRepo.save(membership);
    }
  }

  console.log('✅ Teams and Team Memberships seeded via Repository');
}
