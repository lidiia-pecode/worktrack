import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SetCapacityPayload } from './set-capacity-payload.dto';

const isAccepted = async (minutesPerWeek: number) =>
  (
    await validate(
      plainToInstance(SetCapacityPayload, {
        userId: '4f7a3c2e-8b1d-4e6f-9a0b-1c2d3e4f5a6b',
        minutesPerWeek,
        validFrom: '2026-12-01',
      }),
    )
  ).length === 0;

describe('SetCapacityPayload', () => {
  // A week is five working days of up to 12h, set in 30-minute steps.
  it.each([0, 25 * 60, 32 * 60 + 30, 40 * 60, 60 * 60])(
    'accepts %p minutes a week',
    async (minutes) => {
      await expect(isAccepted(minutes)).resolves.toBe(true);
    },
  );

  it.each([32 * 60, 24 * 60, 62 * 60 + 30, 168 * 60])(
    'refuses %p minutes a week',
    async (minutes) => {
      await expect(isAccepted(minutes)).resolves.toBe(false);
    },
  );
});
