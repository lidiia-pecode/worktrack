import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';

import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { Company } from './entities/company.entity';

/** Runs against the development database, so it needs the Docker stack. */

const SLUG = `companies-service-test-${Date.now()}`;

describe('CompaniesService update', () => {
  let dataSource: DataSource;
  let service: CompaniesService;
  let companyId: string;

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    service = new CompaniesService(dataSource.getRepository(Company));

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ id: companyId });
    await dataSource.destroy();
  });

  it('returns the whole company when only some fields are sent', async () => {
    const dto = plainToInstance(UpdateCompanyDto, {
      timezone: 'America/Argentina/Buenos_Aires',
      standardWorkHoursPerDay: 7.5,
    });

    const updated = await service.update(companyId, dto);

    expect(updated).toMatchObject({
      companyName: SLUG,
      currency: 'USD',
      timezone: 'America/Argentina/Buenos_Aires',
    });
    expect(Number(updated.standardWorkHoursPerDay)).toBe(7.5);
  });

  it('saves the other fields sent together with a new name', async () => {
    const dto = plainToInstance(UpdateCompanyDto, {
      companyName: `${SLUG} renamed`,
      timezone: 'Europe/Kyiv',
    });

    const updated = await service.update(companyId, dto);

    expect(updated).toMatchObject({
      companyName: `${SLUG} renamed`,
      timezone: 'Europe/Kyiv',
    });
  });
});
