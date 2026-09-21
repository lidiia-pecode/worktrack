import { DataSource } from 'typeorm';
import { Absence } from 'src/absences/entities/absence.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';

import { ABSENCES, dayOfWeek } from './seed-config';
import { buildLookups } from './seed-lookups';

export async function seedAbsences(dataSource: DataSource, companyId: string) {
  const absenceRepo = dataSource.getRepository(Absence);
  const lookup = await buildLookups(dataSource, companyId);

  let created = 0;

  for (const item of ABSENCES) {
    const userId = lookup.userId(item.email);
    const startDate = dayOfWeek(item.startDay);
    const endDate = dayOfWeek(item.endDay);

    const overlapping = await absenceRepo
      .createQueryBuilder('a')
      .where('a.companyId = :companyId', { companyId })
      .andWhere('a.userId = :userId', { userId })
      .andWhere('a.startDate <= :endDate', { endDate })
      .andWhere('a.endDate >= :startDate', { startDate })
      .getExists();

    if (overlapping) continue;

    // The seed writes straight to the tables, so nothing enforces the rule
    // here: skip rather than create data the app itself would refuse.
    const workedDay = await dataSource
      .getRepository(TimeLog)
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.userId = :userId', { userId })
      .andWhere('t.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getExists();

    if (workedDay) {
      console.log(
        `⚠️  Skipped ${item.type} for ${item.email}: time is already logged between ${startDate} and ${endDate}`,
      );
      continue;
    }

    await absenceRepo.save(
      absenceRepo.create({
        companyId,
        userId,
        type: item.type,
        startDate,
        endDate,
      }),
    );

    created += 1;
  }

  console.log(`✅ Absences seeded (${created})`);
}
