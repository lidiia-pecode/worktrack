import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SetStandardDayPayload } from './standard-day.dto';

describe('SetStandardDayPayload hours', () => {
  const isAccepted = async (hoursPerDay: number) =>
    (
      await validate(
        plainToInstance(SetStandardDayPayload, {
          hoursPerDay,
          validFrom: '2026-11-09',
        }),
      )
    ).length === 0;

  it.each([1, 6.5, 8, 12])('accepts %ph', async (hours) => {
    await expect(isAccepted(hours)).resolves.toBe(true);
  });

  it.each([6.4, 7.75, 12.5, 24])('refuses %ph', async (hours) => {
    await expect(isAccepted(hours)).resolves.toBe(false);
  });
});
