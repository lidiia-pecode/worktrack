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
  it('refuses a project or person id that is not a uuid', async () => {
    expect((await parse({ projectId: 'crm' })).errors).not.toHaveLength(0);
    expect((await parse({ userId: 'john' })).errors).not.toHaveLength(0);
  });

  it('needs no filter at all', async () => {
    expect((await parse({})).errors).toHaveLength(0);
  });
});
