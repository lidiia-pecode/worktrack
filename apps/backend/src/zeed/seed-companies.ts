import { DataSource } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { CompanyStatus } from 'src/companies/enum/company-status.enum';
import { WeekDay } from 'src/companies/enum/week-day.enum';

export async function seedCompanies(dataSource: DataSource): Promise<string> {
  const companyRepo = dataSource.getRepository(Company);

  const slug = 'techcorp';

  let company = await companyRepo.findOneBy({ slug });

  if (!company) {
    company = companyRepo.create({
      companyName: 'TechCorp Solutions',
      slug,
      status: CompanyStatus.ACTIVE,
      timezone: 'UTC',
      currency: 'USD',
      weekStartDay: WeekDay.MONDAY,
      standardWorkHoursPerDay: 8.0,
    });

    company = await companyRepo.save(company);
    console.log('✅ Company TechCorp created via Repository');
  } else {
    console.log('✅ Company TechCorp already exists');
  }

  return company.id;
}
