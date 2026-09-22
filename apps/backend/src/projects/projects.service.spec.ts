import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { PaginationQuery } from 'src/lib/dtos/pagination-query.dto';
import { Company } from 'src/companies/entities/company.entity';
import { ActivitiesService } from 'src/activities/activities.service';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import { PlanningService } from 'src/planning/planning.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { AssignableActivitiesQuery } from './dtos/assignable-activities-query.dto';
import { Project } from './entities/project.entity';
import { ProjectActivity } from './entities/project-activity.entity';
import { ProjectsService } from './projects.service';

/**
 * Runs against the development database, so it needs the Docker stack:
 * `make test`. The rule under test is which members a save may add and remove,
 * and that is a diff against rows the database holds.
 *
 * Everything is created under a throwaway company and deleted afterwards.
 */

const RUN = Date.now();
const SLUG = `projects-scope-test-${RUN}`;
const JOINED_AT = '2025-12-31';

const stub = <T>(value: unknown): T => value as T;

describe('ProjectsService membership scope', () => {
  let dataSource: DataSource;
  let service: ProjectsService;

  let companyId: string;
  let owner: AuthUser;
  let alphaManager: AuthUser; // leads "Alpha"
  let betaManager: AuthUser; // leads "Beta"
  let loneManager: AuthUser; // has the MANAGER role but is on no team
  let alphaMember: AuthUser; // in "Alpha"
  let betaMember: AuthUser; // in "Beta"
  let leaver: AuthUser; // in "Alpha", archived by the archiving tests

  let activityId: string;

  const createUser = async (
    name: string,
    role: UserRole,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@projects-scope.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
      status: UserStatus.ACTIVE,
    });

    return { id: user.id, email, companyId, role };
  };

  const addToTeam = async (
    teamId: string,
    user: AuthUser,
    roleInTeam: TeamRole,
  ): Promise<void> => {
    await dataSource.getRepository(TeamMembership).save({
      companyId,
      teamId,
      userId: user.id,
      roleInTeam,
      joinedAt: JOINED_AT,
    });
  };

  /** A project with the given members, created outside the service. */
  const createProject = async (
    name: string,
    members: AuthUser[],
  ): Promise<string> => {
    const project = await dataSource.getRepository(Project).save({
      companyId,
      name: `${name} ${RUN}`,
    });

    if (members.length) {
      await dataSource
        .createQueryBuilder()
        .relation(Project, 'users')
        .of(project.id)
        .add(members.map((member) => member.id));
    }

    return project.id;
  };

  const setStatus = async (
    user: AuthUser,
    status: UserStatus,
  ): Promise<void> => {
    await dataSource.getRepository(User).update({ id: user.id }, { status });
  };

  /** Makes the project loggable by giving it one active activity. */
  const linkActivity = async (projectId: string): Promise<void> => {
    await dataSource
      .getRepository(ProjectActivity)
      .save({ companyId, projectId, activityId });
  };

  const memberIds = async (projectId: string): Promise<string[]> => {
    const rows: Array<{ user_id: string }> = await dataSource
      .createQueryBuilder()
      .select('pu.user_id', 'user_id')
      .from('project_users', 'pu')
      .where('pu.project_id = :projectId', { projectId })
      .getRawMany();

    return rows.map((row) => row.user_id).sort();
  };

  const sorted = (...users: AuthUser[]): string[] =>
    users.map((user) => user.id).sort();

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const teamVisibility = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );

    service = new ProjectsService(
      dataSource.getRepository(Project),
      dataSource.getRepository(ProjectActivity),
      dataSource.getRepository(User),
      stub<ActivitiesService>({
        findActiveOnlyMany: (ids: string[]) =>
          dataSource.getRepository(Activity).findBy({ id: In(ids) }),
      }),
      new UsersService(
        dataSource.getRepository(User),
        teamVisibility,
        dataSource,
      ),
      teamVisibility,
      stub<PlanningService>({
        deleteForRemovedMembers: () => Promise.resolve(),
      }),
      dataSource,
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    owner = await createUser('owner', UserRole.OWNER);
    alphaManager = await createUser('alphamanager', UserRole.MANAGER);
    betaManager = await createUser('betamanager', UserRole.MANAGER);
    loneManager = await createUser('lonemanager', UserRole.MANAGER);
    alphaMember = await createUser('alphamember', UserRole.EMPLOYEE);
    betaMember = await createUser('betamember', UserRole.EMPLOYEE);
    leaver = await createUser('leaver', UserRole.EMPLOYEE);

    const alpha = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Alpha ${RUN}` });
    const beta = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Beta ${RUN}` });

    await addToTeam(alpha.id, alphaManager, TeamRole.MANAGER);
    await addToTeam(alpha.id, alphaMember, TeamRole.MEMBER);
    await addToTeam(alpha.id, leaver, TeamRole.MEMBER);
    await addToTeam(beta.id, betaManager, TeamRole.MANAGER);
    await addToTeam(beta.id, betaMember, TeamRole.MEMBER);

    const category = await dataSource
      .getRepository(ActCategory)
      .save({ companyId, name: `Category ${RUN}` });

    const activity = await dataSource.getRepository(Activity).save({
      companyId,
      name: `Activity ${RUN}`,
      categoryId: category.id,
    });

    activityId = activity.id;
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    // Project membership does not cascade from the user, so it goes first.
    await dataSource
      .createQueryBuilder()
      .delete()
      .from('project_users')
      .where(
        'project_id IN (SELECT id FROM projects WHERE company_id = :companyId)',
        { companyId },
      )
      .execute();

    // Users, teams, projects and memberships all cascade from the company.
    await dataSource.getRepository(Company).delete({ slug: SLUG });
    await dataSource.destroy();
  });

  describe('update', () => {
    it('lets a manager assign someone from a team they lead', async () => {
      const projectId = await createProject('assign own', []);

      await service.update(
        projectId,
        { userIds: [alphaMember.id] },
        alphaManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(sorted(alphaMember));
    });

    it("refuses a manager someone from another manager's team", async () => {
      const projectId = await createProject('assign other', []);

      await expect(
        service.update(projectId, { userIds: [betaMember.id] }, alphaManager),
      ).rejects.toThrow(ForbiddenException);

      await expect(memberIds(projectId)).resolves.toEqual([]);
    });

    it('lets an owner assign anyone in the company', async () => {
      const projectId = await createProject('owner assigns', []);

      await service.update(
        projectId,
        { userIds: [alphaMember.id, betaMember.id] },
        owner,
      );

      await expect(memberIds(projectId)).resolves.toEqual(
        sorted(alphaMember, betaMember),
      );
    });

    it("leaves members outside a manager's scope untouched", async () => {
      const projectId = await createProject('cross team', [
        alphaMember,
        betaMember,
      ]);

      // What the manager was shown, and therefore all they can submit.
      await service.update(
        projectId,
        { userIds: [alphaMember.id] },
        alphaManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(
        sorted(alphaMember, betaMember),
      );
    });

    it('lets a manager remove someone from a team they lead', async () => {
      const projectId = await createProject('remove own', [
        alphaMember,
        betaMember,
      ]);

      await service.update(projectId, { userIds: [] }, alphaManager);

      await expect(memberIds(projectId)).resolves.toEqual(sorted(betaMember));
    });

    it('lets a manager who leads no team assign themselves', async () => {
      const projectId = await createProject('lone manager', []);

      await service.update(
        projectId,
        { userIds: [loneManager.id] },
        loneManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(sorted(loneManager));
    });

    it('lets a manager add themselves alongside their own people', async () => {
      const projectId = await createProject('manager joins', []);

      await service.update(
        projectId,
        { userIds: [alphaManager.id, alphaMember.id] },
        alphaManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(
        sorted(alphaManager, alphaMember),
      );
    });

    // `UpdateUserModal` reads the members back and writes them all again. A
    // manager's read is partial, so the members they never saw must survive
    // both directions of that toggle.
    it('adds one person when the user modal sends the whole list', async () => {
      const projectId = await createProject('user modal add', [
        alphaMember,
        betaMember,
      ]);

      await service.update(
        projectId,
        { userIds: [alphaMember.id, alphaManager.id] },
        alphaManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(
        sorted(alphaMember, alphaManager, betaMember),
      );
    });

    it('removes one person when the user modal sends the whole list', async () => {
      const projectId = await createProject('user modal remove', [
        alphaMember,
        alphaManager,
        betaMember,
      ]);

      await service.update(
        projectId,
        { userIds: [alphaManager.id] },
        alphaManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(
        sorted(alphaManager, betaMember),
      );
    });
  });

  describe('getById', () => {
    it('gives an owner every member', async () => {
      const projectId = await createProject('owner reads', [
        alphaMember,
        betaMember,
      ]);

      const project = await service.getById(projectId, owner);

      expect(project.users.map((u) => u.id).sort()).toEqual(
        sorted(alphaMember, betaMember),
      );
    });

    it('gives a manager only their own people', async () => {
      const projectId = await createProject('manager reads', [
        alphaMember,
        betaMember,
      ]);

      const project = await service.getById(projectId, alphaManager);

      expect(project.users.map((u) => u.id)).toEqual([alphaMember.id]);
    });

    it('shows a manager themselves when they are a member', async () => {
      const projectId = await createProject('manager is member', [
        alphaManager,
        betaMember,
      ]);

      const project = await service.getById(projectId, alphaManager);

      expect(project.users.map((u) => u.id)).toEqual([alphaManager.id]);
    });

    it('still opens a project staffed entirely by people the manager cannot see', async () => {
      const projectId = await createProject('all invisible', [betaMember]);

      const project = await service.getById(projectId, alphaManager);

      expect(project.users).toEqual([]);
      expect(project.membersCount).toBe(1);
    });

    it('reports the true member count to every role', async () => {
      const projectId = await createProject('true count', [
        alphaMember,
        betaMember,
      ]);

      const asManager = await service.getById(projectId, alphaManager);
      const asOwner = await service.getById(projectId, owner);

      expect(asManager.membersCount).toBe(2);
      expect(asManager.users).toHaveLength(1);
      expect(asOwner.membersCount).toBe(2);
    });

    it('keeps the members a manager cannot see when the project is archived', async () => {
      const projectId = await createProject('archive keeps', [
        alphaMember,
        betaMember,
      ]);

      await service.archive(projectId, alphaManager);

      await expect(memberIds(projectId)).resolves.toEqual(
        sorted(alphaMember, betaMember),
      );
    });
  });

  describe('listUsers', () => {
    const PAGE = { offset: 0, limit: 50 } as PaginationQuery;

    it('gives an owner every member', async () => {
      const projectId = await createProject('list owner', [
        alphaMember,
        betaMember,
      ]);

      const { results, count } = await service.listUsers(
        projectId,
        PAGE,
        owner,
      );

      expect(results.map((u) => u.id).sort()).toEqual(
        sorted(alphaMember, betaMember),
      );
      expect(count).toBe(2);
    });

    it('gives a manager their own people and the scoped count', async () => {
      const projectId = await createProject('list manager', [
        alphaMember,
        betaMember,
      ]);

      const { results, count } = await service.listUsers(
        projectId,
        PAGE,
        alphaManager,
      );

      expect(results.map((u) => u.id)).toEqual([alphaMember.id]);
      expect(count).toBe(1);
    });

    it('404s on a project in another company', async () => {
      await expect(
        service.listUsers(randomUUID(), PAGE, owner),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('a manager as a project member', () => {
    const PAGE = { offset: 0, limit: 50 } as AssignableActivitiesQuery;

    const loggableProjectIds = async (caller: AuthUser): Promise<string[]> => {
      const { results } = await service.listAssignableActivities(PAGE, caller);

      return results.map((projectActivity) => projectActivity.project.id);
    };

    it('lets a manager put themselves on a project and log against it', async () => {
      const projectId = await createProject('manager logs', []);
      await linkActivity(projectId);

      await service.update(
        projectId,
        { userIds: [alphaManager.id] },
        alphaManager,
      );

      await expect(loggableProjectIds(alphaManager)).resolves.toContain(
        projectId,
      );
    });

    it('lets a manager who leads no team do the same', async () => {
      const projectId = await createProject('lone manager logs', []);
      await linkActivity(projectId);

      await service.update(
        projectId,
        { userIds: [loneManager.id] },
        loneManager,
      );

      await expect(loggableProjectIds(loneManager)).resolves.toContain(
        projectId,
      );
    });

    it('lets an owner be a project member', async () => {
      const projectId = await createProject('owner logs', []);
      await linkActivity(projectId);

      await service.update(projectId, { userIds: [owner.id] }, owner);

      await expect(loggableProjectIds(owner)).resolves.toContain(projectId);
    });

    it("leaves a project off a manager's timesheet when they are not a member", async () => {
      const projectId = await createProject('not a member', [alphaMember]);
      await linkActivity(projectId);

      await expect(loggableProjectIds(alphaManager)).resolves.not.toContain(
        projectId,
      );
    });
  });

  describe('an archived member', () => {
    afterEach(async () => {
      await setStatus(leaver, UserStatus.ACTIVE);
    });

    it('survives a save that leaves the project unchanged', async () => {
      const projectId = await createProject('archived stays', [
        alphaMember,
        leaver,
      ]);
      await setStatus(leaver, UserStatus.DEACTIVATED);

      await service.update(
        projectId,
        { userIds: [alphaMember.id, leaver.id] },
        alphaManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(
        sorted(alphaMember, leaver),
      );
    });

    it('is still listed, marked as archived', async () => {
      const projectId = await createProject('archived listed', [leaver]);
      await setStatus(leaver, UserStatus.DEACTIVATED);

      const project = await service.getById(projectId, alphaManager);

      expect(project.users.map((u) => u.id)).toEqual([leaver.id]);
      expect(project.users[0].status).toBe(UserStatus.DEACTIVATED);
      expect(project.membersCount).toBe(1);
    });

    it('can still be removed deliberately', async () => {
      const projectId = await createProject('archived removed', [
        alphaMember,
        leaver,
      ]);
      await setStatus(leaver, UserStatus.DEACTIVATED);

      await service.update(
        projectId,
        { userIds: [alphaMember.id] },
        alphaManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(sorted(alphaMember));
    });

    it('cannot be newly added', async () => {
      const projectId = await createProject('archived refused', []);
      await setStatus(leaver, UserStatus.DEACTIVATED);

      await expect(
        service.update(projectId, { userIds: [leaver.id] }, alphaManager),
      ).rejects.toThrow(NotFoundException);

      await expect(memberIds(projectId)).resolves.toEqual([]);
    });

    it('keeps the membership across un-archiving', async () => {
      const projectId = await createProject('archived restored', [leaver]);

      await setStatus(leaver, UserStatus.DEACTIVATED);
      await setStatus(leaver, UserStatus.ACTIVE);

      await expect(memberIds(projectId)).resolves.toEqual(sorted(leaver));
    });

    it('does not let an archived id smuggle someone past the scope check', async () => {
      const projectId = await createProject('archived scope', []);
      await setStatus(betaMember, UserStatus.DEACTIVATED);

      await expect(
        service.update(projectId, { userIds: [betaMember.id] }, alphaManager),
      ).rejects.toThrow(NotFoundException);

      await setStatus(betaMember, UserStatus.ACTIVE);
    });
  });

  describe('create', () => {
    it('applies the same scope to a new project', async () => {
      await expect(
        service.create(
          { name: `Refused ${RUN}`, userIds: [betaMember.id] },
          alphaManager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns the new project with its activities', async () => {
      const project = await service.create(
        { name: `With activities ${RUN}`, activityIds: [activityId] },
        alphaManager,
      );

      expect(
        project.projectActivities.map(
          (projectActivity) => projectActivity.activity.id,
        ),
      ).toEqual([activityId]);
    });

    it('lets a manager staff a new project from their own people', async () => {
      const project = await service.create(
        { name: `Staffed ${RUN}`, userIds: [alphaMember.id] },
        alphaManager,
      );

      await expect(memberIds(project.id)).resolves.toEqual(sorted(alphaMember));
    });
  });
});
