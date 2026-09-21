import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { ActivitiesService } from 'src/activities/activities.service';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

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
      stub<ActivitiesService>({}),
      new UsersService(
        dataSource.getRepository(User),
        teamVisibility,
        dataSource,
      ),
      teamVisibility,
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

    const alpha = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Alpha ${RUN}` });
    const beta = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Beta ${RUN}` });

    await addToTeam(alpha.id, alphaManager, TeamRole.MANAGER);
    await addToTeam(alpha.id, alphaMember, TeamRole.MEMBER);
    await addToTeam(beta.id, betaManager, TeamRole.MANAGER);
    await addToTeam(beta.id, betaMember, TeamRole.MEMBER);
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

    it('adds and removes one person when the user modal sends the whole list', async () => {
      const projectId = await createProject('user modal', [
        alphaMember,
        betaMember,
      ]);

      // `UpdateUserModal` reads the members back and writes them all again.
      // A manager's read is partial, so the absent beta member must survive.
      await service.update(
        projectId,
        { userIds: [alphaMember.id, alphaManager.id] },
        alphaManager,
      );

      await expect(memberIds(projectId)).resolves.toEqual(
        sorted(alphaMember, alphaManager, betaMember),
      );
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

    it('lets a manager staff a new project from their own people', async () => {
      const project = await service.create(
        { name: `Staffed ${RUN}`, userIds: [alphaMember.id] },
        alphaManager,
      );

      await expect(memberIds(project.id)).resolves.toEqual(sorted(alphaMember));
    });
  });
});
