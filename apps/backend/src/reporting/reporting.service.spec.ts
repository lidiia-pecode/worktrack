import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { todayISODate } from 'src/capacity/working-days.util';

import { ReportingPeriod } from './entities/reporting-period.entity';
import { ReportingMonthState } from './enums/reporting-month-state.enum';
import { ReportingService } from './reporting.service';
import {
  addMonths,
  editableUntil,
  firstDayOfMonth,
  isAutoLocked,
  lastDayOfMonth,
  latestAutoLockedMonth,
  monthsBetween,
  toMonthKey,
} from './reporting-months.util';

describe('reporting months', () => {
  it('keeps a month editable for seven days after it ends', () => {
    expect(editableUntil('2026-01-01')).toBe('2026-02-07');
    expect(isAutoLocked('2026-01-01', '2026-02-07')).toBe(false);
    expect(isAutoLocked('2026-01-01', '2026-02-08')).toBe(true);
  });

  it('carries the grace window across a year end', () => {
    expect(editableUntil('2025-12-01')).toBe('2026-01-07');
    expect(latestAutoLockedMonth('2026-01-07')).toBe('2025-11-01');
    expect(latestAutoLockedMonth('2026-01-08')).toBe('2025-12-01');
  });

  it('finds the last day of a month, leap years included', () => {
    expect(lastDayOfMonth('2028-02-01')).toBe('2028-02-29');
    expect(lastDayOfMonth('2026-02-01')).toBe('2026-02-28');
  });

  it('converts between dates, first days and month keys', () => {
    expect(firstDayOfMonth('2026-03-17')).toBe('2026-03-01');
    expect(firstDayOfMonth('2026-03')).toBe('2026-03-01');
    expect(toMonthKey('2026-03-17')).toBe('2026-03');
  });

  it('lists every month in a range', () => {
    expect(monthsBetween('2025-11-15', '2026-02-03')).toEqual([
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
    ]);
  });
});

/**
 * Runs against the development database, so it needs the Docker stack. Dates
 * are relative to today, because the lock itself is.
 */

const RUN = Date.now();
const SLUG = `reporting-test-${RUN}`;

describe('ReportingService', () => {
  let dataSource: DataSource;
  let service: ReportingService;
  let companyId: string;
  let ownerId: string;

  const today = todayISODate('UTC');
  const thisMonth = firstDayOfMonth(today);
  // Three months back is always past its grace window.
  const lockedMonth = addMonths(thisMonth, -3);
  const lockedMonthKey = toMonthKey(lockedMonth);
  const lockedDate = `${lockedMonthKey}-15`;
  const newestLocked = latestAutoLockedMonth(today);

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    service = new ReportingService(
      dataSource.getRepository(ReportingPeriod),
      dataSource.getRepository(Company),
      new TeamVisibilityService(
        dataSource.getRepository(TeamMembership),
        dataSource.getRepository(User),
      ),
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG, timezone: 'UTC' });
    companyId = company.id;

    const owner = await dataSource.getRepository(User).save({
      companyId,
      role: UserRole.OWNER,
      firstName: 'Owner',
      lastName: 'Test',
      email: `owner-${RUN}@reporting.test`,
    });
    ownerId = owner.id;
  });

  afterEach(async () => {
    await dataSource.getRepository(ReportingPeriod).delete({ companyId });
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });
    await dataSource.destroy();
  });

  describe('automatic locking', () => {
    it('leaves the current month open', async () => {
      await expect(service.isDateLocked(companyId, today)).resolves.toBe(false);
    });

    it('locks a month once its grace window has passed', async () => {
      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        true,
      );
    });

    it('locks a range as soon as it touches a locked month', async () => {
      await expect(
        service.isRangeLocked(companyId, lockedDate, today),
      ).resolves.toBe(true);
    });

    it('reports the end of the newest locked month', async () => {
      await expect(service.latestLockedDate(companyId)).resolves.toBe(
        lastDayOfMonth(newestLocked),
      );
    });
  });

  describe('reopening', () => {
    it('makes a locked month writable until it is closed again', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);
      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        false,
      );

      await service.closeMonth(companyId, lockedMonthKey, ownerId);
      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        true,
      );
    });

    it('can reopen a month that was closed again', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);
      await service.closeMonth(companyId, lockedMonthKey, ownerId);
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        false,
      );
    });

    it('skips a reopened month when finding the newest locked one', async () => {
      await service.reopenMonth(companyId, toMonthKey(newestLocked), ownerId);

      await expect(service.latestLockedDate(companyId)).resolves.toBe(
        lastDayOfMonth(addMonths(newestLocked, -1)),
      );
    });

    it('refuses a month that has not locked yet', async () => {
      await expect(
        service.reopenMonth(companyId, toMonthKey(thisMonth), ownerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses reopening twice', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      await expect(
        service.reopenMonth(companyId, lockedMonthKey, ownerId),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses closing a month that was never reopened', async () => {
      await expect(
        service.closeMonth(companyId, lockedMonthKey, ownerId),
      ).rejects.toThrow(ConflictException);
    });

    it('records who made the change', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      const row = await dataSource
        .getRepository(ReportingPeriod)
        .findOneByOrFail({ companyId, month: lockedMonth });
      expect(row.changedById).toBe(ownerId);
    });
  });

  describe('listing months', () => {
    it('lists twelve months newest first, each with its state', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      const months = await service.listMonths(companyId, {});

      expect(months).toHaveLength(12);
      expect(months[0]).toEqual({
        month: toMonthKey(thisMonth),
        state: ReportingMonthState.OPEN,
        editableUntil: editableUntil(thisMonth),
      });
      expect(months.find((m) => m.month === lockedMonthKey)).toEqual({
        month: lockedMonthKey,
        state: ReportingMonthState.REOPENED,
        editableUntil: null,
      });
      expect(
        months.find((m) => m.month === toMonthKey(addMonths(thisMonth, -4)))
          ?.state,
      ).toBe(ReportingMonthState.LOCKED);
    });

    it('shows last month in its grace window during the first week', async () => {
      const lastMonth = addMonths(thisMonth, -1);
      const [, previous] = await service.listMonths(companyId, {});

      expect(previous.state).toBe(
        isAutoLocked(lastMonth, today)
          ? ReportingMonthState.LOCKED
          : ReportingMonthState.GRACE,
      );
    });

    it('refuses a range that runs backwards', async () => {
      await expect(
        service.listMonths(companyId, { from: '2026-05', to: '2026-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
