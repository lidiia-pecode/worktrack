import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Raw, Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import {
  AddTeamMemberDto,
  CreateTeamDto,
  TeamsQuery,
  UpdateTeamDto,
  UpdateTeamMemberDto,
} from './dtos/team.dto';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { TeamStatus } from './enums/team-status.enum';
import { TeamVisibilityService } from './team-visibility.service';
import { findActiveTeam } from './find-active-team.util';
import { TeamRole } from './enums/team-role.enum';
import { findCompanyToday } from 'src/companies/company-today.util';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { InvitationStatus } from 'src/invitations/enums/invitation-status.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMembership)
    private readonly membershipRepo: Repository<TeamMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // HELPER: safe dates compare
  // ==========================================
  private isInvalidDateRange(joinedAt: string, leftAt: string): boolean {
    return new Date(leftAt).getTime() < new Date(joinedAt).getTime();
  }

  /**
   * `leftAt` is the day a membership ended, not its last day, so a membership
   * that ends on a day and one that starts on that day do not overlap.
   */
  private overlapsPeriod(joinedAt: string, leftAt: string | null) {
    return {
      joinedAt: Raw((alias) => `(${alias} < :leftAt OR :leftAt IS NULL)`, {
        leftAt,
      }),
      leftAt: Raw((alias) => `(${alias} IS NULL OR ${alias} > :joinedAt)`, {
        joinedAt,
      }),
    };
  }

  /** A membership still in effect on `today`, or one that has not started. */
  private stillInEffect(today: string) {
    return Raw((alias) => `(${alias} IS NULL OR ${alias} > :today)`, {
      today,
    });
  }

  private async assertTeamIsActive(
    teamId: string,
    companyId: string,
  ): Promise<void> {
    await findActiveTeam(
      this.teamRepo,
      teamId,
      companyId,
      'An archived team cannot be changed',
    );
  }

  /** An owner acts on any team, a manager only on one they actively lead. */
  private async assertTeamInScope(
    teamId: string,
    user: AuthUser,
  ): Promise<void> {
    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);

    if (visibleTeamIds && !visibleTeamIds.includes(teamId)) {
      throw new ForbiddenException(
        'You can only change the membership of teams you lead',
      );
    }
  }

  /** The Owner already acts for everyone, so only a Manager leads a team. */
  private assertCanLeadTeam(user: User, roleInTeam?: TeamRole): void {
    if (roleInTeam === TeamRole.MANAGER && user.role !== UserRole.MANAGER) {
      throw new BadRequestException(
        'Only a user with the Manager role can manage a team',
      );
    }
  }

  // ==========================================
  // TEAMS CRUD
  // ==========================================

  async list(companyId: string, query: TeamsQuery, user: AuthUser) {
    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);

    if (visibleTeamIds?.length === 0) {
      return { results: [], count: 0 };
    }

    const where = {
      companyId,
      ...(visibleTeamIds ? { id: In(visibleTeamIds) } : {}),
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

  /**
   * Read path for a single team. Separate from `getTeamById` so the write
   * paths, which decide who may change a team, keep their own rules.
   */
  async getTeamForRead(
    id: string,
    companyId: string,
    user: AuthUser,
  ): Promise<Team> {
    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);

    if (visibleTeamIds && !visibleTeamIds.includes(id)) {
      throw new NotFoundException(
        `Team with id ${id} not found in this company`,
      );
    }

    return this.getTeamById(id, companyId);
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

    if (team.status === TeamStatus.ARCHIVED) {
      throw new BadRequestException('An archived team cannot be changed');
    }

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

  /**
   * Archiving ends the team's responsibility: its pending invitations are
   * revoked and every membership still in effect ends today, so the team
   * grants nothing afterwards. A membership that has not started yet ends on
   * its start date.
   */
  async archiveTeam(
    id: string,
    companyId: string,
  ): Promise<Team & { revokedInvitationCount: number }> {
    const team = await this.getTeamById(id, companyId, true);

    if (team.status === TeamStatus.ARCHIVED) {
      throw new BadRequestException('Team is already archived');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Team)
        .update(team.id, { status: TeamStatus.ARCHIVED });

      const today = await findCompanyToday(manager, companyId);
      await manager
        .createQueryBuilder()
        .update(TeamMembership)
        .set({ leftAt: () => 'GREATEST(joined_at, :today)' })
        .where({ teamId: id, companyId, leftAt: this.stillInEffect(today) })
        .setParameters({ today })
        .execute();

      const { affected } = await manager
        .getRepository(Invitation)
        .update(
          { teamId: id, companyId, status: InvitationStatus.PENDING },
          { status: InvitationStatus.REVOKED, revokedAt: new Date() },
        );

      const archived = await manager.getRepository(Team).findOneOrFail({
        where: { id },
        relations: ['memberships', 'memberships.user'],
      });

      return { ...archived, revokedInvitationCount: affected ?? 0 };
    });
  }

  /** Who archiving the team would affect, shown to the owner beforehand. */
  async getArchiveImpact(
    id: string,
    companyId: string,
  ): Promise<{ managers: User[]; peopleLeftWithoutTeam: User[] }> {
    await this.assertTeamIsActive(id, companyId);

    const today = await findCompanyToday(this.dataSource.manager, companyId);

    const memberships = await this.membershipRepo.find({
      where: { teamId: id, companyId, leftAt: this.stillInEffect(today) },
      relations: ['user'],
      order: { user: { firstName: 'ASC', lastName: 'ASC' } },
    });

    const managers = memberships
      .filter((membership) => membership.roleInTeam === TeamRole.MANAGER)
      .map((membership) => membership.user);
    const members = memberships
      .filter((membership) => membership.roleInTeam === TeamRole.MEMBER)
      .map((membership) => membership.user);

    const placedElsewhere =
      members.length === 0
        ? []
        : await this.membershipRepo.find({
            select: ['userId'],
            where: {
              companyId,
              teamId: Not(id),
              userId: In(members.map((member) => member.id)),
              leftAt: this.stillInEffect(today),
              team: { status: TeamStatus.ACTIVE },
            },
          });
    const placedUserIds = new Set(
      placedElsewhere.map((membership) => membership.userId),
    );

    return {
      managers,
      peopleLeftWithoutTeam: members.filter(
        (member) => !placedUserIds.has(member.id),
      ),
    };
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
    await findActiveTeam(
      this.teamRepo,
      teamId,
      companyId,
      'Cannot add members to an archived team',
    );

    const user = await this.userRepo.findOne({
      where: { id: dto.userId, companyId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with id ${dto.userId} not found in this company`,
      );
    }

    this.assertCanLeadTeam(user, dto.roleInTeam);

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
          ...this.overlapsPeriod(dto.joinedAt, newLeftAt),
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
    await this.assertTeamIsActive(teamId, companyId);

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

      this.assertCanLeadTeam(membership.user, dto.roleInTeam);

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
            ...this.overlapsPeriod(newJoinedAt, newLeftAt),
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
    user: AuthUser,
  ): Promise<void> {
    await this.assertTeamInScope(teamId, user);
    await this.assertTeamIsActive(teamId, companyId);

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

    if (membership.leftAt) {
      throw new BadRequestException('This membership is already closed');
    }

    const today = await findCompanyToday(this.dataSource.manager, companyId);

    // A membership that has not started yet closes on its start date, so the
    // stored range stays valid.
    membership.leftAt =
      today < membership.joinedAt ? membership.joinedAt : today;

    await this.membershipRepo.save(membership);
  }
}
