import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { TimeLogsQuery } from 'src/time-logs/dtos/time-logs-query.dto';

import { PaginationQuery, pageOffset } from './pagination-query.dto';

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

  it('skips the rows before the requested page', () => {
    const query = plainToInstance(PaginationQuery, {
      page: '3',
      pageSize: '10',
    });

    expect(pageOffset(query)).toBe(20);
  });

  it.each(['offset', 'limit'])(
    "refuses %s as an unknown parameter through the app's pipe",
    async (name) => {
      // The options `main.ts` gives the app's pipe.
      const pipe = new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      });

      await expect(
        pipe.transform(
          { [name]: '100' },
          { type: 'query', metatype: PaginationQuery },
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );
});
