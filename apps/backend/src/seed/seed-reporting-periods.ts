import { DataSource } from 'typeorm';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { ReportingPeriodStatus } from 'src/reporting/enum/reporting-period-status.enum';

import { reportingPeriods } from './seed-config';

export async function seedReportingPeriods(
  dataSource: DataSource,
  companyId: string,
) {
  const periodRepo = dataSource.getRepository(ReportingPeriod);
  const periods = reportingPeriods();

  for (const period of periods) {
    const existing = await periodRepo.findOneBy({
      companyId,
      name: period.name,
    });

    if (!existing) {
      await periodRepo.save(
        periodRepo.create({
          companyId,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          status: period.isPast
            ? ReportingPeriodStatus.LOCKED
            : ReportingPeriodStatus.OPEN,
        }),
      );
    }
  }

  console.log(`✅ Reporting periods seeded (${periods.length})`);
}
