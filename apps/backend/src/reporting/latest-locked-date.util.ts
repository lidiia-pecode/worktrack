import { EntityManager } from 'typeorm';

import { findCompanyToday } from 'src/companies/company-today.util';

import { ReportingPeriod } from './entities/reporting-period.entity';
import { ReportingPeriodStatus } from './enums/reporting-period-status.enum';
import {
  addMonths,
  lastDayOfMonth,
  latestAutoLockedMonth,
} from './reporting-months.util';

/**
 * The last day of the newest locked month. Inside a transaction the reopened
 * months' rows are share-locked, so a Close at the same moment waits for the
 * write that checked them.
 */
export async function findLatestLockedDate(
  manager: EntityManager,
  companyId: string,
  inTransaction: boolean,
): Promise<string> {
  const today = await findCompanyToday(manager, companyId);
  const rows = await manager.find(ReportingPeriod, {
    where: { companyId, status: ReportingPeriodStatus.OPEN },
    select: ['month'],
    ...(inTransaction && { lock: { mode: 'pessimistic_read' } }),
  });
  const reopened = new Set(rows.map((row) => row.month));

  let month = latestAutoLockedMonth(today);
  while (reopened.has(month)) {
    month = addMonths(month, -1);
  }

  return lastDayOfMonth(month);
}
