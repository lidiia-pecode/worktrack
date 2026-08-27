import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Raw, Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import {
  AddTeamMemberDto,
  CreateTeamDto,
  TeamsQuery,
  UpdateTeamDto,
  UpdateTeamMemberDto,
} from './dtos/team.dto';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { TeamStatus } from './enums/team-status.enum';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMembership)
    private readonly membershipRepo: Repository<TeamMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // HELPER: safe dates compare
  // ==========================================
  private isInvalidDateRange(joinedAt: string, leftAt: string): boolean {
    return new Date(leftAt).getTime() < new Date(joinedAt).getTime();
  }

  // ==========================================
  // TEAMS CRUD
  // ==========================================

  async list(companyId: string, query: TeamsQuery) {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [teams, count] = await this.teamRepo.findAndCount({
      where,
      relations: ['memberships', 'memberships.user'],
      skip: query.offset,
      take: query.limit,
      order: { name: 'ASC' },
    });

    const results = teams.map((team) => ({
      ...team,
      memberships: team.memberships
        ? team.memberships.filter((m) => m.leftAt === null)
        : [],
    }));

    return { results, count };
  }

  async getTeamById(
    id: string,
    companyId: string,
    includeHistory = false,
  ): Promise<Team> {
    const team = await this.teamRepo.findOne({
      where: { id, companyId },
      relations: ['memberships', 'memberships.user'],
    });

    if (!team) {
      throw new NotFoundException(
        `Team with id ${id} not found in this company`,
      );
    }

    if (!includeHistory && team.memberships) {
      return {
        ...team,
        memberships: team.memberships.filter((m) => m.leftAt === null),
      };
    }

    return team;
  }

  async createTeam(companyId: string, dto: CreateTeamDto): Promise<Team> {
    const team = this.teamRepo.create({
      companyId,
      name: dto.name,
      status: TeamStatus.ACTIVE,
    });

    try {
      return await this.teamRepo.save(team);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          `Team with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async updateTeam(
    id: string,
    companyId: string,
    dto: UpdateTeamDto,
  ): Promise<Team> {
    const team = await this.getTeamById(id, companyId, true);

    if (dto.name && dto.name !== team.name) {
      team.name = dto.name;
    }

    try {
      return await this.teamRepo.save(team);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          `Team with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async archiveTeam(id: string, companyId: string): Promise<Team> {
    const team = await this.getTeamById(id, companyId, true);

    if (team.status === TeamStatus.ARCHIVED) {
      throw new BadRequestException('Team is already archived');
    }

    team.status = TeamStatus.ARCHIVED;
    return this.teamRepo.save(team);
  }

  async unarchiveTeam(id: string, companyId: string): Promise<Team> {
    const team = await this.getTeamById(id, companyId, true);

    if (team.status === TeamStatus.ACTIVE) {
      throw new BadRequestException('Team is already active');
    }

    team.status = TeamStatus.ACTIVE;
    return this.teamRepo.save(team);
  }

  // ==========================================
  // TEAM MEMBERSHIPS MANAGEMENT
  // ==========================================

  async addMember(
    teamId: string,
    companyId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMembership> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId, companyId },
      select: ['id', 'status'],
    });

    if (!team) {
      throw new NotFoundException(
        `Team with id ${teamId} not found in this company`,
      );
    }

    if (team.status === TeamStatus.ARCHIVED) {
      throw new BadRequestException('Cannot add members to an archived team');
    }

    const user = await this.userRepo.findOne({
      where: { id: dto.userId, companyId },
    });

    console.log('dto.roleInTeam', dto.roleInTeam);

    if (!user) {
      throw new NotFoundException(
        `User with id ${dto.userId} not found in this company`,
      );
    }

    const newLeftAt = dto.leftAt ?? null;
    if (newLeftAt && this.isInvalidDateRange(dto.joinedAt, newLeftAt)) {
      throw new BadRequestException('leftAt cannot be earlier than joinedAt');
    }

    return this.dataSource.transaction(async (manager) => {
      const trxMembershipRepo = manager.getRepository(TeamMembership);

      const overlappingMembership = await trxMembershipRepo.findOne({
        where: {
          teamId,
          userId: dto.userId,
          joinedAt: Raw(
            (alias) => `(${alias} <= :newLeftAt OR :newLeftAt IS NULL)`,
            { newLeftAt },
          ),
          leftAt: Raw(
            (alias) => `(${alias} >= :newJoinedAt OR ${alias} IS NULL)`,
            { newJoinedAt: dto.joinedAt },
          ),
        },
      });

      if (overlappingMembership) {
        throw new ConflictException(
          'User already has an active or overlapping membership in this team',
        );
      }

      const membership = trxMembershipRepo.create({
        companyId,
        teamId,
        userId: dto.userId,
        roleInTeam: dto.roleInTeam,
        joinedAt: dto.joinedAt,
        leftAt: newLeftAt,
      });

      try {
        const saved = await trxMembershipRepo.save(membership);

        return await trxMembershipRepo.findOneOrFail({
          where: { id: saved.id },
          relations: ['user'],
        });
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            'User already has an active or overlapping membership in this team',
          );
        }
        throw error;
      }
    });
  }

  async updateMember(
    membershipId: string,
    companyId: string,
    dto: UpdateTeamMemberDto,
    teamId: string,
  ): Promise<TeamMembership> {
    return this.dataSource.transaction(async (manager) => {
      const trxMembershipRepo = manager.getRepository(TeamMembership);

      const membership = await trxMembershipRepo.findOne({
        where: {
          id: membershipId,
          companyId,
          ...(teamId ? { teamId } : {}),
        },
        relations: ['user'],
      });

      if (!membership) {
        throw new NotFoundException(
          `Team membership with id ${membershipId} not found in this team`,
        );
      }

      const newJoinedAt = dto.joinedAt ?? membership.joinedAt;
      const newLeftAt =
        dto.leftAt !== undefined ? dto.leftAt : membership.leftAt;

      if (newLeftAt && this.isInvalidDateRange(newJoinedAt, newLeftAt)) {
        throw new BadRequestException('leftAt cannot be earlier than joinedAt');
      }

      if (dto.joinedAt !== undefined || dto.leftAt !== undefined) {
        const overlapping = await trxMembershipRepo.findOne({
          where: {
            teamId: membership.teamId,
            userId: membership.userId,
            id: Not(membershipId),
            joinedAt: Raw(
              (alias) => `(${alias} <= :newLeftAt OR :newLeftAt IS NULL)`,
              { newLeftAt },
            ),
            leftAt: Raw(
              (alias) => `(${alias} >= :newJoinedAt OR ${alias} IS NULL)`,
              { newJoinedAt },
            ),
          },
        });

        if (overlapping) {
          throw new ConflictException(
            'Updated dates overlap with another existing membership interval',
          );
        }
      }

      if (dto.roleInTeam !== undefined) membership.roleInTeam = dto.roleInTeam;
      if (dto.joinedAt !== undefined) membership.joinedAt = dto.joinedAt;
      if (dto.leftAt !== undefined) membership.leftAt = dto.leftAt;

      try {
        await trxMembershipRepo.save(membership);

        return await trxMembershipRepo.findOneOrFail({
          where: { id: membershipId },
          relations: ['user'],
        });
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            'Updated dates overlap with another existing membership interval',
          );
        }
        throw error;
      }
    });
  }

  async removeMember(
    membershipId: string,
    companyId: string,
    teamId: string,
  ): Promise<void> {
    const membership = await this.membershipRepo.findOne({
      where: {
        id: membershipId,
        companyId,
        ...(teamId ? { teamId } : {}),
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `Team membership with id ${membershipId} not found in this team`,
      );
    }

    await this.membershipRepo.remove(membership);
  }
}
