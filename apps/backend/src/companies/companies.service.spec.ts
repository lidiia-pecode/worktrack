import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { waitUntilBlockedBy } from 'src/lib/testing/locks';

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
    });

    const updated = await service.update(companyId, dto);

    expect(updated).toMatchObject({
      companyName: SLUG,
      currency: 'USD',
      timezone: 'America/Argentina/Buenos_Aires',
    });
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

describe('CompaniesService.retryOnTakenSlug', () => {
  const NAME = `race${Date.now()}`;

  let dataSource: DataSource;
  let service: CompaniesService;

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    service = new CompaniesService(dataSource.getRepository(Company));
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ companyName: NAME });
    await dataSource.destroy();
  });

  it('signs up again with the next slug when another took it at the same moment', async () => {
    const holder = dataSource.createQueryRunner();
    await holder.connect();
    await holder.startTransaction();

    try {
      // Another sign-up has the slug but hasn't committed, so this one still
      // finds it free, then waits on the index and loses it.
      await holder.manager.save(Company, { companyName: NAME, slug: NAME });
      const signUp = service.retryOnTakenSlug(() =>
        dataSource.transaction((manager) => service.create(NAME, manager)),
      );
      await waitUntilBlockedBy(dataSource, holder);
      await holder.commitTransaction();

      await expect(signUp).resolves.toMatchObject({ slug: `${NAME}-1` });
    } finally {
      if (holder.isTransactionActive) await holder.rollbackTransaction();
      await holder.release();
    }
  });
});
