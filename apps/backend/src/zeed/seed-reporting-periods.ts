import { DataSource } from 'typeorm';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { ReportingPeriodStatus } from 'src/reporting/enum/reporting-period-status.enum';

export async function seedReportingPeriods(
  dataSource: DataSource,
  companyId: string,
) {
  const periodRepo = dataSource.getRepository(ReportingPeriod);

  const periodsData = [
    {
      name: 'Q1 2026',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      status: ReportingPeriodStatus.LOCKED,
    },
    {
      name: 'Q2 2026',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      status: ReportingPeriodStatus.OPEN,
    },
    {
      name: 'Q3 2026',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      status: ReportingPeriodStatus.OPEN,
    },
  ];

  for (const item of periodsData) {
    const existing = await periodRepo.findOneBy({
      companyId,
      name: item.name,
    });

    if (!existing) {
      const period = periodRepo.create({
        companyId,
        ...item,
      });

      await periodRepo.save(period);
    }
  }

  console.log('✅ Reporting periods seeded via Repository');
}
