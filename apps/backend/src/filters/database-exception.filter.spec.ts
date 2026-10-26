import { ArgumentsHost, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { DatabaseExceptionFilter } from './database-exception.filter';

const PERSONAL_DETAIL =
  'Key (email)=(sophie.turner@example.com) already exists.';

const failedQuery = (code: string) =>
  new QueryFailedError('INSERT ...', ['sophie.turner@example.com'], {
    code,
    constraint: 'UQ_users_email',
    table: 'users',
    detail: PERSONAL_DETAIL,
  } as unknown as Error);

const respond = (exception: QueryFailedError) => {
  const json = jest.fn<void, [{ message: string }]>();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new DatabaseExceptionFilter().catch(exception, host);

  return { status, body: json.mock.calls[0][0] };
};

describe('DatabaseExceptionFilter', () => {
  let logged: jest.SpyInstance;

  beforeEach(() => {
    logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => logged.mockRestore());

  it('answers a duplicate with a plain 409 that repeats nothing sent', () => {
    const { status, body } = respond(failedQuery('23505'));

    expect(status).toHaveBeenCalledWith(409);
    expect(body.message).toBe('This already exists');
  });

  it('logs the code, table and constraint, never the values', () => {
    respond(failedQuery('23505'));

    const lines = logged.mock.calls.flat().join('\n');
    expect(lines).toContain('23505');
    expect(lines).toContain('UQ_users_email');
    expect(lines).not.toContain('sophie.turner@example.com');
  });
});
