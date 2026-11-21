import { DataSource, IsNull, Not } from 'typeorm';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { TeamStatus } from 'src/teams/enums/team-status.enum';

import { TEAMS } from './seed-config';

export async function seedTeams(dataSource: DataSource, companyId: string) {
  const teamRepo = dataSource.getRepository(Team);
  const membershipRepo = dataSource.getRepository(TeamMembership);
  const userRepo = dataSource.getRepository(User);

  for (const data of TEAMS) {
    const status = data.status ?? TeamStatus.ACTIVE;

    let team = await teamRepo.findOneBy({ companyId, name: data.name });

    if (!team) {
      team = await teamRepo.save(
        teamRepo.create({ companyId, name: data.name, status }),
      );
    }

    for (const entry of data.members) {
      const user = await userRepo.findOneBy({ companyId, email: entry.email });

      if (!user) throw new Error(`Team member "${entry.email}" not found`);

      // A membership starts with the account, as an invitation's does, so a
      // team's history covers everything the person logged.
      const joinedAt =
        entry.joinedOn ?? user.createdAt.toISOString().slice(0, 10);
      const leftAt = entry.leftOn ?? null;

      const existing = await membershipRepo.findOneBy({
        teamId: team.id,
        userId: user.id,
        leftAt: leftAt ? Not(IsNull()) : IsNull(),
      });

      if (!existing) {
        await membershipRepo.save(
          membershipRepo.create({
            companyId,
            teamId: team.id,
            userId: user.id,
            roleInTeam: entry.roleInTeam,
            joinedAt,
            leftAt,
          }),
        );
      }
    }
  }

  console.log(`✅ Teams seeded (${TEAMS.length})`);
}
