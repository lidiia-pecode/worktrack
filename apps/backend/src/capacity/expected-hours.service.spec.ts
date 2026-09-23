import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { Absence } from 'src/absences/entities/absence.entity';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';

import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { ReportingPeriodStatus } from 'src/reporting/enums/reporting-period-status.enum';
import { ReportingService } from 'src/reporting/reporting.service';
import { eachMonth } from 'src/reporting/reporting-months.util';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { TimeLogsService } from 'src/time-logs/time-logs.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { UserCapacity } from './entities/user-capacity.entity';
import { CapacityService } from './capacity.service';
import { ExpectedHoursService } from './expected-hours.service';
import { todayISODate } from './working-days.util';

/**
 * Runs against the development database, so it needs the Docker stack.
 *
 * The week used throughout is Monday 9 February 2026 to Sunday 15 February
 * 2026 — five working days, so a full-timer expects 40h and the part-timer 24h.
 */

const RUN = Date.now();
const SLUG = `capacity-test-${RUN}`;
const OTHER_SLUG = `capacity-other-${RUN}`;

const MONDAY = '2026-02-09';
const FRIDAY = '2026-02-13';
const SUNDAY = '2026-02-15';

const FULL_WEEK = 40 * 60;
const PART_WEEK = 24 * 60;

const LOCKED_DATE = '2026-01-12';

