import 'reflect-metadata';
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
import { ReportingService } from 'src/reporting/reporting.service';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { TimeLogsService } from 'src/time-logs/time-logs.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { UserCapacity } from './entities/user-capacity.entity';
import { CapacityService } from './capacity.service';
import { ExpectedHoursService } from './expected-hours.service';

/**
 * Runs against the development database, so it needs the Docker stack.
 *
 * The week used throughout is Monday 9 February 2026 to Sunday 15 February
 * 2026 — five working days, so a full-timer expects 40h and the part-timer 24h.
 */

const RUN = Date.now();
const SLUG = `capacity-test-${RUN}`;

const MONDAY = '2026-02-09';
const FRIDAY = '2026-02-13';
const SUNDAY = '2026-02-15';

const FULL_WEEK = 40 * 60;
const PART_WEEK = 24 * 60;

describe('ExpectedHoursService', () => {
  let dataSource: DataSource;
  let service: ExpectedHoursService;
  let capacity: CapacityService;

  let timeLogs: TimeLogsService;

  let companyId: string;
  let owner: AuthUser;
  let fullTimer: string;
  let partTimer: string;

  const createUser = async (name: string): Promise<string> => {
    const user = await dataSource.getRepository(User).save({
      companyId,
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

  const expectedFor = (userId: string, from = MONDAY, to = SUNDAY) =>
    service.expectedMinutesForUser(companyId, userId, from, to);

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    capacity = new CapacityService(
      dataSource.getRepository(UserCapacity),
      dataSource.getRepository(Company),
    );

    service = new ExpectedHoursService(
      dataSource.getRepository(Absence),
      capacity,
    );

    const teamVisibility = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );

    timeLogs = new TimeLogsService(
      dataSource.getRepository(TimeLog),
      dataSource.getRepository(ProjectActivity),
      new ReportingService(
        dataSource.getRepository(ReportingPeriod),
        teamVisibility,
      ),
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
    await dataSource.getRepository(Company).delete({ slug: In([SLUG]) });
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

  describe('the service contract', () => {
    it('refuses a range that runs backwards', async () => {
      await expect(expectedFor(fullTimer, SUNDAY, MONDAY)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('answers for several people in one call', async () => {
      const expected = await service.expectedMinutesFor(
        companyId,
        [fullTimer, partTimer],
        MONDAY,
        SUNDAY,
      );

      expect(expected.get(fullTimer)).toBe(FULL_WEEK);
      expect(expected.get(partTimer)).toBe(PART_WEEK);
    });
  });
});
