import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { Team } from './entities/team.entity';
import { TeamStatus } from './enums/team-status.enum';

/**
 * The team someone is being placed in: it must exist in the company and be
 * active. `archivedMessage` says what the caller was trying to do. Inside a
 * transaction, `lock` holds the team until it commits: `share` so it can't be
 * archived meanwhile, `exclusive` so that changes to its lead also run one
 * after the other.
 */
export const findActiveTeam = async (
  teamRepository: Repository<Team>,
  teamId: string,
  companyId: string,
  archivedMessage: string,
  { lock }: { lock?: 'share' | 'exclusive' } = {},
): Promise<Team> => {
  const team = await teamRepository.findOne({
    where: { id: teamId, companyId },
    select: ['id', 'name', 'status'],
    lock: lock
      ? {
          mode: lock === 'share' ? 'pessimistic_read' : 'pessimistic_write',
        }
      : undefined,
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
