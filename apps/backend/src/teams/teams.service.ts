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
  Repository,
} from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import {
  AddTeamMemberDto,
  ChangeTeamManagerDto,
  CreateTeamDto,
  PreviousManager,
  TeamsQuery,
  UpdateTeamDto,
} from './dtos/team.dto';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { containsText } from 'src/lib/utils/contains-text.util';
import { TeamStatus } from './enums/team-status.enum';
import { TeamVisibilityService } from './team-visibility.service';
import { findActiveTeam } from './find-active-team.util';
import { TeamRole } from './enums/team-role.enum';
import { findCompanyToday } from 'src/companies/company-today.util';
import { Company } from 'src/companies/entities/company.entity';
import { findLatestLockedDate } from 'src/reporting/latest-locked-date.util';
import { addDays, isoDateIn } from 'src/capacity/working-days.util';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { InvitationStatus } from 'src/invitations/enums/invitation-status.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { pageOffset } from 'src/lib/dtos/pagination-query.dto';

const personName = (user: User): string => `${user.firstName} ${user.lastName}`;

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
    private readonly teamVisibility: TeamVisibilityService,
    private readonly dataSource: DataSource,
  ) {}

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
   * Locks the person's row, so two changes that would each place them in a
   * team run one after the other and the second sees the first.
   */
  private async lockPerson(
    manager: EntityManager,
    companyId: string,
    userId: string,
  ): Promise<User> {
    const user = await manager.getRepository(User).findOne({
      where: { id: userId, companyId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundException(
        `User with id ${userId} not found in this company`,
      );
    }

    return user;
  }

  /** The one team the person is in now, other than this one, whatever their role in it. */
  private findCurrentTeam(
    membershipRepo: Repository<TeamMembership>,
    companyId: string,
    userId: string,
    exceptTeamId: string,
  ): Promise<TeamMembership | null> {
    return membershipRepo.findOne({
      where: {
        companyId,
        userId,
        leftAt: IsNull(),
        teamId: Not(exceptTeamId),
        team: { status: TeamStatus.ACTIVE },
      },
      relations: ['team'],
    });
  }

  /**
   * The first day a membership change applies: today unless given. A given
   * day is today or earlier and in an open month, so a locked month's teams
   * never change.
   */
  private async changeDay(
    manager: EntityManager,
    companyId: string,
    date?: string,
  ): Promise<string> {
    const today = await findCompanyToday(manager, companyId);
    if (date === undefined || date === today) return today;

    if (date > today) {
      throw new BadRequestException(
        'A team change can be dated today or earlier, not later',
      );
    }

    const lockedUntil = await findLatestLockedDate(manager, companyId, true);
    if (date <= lockedUntil) {
      throw new ForbiddenException(
        `A team change can't be dated ${date}: months up to ${lockedUntil} are locked`,
      );
    }

    return date;
  }

  /**
   * Ends the membership being left the day the new one starts, under a row
   * lock so a concurrent change to it waits. Nothing to do if it was closed
   * meanwhile.
   */
  private async closeMembershipForMove(
    membershipRepo: Repository<TeamMembership>,
    current: TeamMembership,
    day: string,
  ): Promise<void> {
    const locked = await membershipRepo.findOne({
      where: { id: current.id, leftAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) return;

    locked.leftAt = day;
    await membershipRepo.save(locked);
  }

  /**
   * A person is in one team at a time (P1): joining another is a move, which
   * the caller has to ask for. Someone who leads their team stays until it has
   * another manager, so no team loses its lead as a side effect.
   */
  private async leaveCurrentTeamIfAsked(
    manager: EntityManager,
    user: User,
    teamId: string,
    leaveCurrentTeam: boolean | undefined,
    day: string,
  ): Promise<void> {
    const membershipRepo = manager.getRepository(TeamMembership);
    const currentTeam = await this.findCurrentTeam(
      membershipRepo,
      user.companyId,
      user.id,
      teamId,
    );
    if (!currentTeam) return;

    if (currentTeam.roleInTeam === TeamRole.MANAGER) {
      throw new ConflictException(
        `${personName(user)} leads ${currentTeam.team.name}; give it another manager first`,
      );
    }

    if (!leaveCurrentTeam) {
      throw new ConflictException(
        `User is already a member of "${currentTeam.team.name}"; set leaveCurrentTeam to move them`,
      );
    }

    if (day < currentTeam.joinedAt) {
      throw new BadRequestException(
        `They joined "${currentTeam.team.name}" on ${currentTeam.joinedAt}; the move can't be dated before it`,
      );
    }

    await this.closeMembershipForMove(membershipRepo, currentTeam, day);
  }

  /** Joining a team takes an active person who is not the owner; staying in one only the first. */
  private assertCanJoinTeam(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'A deactivated person cannot be added to a team',
      );
    }

    // Membership would give the owner nothing, and the team's manager would
    // reach over the owner's records.
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('The owner is not a member of any team');
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

  /** Adds a member; a team's manager is appointed by `changeManager` only. */
  async addMember(
    teamId: string,
    companyId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMembership> {
    // A membership starts the day given, today by default; nothing is scheduled.
    return this.dataSource.transaction(async (manager) => {
      await findActiveTeam(
        manager.getRepository(Team),
        teamId,
        companyId,
        'Cannot add members to an archived team',
        { lock: 'share' },
      );
      const user = await this.lockPerson(manager, companyId, dto.userId);
      this.assertCanJoinTeam(user);

      const trxMembershipRepo = manager.getRepository(TeamMembership);
      const day = await this.changeDay(manager, companyId, dto.date);
      const { timezone } = await manager.findOneOrFail(Company, {
        where: { id: companyId },
        select: ['id', 'timezone'],
      });
      const joinedCompanyOn = isoDateIn(user.createdAt, timezone);
      if (day < joinedCompanyOn) {
        throw new BadRequestException(
          `They joined the company on ${joinedCompanyOn}; a team change can't be dated before it`,
        );
      }

      const isOnTeam = await trxMembershipRepo.exists({
        where: { teamId, userId: dto.userId, leftAt: IsNull() },
      });
      if (isOnTeam) {
        throw new ConflictException('User is already on this team');
      }

      await this.leaveCurrentTeamIfAsked(
        manager,
        user,
        teamId,
        dto.leaveCurrentTeam,
        day,
      );

      // One team at a time, back in time too. A membership ended the day it
      // began covers no day, so it overlaps nothing.
      const overlapping = await trxMembershipRepo
        .createQueryBuilder('membership')
        .innerJoinAndSelect('membership.team', 'team')
        .where('membership.company_id = :companyId', { companyId })
        .andWhere('membership.user_id = :userId', { userId: dto.userId })
        .andWhere('membership.left_at > :day', { day })
        .andWhere('membership.joined_at < membership.left_at')
        .getOne();
      if (overlapping?.leftAt) {
        throw new ConflictException(
          `They were in "${overlapping.team.name}" until ${addDays(overlapping.leftAt, -1)}; pick a day after it`,
        );
      }

      const membership = trxMembershipRepo.create({
        companyId,
        teamId,
        userId: dto.userId,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: day,
        leftAt: null,
      });

      try {
        const saved = await trxMembershipRepo.save(membership);

        return await trxMembershipRepo.findOneOrFail({
          where: { id: saved.id },
          relations: ['user'],
        });
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException('User is already in a team');
        }
        throw error;
      }
    });
  }

  /**
   * The one way a team gets its manager, from today: one of its members (an
   * Employee is made a Manager), or a Manager in no team. The current manager,
   * if any, stays as a member or leaves the team; nobody else and no other
   * team changes.
   */
  async changeManager(
    teamId: string,
    companyId: string,
    dto: ChangeTeamManagerDto,
  ): Promise<TeamMembership> {
    return this.dataSource.transaction(async (manager) => {
      // Exclusive, so this and a manager invitation into the team run one
      // after the other.
      const team = await findActiveTeam(
        manager.getRepository(Team),
        teamId,
        companyId,
        'An archived team cannot be changed',
        { lock: 'exclusive' },
      );

      const invitation = await manager.getRepository(Invitation).findOne({
        where: {
          companyId,
          teamId,
          role: UserRole.MANAGER,
          status: InvitationStatus.PENDING,
        },
      });
      if (invitation) {
        throw new ConflictException(
          `${invitation.email} is invited to lead this team; revoke the invitation first`,
        );
      }

      const newManager = await this.lockPerson(manager, companyId, dto.userId);
      if (newManager.status !== UserStatus.ACTIVE) {
        throw new BadRequestException(
          'A deactivated person cannot lead a team',
        );
      }
      const membershipRepo = manager.getRepository(TeamMembership);
      const [currentLead, ownMembership] = await Promise.all([
        membershipRepo.findOne({
          where: {
            companyId,
            teamId,
            roleInTeam: TeamRole.MANAGER,
            leftAt: IsNull(),
          },
          lock: { mode: 'pessimistic_write' },
        }),
        membershipRepo.findOne({
          where: { companyId, userId: dto.userId, leftAt: IsNull() },
          lock: { mode: 'pessimistic_write' },
        }),
      ]);

      if (currentLead?.userId === dto.userId) {
        throw new BadRequestException('They already lead this team');
      }
      if (ownMembership && ownMembership.teamId !== teamId) {
        const { name } = await manager
          .getRepository(Team)
          .findOneByOrFail({ id: ownMembership.teamId });
        throw new ConflictException(
          `${personName(newManager)} is in ${name}; move them to this team first`,
        );
      }

      // An Employee of this team is made a Manager in the same change, so a
      // failure never leaves a Manager who leads nothing.
      const isTeamEmployee =
        newManager.role === UserRole.EMPLOYEE && Boolean(ownMembership);
      if (newManager.role !== UserRole.MANAGER && !isTeamEmployee) {
        throw new BadRequestException(
          'Only a Manager, or an Employee in this team, can lead it',
        );
      }
      if (isTeamEmployee) {
        newManager.role = UserRole.MANAGER;
        await manager.getRepository(User).save(newManager);
      }

      const today = await findCompanyToday(manager, companyId);

      // The current lead steps down first: the database allows one at a time.
      if (currentLead) {
        if (!dto.previousManager) {
          throw new BadRequestException(
            'Say whether the current manager stays in the team as a member or leaves it',
          );
        }
        if (dto.previousManager === PreviousManager.LEAVES) {
          currentLead.leftAt = today;
        } else {
          currentLead.roleInTeam = TeamRole.MEMBER;
        }
        await membershipRepo.save(currentLead);
      }

      const lead =
        ownMembership ??
        membershipRepo.create({
          companyId,
          teamId,
          userId: dto.userId,
          joinedAt: today,
          leftAt: null,
        });
      lead.roleInTeam = TeamRole.MANAGER;

      try {
        const saved = await membershipRepo.save(lead);

        return await membershipRepo.findOneOrFail({
          where: { id: saved.id },
          relations: ['user'],
        });
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            `${team.name} or ${personName(newManager)} changed at the same moment; reload and try again`,
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
    date?: string,
  ): Promise<void> {
    await this.assertTeamInScope(teamId, user);
    await this.assertTeamIsActive(teamId, companyId);

    await this.dataSource.transaction(async (manager) => {
      const membershipRepo = manager.getRepository(TeamMembership);
      const membership = await membershipRepo.findOne({
        where: {
          id: membershipId,
          companyId,
          ...(teamId ? { teamId } : {}),
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!membership) {
        throw new NotFoundException(
          `Team membership with id ${membershipId} not found in this team`,
        );
      }

      if (membership.leftAt) {
        throw new BadRequestException('This membership is already closed');
      }

      // A manager's removal may only narrow their own reach, so taking a
      // manager off a team, themselves included, is the owner's.
      if (
        user.role !== UserRole.OWNER &&
        membership.roleInTeam === TeamRole.MANAGER
      ) {
        throw new ForbiddenException('Only an owner can remove a team manager');
      }

      const day = await this.changeDay(manager, companyId, date);
      // Dating a removal back also takes those days from the team's manager,
      // so it is the owner's; a manager removes from today.
      if (
        user.role !== UserRole.OWNER &&
        day !== (await findCompanyToday(manager, companyId))
      ) {
        throw new ForbiddenException(
          'Only the owner can date a removal before today',
        );
      }
      if (day < membership.joinedAt) {
        throw new BadRequestException(
          `They joined the team on ${membership.joinedAt}; the removal can't be dated before it`,
        );
      }

      membership.leftAt = day;
      await membershipRepo.save(membership);
    });
  }
}
