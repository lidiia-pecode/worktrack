import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { UpdateUserPayload } from './dtos/user-payload.dto';
import { UpdateProfilePayload } from './dtos/update-profile-payload.dto';
import { User } from './entities/user.entity';
import { UsersQuery } from './dtos/users-query.dto';
import { AssignableUsersQuery } from './dtos/assignable-users-query.dto';
import { UserRole, UserStatus } from './enums/user-role.enum';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { CapacityService } from 'src/capacity/capacity.service';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { andWhereAnyContains } from 'src/lib/utils/contains-text.util';
import { Team } from 'src/teams/entities/team.entity';

type UserTeam = Pick<Team, 'id' | 'name'>;

type UserTeamMembership = UserTeam &
  Pick<Team, 'status'> &
  Pick<TeamMembership, 'roleInTeam' | 'joinedAt'>;

const PERSON_SEARCH_COLUMNS = [
  'u.first_name',
  'u.last_name',
  'u.email',
  'u.position',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly dataSource: DataSource,
    private readonly capacity: CapacityService,
  ) {}

  private getRepository(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.repo;
  }

  private async safeSave(
    repo: Repository<User>,
    user: User,
    email?: string,
  ): Promise<User> {
    try {
      return await repo.save(user);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        const constraint = error.driverError.constraint;

        if (
          constraint?.includes('email') ||
          error.driverError.detail?.includes('email')
        ) {
          throw new ConflictException(
            `User with email ${email || user.email} already exists`,
          );
        }
        throw new ConflictException(
          'A user with these unique credentials already exists',
        );
      }
      throw error;
    }
  }

  async findByEmailWithCompany(
    email: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['company'],
    });
  }

  async findByGoogleIdWithCompany(
    googleId: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { googleId },
      relations: ['company'],
    });
  }

  async findUserByIdWithCompany(
    id: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { id },
      relations: ['company'],
    });
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepository(manager);
    const existingUser = await repo.findOne({
      where: { googleId },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException(
        'This Google account is already linked to another user',
      );
    }

    try {
      await repo.update({ id: userId }, { googleId });
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          'This Google account is already linked to another user',
        );
      }
      throw error;
    }
  }

  // Multi-Tenant Business API

  async list(
    companyId: string,
    query: UsersQuery,
    user: AuthUser,
    manager?: EntityManager,
  ) {
    const qb = this.getRepository(manager)
      .createQueryBuilder('u')
      .where('u.company_id = :companyId', { companyId })
      // Nobody manages the owner's account from this list.
      .andWhere('u.role != :owner', { owner: UserRole.OWNER })
      .loadRelationCountAndMap(
        'u.projectsCount',
        'u.projects',
        'project',
        (projects) =>
          projects.andWhere('project.status = :activeProject', {
            activeProject: ProjectStatus.ACTIVE,
          }),
      );

    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }

    if (query.search) {
      andWhereAnyContains(qb, PERSON_SEARCH_COLUMNS, query.search);
    }

    this.teamVisibility.applyUserVisibility(qb, 'u.id', user);

    const [users, count] = await qb
      .orderBy('u.created_at', 'DESC')
      .addOrderBy('u.id', 'DESC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    const userIds = users.map((listed) => listed.id);
    const [memberships, weeklyMinutesByUser] = await Promise.all([
      this.openMembershipsFor(companyId, userIds, user),
      user.role === UserRole.OWNER
        ? this.weeklyMinutesFor(companyId, userIds)
        : null,
    ]);

    const teamsByUser = new Map<string, UserTeam[]>();
    for (const { userId, team } of memberships) {
      const teams = teamsByUser.get(userId) ?? [];
      teams.push({ id: team.id, name: team.name });
      teamsByUser.set(userId, teams);
    }

    const results = users.map((listed) => ({
      ...listed,
      teams: teamsByUser.get(listed.id) ?? [],
      weeklyMinutes: weeklyMinutesByUser?.get(listed.id),
    }));

    return { results, count };
  }

  // Only teams the caller can see, so a manager learns no other team's name.
  private async openMembershipsFor(
    companyId: string,
    userIds: string[],
    caller: AuthUser,
  ): Promise<TeamMembership[]> {
    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(caller);

    if (!userIds.length || visibleTeamIds?.length === 0) return [];

    return this.dataSource.getRepository(TeamMembership).find({
      where: {
        companyId,
        userId: In(userIds),
        leftAt: IsNull(),
        team: {
          status: TeamStatus.ACTIVE,
          ...(visibleTeamIds ? { id: In(visibleTeamIds) } : {}),
        },
      },
      relations: { team: true },
      order: { team: { name: 'ASC' } },
    });
  }

  private async weeklyMinutesFor(
    companyId: string,
    userIds: string[],
  ): Promise<Map<string, number>> {
    const today = await this.capacity.today(companyId);
    const timelines = await this.capacity.timelinesFor(
      companyId,
      userIds,
      today,
    );

    return new Map(
      userIds.map((id) => [id, timelines.get(id)!.minutesPerWeekOn(today)]),
    );
  }

  /**
   * The people the caller may put on a team or a project: everyone in the
   * company for an owner, a manager's own people plus the manager themselves.
   * Separate from `list` only because of that "plus themselves" — a manager
   * who leads no team must still be able to pick themselves.
   */
  async listAssignable(
    companyId: string,
    query: AssignableUsersQuery,
    user: AuthUser,
  ) {
    const qb = this.repo
      .createQueryBuilder('u')
      .where('u.company_id = :companyId', { companyId });

    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }

    if (query.role) {
      qb.andWhere('u.role = :role', { role: query.role });
    }

    if (query.search) {
      andWhereAnyContains(qb, PERSON_SEARCH_COLUMNS, query.search);
    }

    this.teamVisibility.applyUserVisibility(qb, 'u.id', user, {
      includeSelf: true,
    });

    const [results, count] = await qb
      .orderBy('u.first_name', 'ASC')
      .addOrderBy('u.last_name', 'ASC')
      .addOrderBy('u.id', 'ASC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  async findUserById(
    id: string,
    companyId?: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
    });
  }

  async getUserById(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<User & { hasPassword: boolean; googleLinked: boolean }> {
    const user = await this.findUserById(id, companyId, manager);
    if (!user) {
      throw new NotFoundException(
        `User with id ${id} not found in this company`,
      );
    }
    return {
      ...user,
      hasPassword: Boolean(user.passwordHash),
      googleLinked: Boolean(user.googleId),
    };
  }

  async getUserDetailsById(
    id: string,
    companyId: string,
    caller: AuthUser,
    manager?: EntityManager,
  ): Promise<
    User & {
      hasPassword: boolean;
      googleLinked: boolean;
      teams: UserTeamMembership[];
    }
  > {
    const user = await this.getRepository(manager).findOne({
      where: {
        id,
        companyId,
      },
      relations: {
        projects: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `User with id ${id} not found in this company`,
      );
    }

    if (
      caller.role === UserRole.MANAGER &&
      !(await this.teamVisibility.isUserInManagedTeams(id, caller))
    ) {
      throw new NotFoundException(
        `User with id ${id} not found in this company`,
      );
    }

    const memberships = await this.openMembershipsFor(companyId, [id], caller);

    return {
      ...user,
      hasPassword: Boolean(user.passwordHash),
      googleLinked: Boolean(user.googleId),
      teams: memberships.map(({ team, roleInTeam, joinedAt }) => ({
        id: team.id,
        name: team.name,
        status: team.status,
        roleInTeam,
        joinedAt,
      })),
    };
  }

  async findUsersByIds(
    ids: string[],
    companyId: string,
    manager?: EntityManager,
  ): Promise<User[]> {
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) return [];

    const users = await this.getRepository(manager).find({
      where: {
        id: In(uniqueIds),
        companyId,
        status: UserStatus.ACTIVE,
      },
    });

    if (users.length !== uniqueIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Users not found, inactive, or belong to another company: ${missingIds.join(', ')}`,
      );
    }

    return users;
  }

  async findActiveOnlyMany(
    ids: string[],
    companyId: string,
    manager?: EntityManager,
  ): Promise<User[]> {
    return this.findUsersByIds(ids, companyId, manager);
  }

  async createInvitedUser(
    payload: {
      companyId: string;
      email: string;
      role: UserRole;
      firstName: string;
      lastName: string;
      passwordHash?: string | null;
      googleId?: string | null;
    },
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);

      const user = repo.create({
        companyId: payload.companyId,
        email: payload.email.toLowerCase().trim(),
        role: payload.role,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        passwordHash: payload.passwordHash ?? null,
        status: UserStatus.ACTIVE,
        googleId: payload.googleId ?? null,
      });

      return this.safeSave(repo, user, payload.email);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async updateUser(
    id: string,
    companyId: string,
    payload: UpdateUserPayload,
    currentRole: UserRole,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (user.role === UserRole.OWNER && currentRole !== UserRole.OWNER) {
        throw new ForbiddenException(
          'Only Company OWNER can modify another OWNER',
        );
      }

      if (payload.firstName !== undefined) user.firstName = payload.firstName;
      if (payload.lastName !== undefined) user.lastName = payload.lastName;
      if (payload.role !== undefined) {
        if (payload.role === UserRole.OWNER && currentRole !== UserRole.OWNER) {
          throw new ForbiddenException(
            'Only Company OWNER can assign the OWNER role',
          );
        }

        if (
          user.role === UserRole.MANAGER &&
          payload.role !== UserRole.MANAGER
        ) {
          await this.assertManagesNoTeam(user, man);
        }
        user.role = payload.role;
      }
      if (payload.position !== undefined) user.position = payload.position;

      return this.safeSave(repo, user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  /** Team memberships never change as a side effect of a role change. */
  private async assertManagesNoTeam(
    user: User,
    manager: EntityManager,
  ): Promise<void> {
    const managedTeams = await manager.getRepository(TeamMembership).find({
      where: {
        userId: user.id,
        companyId: user.companyId,
        roleInTeam: TeamRole.MANAGER,
        leftAt: IsNull(),
        team: { status: TeamStatus.ACTIVE },
      },
      relations: ['team'],
      order: { team: { name: 'ASC' } },
    });

    if (managedTeams.length > 0) {
      const teamNames = managedTeams
        .map((membership) => membership.team.name)
        .join(', ');
      throw new BadRequestException(
        `This person manages ${teamNames}. Remove them as manager before changing their role.`,
      );
    }
  }

  async updateProfile(
    id: string,
    companyId: string,
    payload: UpdateProfilePayload,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (payload.firstName !== undefined) user.firstName = payload.firstName;
      if (payload.lastName !== undefined) user.lastName = payload.lastName;
      if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;

      return this.safeSave(repo, user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async updatePassword(
    id: string,
    companyId: string,
    passwordHash: string,
    manager?: EntityManager,
  ): Promise<void> {
    const execute = async (man: EntityManager): Promise<void> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);
      user.passwordHash = passwordHash;
      await repo.save(user);
    };

    if (manager) {
      await execute(manager);
    } else {
      await this.dataSource.transaction(execute);
    }
  }

  async archive(
    id: string,
    currentUserId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      if (id === currentUserId) {
        throw new BadRequestException('You cannot archive your own account');
      }

      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (user.role === UserRole.OWNER) {
        throw new ForbiddenException(
          'Company OWNER account cannot be archived',
        );
      }

      if (user.status === UserStatus.DEACTIVATED) {
        throw new BadRequestException('User is already archived');
      }

      user.status = UserStatus.DEACTIVATED;
      return repo.save(user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async unarchive(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (user.status === UserStatus.ACTIVE) {
        throw new BadRequestException('User is already active');
      }

      user.status = UserStatus.ACTIVE;
      return repo.save(user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }
}
