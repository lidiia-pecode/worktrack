import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { HoursReportQuery } from './hours-report-query.dto';

const parse = async (query: Record<string, string>) => {
  const dto = plainToInstance(HoursReportQuery, {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
    groupBy: 'person',
    ...query,
  });
  return { dto, errors: await validate(dto) };
};

describe('HoursReportQuery', () => {
  it('reads withoutClient from the query string as a flag', async () => {
    expect((await parse({ withoutClient: 'true' })).dto.withoutClient).toBe(
      true,
    );
    expect((await parse({ withoutClient: 'false' })).dto.withoutClient).toBe(
      false,
    );
  });

  it('refuses an empty client and a project id that is not a uuid', async () => {
    expect((await parse({ client: '' })).errors).not.toHaveLength(0);
    expect((await parse({ projectId: 'crm' })).errors).not.toHaveLength(0);
  });

  it('needs no filter at all', async () => {
    expect((await parse({})).errors).toHaveLength(0);
  });
});
