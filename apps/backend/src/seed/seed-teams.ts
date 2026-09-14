import { DataSource, IsNull } from 'typeorm';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { TeamStatus } from 'src/teams/enums/team-status.enum';

import { TEAM, dayOfWeek } from './seed-config';

export async function seedTeams(dataSource: DataSource, companyId: string) {
  const teamRepo = dataSource.getRepository(Team);
  const membershipRepo = dataSource.getRepository(TeamMembership);
  const userRepo = dataSource.getRepository(User);

  let team = await teamRepo.findOneBy({ companyId, name: TEAM.name });

  if (!team) {
    team = await teamRepo.save(
      teamRepo.create({
        companyId,
        name: TEAM.name,
        status: TeamStatus.ACTIVE,
      }),
    );
  }

  const joinedAt = dayOfWeek(0);

  for (const entry of TEAM.members) {
    const user = await userRepo.findOneBy({ companyId, email: entry.email });

    if (!user) throw new Error(`Team member "${entry.email}" not found`);

    const existing = await membershipRepo.findOneBy({
      teamId: team.id,
      userId: user.id,
      leftAt: IsNull(),
    });

    if (!existing) {
      await membershipRepo.save(
        membershipRepo.create({
          companyId,
          teamId: team.id,
          userId: user.id,
          roleInTeam: entry.roleInTeam,
          joinedAt,
        }),
      );
    }
  }

  console.log(`✅ Team "${TEAM.name}" seeded (${TEAM.members.length} members)`);
}
