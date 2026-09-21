import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { ReportingPeriodStatus } from 'src/reporting/enums/reporting-period-status.enum';
import { ReportingService } from 'src/reporting/reporting.service';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { TimeLogsService } from 'src/time-logs/time-logs.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Absence } from './entities/absence.entity';
import { AbsenceType } from './enums/absence-type.enum';
import { AbsencesQuery } from './dtos/absences-query.dto';
import { AbsencesService } from './absences.service';

/**
 * Runs against the development database, so it needs the Docker stack. Both
 * services are built here because the rule under test is reciprocal: a day is
 * either worked or absent, and each side has to refuse the other.
 */

const RUN = Date.now();
const SLUG = `absence-test-${RUN}`;
const OTHER_SLUG = `absence-other-${RUN}`;

const START = '2026-02-10';
const END = '2026-02-12';
const LOCKED_DATE = '2026-03-10';

describe('AbsencesService', () => {
  let dataSource: DataSource;
  let service: AbsencesService;
  let timeLogs: TimeLogsService;

  let companyId: string;
  let owner: AuthUser;
  let manager: AuthUser; // leads "Alpha"
  let member: AuthUser; // in "Alpha"
  let outsider: AuthUser; // in the company, on no team
  let stranger: AuthUser; // a different company entirely

  let projectActivityId: string;

  const createUser = async (
    name: string,
    role: UserRole,
    inCompanyId = companyId,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@absence.test`;
    const user = await dataSource.getRepository(User).save({
      companyId: inCompanyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
    });

    return { id: user.id, email, companyId: inCompanyId, role };
  };

  const absenceFor = (
    ownerId: string,
    startDate = START,
    endDate = END,
    type = AbsenceType.VACATION,
  ) => ({ userId: ownerId, type, startDate, endDate });

  /** Written straight to the table, the way the seed does, to set up a state
   * the service itself would refuse to create. */
  const existingAbsence = async (
    ownerId: string,
    startDate = START,
    endDate = END,
    type = AbsenceType.VACATION,
  ) => {
    const absence = await dataSource
      .getRepository(Absence)
      .save({ companyId, userId: ownerId, type, startDate, endDate });

    return absence.id;
  };

  const query = (overrides: Partial<AbsencesQuery> = {}): AbsencesQuery =>
    Object.assign(new AbsencesQuery(), overrides);

  const existingTimeLog = async (ownerId: string, date = START) => {
    const log = await dataSource.getRepository(TimeLog).save({
      companyId,
      userId: ownerId,
      projectActivityId,
      minutes: 60,
      date,
      isBillable: true,
    });

    return log.id;
  };

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const teamVisibility = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );

    const reporting = new ReportingService(
      dataSource.getRepository(ReportingPeriod),
      teamVisibility,
    );

    service = new AbsencesService(
      dataSource.getRepository(Absence),
      reporting,
      teamVisibility,
      dataSource,
    );

    timeLogs = new TimeLogsService(
      dataSource.getRepository(TimeLog),
      dataSource.getRepository(ProjectActivity),
      reporting,
      teamVisibility,
      dataSource,
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    owner = await createUser('owner', UserRole.OWNER);
    manager = await createUser('manager', UserRole.MANAGER);
    member = await createUser('member', UserRole.EMPLOYEE);
    outsider = await createUser('outsider', UserRole.EMPLOYEE);

    const otherCompany = await dataSource
      .getRepository(Company)
      .save({ companyName: OTHER_SLUG, slug: OTHER_SLUG });
    stranger = await createUser('stranger', UserRole.EMPLOYEE, otherCompany.id);

    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Alpha ${RUN}` });

    for (const [user, roleInTeam] of [
      [manager, TeamRole.MANAGER],
      [member, TeamRole.MEMBER],
    ] as const) {
      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: team.id,
        userId: user.id,
        roleInTeam,
        joinedAt: '2026-01-01',
      });
    }

    const category = await dataSource
      .getRepository(ActCategory)
      .save({ companyId, name: `Category ${RUN}` });

    const activity = await dataSource.getRepository(Activity).save({
      companyId,
      name: `Activity ${RUN}`,
      categoryId: category.id,
    });

    const project = await dataSource
      .getRepository(Project)
      .save({ companyId, name: `Project ${RUN}` });

    const projectActivity = await dataSource
      .getRepository(ProjectActivity)
      .save({ companyId, projectId: project.id, activityId: activity.id });

    projectActivityId = projectActivity.id;

    for (const user of [owner, manager, member, outsider]) {
      await dataSource.query(
        'INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)',
        [project.id, user.id],
      );
    }

    await dataSource.getRepository(ReportingPeriod).save({
      companyId,
      name: `Locked ${RUN}`,
      startDate: LOCKED_DATE,
      endDate: LOCKED_DATE,
      status: ReportingPeriodStatus.LOCKED,
    });
  });

  afterEach(async () => {
    await dataSource.getRepository(TimeLog).delete({ companyId });
    await dataSource.getRepository(Absence).delete({ companyId });
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.query(
      'DELETE FROM project_users WHERE user_id IN (SELECT id FROM users WHERE company_id = $1)',
      [companyId],
    );

    await dataSource
      .getRepository(Company)
      .delete({ slug: In([SLUG, OTHER_SLUG]) });
    await dataSource.destroy();
  });

  describe('write scope', () => {
    it('lets anyone record their own absence', async () => {
      const absence = await service.create(absenceFor(member.id), member);

      expect(absence.userId).toBe(member.id);
    });

    it('defaults the owner to the caller', async () => {
      const absence = await service.create(
        { type: AbsenceType.VACATION, startDate: START, endDate: END },
        member,
      );

      expect(absence.userId).toBe(member.id);
    });

    it('lets an owner record for anyone in the company', async () => {
      const absence = await service.create(absenceFor(outsider.id), owner);

      expect(absence.userId).toBe(outsider.id);
    });

    it('lets a manager record for someone in a team they lead', async () => {
      const absence = await service.create(absenceFor(member.id), manager);

      expect(absence.userId).toBe(member.id);
    });

    it('refuses a manager for someone on no team of theirs', async () => {
      await expect(
        service.create(absenceFor(outsider.id), manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses an employee for anyone but themselves', async () => {
      await expect(
        service.create(absenceFor(member.id), outsider),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses someone from another company', async () => {
      await expect(
        service.create(absenceFor(member.id), stranger),
      ).rejects.toThrow(ForbiddenException);
    });

    it('applies the same scope to update and delete', async () => {
      const id = await existingAbsence(member.id);

      await expect(
        service.update(id, { note: 'changed' }, outsider),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.delete(id, outsider)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('the range itself', () => {
    it('records a multi-day absence as one row', async () => {
      const absence = await service.create(
        absenceFor(member.id, '2026-02-10', '2026-02-23'),
        member,
      );

      expect(absence.startDate).toBe('2026-02-10');
      expect(absence.endDate).toBe('2026-02-23');
      expect(
        await dataSource.getRepository(Absence).count({ where: { companyId } }),
      ).toBe(1);
    });

    it('accepts a single day', async () => {
      const absence = await service.create(
        absenceFor(member.id, START, START, AbsenceType.PUBLIC_HOLIDAY),
        member,
      );

      expect(absence.startDate).toBe(absence.endDate);
    });

    it('refuses a reversed range', async () => {
      await expect(
        service.create(absenceFor(member.id, END, START), member),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses a reversed range on update too', async () => {
      const id = await existingAbsence(member.id);

      await expect(
        service.update(id, { endDate: '2026-02-01' }, member),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('period locking', () => {
    it('refuses an absence inside a locked period', async () => {
      await expect(
        service.create(absenceFor(member.id, LOCKED_DATE, LOCKED_DATE), member),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses a range that only reaches into a locked period', async () => {
      await expect(
        service.create(
          absenceFor(member.id, '2026-03-08', '2026-03-12'),
          member,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses update and delete of an absence in a locked period', async () => {
      const id = await existingAbsence(member.id, LOCKED_DATE, LOCKED_DATE);

      await expect(
        service.update(id, { note: 'changed' }, member),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.delete(id, member)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses moving an absence into a locked period', async () => {
      const id = await existingAbsence(member.id);

      await expect(
        service.update(
          id,
          { startDate: '2026-03-08', endDate: '2026-03-12' },
          member,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('a day is either worked or absent', () => {
    it('refuses an absence covering a day that already has logged time', async () => {
      await existingTimeLog(member.id, '2026-02-11');

      await expect(
        service.create(absenceFor(member.id), member),
      ).rejects.toThrow(ConflictException);
    });

    it('names the conflicting dates in the refusal', async () => {
      await existingTimeLog(member.id, '2026-02-11');
      await existingTimeLog(member.id, '2026-02-12');

      await expect(
        service.create(absenceFor(member.id), member),
      ).rejects.toThrow(/2026-02-11, 2026-02-12/);
    });

    it('rejects the whole range, not only the conflicting days', async () => {
      await existingTimeLog(member.id, '2026-02-11');

      await expect(
        service.create(absenceFor(member.id), member),
      ).rejects.toThrow(ConflictException);

      expect(
        await dataSource.getRepository(Absence).count({ where: { companyId } }),
      ).toBe(0);
    });

    it('ignores time logged by somebody else on the same day', async () => {
      await existingTimeLog(outsider.id, '2026-02-11');

      const absence = await service.create(absenceFor(member.id), member);

      expect(absence.id).toBeDefined();
    });

    it('refuses time logged on a day covered by an absence', async () => {
      await service.create(absenceFor(member.id), member);

      await expect(
        timeLogs.create(
          { projectActivityId, minutes: 60, date: '2026-02-11' },
          member,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses moving a time log onto a day covered by an absence', async () => {
      const logId = await existingTimeLog(member.id, '2026-02-20');
      await service.create(absenceFor(member.id), member);

      await expect(
        timeLogs.update(logId, { date: '2026-02-11' }, member),
      ).rejects.toThrow(ConflictException);
    });

    it('still allows editing and deleting a time log an absence grew over', async () => {
      const logId = await existingTimeLog(member.id, '2026-02-11');
      await existingAbsence(member.id);

      const updated = await timeLogs.update(logId, { minutes: 30 }, member);
      expect(updated.minutes).toBe(30);

      await expect(timeLogs.delete(logId, member)).resolves.toEqual({
        success: true,
      });
    });
  });

  describe('absences never count as hours', () => {
    it('leaves the team summary at zero for a week that is only absence', async () => {
      await service.create(absenceFor(member.id), member);

      const summary = await timeLogs.getTeamSummary(
        { dateFrom: START, dateTo: END },
        owner,
      );

      expect(summary.minutes).toBe(0);
      expect(summary.rows.every((row) => row.minutes === 0)).toBe(true);
    });

    it('counts only logged time when a person has both in the same week', async () => {
      await existingTimeLog(member.id, '2026-02-09');
      await service.create(absenceFor(member.id), member);

      const summary = await timeLogs.getTeamSummary(
        { dateFrom: '2026-02-09', dateTo: END },
        owner,
      );

      expect(summary.minutes).toBe(60);
    });
  });

  describe('the database backs the range rule up', () => {
    it('refuses a reversed range written straight to the table', async () => {
      await expect(
        dataSource.getRepository(Absence).save({
          companyId,
          userId: member.id,
          type: AbsenceType.VACATION,
          startDate: END,
          endDate: START,
        }),
      ).rejects.toThrow(/CHK_|check constraint/i);
    });
  });

  describe('reading', () => {
    it('lets an employee read only their own', async () => {
      await service.create(absenceFor(member.id), member);
      await service.create(absenceFor(outsider.id), owner);

      const { results } = await service.list(query(), member);

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe(member.id);
    });

    it('lets a manager read their own team and nobody else', async () => {
      await service.create(absenceFor(member.id), member);
      await service.create(absenceFor(outsider.id), owner);

      const { results } = await service.list(query(), manager);

      expect(results.map((absence) => absence.userId)).toEqual([member.id]);
    });

    it('lets an owner read everyone in the company', async () => {
      await service.create(absenceFor(member.id), member);
      await service.create(absenceFor(outsider.id), owner);

      const { results } = await service.list(query(), owner);

      expect(results).toHaveLength(2);
    });

    it('refuses a userId filter the caller may not see', async () => {
      await expect(
        service.list(query({ userId: outsider.id }), manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns an absence that only overlaps the edge of the range', async () => {
      await service.create(
        absenceFor(member.id, '2026-02-10', '2026-02-20'),
        member,
      );

      const { results } = await service.list(
        query({ dateFrom: '2026-02-18', dateTo: '2026-02-25' }),
        member,
      );

      expect(results).toHaveLength(1);
    });

    it('leaves out an absence entirely outside the range', async () => {
      await service.create(
        absenceFor(member.id, '2026-02-10', '2026-02-12'),
        member,
      );

      const { results } = await service.list(
        query({ dateFrom: '2026-02-13', dateTo: '2026-02-25' }),
        member,
      );

      expect(results).toHaveLength(0);
    });

    it('refuses a reversed range', async () => {
      await expect(
        service.list(
          query({ dateFrom: '2026-02-20', dateTo: '2026-02-10' }),
          member,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('treats a public holiday like any other absence', async () => {
      await service.create(
        absenceFor(outsider.id, START, START, AbsenceType.PUBLIC_HOLIDAY),
        owner,
      );

      const { results } = await service.list(query(), member);

      expect(results).toHaveLength(0);
    });
  });

  describe('two absences may not overlap', () => {
    it('refuses an absence overlapping an existing one', async () => {
      await service.create(absenceFor(member.id), member);

      await expect(
        service.create(
          absenceFor(member.id, '2026-02-12', '2026-02-14'),
          member,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses a public holiday inside a vacation', async () => {
      await service.create(
        absenceFor(member.id, '2026-02-10', '2026-02-20'),
        member,
      );

      await expect(
        service.create(
          absenceFor(
            member.id,
            '2026-02-15',
            '2026-02-15',
            AbsenceType.PUBLIC_HOLIDAY,
          ),
          member,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('allows absences that only touch end to end', async () => {
      await service.create(
        absenceFor(member.id, '2026-02-10', '2026-02-12'),
        member,
      );

      const next = await service.create(
        absenceFor(member.id, '2026-02-13', '2026-02-15'),
        member,
      );

      expect(next.id).toBeDefined();
    });

    it('does not count the absence being updated as its own overlap', async () => {
      const id = await existingAbsence(member.id);

      const updated = await service.update(id, { note: 'changed' }, member);

      expect(updated.note).toBe('changed');
    });

    it('allows two people to be absent on the same days', async () => {
      await service.create(absenceFor(member.id), member);

      const other = await service.create(absenceFor(outsider.id), owner);

      expect(other.userId).toBe(outsider.id);
    });
  });
});