describe('ExpectedHoursService', () => {
  let dataSource: DataSource;
  let service: ExpectedHoursService;
  let capacity: CapacityService;

  let timeLogs: TimeLogsService;

  let companyId: string;
  let owner: AuthUser;
  let fullTimer: string;
  let partTimer: string;
  let stranger: string;

  const createUser = async (
    name: string,
    inCompanyId?: string,
  ): Promise<string> => {
    const user = await dataSource.getRepository(User).save({
      companyId: inCompanyId ?? companyId,
      role: UserRole.EMPLOYEE,
      firstName: name,
      lastName: 'Test',
      email: `${name}-${RUN}@capacity.test`,
    });

    return user.id;
  };

  const setCapacity = async (
    userId: string,
    minutesPerWeek: number,
    validFrom: string,
  ) => {
    await dataSource
      .getRepository(UserCapacity)
      .save({ companyId, userId, validFrom, minutesPerWeek });
  };

  const setAbsence = async (
    userId: string,
    startDate: string,
    endDate: string,
  ) => {
    await dataSource.getRepository(Absence).save({
      companyId,
      userId,
      type: AbsenceType.VACATION,
      startDate,
      endDate,
    });
  };

  const expectedFor = async (userId: string, from = MONDAY, to = SUNDAY) =>
    (await service.expectedForUser(companyId, userId, from, to)).total;

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
      dataSource.getRepository(Company),
      teamVisibility,
    );

    capacity = new CapacityService(
      dataSource.getRepository(UserCapacity),
      dataSource.getRepository(Company),
      dataSource.getRepository(User),
      reporting,
    );

    service = new ExpectedHoursService(
      dataSource.getRepository(Absence),
      capacity,
    );

    timeLogs = new TimeLogsService(
      dataSource.getRepository(TimeLog),
      dataSource.getRepository(ProjectActivity),
      reporting,
      teamVisibility,
      service,
      dataSource,
    );

    const company = await dataSource.getRepository(Company).save({
      companyName: SLUG,
      slug: SLUG,
      standardWorkHoursPerDay: 8,
    });
    companyId = company.id;

    fullTimer = await createUser('full');
    partTimer = await createUser('part');

    const ownerId = await createUser('owner');
    owner = {
      id: ownerId,
      email: `owner-${RUN}@capacity.test`,
      companyId,
      role: UserRole.OWNER,
    };

    const otherCompany = await dataSource
      .getRepository(Company)
      .save({ companyName: OTHER_SLUG, slug: OTHER_SLUG });
    stranger = await createUser('stranger', otherCompany.id);

    // Past months lock by themselves. Reopening everything from February on
    // leaves January (LOCKED_DATE) as the newest locked month.
    await dataSource.getRepository(ReportingPeriod).save(
      eachMonth('2026-02-01', todayISODate()).map((month) => ({
        companyId,
        month,
        status: ReportingPeriodStatus.OPEN,
      })),
    );
  });

  beforeEach(async () => {
    await setCapacity(partTimer, PART_WEEK, '2020-01-01');
  });

  afterEach(async () => {
    await dataSource.getRepository(Absence).delete({ companyId });
    await dataSource.getRepository(UserCapacity).delete({ companyId });
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await dataSource
      .getRepository(Company)
      .delete({ slug: In([SLUG, OTHER_SLUG]) });
    await dataSource.destroy();
  });

  describe('capacity resolution', () => {
    it('falls back to the company default when there is no row', async () => {
      const minutes = await capacity.minutesPerWeekOn(
        companyId,
        fullTimer,
        MONDAY,
      );

      expect(minutes).toBe(FULL_WEEK);
    });

    it('uses the latest row that starts on or before the date', async () => {
      await setCapacity(fullTimer, 32 * 60, '2026-03-01');

      await expect(
        capacity.minutesPerWeekOn(companyId, fullTimer, '2026-02-28'),
      ).resolves.toBe(FULL_WEEK);

      await expect(
        capacity.minutesPerWeekOn(companyId, fullTimer, '2026-03-01'),
      ).resolves.toBe(32 * 60);
    });
  });

  describe('expected hours', () => {
    it('gives a full-timer their company-standard week', async () => {
      await expect(expectedFor(fullTimer)).resolves.toBe(FULL_WEEK);
    });

    it('measures a part-timer against their own capacity', async () => {
      await expect(expectedFor(partTimer)).resolves.toBe(PART_WEEK);
    });

    it('counts only working days, so a weekend expects nothing', async () => {
      await expect(expectedFor(fullTimer, '2026-02-14', SUNDAY)).resolves.toBe(
        0,
      );
    });

    it('expects nothing from a range with no working days in it', async () => {
      await expect(
        expectedFor(partTimer, '2026-02-14', '2026-02-14'),
      ).resolves.toBe(0);
    });
  });

  describe('absences', () => {
    it('brings a full week away to exactly zero for a full-timer', async () => {
      await setAbsence(fullTimer, MONDAY, FRIDAY);

      await expect(expectedFor(fullTimer)).resolves.toBe(0);
    });

    it('brings a full week away to exactly zero for a part-timer', async () => {
      await setAbsence(partTimer, MONDAY, FRIDAY);

      await expect(expectedFor(partTimer)).resolves.toBe(0);
    });

    it('removes only the days an absence actually covers', async () => {
      await setAbsence(partTimer, MONDAY, '2026-02-10');

      // Three of five days left, at 4h 48m each.
      await expect(expectedFor(partTimer)).resolves.toBe(
        Math.round((PART_WEEK / 5) * 3),
      );
    });

    it('handles an absence starting before the range and ending inside it', async () => {
      await setAbsence(fullTimer, '2026-02-04', '2026-02-10');

      await expect(expectedFor(fullTimer)).resolves.toBe(3 * 8 * 60);
    });

    it('ignores a weekend-only absence', async () => {
      await setAbsence(fullTimer, '2026-02-14', SUNDAY);

      await expect(expectedFor(fullTimer)).resolves.toBe(FULL_WEEK);
    });
  });

  describe('capacity changes over time', () => {
    it('applies a change from its date forward', async () => {
      await setCapacity(fullTimer, 32 * 60, '2026-02-11');

      // Mon and Tue at 8h, then Wed to Fri at 6h 24m.
      await expect(expectedFor(fullTimer)).resolves.toBe(
        Math.round(2 * 8 * 60 + 3 * ((32 * 60) / 5)),
      );
    });

    it('leaves an earlier week untouched when capacity changes later', async () => {
      const before = await expectedFor(fullTimer);

      await setCapacity(fullTimer, 16 * 60, '2026-03-02');

      await expect(expectedFor(fullTimer)).resolves.toBe(before);
    });
  });

  describe('the team summary and the timesheet agree', () => {
    const summaryExpectedFor = async (userId: string) => {
      const summary = await timeLogs.getTeamSummary(
        { dateFrom: MONDAY, dateTo: SUNDAY },
        owner,
      );

      return summary.rows.find((row) => row.user.id === userId)
        ?.expectedMinutes;
    };

    it('reports the same figure for a full-timer', async () => {
      expect(await summaryExpectedFor(fullTimer)).toBe(
        await expectedFor(fullTimer),
      );
    });

    it('reports the same figure for a part-timer', async () => {
      expect(await summaryExpectedFor(partTimer)).toBe(
        await expectedFor(partTimer),
      );
    });

    it('reports the same figure for somebody who was away', async () => {
      await setAbsence(partTimer, MONDAY, '2026-02-11');

      const fromSummary = await summaryExpectedFor(partTimer);

      expect(fromSummary).toBe(await expectedFor(partTimer));
      expect(fromSummary).toBeLessThan(PART_WEEK);
    });
  });

  describe('only finished days count towards behind', () => {
    const thisMonday = () => {
      const today = new Date();
      const monday = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
        ),
      );
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

      return monday;
    };

    const isoOffsetFromMonday = (days: number) => {
      const date = thisMonday();
      date.setUTCDate(date.getUTCDate() + days);

      return date.toISOString().slice(0, 10);
    };

    it('expects nothing yet from a week that has not started', async () => {
      const expected = await service.expectedForUser(
        companyId,
        fullTimer,
        isoOffsetFromMonday(7),
        isoOffsetFromMonday(13),
      );

      expect(expected.total).toBe(FULL_WEEK);
      expect(expected.toDate).toBe(0);
    });

    it('counts the whole of a week that is over', async () => {
      const expected = await service.expectedForUser(
        companyId,
        fullTimer,
        isoOffsetFromMonday(-7),
        isoOffsetFromMonday(-1),
      );

      expect(expected.toDate).toBe(expected.total);
    });

    it('leaves today itself out, whatever day it is', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const inAWeek = isoOffsetFromMonday(13);

      const expected = await service.expectedForUser(
        companyId,
        fullTimer,
        today,
        inAWeek,
      );

      // Nothing in a range starting today has finished yet.
      expect(expected.toDate).toBe(0);
      expect(expected.total).toBeGreaterThan(0);
    });

    it('expects nothing to date from somebody away all of a finished week', async () => {
      await setAbsence(
        partTimer,
        isoOffsetFromMonday(-7),
        isoOffsetFromMonday(-1),
      );

      const expected = await service.expectedForUser(
        companyId,
        partTimer,
        isoOffsetFromMonday(-7),
        isoOffsetFromMonday(-1),
      );

      expect(expected.total).toBe(0);
      expect(expected.toDate).toBe(0);
    });
  });

  describe('setting capacity', () => {
    it('reports the company default when nobody has set anything', async () => {
      const current = await capacity.currentFor(companyId, fullTimer, MONDAY);

      expect(current).toMatchObject({
        minutesPerWeek: FULL_WEEK,
        validFrom: null,
        isCompanyDefault: true,
      });
    });

    it('records a change from the date it takes effect', async () => {
      const current = await capacity.setCapacity(
        companyId,
        fullTimer,
        32 * 60,
        '2026-02-11',
        owner.id,
      );

      expect(current).toMatchObject({
        minutesPerWeek: 32 * 60,
        validFrom: '2026-02-11',
        isCompanyDefault: false,
      });
    });

    it('leaves the weeks before that date alone', async () => {
      const beforeChange = await expectedFor(
        fullTimer,
        '2026-02-02',
        '2026-02-08',
      );

      await capacity.setCapacity(
        companyId,
        fullTimer,
        16 * 60,
        MONDAY,
        owner.id,
      );

      await expect(
        expectedFor(fullTimer, '2026-02-02', '2026-02-08'),
      ).resolves.toBe(beforeChange);
    });

    it('replaces a row dated the same day rather than failing', async () => {
      await capacity.setCapacity(
        companyId,
        fullTimer,
        32 * 60,
        MONDAY,
        owner.id,
      );
      await capacity.setCapacity(
        companyId,
        fullTimer,
        30 * 60,
        MONDAY,
        owner.id,
      );

      const current = await capacity.currentFor(companyId, fullTimer, MONDAY);

      expect(current.minutesPerWeek).toBe(30 * 60);
    });

    it('refuses a change dated into a locked period', async () => {
      await expect(
        capacity.setCapacity(
          companyId,
          fullTimer,
          32 * 60,
          LOCKED_DATE,
          owner.id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses a change backdated before a locked period', async () => {
      // It would apply inside the locked period and rewrite what was expected
      // of somebody in a month already signed off.
      await expect(
        capacity.setCapacity(
          companyId,
          fullTimer,
          32 * 60,
          '2025-12-01',
          owner.id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('leaves a locked month untouched once the change is refused', async () => {
      const lockedWeek = ['2026-01-12', '2026-01-16'] as const;
      const before = await expectedFor(fullTimer, ...lockedWeek);

      await expect(
        capacity.setCapacity(
          companyId,
          fullTimer,
          20 * 60,
          '2025-12-01',
          owner.id,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(expectedFor(fullTimer, ...lockedWeek)).resolves.toBe(before);
    });

    it('refuses to set capacity for somebody in another company', async () => {
      await expect(
        capacity.setCapacity(companyId, stranger, 32 * 60, MONDAY, owner.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('planning never changes an expected figure', () => {
    let projectId: string;

    beforeAll(async () => {
      const project = await dataSource
        .getRepository(Project)
        .save({ companyId, name: `Project ${RUN}` });

      projectId = project.id;
    });

    afterEach(async () => {
      await dataSource.getRepository(PlanningEntry).delete({ companyId });
    });

    it('leaves a full-timer untouched whether or not they are planned', async () => {
      const before = await expectedFor(fullTimer);

      await dataSource.getRepository(PlanningEntry).save({
        companyId,
        userId: fullTimer,
        projectId,
        date: MONDAY,
        plannedMinutes: 120,
      });

      await expect(expectedFor(fullTimer)).resolves.toBe(before);
    });

    it('expects the same of somebody with no planning at all', async () => {
      await dataSource.getRepository(PlanningEntry).save({
        companyId,
        userId: fullTimer,
        projectId,
        date: MONDAY,
        plannedMinutes: 480,
      });

      // The part-timer has nothing planned; their expectation is their own.
      await expect(expectedFor(partTimer)).resolves.toBe(PART_WEEK);
    });
  });

  describe('the service contract', () => {
    it('refuses a range that runs backwards', async () => {
      await expect(expectedFor(fullTimer, SUNDAY, MONDAY)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('answers for several people in one call', async () => {
      const expected = await service.expectedFor(
        companyId,
        [fullTimer, partTimer],
        MONDAY,
        SUNDAY,
      );

      expect(expected.get(fullTimer)?.total).toBe(FULL_WEEK);
      expect(expected.get(partTimer)?.total).toBe(PART_WEEK);
    });
  });
});
