import { DataSource } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { CompanyStatus } from 'src/companies/enum/company-status.enum';

import { COMPANY } from './seed-config';

export async function seedCompanies(dataSource: DataSource): Promise<string> {
  const companyRepo = dataSource.getRepository(Company);

  let company = await companyRepo.findOneBy({ slug: COMPANY.slug });

  if (!company) {
    company = await companyRepo.save(
      companyRepo.create({ ...COMPANY, status: CompanyStatus.ACTIVE }),
    );
    console.log(`✅ Company "${COMPANY.companyName}" created`);
  } else {
    console.log(`✅ Company "${COMPANY.companyName}" already exists`);
  }

  return company.id;
}
