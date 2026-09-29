import 'reflect-metadata';
import { createHash, randomBytes } from 'crypto';
import { DataSource, In, Like } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { InvitationStatus } from 'src/invitations/enums/invitation-status.enum';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';

import { OnboardingService } from './onboarding.service';

/**
 * Setup steps are questions about real rows, so this runs against the
 * development database: `make test`. Everything is created under throwaway
 * companies.
 */

const RUN = Date.now();
const SLUG_PREFIX = `onboarding-test-${RUN}`;

describe('OnboardingService', () => {
  let dataSource: DataSource;
  let service: OnboardingService;

  const createCompany = async (name: string): Promise<string> => {
    const slug = `${SLUG_PREFIX}-${name}`;
    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: slug, slug });

    return company.id;
  };

  const createUser = async (
    companyId: string,
    name: string,
    role: UserRole,
    status = UserStatus.ACTIVE,
  ): Promise<User> =>
    dataSource.getRepository(User).save({
      companyId,
      role,
      status,
      firstName: name,
      lastName: 'Test',
      email: `${name}-${RUN}@onboarding.test`,
    });

  const createTeam = async (
    companyId: string,
    name: string,
  ): Promise<string> => {
    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `${name} ${RUN}` });

    return team.id;
  };

  const addToTeam = (
    companyId: string,
    teamId: string,
    userId: string,
    roleInTeam: TeamRole,
  ) =>
    dataSource.getRepository(TeamMembership).save({
      companyId,
      teamId,
      userId,
      roleInTeam,
      joinedAt: '2026-01-01',
      leftAt: null,
    });

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    service = new OnboardingService(
      dataSource.getRepository(Team),
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
      dataSource.getRepository(Invitation),
      dataSource.getRepository(Activity),
      dataSource.getRepository(ActCategory),
      dataSource.getRepository(Project),
      dataSource.getRepository(Company),
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    const companies = await dataSource
      .getRepository(Company)
      .find({ where: { slug: Like(`${SLUG_PREFIX}-%`) } });
    const companyIds = companies.map(({ id }) => id);

    // Project members point at users, so projects go before the companies.
    await dataSource
      .getRepository(Project)
      .delete({ companyId: In(companyIds) });
    await dataSource.getRepository(Company).delete({ id: In(companyIds) });

    await dataSource.destroy();
  });

  describe('owner setup', () => {
    let companyId: string;
    let owner: User;
    let categoryId: string;
    let activityId: string;
    let projectId: string;

    const ownerState = () => service.getOwnerSetupState(companyId);

    beforeAll(async () => {
      companyId = await createCompany('owner');
      owner = await createUser(companyId, 'owner', UserRole.OWNER);
    });

    it('starts with nothing done', async () => {
      const state = await ownerState();

      expect(state.steps).toEqual({
        createTeam: false,
        createCategory: false,
        createActivity: false,
        addProjectActivities: false,
        addProjectPeople: false,
      });
      expect(state.managerSteps).toEqual({
        inviteManager: false,
        managerJoined: false,
        assignManager: false,
      });
      expect(state.setupProjectId).toBeNull();
      expect(state.setupFinished).toBe(false);
    });

    it('counts an active team', async () => {
      await createTeam(companyId, 'Delivery');

      expect((await ownerState()).steps.createTeam).toBe(true);
    });

    it('counts a category without ticking the activity step', async () => {
      const category = await dataSource
        .getRepository(ActCategory)
        .save({ companyId, name: `Development ${RUN}` });
      categoryId = category.id;

      const { steps } = await ownerState();

      expect(steps.createCategory).toBe(true);
      expect(steps.createActivity).toBe(false);
    });

    it('counts an active activity', async () => {
      const activity = await dataSource.getRepository(Activity).save({
        companyId,
        categoryId,
        name: `Coding ${RUN}`,
        defaultBillable: true,
      });
      activityId = activity.id;

      expect((await ownerState()).steps.createActivity).toBe(true);
    });

    it('points at a project that has no activities yet', async () => {
      const project = await dataSource
        .getRepository(Project)
        .save({ companyId, name: `Website ${RUN}` });
      projectId = project.id;

      const state = await ownerState();

      expect(state.steps.addProjectActivities).toBe(false);
      expect(state.setupProjectId).toBe(projectId);
    });

    it('ignores an activity that was taken off the project', async () => {
      await dataSource
        .getRepository(ProjectActivity)
        .save({ companyId, projectId, activityId, isActive: false });

      expect((await ownerState()).steps.addProjectActivities).toBe(false);
    });

    it('counts a project with an active activity', async () => {
      await dataSource
        .getRepository(ProjectActivity)
        .update({ projectId, activityId }, { isActive: true });

      const state = await ownerState();

      expect(state.steps.addProjectActivities).toBe(true);
      expect(state.steps.addProjectPeople).toBe(false);
      expect(state.setupProjectId).toBe(projectId);
    });

    it('ignores a project whose only activity is archived', async () => {
      await dataSource
        .getRepository(Activity)
        .update(activityId, { status: ActivityStatus.ARCHIVED });

      expect((await ownerState()).steps.addProjectActivities).toBe(false);

      await dataSource
        .getRepository(Activity)
        .update(activityId, { status: ActivityStatus.ACTIVE });
    });

    it('ignores a deactivated person on the project', async () => {
      const leaver = await createUser(
        companyId,
        'leaver',
        UserRole.EMPLOYEE,
        UserStatus.DEACTIVATED,
      );
      await dataSource
        .createQueryBuilder()
        .relation(Project, 'users')
        .of(projectId)
        .add(leaver.id);

      expect((await ownerState()).steps.addProjectPeople).toBe(false);
    });

    it('completes setup with the owner alone on the project', async () => {
      await dataSource
        .createQueryBuilder()
        .relation(Project, 'users')
        .of(projectId)
        .add(owner.id);

      const state = await ownerState();

      expect(state.steps.addProjectPeople).toBe(true);
      expect(state.setupFinished).toBe(true);
      expect(state.managerSteps.inviteManager).toBe(false);
    });

    it('stays finished when the project is archived later', async () => {
      await dataSource
        .getRepository(Project)
        .update(projectId, { status: ProjectStatus.ARCHIVED });

      const state = await ownerState();

      expect(state.steps.addProjectActivities).toBe(false);
      expect(state.setupProjectId).toBeNull();
      expect(state.setupFinished).toBe(true);

      await dataSource
        .getRepository(Project)
        .update(projectId, { status: ProjectStatus.ACTIVE });
    });

    it('counts a pending manager invitation, then the manager joining and leading a team', async () => {
      await dataSource.getRepository(Invitation).save({
        companyId,
        teamId: null,
        invitedById: owner.id,
        email: `manager-${RUN}@onboarding.test`,
        role: UserRole.MANAGER,
        status: InvitationStatus.PENDING,
        tokenHash: createHash('sha256')
          .update(randomBytes(32).toString('hex'))
          .digest('hex'),
        expiresAt: new Date(Date.now() + 3_600_000),
      });

      expect((await ownerState()).managerSteps).toEqual({
        inviteManager: true,
        managerJoined: false,
        assignManager: false,
      });

      const manager = await createUser(companyId, 'manager', UserRole.MANAGER);
      const team = await createTeam(companyId, 'Support');
      await addToTeam(companyId, team, manager.id, TeamRole.MANAGER);

      expect((await ownerState()).managerSteps).toEqual({
        inviteManager: true,
        managerJoined: true,
        assignManager: true,
      });
    });
  });

  describe('skipping setup', () => {
    let companyId: string;

    beforeAll(async () => {
      companyId = await createCompany('skip');
    });

    it('finishes setup for good with nothing done', async () => {
      await expect(
        service.getOwnerSetupState(companyId),
      ).resolves.toMatchObject({ setupFinished: false });

      await expect(service.skipOwnerSetup(companyId)).resolves.toMatchObject({
        setupFinished: true,
        steps: { createTeam: false },
      });

      await expect(
        service.getOwnerSetupState(companyId),
      ).resolves.toMatchObject({ setupFinished: true });
    });
  });
});
