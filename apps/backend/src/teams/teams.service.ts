import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  Not,
  Raw,
  Repository,
} from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import {
  AddTeamMemberDto,
  CreateTeamDto,
  TeamsQuery,
  UpdateTeamDto,
  UpdateTeamMemberDto,
} from './dtos/team.dto';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { containsText } from 'src/lib/utils/contains-text.util';
import { TeamStatus } from './enums/team-status.enum';
import { TeamVisibilityService } from './team-visibility.service';
import { findActiveTeam } from './find-active-team.util';
import { TeamRole } from './enums/team-role.enum';
import { findCompanyToday } from 'src/companies/company-today.util';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { InvitationStatus } from 'src/invitations/enums/invitation-status.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { pageOffset } from 'src/lib/dtos/pagination-query.dto';

/** What still has to leave a team before it can be archived. */
export interface TeamArchiveImpact {
  openMemberships: TeamMembership[];
  pendingInvitationCount: number;
}

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

  /**
   * The owner reads a team's whole history; anyone else who is current on it.
   * Former members may now belong to someone else's team, and a manager reads
   * nobody outside their reach (permission-model §3.4).
   */
  private shownMemberships(team: Team, user: AuthUser): TeamMembership[] {
    const memberships = team.memberships ?? [];

    return user.role === UserRole.OWNER
      ? memberships
      : memberships.filter((membership) => membership.leftAt === null);
  }

  private async assertTeamIsActive(
    teamId: string,
    companyId: string,
    archivedMessage = 'An archived team cannot be changed',
  ): Promise<void> {
    await findActiveTeam(this.teamRepo, teamId, companyId, archivedMessage);
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

  /**
   * Locks the person's row, so two changes that would each make them a member
   * of a team run one after the other and the second sees the first.
   */
  private async lockPerson(
    manager: EntityManager,
    companyId: string,
    userId: string,
  ): Promise<void> {
    await manager.getRepository(User).findOne({
      where: { id: userId, companyId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /** The open member-role membership the person holds in another active team, if any. */
  private findCurrentMemberTeam(
    membershipRepo: Repository<TeamMembership>,
    companyId: string,
    userId: string,
    exceptTeamId: string,
  ): Promise<TeamMembership | null> {
    return membershipRepo.findOne({
      where: {
        companyId,
        userId,
        roleInTeam: TeamRole.MEMBER,
        leftAt: IsNull(),
        teamId: Not(exceptTeamId),
        team: { status: TeamStatus.ACTIVE },
      },
      relations: ['team'],
    });
  }

  /**
   * Ends the membership being left on `endsOn` (the day the new one starts,
   * or today when a role switch makes them a member), under a row lock so a
   * concurrent change to it waits. Nothing to do if it was closed meanwhile.
   */
  private async closeMembershipForMove(
    membershipRepo: Repository<TeamMembership>,
    current: TeamMembership,
    endsOn: string,
  ): Promise<void> {
    const locked = await membershipRepo.findOne({
      where: { id: current.id, leftAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) return;

    // A membership that has not started yet ends on its start date.
    locked.leftAt = locked.joinedAt > endsOn ? locked.joinedAt : endsOn;
    await membershipRepo.save(locked);
  }

  /** Joining a team takes an active person who is not the owner; staying in one only the first. */
  private assertCanJoinTeam(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'A deactivated person cannot be added to a team',
      );
    }

    // Membership would give the owner nothing, and the team's managers reach
    // over the owner's records.
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('The owner is not a member of any team');
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
      ...(query.search ? { name: containsText(query.search) } : {}),
    };

    const [teams, count] = await this.teamRepo.findAndCount({
      where,
      relations: ['memberships', 'memberships.user'],
      skip: pageOffset(query),
      take: query.pageSize,
      order: { name: 'ASC' },
    });

    const results = teams.map((team) => ({
      ...team,
      memberships: this.shownMemberships(team, user),
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

    const team = await this.getTeamById(id, companyId);
    return { ...team, memberships: this.shownMemberships(team, user) };
  }

  async getTeamById(id: string, companyId: string): Promise<Team> {
    const team = await this.teamRepo.findOne({
      where: { id, companyId },
      relations: ['memberships', 'memberships.user'],
    });

    if (!team) {
      throw new NotFoundException(
        `Team with id ${id} not found in this company`,
      );
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
    const team = await this.getTeamById(id, companyId);

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
   * What is still on the team: its open memberships, whatever the role or the
   * person's status, and its pending invitations. A team is archived only once
   * both are gone, so archiving changes nothing but its status.
   */
  private async findWhatIsOnTeam(
    manager: EntityManager,
    teamId: string,
    companyId: string,
  ): Promise<TeamArchiveImpact> {
    const [openMemberships, pendingInvitationCount] = await Promise.all([
      manager.getRepository(TeamMembership).find({
        where: { teamId, companyId, leftAt: IsNull() },
        relations: ['user'],
        order: { user: { firstName: 'ASC', lastName: 'ASC' } },
      }),
      manager.getRepository(Invitation).count({
        where: { teamId, companyId, status: InvitationStatus.PENDING },
      }),
    ]);

    return { openMemberships, pendingInvitationCount };
  }

  /**
   * Archiving takes a team out of use and keeps it whole: it is refused until
   * the owner has emptied the team, and restoring is its exact undo.
   */
  async archiveTeam(id: string, companyId: string): Promise<Team> {
    return this.dataSource.transaction(async (manager) => {
      // Locked so that nobody joins or is invited while it is checked.
      const team = await manager.getRepository(Team).findOne({
        where: { id, companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!team) {
        throw new NotFoundException(
          `Team with id ${id} not found in this company`,
        );
      }
      if (team.status === TeamStatus.ARCHIVED) {
        throw new BadRequestException('Team is already archived');
      }

      const { openMemberships, pendingInvitationCount } =
        await this.findWhatIsOnTeam(manager, id, companyId);
      if (openMemberships.length > 0 || pendingInvitationCount > 0) {
        throw new ConflictException(
          'Remove everyone from the team and settle its invitations first',
        );
      }

      team.status = TeamStatus.ARCHIVED;
      return manager.getRepository(Team).save(team);
    });
  }

  /** What still has to leave the team before it can be archived. */
  async getArchiveImpact(
    id: string,
    companyId: string,
  ): Promise<TeamArchiveImpact> {
    await this.assertTeamIsActive(id, companyId, 'Team is already archived');

    return this.findWhatIsOnTeam(this.dataSource.manager, id, companyId);
  }

  async unarchiveTeam(id: string, companyId: string): Promise<Team> {
    const team = await this.getTeamById(id, companyId);

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
    const user = await this.userRepo.findOne({
      where: { id: dto.userId, companyId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with id ${dto.userId} not found in this company`,
      );
    }

    this.assertCanJoinTeam(user);
    this.assertCanLeadTeam(user, dto.roleInTeam);

    const newLeftAt = dto.leftAt ?? null;
    if (newLeftAt && this.isInvalidDateRange(dto.joinedAt, newLeftAt)) {
      throw new BadRequestException('leftAt cannot be earlier than joinedAt');
    }

    return this.dataSource.transaction(async (manager) => {
      await findActiveTeam(
        manager.getRepository(Team),
        teamId,
        companyId,
        'Cannot add members to an archived team',
        { lock: true },
      );

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

      const roleInTeam = dto.roleInTeam ?? TeamRole.MEMBER;

      // A person is a member of one team at a time: joining another as a
      // member is a move, which the caller has to ask for (P1). A past
      // membership, already closed, is history and moves nobody.
      if (roleInTeam === TeamRole.MEMBER && newLeftAt === null) {
        await this.lockPerson(manager, companyId, dto.userId);
        const currentTeam = await this.findCurrentMemberTeam(
          trxMembershipRepo,
          companyId,
          dto.userId,
          teamId,
        );

        if (currentTeam && !dto.leaveCurrentTeam) {
          throw new ConflictException(
            `User is already a member of "${currentTeam.team.name}"; set leaveCurrentTeam to move them`,
          );
        }

        if (currentTeam) {
          await this.closeMembershipForMove(
            trxMembershipRepo,
            currentTeam,
            dto.joinedAt,
          );
        }
      }

      const membership = trxMembershipRepo.create({
        companyId,
        teamId,
        userId: dto.userId,
        roleInTeam,
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
      // Locked, so an archive under way finishes first and this is refused.
      await findActiveTeam(
        manager.getRepository(Team),
        teamId,
        companyId,
        'An archived team cannot be changed',
        { lock: true },
      );
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

      // Setting a role, or reopening a membership, must respect who may lead;
      // editing the dates of one that stays closed need not.
      if (newLeftAt === null || dto.roleInTeam !== undefined) {
        this.assertCanLeadTeam(
          membership.user,
          dto.roleInTeam ?? membership.roleInTeam,
        );
      }

      const reopens = membership.leftAt !== null && newLeftAt === null;
      if (reopens) this.assertCanJoinTeam(membership.user);

      // Reopening a membership, or switching an open one to Member, makes it
      // their member team, of which they have one at a time (P1).
      const becomesMember =
        newLeftAt === null &&
        (dto.roleInTeam ?? membership.roleInTeam) === TeamRole.MEMBER &&
        (reopens || membership.roleInTeam !== TeamRole.MEMBER);
      if (becomesMember) {
        await this.lockPerson(manager, companyId, membership.userId);
      }
      const currentTeam = becomesMember
        ? await this.findCurrentMemberTeam(
            trxMembershipRepo,
            companyId,
            membership.userId,
            membership.teamId,
          )
        : null;
      if (currentTeam && !dto.leaveCurrentTeam) {
        throw new ConflictException(
          `User is already a member of "${currentTeam.team.name}"; set leaveCurrentTeam to move them`,
        );
      }

      if (currentTeam) {
        await this.closeMembershipForMove(
          trxMembershipRepo,
          currentTeam,
          await findCompanyToday(manager, companyId),
        );
      }

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

    // A manager's removal may only narrow their own reach, so taking a manager
    // off a team, themselves included, is the owner's.
    if (
      user.role !== UserRole.OWNER &&
      membership.roleInTeam === TeamRole.MANAGER
    ) {
      throw new ForbiddenException('Only an owner can remove a team manager');
    }

    const today = await findCompanyToday(this.dataSource.manager, companyId);

    // A membership that has not started yet closes on its start date, so the
    // stored range stays valid.
    membership.leftAt =
      today < membership.joinedAt ? membership.joinedAt : today;

    await this.membershipRepo.save(membership);
  }
}
