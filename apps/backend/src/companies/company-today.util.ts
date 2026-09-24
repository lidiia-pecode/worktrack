import { EntityManager } from 'typeorm';

import { todayISODate } from 'src/capacity/working-days.util';

import { Company } from './entities/company.entity';

/** Today where the company is, not on the server's clock. */
export const findCompanyToday = async (
  manager: EntityManager,
  companyId: string,
): Promise<string> => {
  const company = await manager.getRepository(Company).findOne({
    where: { id: companyId },
    select: ['id', 'timezone'],
  });

  return todayISODate(company?.timezone);
};
