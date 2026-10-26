import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LATEST_NOTIFICATIONS } from '../notification.constants';
import { MarkReadPayload } from './mark-read-payload.dto';

const ID = '4f7a3c2e-8b1d-4e6f-9a0b-1c2d3e4f5a6b';

const isValid = async (ids: unknown) =>
  (await validate(plainToInstance(MarkReadPayload, { ids }))).length === 0;

describe('MarkReadPayload', () => {
  it('takes the ids of what the menu showed, up to its size', async () => {
    expect(await isValid([ID])).toBe(true);
    expect(await isValid(Array(LATEST_NOTIFICATIONS).fill(ID))).toBe(true);
  });

  it('refuses nothing, too many or something that is not an id', async () => {
    expect(await isValid(undefined)).toBe(false);
    expect(await isValid([])).toBe(false);
    expect(await isValid(Array(LATEST_NOTIFICATIONS + 1).fill(ID))).toBe(false);
    expect(await isValid(['not-an-id'])).toBe(false);
  });
});
