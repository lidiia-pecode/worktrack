import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { InvitationTokenQuery } from './invitation-token-query.dto';

const errorFields = async (query: Record<string, unknown>) => {
  const errors = await validate(plainToInstance(InvitationTokenQuery, query));
  return errors.map((error) => error.property);
};

describe('the invitation token query parameter', () => {
  it('accepts one token, or none', async () => {
    await expect(errorFields({ token: 'abc' })).resolves.toEqual([]);
    await expect(errorFields({})).resolves.toEqual([]);
  });

  it('refuses a token given twice', async () => {
    await expect(errorFields({ token: ['a', 'b'] })).resolves.toEqual([
      'token',
    ]);
  });
});
