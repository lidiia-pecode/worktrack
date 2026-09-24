import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { Project } from 'src/projects/entities/project.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';

import { OnboardingService } from './onboarding.service';

/**
 * The manager wizard must only react to the manager's own teams, which is a
 * question about membership rows, so this runs against the development
 * database: `make test`. Everything is created under a throwaway company.
 */

const RUN = Date.now();
const SLUG = `onboarding-test-${RUN}`;

describe('OnboardingService manager setup', () => {
  let dataSource: DataSource;
  let service: OnboardingService;
  let companyId: string;

  const createUser = async (name: string, role: UserRole): Promise<string> => {
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email: `${name}-${RUN}@onboarding.test`,
    });

    return user.id;
  };

  const createTeam = async (name: string): Promise<string> => {
    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `${name} ${RUN}` });

    return team.id;
  };

  const addToTeam = (teamId: string, userId: string, roleInTeam: TeamRole) =>
    dataSource.getRepository(TeamMembership).save({
      companyId,
      teamId,
      userId,
      roleInTeam,
      joinedAt: '2026-01-01',
      leftAt: null,
    });

  const memberJoined = async (managerId: string) =>
    (await service.getManagerSetupState(companyId, managerId)).steps
      .memberJoined;

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
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });

    await dataSource.destroy();
  });

  describe('memberJoined', () => {
    let alphaManager: string;
    let betaManager: string;
    let beta: string;

    beforeAll(async () => {
      alphaManager = await createUser('alphamanager', UserRole.MANAGER);
      betaManager = await createUser('betamanager', UserRole.MANAGER);

      const alpha = await createTeam('Alpha');
      beta = await createTeam('Beta');

      await addToTeam(alpha, alphaManager, TeamRole.MANAGER);
      await addToTeam(beta, betaManager, TeamRole.MANAGER);
    });

    it('ignores an employee with no team', async () => {
      await createUser('noteam', UserRole.EMPLOYEE);

      await expect(memberJoined(alphaManager)).resolves.toBe(false);
    });

    it('counts an employee joining the manager team', async () => {
      const employee = await createUser('betamember', UserRole.EMPLOYEE);
      await addToTeam(beta, employee, TeamRole.MEMBER);

      await expect(memberJoined(betaManager)).resolves.toBe(true);
    });

    it('ignores an employee joining another manager team', async () => {
      await expect(memberJoined(alphaManager)).resolves.toBe(false);
    });
  });
});
