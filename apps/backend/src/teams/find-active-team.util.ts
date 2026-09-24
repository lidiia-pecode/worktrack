import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { Team } from './entities/team.entity';
import { TeamStatus } from './enums/team-status.enum';

/**
 * The team someone is being placed in: it must exist in the company and be
 * active. `archivedMessage` says what the caller was trying to do.
 */
export const findActiveTeam = async (
  teamRepository: Repository<Team>,
  teamId: string,
  companyId: string,
  archivedMessage: string,
): Promise<Team> => {
  const team = await teamRepository.findOne({
    where: { id: teamId, companyId },
    select: ['id', 'status'],
  });

  if (!team) {
    throw new NotFoundException(
      `Team with id ${teamId} not found in this company`,
    );
  }

  if (team.status === TeamStatus.ARCHIVED) {
    throw new BadRequestException(archivedMessage);
  }

  return team;
};
