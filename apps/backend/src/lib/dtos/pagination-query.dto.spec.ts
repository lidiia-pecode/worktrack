import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { TimeLogsQuery } from 'src/time-logs/dtos/time-logs-query.dto';

import { PaginationQuery } from './pagination-query.dto';

// Query strings arrive as text, as they do through the ValidationPipe.
const invalidFields = async (query: Record<string, string>) => {
  const errors = await validate(plainToInstance(PaginationQuery, query));
  return errors.map((error) => error.property);
};

describe('PaginationQuery', () => {
  it('accepts the default and the largest page size', async () => {
    expect(await invalidFields({})).toEqual([]);
    expect(await invalidFields({ page: '3', pageSize: '100' })).toEqual([]);
  });

  it('refuses a page size above 100 rather than shortening it', async () => {
    expect(await invalidFields({ pageSize: '101' })).toEqual(['pageSize']);
  });

  it('refuses a page size or page below 1', async () => {
    expect(await invalidFields({ pageSize: '0' })).toEqual(['pageSize']);
    expect(await invalidFields({ pageSize: '-1' })).toEqual(['pageSize']);
    expect(await invalidFields({ page: '0' })).toEqual(['page']);
  });

  it('applies to the list queries built on it', async () => {
    const errors = await validate(
      plainToInstance(TimeLogsQuery, { pageSize: '500' }),
    );

    expect(errors.map((error) => error.property)).toEqual(['pageSize']);
  });
});
