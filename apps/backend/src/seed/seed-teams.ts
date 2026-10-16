import { DataSource, IsNull, Not } from 'typeorm';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { TeamStatus } from 'src/teams/enums/team-status.enum';

import { TEAMS, dayOfWeek } from './seed-config';

// Archiving a team closes its memberships, so its former members left before it.
const ARCHIVED_TEAM_JOINED_DAY = -56;
const ARCHIVED_TEAM_LEFT_DAY = -14;

export async function seedTeams(dataSource: DataSource, companyId: string) {
  const teamRepo = dataSource.getRepository(Team);
  const membershipRepo = dataSource.getRepository(TeamMembership);
  const userRepo = dataSource.getRepository(User);

  for (const data of TEAMS) {
    const status = data.status ?? TeamStatus.ACTIVE;
    const isArchived = status === TeamStatus.ARCHIVED;

    let team = await teamRepo.findOneBy({ companyId, name: data.name });

    if (!team) {
      team = await teamRepo.save(
        teamRepo.create({ companyId, name: data.name, status }),
      );
    }

    for (const entry of data.members) {
      const user = await userRepo.findOneBy({ companyId, email: entry.email });

      if (!user) throw new Error(`Team member "${entry.email}" not found`);

      const existing = await membershipRepo.findOneBy({
        teamId: team.id,
        userId: user.id,
        leftAt: isArchived ? Not(IsNull()) : IsNull(),
      });

      if (!existing) {
        await membershipRepo.save(
          membershipRepo.create({
            companyId,
            teamId: team.id,
            userId: user.id,
            roleInTeam: entry.roleInTeam,
            joinedAt: dayOfWeek(isArchived ? ARCHIVED_TEAM_JOINED_DAY : 0),
            leftAt: isArchived ? dayOfWeek(ARCHIVED_TEAM_LEFT_DAY) : null,
          }),
        );
      }
    }
  }

  console.log(`✅ Teams seeded (${TEAMS.length})`);
}
